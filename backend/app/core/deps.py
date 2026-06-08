from typing import Annotated

from fastapi import Cookie, Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.core.errors import ApiError
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db_session)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise ApiError(401, "not_authenticated", "Bearer token required")

    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:  # noqa: BLE001
        raise ApiError(401, "invalid_token", "Access token is invalid or expired") from exc

    user = db.scalar(select(User).where(User.id == payload["sub"], User.is_active.is_(True)))
    if not user:
        raise ApiError(401, "invalid_user", "User not found or inactive")
    return user


def require_csrf(
    request: Request,
    x_csrf_token: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    csrf_cookie: Annotated[str | None, Cookie(alias="pasos_csrf")] = None,
) -> None:
    if request.cookies.get("pasos_refresh"):
        if not x_csrf_token or not csrf_cookie or x_csrf_token != csrf_cookie:
            raise ApiError(403, "csrf_failed", "CSRF token missing or invalid")

