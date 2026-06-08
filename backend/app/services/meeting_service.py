from __future__ import annotations

from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import BoardMeetingCreateRequest, BoardMeetingResponse
from app.core.errors import ApiError
from app.models.board_meeting import BoardMeeting
from app.models.user import User
from app.services.board_service import get_board_for_user


def _meeting_response(meeting: BoardMeeting) -> BoardMeetingResponse:
    return BoardMeetingResponse(
        id=meeting.id,
        board_id=meeting.board_id,
        author_id=meeting.author_id,
        author_label=meeting.author_label,
        title=meeting.title,
        summary=meeting.summary,
        decisions=meeting.decisions_json,
        linked_task_ids=meeting.linked_task_ids_json,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


def list_board_meetings(db: Session, board_id: str, user: User) -> list[BoardMeetingResponse]:
    _board, _role = get_board_for_user(db, board_id, user)
    meetings = db.scalars(
        select(BoardMeeting)
        .where(BoardMeeting.board_id == board_id)
        .order_by(desc(BoardMeeting.created_at))
        .limit(20)
    ).all()
    return [_meeting_response(meeting) for meeting in meetings]


def create_board_meeting(
    db: Session,
    board_id: str,
    user: User,
    payload: BoardMeetingCreateRequest,
) -> BoardMeetingResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "meeting_forbidden", "Insufficient permissions to create meeting notes on this board")

    board_snapshot = board.snapshot or {}
    board_tasks = board_snapshot.get("tasks", []) if isinstance(board_snapshot, dict) else []
    valid_task_ids = {
        task.get("id")
        for task in board_tasks
        if isinstance(task, dict) and task.get("id")
    }
    invalid_ids = sorted(set(payload.linked_task_ids) - valid_task_ids)
    if invalid_ids:
        raise ApiError(422, "meeting_invalid_tasks", f"Unknown board task ids: {', '.join(invalid_ids)}")

    meeting = BoardMeeting(
        id=str(uuid4()),
        board_id=board_id,
        author_id=user.id,
        author_label=user.display_name or user.email,
        title=payload.title,
        summary=payload.summary,
        decisions_json=payload.decisions,
        linked_task_ids_json=payload.linked_task_ids,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _meeting_response(meeting)
