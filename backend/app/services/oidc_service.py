from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from uuid import uuid4

import httpx
import jwt
from jwt import PyJWK
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.security import hash_password
from app.models.user import User

_metadata_cache: dict[str, Any] | None = None
_jwks_cache: dict[str, Any] | None = None


def ensure_oidc_configured() -> None:
    settings = get_settings()
    if (
        not settings.authentik_enabled
        or not settings.authentik_issuer_url
        or not settings.authentik_client_id
        or not settings.authentik_client_secret
    ):
        raise ApiError(503, "sso_not_configured", "El SSO de Pasos no esta configurado")


def redirect_uri() -> str:
    settings = get_settings()
    return f"{settings.public_base_url.rstrip('/')}{settings.authentik_redirect_path}"


def code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return jwt.utils.base64url_encode(digest).decode("ascii")


async def fetch_oidc_metadata() -> dict[str, Any]:
    global _metadata_cache
    ensure_oidc_configured()
    if _metadata_cache:
        return _metadata_cache

    settings = get_settings()
    issuer = settings.authentik_issuer_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        response = await client.get(f"{issuer}/.well-known/openid-configuration")
    if response.status_code >= 400:
        raise ApiError(502, "sso_metadata_unavailable", "No se pudo cargar la metadata OIDC de Authentik")

    metadata = response.json()
    required = ("issuer", "authorization_endpoint", "token_endpoint", "userinfo_endpoint", "jwks_uri")
    missing = [key for key in required if not metadata.get(key)]
    if missing:
        raise ApiError(502, "sso_metadata_invalid", f"Metadata OIDC incompleta: {', '.join(missing)}")
    _metadata_cache = metadata
    return metadata


async def fetch_oidc_jwks(metadata: dict[str, Any]) -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        response = await client.get(str(metadata["jwks_uri"]))
    if response.status_code >= 400:
        raise ApiError(502, "sso_jwks_unavailable", "No se pudieron cargar las claves OIDC de Authentik")

    jwks = response.json()
    if not isinstance(jwks.get("keys"), list) or not jwks["keys"]:
        raise ApiError(502, "sso_jwks_invalid", "Authentik no devolvio claves de firma OIDC")
    _jwks_cache = jwks
    return jwks


def build_authorization_url(metadata: dict[str, Any], state: str, nonce: str, code_verifier: str) -> str:
    settings = get_settings()
    query = urlencode(
        {
            "client_id": settings.authentik_client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri(),
            "scope": settings.authentik_scopes,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge(code_verifier),
            "code_challenge_method": "S256",
        }
    )
    return f"{metadata['authorization_endpoint']}?{query}"


async def exchange_authorization_code(code: str, code_verifier: str, metadata: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri(),
        "client_id": settings.authentik_client_id,
        "client_secret": settings.authentik_client_secret,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        response = await client.post(str(metadata["token_endpoint"]), data=data)
    if response.status_code >= 400:
        raise ApiError(502, "sso_code_exchange_failed", "No se pudo intercambiar el codigo OIDC")

    payload = response.json()
    if not payload.get("access_token") or not payload.get("id_token"):
        raise ApiError(502, "sso_token_response_invalid", "La respuesta OIDC no incluyo los tokens requeridos")
    return payload


async def fetch_userinfo(access_token: str, metadata: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        response = await client.get(
            str(metadata["userinfo_endpoint"]),
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if response.status_code >= 400:
        raise ApiError(502, "sso_userinfo_failed", "No se pudo cargar el perfil OIDC")
    return response.json()


async def validate_id_token(id_token: str, metadata: dict[str, Any], expected_nonce: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(id_token)
    except jwt.PyJWTError as exc:
        raise ApiError(401, "sso_id_token_invalid", "El id_token OIDC no es valido") from exc

    if header.get("alg") != "RS256":
        raise ApiError(401, "sso_id_token_alg_invalid", "Algoritmo de firma OIDC no soportado")

    jwks = await fetch_oidc_jwks(metadata)
    signing_key = None
    for key in jwks["keys"]:
        if key.get("kid") == header.get("kid"):
            signing_key = PyJWK.from_dict(key).key
            break
    if signing_key is None:
        raise ApiError(401, "sso_signing_key_missing", "No se encontro la clave de firma OIDC")

    try:
        claims = jwt.decode(
            id_token,
            key=signing_key,
            algorithms=["RS256"],
            audience=settings.authentik_client_id,
            issuer=metadata["issuer"],
            leeway=60,
        )
    except jwt.PyJWTError as exc:
        raise ApiError(401, "sso_id_token_invalid", "No se pudo validar el id_token OIDC") from exc

    if claims.get("nonce") != expected_nonce:
        raise ApiError(401, "sso_nonce_mismatch", "La respuesta OIDC no coincide con la sesion iniciada")
    return claims


def _claim_string(claims: dict[str, Any], *names: str) -> str | None:
    for name in names:
        value = claims.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def upsert_user_from_claims(db: Session, claims: dict[str, Any]) -> User:
    settings = get_settings()
    subject = _claim_string(claims, "sub")
    if not subject:
        raise ApiError(502, "sso_subject_missing", "El perfil OIDC no incluyo identificador de usuario")

    email = _claim_string(claims, "email")
    if email:
        email = email.lower()

    user = db.scalar(select(User).where(User.oidc_subject == subject))
    if not user and email:
        user = db.scalar(select(User).where(User.email == email))

    if not user:
        if not settings.authentik_auto_provision:
            raise ApiError(403, "sso_user_not_provisioned", "El usuario no esta dado de alta en Pasos")
        if not email:
            raise ApiError(502, "sso_email_missing", "El perfil OIDC no incluyo email")
        user = User(
            id=uuid4().hex,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(48)),
            is_active=True,
        )
        db.add(user)

    if email:
        user.email = email
    user.display_name = _claim_string(claims, "name", "preferred_username") or user.display_name or email
    user.auth_provider = "authentik"
    user.oidc_subject = subject
    user.last_login_at = datetime.now(timezone.utc)
    user.is_active = True

    db.commit()
    db.refresh(user)
    return user


async def authenticate_oidc_callback(db: Session, code: str, code_verifier: str, expected_nonce: str) -> User:
    metadata = await fetch_oidc_metadata()
    token_payload = await exchange_authorization_code(code, code_verifier, metadata)
    id_claims = await validate_id_token(str(token_payload["id_token"]), metadata, expected_nonce)
    userinfo_claims = await fetch_userinfo(str(token_payload["access_token"]), metadata)
    return upsert_user_from_claims(db, {**id_claims, **userinfo_claims})
