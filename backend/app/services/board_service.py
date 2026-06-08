from __future__ import annotations

import hashlib
import json
from uuid import uuid4

from sqlalchemy import and_, delete, desc, false, or_, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import BoardCreateRequest, BoardResponse, BoardSnapshotDTO, BoardUpdateRequest
from app.core.errors import ApiError
from app.models.board import Board
from app.models.membership import BoardMembership
from app.models.organization_membership import OrganizationMembership
from app.models.team import Team
from app.models.team_membership import TeamMembership
from app.models.user import User


def _snapshot_hash(snapshot: dict) -> str:
    canonical = json.dumps(snapshot, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _validate_board_snapshot(snapshot: BoardSnapshotDTO) -> None:
    task_ids = {task.id for task in snapshot.tasks}
    dependency_map: dict[str, list[str]] = {}

    for task in snapshot.tasks:
        dependencies = task.dependencyTaskIds
        dependency_map[task.id] = dependencies

        if task.startDate and task.dueDate and task.startDate > task.dueDate:
            raise ApiError(
                422,
                "task_invalid_dates",
                f"Task '{task.title}' has a start date later than its due date",
            )

        if task.id in dependencies:
            raise ApiError(
                422,
                "task_invalid_dependencies",
                f"Task '{task.title}' cannot depend on itself",
            )

        unknown_dependencies = sorted(set(dependencies) - task_ids)
        if unknown_dependencies:
            raise ApiError(
                422,
                "task_invalid_dependencies",
                f"Task '{task.title}' references unknown dependencies: {', '.join(unknown_dependencies)}",
            )

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(task_id: str) -> None:
        if task_id in visited:
            return
        if task_id in visiting:
            raise ApiError(422, "task_dependency_cycle", "Task dependency cycle detected in board snapshot")

        visiting.add(task_id)
        for dependency_id in dependency_map.get(task_id, []):
            visit(dependency_id)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in dependency_map:
        visit(task_id)


def _board_response(board: Board, role: str) -> BoardResponse:
    return BoardResponse(
        id=board.id,
        title=board.title,
        owner_id=board.owner_id,
        organization_id=board.organization_id,
        team_id=board.team_id,
        context_type=board.context_type,
        board_type=board.board_type,
        snapshot=BoardSnapshotDTO.model_validate(board.snapshot),
        role=role,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


def _get_direct_board_membership(db: Session, board_id: str, user_id: str) -> BoardMembership | None:
    return db.scalar(
        select(BoardMembership).where(
            BoardMembership.board_id == board_id,
            BoardMembership.user_id == user_id,
        )
    )


def _get_active_org_membership(db: Session, organization_id: str, user_id: str) -> OrganizationMembership | None:
    return db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.status == "active",
        )
    )


def _get_active_team_membership(db: Session, team_id: str, user_id: str) -> TeamMembership | None:
    return db.scalar(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id,
            TeamMembership.status == "active",
        )
    )


def _role_from_org_membership(role: str) -> str:
    return "editor" if role in {"organization_admin", "leadership"} else "viewer"


def get_board_access_role(db: Session, board: Board, user: User) -> str | None:
    direct_membership = _get_direct_board_membership(db, board.id, user.id)
    if direct_membership:
        return direct_membership.role

    if board.team_id:
        team_membership = _get_active_team_membership(db, board.team_id, user.id)
        if team_membership:
            return team_membership.role
        if board.organization_id:
            org_membership = _get_active_org_membership(db, board.organization_id, user.id)
            if org_membership and org_membership.role in {"organization_admin", "leadership"}:
                return "editor"
        return None

    if board.organization_id:
        org_membership = _get_active_org_membership(db, board.organization_id, user.id)
        if org_membership:
            return _role_from_org_membership(org_membership.role)

    return None


_MAX_BOARDS_LIMIT = 200


def list_user_boards(
    db: Session,
    user: User,
    *,
    organization_id: str | None = None,
    team_id: str | None = None,
    limit: int = _MAX_BOARDS_LIMIT,
) -> list[BoardResponse]:
    safe_limit = max(1, min(limit, _MAX_BOARDS_LIMIT))
    direct_board_ids = db.scalars(
        select(BoardMembership.board_id).where(BoardMembership.user_id == user.id)
    ).all()
    team_ids = db.scalars(
        select(TeamMembership.team_id).where(
            TeamMembership.user_id == user.id,
            TeamMembership.status == "active",
        )
    ).all()
    org_ids = db.scalars(
        select(OrganizationMembership.organization_id).where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.status == "active",
        )
    ).all()

    boards = db.scalars(
        select(Board)
        .where(
            or_(
                Board.id.in_(direct_board_ids) if direct_board_ids else false(),
                Board.team_id.in_(team_ids) if team_ids else false(),
                and_(
                    Board.organization_id.in_(org_ids) if org_ids else false(),
                    Board.team_id.is_(None),
                ),
            )
        )
        .order_by(desc(Board.updated_at))
        .limit(safe_limit)
    ).all()
    visible_boards: list[BoardResponse] = []

    for board in boards:
        if organization_id and board.organization_id != organization_id:
            continue
        if team_id and board.team_id != team_id:
            continue
        role = get_board_access_role(db, board, user)
        if not role:
            continue
        visible_boards.append(_board_response(board, role))

    return visible_boards


