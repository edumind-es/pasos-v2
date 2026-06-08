from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    TimelineAlertResponse,
    TimelineCapacityResponse,
    TimelineItemResponse,
    TimelineOverviewResponse,
)
from app.models.user import User
from app.services.board_service import list_user_boards

_COMPLETED_COLUMN_TOKENS = ("terminado", "hecho", "validado", "publicado", "cerrado", "done", "complete")


@dataclass
class _DerivedTimelineItem:
    response: TimelineItemResponse


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_completed(column_title: str | None, pedagogical_status: str | None) -> bool:
    normalized_column = (column_title or "").strip().lower()
    if any(token in normalized_column for token in _COMPLETED_COLUMN_TOKENS):
        return True
    return pedagogical_status == "validated"


def get_timeline_overview(
    db: Session,
    user: User,
    *,
    organization_id: str | None = None,
    team_id: str | None = None,
    board_id: str | None = None,
) -> TimelineOverviewResponse:
    boards = list_user_boards(db, user, organization_id=organization_id, team_id=team_id)
    if board_id:
        boards = [board for board in boards if board.id == board_id]

    now = datetime.now(timezone.utc)
    items: list[TimelineItemResponse] = []

    for board in boards:
        column_map = {column.id: column.title for column in board.snapshot.columns}
        task_map = {task.id: task for task in board.snapshot.tasks}
        cache: dict[str, _DerivedTimelineItem] = {}

        def build_item(task_id: str, path: set[str] | None = None) -> _DerivedTimelineItem:
            if task_id in cache:
                return cache[task_id]

            task = task_map[task_id]
            path = path or set()
            if task_id in path:
                response = TimelineItemResponse(
                    task_id=task.id,
                    board_id=board.id,
                    board_title=board.title,
                    title=task.title,
                    task_type=task.taskType or "task",
                    owner_label=task.ownerLabel,
                    effort_points=task.effortPoints or 0,
                    column_title=column_map.get(task.columnId),
                    dependency_task_ids=task.dependencyTaskIds,
                    blocked_by_task_ids=[],
                    start_at=_normalize_datetime(task.startDate),
                    end_at=_normalize_datetime(task.dueDate),
                    is_blocked=False,
                    is_delayed=False,
                    is_milestone=task.taskType == "milestone",
                    is_completed=_is_completed(column_map.get(task.columnId), task.pedagogicalStatus),
                    context_type=board.context_type,
                    organization_id=board.organization_id,
                    team_id=board.team_id,
                )
                return _DerivedTimelineItem(response=response)

            next_path = set(path)
            next_path.add(task_id)
            dependency_items = [
                build_item(dependency_id, next_path)
                for dependency_id in task.dependencyTaskIds
                if dependency_id in task_map
            ]
            dependency_end_dates = [
                dependency.response.end_at
                for dependency in dependency_items
                if dependency.response.end_at is not None
            ]

            explicit_start = _normalize_datetime(task.startDate)
            due_at = _normalize_datetime(task.dueDate)
            derived_start = explicit_start
            if derived_start is None and dependency_end_dates:
                derived_start = max(dependency_end_dates)
            if derived_start is None:
                derived_start = due_at

            end_at = due_at or derived_start
            if derived_start and end_at and derived_start > end_at:
                derived_start = end_at

            column_title = column_map.get(task.columnId)
            is_completed = _is_completed(column_title, task.pedagogicalStatus)
            blocked_by_task_ids = [
                dependency.response.task_id
                for dependency in dependency_items
                if not dependency.response.is_completed
            ]
            is_blocked = len(blocked_by_task_ids) > 0
            is_delayed = bool(end_at and end_at < now and not is_completed)

            response = TimelineItemResponse(
                task_id=task.id,
                board_id=board.id,
                board_title=board.title,
                title=task.title,
                task_type=task.taskType or "task",
                owner_label=task.ownerLabel,
                effort_points=task.effortPoints or 0,
                column_title=column_title,
                dependency_task_ids=task.dependencyTaskIds,
                blocked_by_task_ids=blocked_by_task_ids,
                start_at=derived_start,
                end_at=end_at,
                is_blocked=is_blocked,
                is_delayed=is_delayed,
                is_milestone=task.taskType == "milestone",
                is_completed=is_completed,
                context_type=board.context_type,
                organization_id=board.organization_id,
                team_id=board.team_id,
            )
            derived_item = _DerivedTimelineItem(response=response)
            cache[task_id] = derived_item
            return derived_item

        for task in board.snapshot.tasks:
            has_schedule_signal = bool(task.startDate or task.dueDate or task.dependencyTaskIds or task.taskType == "milestone")
            if not has_schedule_signal:
                continue
            items.append(build_item(task.id).response)

    items.sort(
        key=lambda item: (
            item.start_at or item.end_at or datetime.max.replace(tzinfo=timezone.utc),
            item.board_title.lower(),
            item.title.lower(),
        )
    )

    alerts: list[TimelineAlertResponse] = []
    for item in items:
        if item.is_delayed:
            alerts.append(
                TimelineAlertResponse(
                    alert_type="delayed",
                    severity="critical",
                    task_id=item.task_id,
                    board_id=item.board_id,
                    board_title=item.board_title,
                    title=item.title,
                    owner_label=item.owner_label,
                    message="La tarjeta ha superado su fecha objetivo sin quedar cerrada.",
                )
            )
        if item.is_blocked:
            alerts.append(
                TimelineAlertResponse(
                    alert_type="blocked",
                    severity="warning",
                    task_id=item.task_id,
                    board_id=item.board_id,
                    board_title=item.board_title,
                    title=item.title,
                    owner_label=item.owner_label,
                    message="La tarjeta depende de otras tareas todavía abiertas.",
                )
            )
        due_soon = bool(item.end_at and item.end_at <= now + timedelta(days=3) and not item.is_completed)
        if item.is_milestone and (item.is_delayed or item.is_blocked or due_soon):
            alerts.append(
                TimelineAlertResponse(
                    alert_type="milestone_at_risk",
                    severity="critical" if item.is_delayed else "warning",
                    task_id=item.task_id,
                    board_id=item.board_id,
                    board_title=item.board_title,
                    title=item.title,
                    owner_label=item.owner_label,
                    message="El hito necesita seguimiento porque está bloqueado, vencido o demasiado próximo.",
                )
            )

    capacities_map: dict[str, TimelineCapacityResponse] = {}
    for item in items:
        if item.is_completed:
            continue
        owner_label = (item.owner_label or "Sin responsable").strip() or "Sin responsable"
        current = capacities_map.get(owner_label)
        if current is None:
            current = TimelineCapacityResponse(
                owner_label=owner_label,
                task_count=0,
                effort_points=0,
                blocked_count=0,
                delayed_count=0,
            )
            capacities_map[owner_label] = current

        current.task_count += 1
        current.effort_points += item.effort_points
        current.blocked_count += 1 if item.is_blocked else 0
        current.delayed_count += 1 if item.is_delayed else 0

    capacities = sorted(
        capacities_map.values(),
        key=lambda capacity: (-capacity.effort_points, -capacity.task_count, capacity.owner_label.lower()),
    )

    blocked_count = sum(1 for item in items if item.is_blocked)
    delayed_count = sum(1 for item in items if item.is_delayed)
    milestone_risk_count = sum(1 for alert in alerts if alert.alert_type == "milestone_at_risk")
    scope_type = "team" if team_id else "organization" if organization_id else "personal"

    return TimelineOverviewResponse(
        scope_type=scope_type,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
        item_count=len(items),
        blocked_count=blocked_count,
        delayed_count=delayed_count,
        milestone_risk_count=milestone_risk_count,
        items=items,
        alerts=alerts,
        capacities=capacities,
    )
