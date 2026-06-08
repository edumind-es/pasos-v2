from __future__ import annotations

import re
from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import BoardCommentCreateRequest, BoardCommentResponse
from app.core.errors import ApiError
from app.models.board_comment import BoardComment
from app.models.user import User
from app.services.board_service import get_board_for_user

MENTION_RE = re.compile(r"@([A-Za-z0-9._-]{2,64})(?=$|[^A-Za-z0-9._-])")


def _comment_response(comment: BoardComment) -> BoardCommentResponse:
    return BoardCommentResponse(
        id=comment.id,
        board_id=comment.board_id,
        author_id=comment.author_id,
        author_label=comment.author_label,
        message=comment.message,
        mentions=comment.mentions_json,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


def list_board_comments(db: Session, board_id: str, user: User) -> list[BoardCommentResponse]:
    _board, _role = get_board_for_user(db, board_id, user)
    comments = db.scalars(
        select(BoardComment)
        .where(BoardComment.board_id == board_id)
        .order_by(desc(BoardComment.created_at))
        .limit(50)
    ).all()
    return [_comment_response(comment) for comment in comments]


def create_board_comment(
    db: Session,
    board_id: str,
    user: User,
    payload: BoardCommentCreateRequest,
) -> BoardCommentResponse:
    _board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "comment_forbidden", "Insufficient permissions to comment on this board")

    comment = BoardComment(
        id=str(uuid4()),
        board_id=board_id,
        author_id=user.id,
        author_label=user.display_name or user.email,
        message=payload.message,
        mentions_json=sorted(set(match.rstrip(".,;:!?") for match in MENTION_RE.findall(payload.message.lower()))),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_response(comment)