def get_board_for_user(db: Session, board_id: str, user: User) -> tuple[Board, str]:
    board = db.scalar(select(Board).where(Board.id == board_id))
    if not board:
        raise ApiError(404, "board_not_found", "Board not found")

    role = get_board_access_role(db, board, user)
    if not role:
        raise ApiError(404, "board_not_found", "Board not found")
    return board, role


def _default_board_type(context_type: str) -> str:
    if context_type == "team":
        return "team_coordination"
    if context_type == "organization":
        return "organization_project"
    return "learning_sequence"


def _resolve_board_context(
    db: Session,
    *,
    user: User,
    organization_id: str | None,
    team_id: str | None,
    context_type: str | None,
    board_type: str | None,
) -> dict[str, str | None]:
    if team_id:
        team = db.scalar(select(Team).where(Team.id == team_id, Team.is_archived.is_(False)))
        if not team:
            raise ApiError(404, "team_not_found", "Team not found")

        team_membership = _get_active_team_membership(db, team.id, user.id)
        org_membership = _get_active_org_membership(db, team.organization_id, user.id)
        if not team_membership and not (
            org_membership and org_membership.role in {"organization_admin", "leadership"}
        ):
            raise ApiError(403, "board_forbidden", "Insufficient permissions for this team")

        return {
            "organization_id": team.organization_id,
            "team_id": team.id,
            "context_type": "team",
            "board_type": board_type or _default_board_type("team"),
        }

    if organization_id:
        org_membership = _get_active_org_membership(db, organization_id, user.id)
        if not org_membership:
            raise ApiError(404, "organization_not_found", "Organization not found")
        if org_membership.role not in {"organization_admin", "leadership"}:
            raise ApiError(403, "board_forbidden", "Insufficient permissions for this organization")

        return {
            "organization_id": organization_id,
            "team_id": None,
            "context_type": context_type or "organization",
            "board_type": board_type or _default_board_type("organization"),
        }

    return {
        "organization_id": None,
        "team_id": None,
        "context_type": context_type or "personal",
        "board_type": board_type or _default_board_type("personal"),
    }


def create_board(db: Session, user: User, payload: BoardCreateRequest) -> BoardResponse:
    _validate_board_snapshot(payload.snapshot)
    context = _resolve_board_context(
        db,
        user=user,
        organization_id=payload.organization_id,
        team_id=payload.team_id,
        context_type=payload.context_type,
        board_type=payload.board_type,
    )

    if payload.id:
        existing_board = db.scalar(select(Board).where(Board.id == payload.id))
        if existing_board:
            role = get_board_access_role(db, existing_board, user)
            if role != "owner":
                raise ApiError(409, "board_id_conflict", "A board with this id already exists")
            existing_board.organization_id = context["organization_id"]
            existing_board.team_id = context["team_id"]
            existing_board.context_type = context["context_type"]
            existing_board.board_type = context["board_type"]
            existing_board.title = payload.title
            existing_board.snapshot = payload.snapshot.model_dump(mode="json")
            db.commit()
            db.refresh(existing_board)
            return _board_response(existing_board, role)

    board = Board(
        id=payload.id or str(uuid4()),
        owner_id=user.id,
        organization_id=context["organization_id"],
        team_id=context["team_id"],
        context_type=context["context_type"],
        board_type=context["board_type"],
        title=payload.title,
        snapshot=payload.snapshot.model_dump(mode="json"),
        metadata_json={"origin_mode": "pro"},
    )
    membership = BoardMembership(
        id=str(uuid4()),
        board_id=board.id,
        user_id=user.id,
        role="owner",
    )
    db.add(board)
    db.add(membership)
    db.commit()
    db.refresh(board)
    return _board_response(board, "owner")


def update_board(db: Session, board_id: str, user: User, payload: BoardUpdateRequest) -> BoardResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "board_forbidden", "Insufficient permissions to update board")

    _validate_board_snapshot(payload.snapshot)

    context_changed = (
        board.organization_id != payload.organization_id
        or board.team_id != payload.team_id
        or board.context_type != payload.context_type
        or board.board_type != payload.board_type
    )
    if context_changed and role != "owner":
        raise ApiError(403, "board_forbidden", "Only the owner can move a board across spaces")

    if context_changed:
        context = _resolve_board_context(
            db,
            user=user,
            organization_id=payload.organization_id,
            team_id=payload.team_id,
            context_type=payload.context_type,
            board_type=payload.board_type,
        )
        board.organization_id = context["organization_id"]
        board.team_id = context["team_id"]
        board.context_type = context["context_type"]
        board.board_type = context["board_type"]

    incoming_snapshot = payload.snapshot.model_dump(mode="json")
    title_unchanged = board.title == payload.title
    snapshot_unchanged = _snapshot_hash(board.snapshot or {}) == _snapshot_hash(incoming_snapshot)

    if title_unchanged and snapshot_unchanged and not context_changed:
        return _board_response(board, role)

    board.title = payload.title
    board.snapshot = incoming_snapshot
    db.commit()
    db.refresh(board)
    return _board_response(board, role)


def delete_board(db: Session, board_id: str, user: User) -> None:
    board, role = get_board_for_user(db, board_id, user)
    if role != "owner":
        raise ApiError(403, "board_forbidden", "Only the owner can delete a board")
    db.execute(delete(BoardMembership).where(BoardMembership.board_id == board.id))
    db.delete(board)
    db.commit()
