from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    ExecutiveDashboardResponse,
    ExecutiveOverdueMilestoneResponse,
    ExecutiveOwnerMetricResponse,
    ExecutivePendingDocumentResponse,
    ExecutiveProjectProgressResponse,
    ExecutiveRecurringBlockerResponse,
    ExecutiveSummaryResponse,
    ExecutiveTeamMetricResponse,
    TaskSnapshotDTO,
)
from app.models.board_document import BoardDocument
from app.models.team import Team
from app.models.user import User
from app.services._executive_helpers import (
    OwnerAccumulator,
    TeamAccumulator,
    _PENDING_DOCUMENT_STATUSES,
    empty_executive_summary,
    is_completed,
    matches_owner,
    normalize_key,
    normalize_label,
    progress_percent,
    team_label,
    within_alert_window,
)
from app.services.board_service import list_user_boards
from app.services.timeline_service import get_timeline_overview


def get_executive_dashboard(
    db: Session,
    user: User,
    *,
    organization_id: str | None = None,
    team_id: str | None = None,
    board_id: str | None = None,
    owner_label: str | None = None,
    period_days: int = 30,
) -> ExecutiveDashboardResponse:
    period_days = max(7, min(period_days, 180))
    boards = list_user_boards(db, user, organization_id=organization_id, team_id=team_id)
    if board_id:
        boards = [board for board in boards if board.id == board_id]

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=period_days)
    scope_type = "team" if team_id else "organization" if organization_id else "personal"

    if not boards:
        return ExecutiveDashboardResponse(
            scope_type=scope_type,
            organization_id=organization_id,
            team_id=team_id,
            board_id=board_id,
            owner_label=owner_label,
            period_days=period_days,
            generated_at=now,
            summary=empty_executive_summary(),
        )

    team_ids = sorted({board.team_id for board in boards if board.team_id})
    teams = db.scalars(select(Team).where(Team.id.in_(team_ids))).all() if team_ids else []
    team_name_map = {team.id: team.name for team in teams}

    timeline = get_timeline_overview(
        db,
        user,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
    )
    filtered_items = [
        item
        for item in timeline.items
        if matches_owner(item.owner_label, owner_label)
    ]

    items_by_board: dict[str, list[TimelineItemResponse]] = defaultdict(list)
    for item in filtered_items:
        items_by_board[item.board_id].append(item)

    pending_documents_query = db.scalars(
        select(BoardDocument)
        .where(
            BoardDocument.board_id.in_([board.id for board in boards]),
            BoardDocument.status.in_(_PENDING_DOCUMENT_STATUSES),
        )
        .order_by(BoardDocument.updated_at.asc())
    ).all()

    pending_documents: list[ExecutivePendingDocumentResponse] = []
    pending_documents_by_board: dict[str, int] = defaultdict(int)
    for document in pending_documents_query:
        if owner_label and normalize_key(document.author_label) != normalize_key(owner_label):
            continue

        board = next((candidate for candidate in boards if candidate.id == document.board_id), None)
        if board is None:
            continue

        pending_documents_by_board[board.id] += 1
        pending_documents.append(
            ExecutivePendingDocumentResponse(
                document_id=document.id,
                board_id=board.id,
                board_title=board.title,
                team_id=board.team_id,
                team_name=team_name_map.get(board.team_id) if board.team_id else team_label(None, board.context_type),
                title=document.title,
                status=document.status,  # type: ignore[arg-type]
                author_label=document.author_label,
                updated_at=document.updated_at,
                age_days=max(0, (now - (document.updated_at if document.updated_at.tzinfo else document.updated_at.replace(tzinfo=timezone.utc))).days),
            )
        )

    task_title_map: dict[tuple[str, str], str] = {}
    project_rows: list[ExecutiveProjectProgressResponse] = []
    team_accumulators: dict[str | None, TeamAccumulator] = {}

    total_tasks = 0
    completed_tasks = 0
    blocked_count = 0
    delayed_count = 0
    overdue_milestone_count = 0

    for board in boards:
        column_map = {column.id: column.title for column in board.snapshot.columns}
        board_tasks: list[TaskSnapshotDTO] = []
        for task in board.snapshot.tasks:
            task_title_map[(board.id, task.id)] = task.title
            if matches_owner(task.ownerLabel, owner_label):
                board_tasks.append(task)

        board_items = items_by_board.get(board.id, [])
        board_blocked_count = sum(1 for item in board_items if item.is_blocked)
        board_delayed_count = sum(
            1
            for item in board_items
            if item.is_delayed and within_alert_window(item, window_start)
        )
        board_overdue_milestone_count = sum(
            1
            for item in board_items
            if item.is_milestone and item.is_delayed and within_alert_window(item, window_start)
        )
        board_completed_tasks = sum(
            1
            for task in board_tasks
            if is_completed(column_map.get(task.columnId), task.pedagogicalStatus)
        )
        board_total_tasks = len(board_tasks)

        total_tasks += board_total_tasks
        completed_tasks += board_completed_tasks
        blocked_count += board_blocked_count
        delayed_count += board_delayed_count
        overdue_milestone_count += board_overdue_milestone_count

        project_rows.append(
            ExecutiveProjectProgressResponse(
                board_id=board.id,
                board_title=board.title,
                team_id=board.team_id,
                team_name=team_name_map.get(board.team_id) if board.team_id else team_label(None, board.context_type),
                board_type=board.board_type,
                total_tasks=board_total_tasks,
                completed_tasks=board_completed_tasks,
                progress_percent=progress_percent(board_completed_tasks, board_total_tasks),
                blocked_count=board_blocked_count,
                delayed_count=board_delayed_count,
                overdue_milestone_count=board_overdue_milestone_count,
                pending_document_count=pending_documents_by_board.get(board.id, 0),
                updated_at=board.updated_at,
            )
        )

        team_key = board.team_id
        team_name = team_name_map.get(board.team_id) if board.team_id else team_label(None, board.context_type)
        team_accumulator = team_accumulators.get(team_key)
        if team_accumulator is None:
            team_accumulator = TeamAccumulator(team_id=team_key, team_name=team_name)
            team_accumulators[team_key] = team_accumulator

        team_accumulator.board_ids.add(board.id)
        team_accumulator.total_tasks += board_total_tasks
        team_accumulator.completed_tasks += board_completed_tasks
        team_accumulator.blocked_count += board_blocked_count
        team_accumulator.delayed_count += board_delayed_count
        team_accumulator.overdue_milestone_count += board_overdue_milestone_count
        team_accumulator.pending_document_count += pending_documents_by_board.get(board.id, 0)

    owner_accumulators: dict[str, OwnerAccumulator] = {}
    for item in filtered_items:
        if item.is_completed:
            continue
        label = normalize_label(item.owner_label) or "Sin responsable"
        current = owner_accumulators.get(label)
        if current is None:
            current = OwnerAccumulator(owner_label=label)
            owner_accumulators[label] = current

        current.board_ids.add(item.board_id)
        current.task_count += 1
        current.effort_points += item.effort_points
        current.blocked_count += 1 if item.is_blocked else 0
        current.delayed_count += 1 if item.is_delayed and within_alert_window(item, window_start) else 0

    blocker_groups: dict[str, dict[str, object]] = {}
    for item in filtered_items:
        if not item.is_blocked:
            continue
        if not within_alert_window(item, window_start):
            continue
        for dependency_task_id in item.blocked_by_task_ids:
            blocker_title = task_title_map.get((item.board_id, dependency_task_id)) or dependency_task_id
            blocker_key = normalize_key(blocker_title)
            group = blocker_groups.get(blocker_key)
            if group is None:
                group = {
                    "blocker_label": blocker_title,
                    "blocked_task_count": 0,
                    "board_titles": set(),
                    "owner_labels": set(),
                }
                blocker_groups[blocker_key] = group

            group["blocked_task_count"] = int(group["blocked_task_count"]) + 1
            cast_board_titles = group["board_titles"]
            cast_owner_labels = group["owner_labels"]
            assert isinstance(cast_board_titles, set)
            assert isinstance(cast_owner_labels, set)
            cast_board_titles.add(item.board_title)
            if item.owner_label:
                cast_owner_labels.add(item.owner_label)

    recurring_blockers = [
        ExecutiveRecurringBlockerResponse(
            blocker_label=str(group["blocker_label"]),
            blocked_task_count=int(group["blocked_task_count"]),
            board_count=len(group["board_titles"]),
            board_titles=sorted(group["board_titles"]),
            owner_labels=sorted(group["owner_labels"]),
        )
        for group in blocker_groups.values()
    ]
    recurring_blockers.sort(key=lambda item: (-item.blocked_task_count, -item.board_count, item.blocker_label.lower()))
    recurrent_blocker_count = sum(1 for item in recurring_blockers if item.blocked_task_count >= 2)

    overdue_milestones: list[ExecutiveOverdueMilestoneResponse] = []
    for item in filtered_items:
        if not item.is_milestone or not item.is_delayed or item.end_at is None:
            continue
        if not within_alert_window(item, window_start):
            continue
        end_at = item.end_at if item.end_at.tzinfo else item.end_at.replace(tzinfo=timezone.utc)
        overdue_milestones.append(
            ExecutiveOverdueMilestoneResponse(
                task_id=item.task_id,
                board_id=item.board_id,
                board_title=item.board_title,
                team_id=item.team_id,
                team_name=team_name_map.get(item.team_id) if item.team_id else team_label(None, item.context_type),
                title=item.title,
                owner_label=item.owner_label,
                due_at=end_at,
                delayed_days=max(0, (now - end_at).days),
                blocked_by_task_ids=item.blocked_by_task_ids,
            )
        )

    teams_response = [
        ExecutiveTeamMetricResponse(
            team_id=accumulator.team_id,
            team_name=accumulator.team_name,
            board_count=len(accumulator.board_ids),
            total_tasks=accumulator.total_tasks,
            completed_tasks=accumulator.completed_tasks,
            progress_percent=progress_percent(accumulator.completed_tasks, accumulator.total_tasks),
            blocked_count=accumulator.blocked_count,
            delayed_count=accumulator.delayed_count,
            overdue_milestone_count=accumulator.overdue_milestone_count,
            pending_document_count=accumulator.pending_document_count,
        )
        for accumulator in team_accumulators.values()
    ]
    teams_response.sort(
        key=lambda item: (-item.overdue_milestone_count, -item.delayed_count, -item.blocked_count, item.team_name.lower())
    )

    owners_response = [
        ExecutiveOwnerMetricResponse(
            owner_label=accumulator.owner_label,
            board_count=len(accumulator.board_ids),
            task_count=accumulator.task_count,
            effort_points=accumulator.effort_points,
            blocked_count=accumulator.blocked_count,
            delayed_count=accumulator.delayed_count,
        )
        for accumulator in owner_accumulators.values()
    ]
    owners_response.sort(key=lambda item: (-item.effort_points, -item.task_count, item.owner_label.lower()))

    project_rows.sort(
        key=lambda item: (
            -item.overdue_milestone_count,
            -item.delayed_count,
            -item.blocked_count,
            item.progress_percent,
            item.board_title.lower(),
        )
    )
    pending_documents.sort(key=lambda item: (-item.age_days, item.updated_at, item.title.lower()))
    overdue_milestones.sort(key=lambda item: (-item.delayed_days, item.due_at, item.title.lower()))

    return ExecutiveDashboardResponse(
        scope_type=scope_type,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
        owner_label=owner_label,
        period_days=period_days,
        generated_at=now,
        summary=ExecutiveSummaryResponse(
            total_boards=len(project_rows),
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            progress_percent=progress_percent(completed_tasks, total_tasks),
            blocked_count=blocked_count,
            delayed_count=delayed_count,
            overdue_milestone_count=overdue_milestone_count,
            pending_document_count=len(pending_documents),
            recurrent_blocker_count=recurrent_blocker_count,
        ),
        teams=teams_response,
        owners=owners_response,
        projects=project_rows,
        recurring_blockers=recurring_blockers,
        pending_documents=pending_documents,
        overdue_milestones=overdue_milestones,
    )


