from __future__ import annotations

import secrets
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Depends, Request, Response
from fastapi.responses import RedirectResponse

from app.api.v1.dtos import (
    AuthLoginRequest,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    UserResponse,
)
from app.core.config import get_settings
from app.core.deps import DbSession, get_current_user, require_csrf
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.services.auth_service import (
    authenticate_user,
    issue_tokens,
    register_user,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.services.oidc_service import (
    authenticate_oidc_callback,
    build_authorization_url,
    ensure_oidc_configured,
    fetch_oidc_jwks,
    fetch_oidc_metadata,
)
from app.services.user_identity_service import to_user_response

router = APIRouter(prefix="/auth", tags=["auth"])
OIDC_STATE_COOKIE = "pasos_oidc_state"
OIDC_NONCE_COOKIE = "pasos_oidc_nonce"
OIDC_VERIFIER_COOKIE = "pasos_oidc_verifier"
OIDC_NEXT_COOKIE = "pasos_oidc_next"


def _oidc_cookie_path() -> str:
    return f"{get_settings().api_v1_prefix.rstrip('/')}/auth/oidc"


def _set_auth_cookies(response: Response, refresh_token: str, csrf_token: str) -> None:
    settings = get_settings()
    max_age = settings.refresh_token_ttl_days * 24 * 60 * 60
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        domain=settings.cookie_domain,
        path="/api/v1/auth",
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        domain=settings.cookie_domain,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.refresh_cookie_name, domain=settings.cookie_domain, path="/api/v1/auth")
    response.delete_cookie(settings.csrf_cookie_name, domain=settings.cookie_domain, path="/")


def _set_oidc_cookie(response: Response, key: str, value: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=600,
        domain=settings.cookie_domain,
        path=_oidc_cookie_path(),
    )


def _clear_oidc_cookies(response: Response) -> None:
    settings = get_settings()
    for key in (OIDC_STATE_COOKIE, OIDC_NONCE_COOKIE, OIDC_VERIFIER_COOKIE, OIDC_NEXT_COOKIE):
        response.delete_cookie(key, domain=settings.cookie_domain, path=_oidc_cookie_path())


def _sanitize_next(next_value: str | None) -> str:
    if not next_value:
        return "/"
    candidate = next_value.strip()
    if not candidate.startswith("/") or candidate.startswith("//") or candidate.startswith("/api/"):
        return "/"
    return candidate


def _frontend_login_url(next_value: str | None) -> str:
    settings = get_settings()
    query = urlencode({"sso": "1", "next": _sanitize_next(next_value)})
    return f"{settings.public_base_url.rstrip('/')}/login?{query}"


def _auth_response(user: User, tokens: dict) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=tokens["access_token"],
        expires_at=tokens["access_expires_at"],
        user=to_user_response(user),
    )


@router.get("/config")
def auth_config() -> dict[str, object]:
    settings = get_settings()
    return {
        "auth_mode": "authentik" if settings.authentik_enabled else "local",
        "sso_enabled": settings.authentik_enabled,
        "sso_provider": "authentik" if settings.authentik_enabled else None,
        "sso_login_path": "/api/v1/auth/oidc/start" if settings.authentik_enabled else None,
    }


@router.get("/oidc/health")
async def oidc_health() -> dict[str, object]:
    settings = get_settings()
    if not settings.authentik_enabled:
        return {"ok": True, "enabled": False, "provider": None}
    try:
        metadata = await fetch_oidc_metadata()
        jwks = await fetch_oidc_jwks(metadata)
        return {
            "ok": True,
            "enabled": True,
            "provider": "authentik",
            "issuer": metadata.get("issuer"),
            "authorization_endpoint": bool(metadata.get("authorization_endpoint")),
            "token_endpoint": bool(metadata.get("token_endpoint")),
            "userinfo_endpoint": bool(metadata.get("userinfo_endpoint")),
            "jwks_uri": bool(metadata.get("jwks_uri")),
            "signing_keys": len(jwks.get("keys", [])),
        }
    except ApiError as exc:
        return {"ok": False, "enabled": True, "provider": "authentik", "error": exc.message}


