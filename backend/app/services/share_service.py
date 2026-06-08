from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dtos import ShareCreateRequest, ShareResponse, ShareResolveResponse
from app.core.config import get_settings
from app.core.errors import ApiError
from app.models.board import Board
from app.models.share import BoardShare
from app.models.user import User
from app.services.activity_service import record_board_activity
from app.services.board_service import _board_response, get_board_for_user

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generate_code() -> str:
    import secrets

    return "".join(secrets.choice(ALPHABET) for _ in range(8))


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def get_active_share_by_code(db: Session, code: str) -> BoardShare:
    share = db.scalar(select(BoardShare).where(BoardShare.code == code.upper()))
    now = datetime.now(timezone.utc)
    if not share or _coerce_utc(share.revoked_at) or _coerce_utc(share.expires_at) <= now:
        raise ApiError(404, "share_not_found", "Share code is invalid or expired")
    if share.max_uses is not None and share.use_count >= share.max_uses:
        raise ApiError(410, "share_exhausted", "Share code is no longer available")
    return share


def create_share(
    db: Session,
    board_id: str,
    user: User,
    payload: ShareCreateRequest,
) -> ShareResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "share_forbidden", "Insufficient permissions to share this board")
    if not payload.allow_anonymous:
        raise ApiError(
            422,
            "share_identified_not_supported",
            "Protected shares without anonymous access are not available yet",
        )
    if board.context_type in {"team", "organization"} and payload.allow_anonymous:
        raise ApiError(
            403,
            "share_anonymous_forbidden",
            "Team and organization boards cannot be shared with anonymous access",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.ttl_hours)
    code = _generate_code()
    share = BoardShare(
        id=str(uuid4()),
        board_id=board.id,
        created_by_user_id=user.id,
        code=code,
        permission=payload.permission,
        expires_at=expires_at,
        max_uses=payload.max_uses,
        allow_anonymous=payload.allow_anonymous,
    )
    db.add(share)
    db.flush()
    record_board_activity(
        db,
        board_id=board.id,
        share_id=share.id,
        event_type="share_created",
        actor_type="teacher",
        actor_id=user.id,
        actor_label=user.display_name or user.email,
        metadata={
            "permission": payload.permission,
            "ttl_hours": payload.ttl_hours,
            "allow_anonymous": payload.allow_anonymous,
        },
    )
    db.commit()

    settings = get_settings()
    return ShareResponse(
        code=code,
        permission=payload.permission,
        expires_at=expires_at,
        url=f"{settings.public_base_url}/codigo?code={code}",
    )


def resolve_share(db: Session, code: str) -> ShareResolveResponse:
    share = get_active_share_by_code(db, code)
    if not share.allow_anonymous:
        raise ApiError(
            403,
            "share_identified_required",
            "This share requires identified access and cannot be opened anonymously",
        )

    board = db.scalar(select(Board).where(Board.id == share.board_id))
    if not board:
        raise ApiError(404, "board_not_found", "Shared board no longer exists")

    share.use_count += 1
    record_board_activity(
        db,
        board_id=board.id,
        share_id=share.id,
        event_type="share_resolved",
        actor_type="anonymous",
        metadata={"share_code": share.code, "use_count": share.use_count},
    )
    db.commit()

    return ShareResolveResponse(
        code=share.code,
        permission=share.permission,
        expires_at=share.expires_at,
        board=_board_response(board, "viewer"),
    )
