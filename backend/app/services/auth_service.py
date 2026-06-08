from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dtos import AuthLoginRequest, AuthRegisterRequest
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_csrf_token,
    hash_ip,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def register_user(db: Session, payload: AuthRegisterRequest) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise ApiError(409, "email_exists", "A user with this email already exists")

    user = User(
        id=uuid4().hex,
        email=payload.email.lower(),
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: AuthLoginRequest) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.lower(), User.is_active.is_(True)))
    if not user or not verify_password(payload.password, user.password_hash):
        raise ApiError(401, "invalid_credentials", "Email or password is invalid")
    return user


def issue_tokens(
    db: Session,
    user: User,
    ip_address: str | None,
    user_agent: str | None,
) -> dict:
    access_token, access_expires_at = create_access_token(user.id)
    refresh_token, jti, refresh_expires_at = create_refresh_token(user.id)
    csrf_token = generate_csrf_token()

    refresh_record = RefreshToken(
        id=str(uuid4()),
        user_id=user.id,
        jti=jti,
        token_hash=hash_token(refresh_token),
        csrf_token=csrf_token,
        expires_at=refresh_expires_at,
        ip_hash=hash_ip(ip_address),
        user_agent=(user_agent or "")[:255] or None,
    )
    db.add(refresh_record)
    db.commit()

    return {
        "access_token": access_token,
        "access_expires_at": access_expires_at,
        "refresh_token": refresh_token,
        "refresh_expires_at": refresh_expires_at,
        "csrf_token": csrf_token,
    }


def rotate_refresh_token(
    db: Session,
    raw_refresh_token: str,
    ip_address: str | None,
    user_agent: str | None,
) -> tuple[User, dict]:
    try:
        payload = decode_refresh_token(raw_refresh_token)
    except Exception as exc:  # noqa: BLE001
        raise ApiError(401, "invalid_refresh_token", "Refresh token is invalid or expired") from exc

    refresh_record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.jti == payload["jti"],
            RefreshToken.token_hash == hash_token(raw_refresh_token),
        )
    )
    now = datetime.now(timezone.utc)
    if (
        not refresh_record
        or _coerce_utc(refresh_record.revoked_at)
        or _coerce_utc(refresh_record.expires_at) <= now
    ):
        raise ApiError(401, "invalid_refresh_token", "Refresh token is invalid or revoked")

    user = db.scalar(select(User).where(User.id == payload["sub"], User.is_active.is_(True)))
    if not user:
        raise ApiError(401, "invalid_user", "User not found or inactive")

    refresh_record.revoked_at = now
    new_tokens = issue_tokens(db, user, ip_address, user_agent)
    latest = db.scalar(select(RefreshToken).where(RefreshToken.jti == decode_refresh_token(new_tokens["refresh_token"])["jti"]))
    if latest:
        latest.rotated_from_id = refresh_record.id
        db.commit()
    return user, new_tokens


def revoke_refresh_token(db: Session, raw_refresh_token: str | None) -> None:
    if not raw_refresh_token:
        return
    try:
        payload = decode_refresh_token(raw_refresh_token)
    except Exception:  # noqa: BLE001
        return
    refresh_record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.jti == payload["jti"],
            RefreshToken.token_hash == hash_token(raw_refresh_token),
        )
    )
    if refresh_record and not refresh_record.revoked_at:
        refresh_record.revoked_at = datetime.now(timezone.utc)
        db.commit()