@router.get("/oidc/start", dependencies=[Depends(rate_limit("auth_sso_start", 20, 60))])
async def oidc_start(next: str | None = None) -> RedirectResponse:
    ensure_oidc_configured()
    metadata = await fetch_oidc_metadata()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    response = RedirectResponse(build_authorization_url(metadata, state, nonce, code_verifier), status_code=303)
    _set_oidc_cookie(response, OIDC_STATE_COOKIE, state)
    _set_oidc_cookie(response, OIDC_NONCE_COOKIE, nonce)
    _set_oidc_cookie(response, OIDC_VERIFIER_COOKIE, code_verifier)
    _set_oidc_cookie(response, OIDC_NEXT_COOKIE, _sanitize_next(next))
    return response


@router.get("/oidc/callback", dependencies=[Depends(rate_limit("auth_sso_callback", 30, 60))])
async def oidc_callback(
    request: Request,
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if error:
        raise ApiError(401, "sso_denied", f"Authentik rechazo el inicio de sesion: {error}")

    expected_state = request.cookies.get(OIDC_STATE_COOKIE)
    expected_nonce = request.cookies.get(OIDC_NONCE_COOKIE)
    code_verifier = request.cookies.get(OIDC_VERIFIER_COOKIE)
    next_path = request.cookies.get(OIDC_NEXT_COOKIE)
    if not code or not state or not expected_state or state != expected_state or not expected_nonce or not code_verifier:
        raise ApiError(400, "sso_callback_state_invalid", "La respuesta SSO no coincide con la sesion iniciada")

    user = await authenticate_oidc_callback(db, code, code_verifier, expected_nonce)
    tokens = issue_tokens(db, user, request.client.host if request.client else None, request.headers.get("user-agent"))
    response = RedirectResponse(_frontend_login_url(next_path), status_code=303)
    _set_auth_cookies(response, tokens["refresh_token"], tokens["csrf_token"])
    _clear_oidc_cookies(response)
    return response


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    dependencies=[Depends(rate_limit("auth_register", 5, 60))],
)
def register(
    payload: AuthRegisterRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> AuthTokenResponse:
    user = register_user(db, payload)
    tokens = issue_tokens(db, user, request.client.host if request.client else None, request.headers.get("user-agent"))
    _set_auth_cookies(response, tokens["refresh_token"], tokens["csrf_token"])
    return _auth_response(user, tokens)


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    dependencies=[Depends(rate_limit("auth_login", 10, 60))],
)
def login(
    payload: AuthLoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> AuthTokenResponse:
    user = authenticate_user(db, payload)
    tokens = issue_tokens(db, user, request.client.host if request.client else None, request.headers.get("user-agent"))
    _set_auth_cookies(response, tokens["refresh_token"], tokens["csrf_token"])
    return _auth_response(user, tokens)


@router.post("/refresh", response_model=AuthTokenResponse, dependencies=[Depends(require_csrf)])
def refresh(
    payload: AuthRefreshRequest,
    request: Request,
    response: Response,
    db: DbSession,
    refresh_cookie: Annotated[str | None, Cookie(alias="pasos_refresh")] = None,
) -> AuthTokenResponse:
    raw_refresh = payload.refresh_token or refresh_cookie
    user, tokens = rotate_refresh_token(
        db,
        raw_refresh,
        request.client.host if request.client else None,
        request.headers.get("user-agent"),
    )
    _set_auth_cookies(response, tokens["refresh_token"], tokens["csrf_token"])
    return _auth_response(user, tokens)


@router.post("/logout", dependencies=[Depends(require_csrf)])
def logout(
    payload: AuthLogoutRequest,
    response: Response,
    db: DbSession,
    refresh_cookie: Annotated[str | None, Cookie(alias="pasos_refresh")] = None,
) -> dict[str, str]:
    revoke_refresh_token(db, payload.refresh_token or refresh_cookie)
    _clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return to_user_response(current_user)
