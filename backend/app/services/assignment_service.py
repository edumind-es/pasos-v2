from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import LearningAssignmentCreateRequest, LearningAssignmentResponse
from app.core.errors import ApiError
from app.models.board import Board
from app.models.learning_assignment import LearningAssignment
from app.models.user import User
from app.services.board_service import get_board_for_user, list_user_boards


def _assignment_response(assignment: LearningAssignment, board: Board) -> LearningAssignmentResponse:
    return LearningAssignmentResponse(
        id=assignment.id,
        board_id=assignment.board_id,
        board_title=board.title,
        organization_id=assignment.organization_id,
        team_id=assignment.team_id,
        target_type=assignment.target_type,  # type: ignore[arg-type]
        target_label=assignment.target_label,
        target_key=assignment.target_key,
        due_date=assignment.due_date,
        status=assignment.status,  # type: ignore[arg-type]
        notes=assignment.metadata_json.get("notes"),
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


def list_board_assignments(db: Session, board_id: str, user: User) -> list[LearningAssignmentResponse]:
    board, _role = get_board_for_user(db, board_id, user)
    assignments = db.scalars(
        select(LearningAssignment)
        .where(LearningAssignment.board_id == board.id)
        .order_by(desc(LearningAssignment.created_at))
    ).all()
    return [_assignment_response(assignment, board) for assignment in assignments]


def create_board_assignment(
    db: Session,
    board_id: str,
    user: User,
    payload: LearningAssignmentCreateRequest,
) -> LearningAssignmentResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "assignment_forbidden", "Insufficient permissions to create assignments")

    assignment = LearningAssignment(
        id=str(uuid4()),
        board_id=board.id,
        creator_id=user.id,
        organization_id=board.organization_id,
        team_id=board.team_id,
        target_type=payload.target_type,
        target_label=payload.target_label,
        target_key=payload.target_key,
        due_date=payload.due_date,
        status="active",
        metadata_json={"notes": payload.notes},
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _assignment_response(assignment, board)


def delete_board_assignment(db: Session, board_id: str, assignment_id: str, user: User) -> None:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "assignment_forbidden", "Insufficient permissions to delete assignments")

    assignment = db.scalar(
        select(LearningAssignment).where(
            LearningAssignment.id == assignment_id,
            LearningAssignment.board_id == board.id,
        )
    )
    if assignment is None:
        raise ApiError(404, "assignment_not_found", "Assignment not found")

    db.delete(assignment)
    db.commit()


def list_today_assignments(
    db: Session,
    user: User,
    *,
    reference_date: date | None = None,
    days_ahead: int = 2,
) -> list[LearningAssignmentResponse]:
    visible_boards = list_user_boards(db, user)
    visible_board_ids = [board.id for board in visible_boards]
    if not visible_board_ids:
        return []

    board_map = {
        board.id: db.scalar(select(Board).where(Board.id == board.id))
        for board in visible_boards
    }

    start_date = reference_date or datetime.now(timezone.utc).date()
    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(start_date + timedelta(days=days_ahead), time.max, tzinfo=timezone.utc)

    assignments = db.scalars(
        select(LearningAssignment)
        .where(
            LearningAssignment.board_id.in_(visible_board_ids),
            LearningAssignment.status == "active",
            LearningAssignment.due_date.is_not(None),
            LearningAssignment.due_date >= start_dt,
            LearningAssignment.due_date <= end_dt,
        )
        .order_by(LearningAssignment.due_date.asc(), LearningAssignment.created_at.asc())
    ).all()

    responses: list[LearningAssignmentResponse] = []
    for assignment in assignments:
        board = board_map.get(assignment.board_id)
        if board is None:
            continue
        responses.append(_assignment_response(assignment, board))
    return responses
