from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


# Valores por defecto de los secretos: viven aquí como fallback de desarrollo,
# pero jamás deben llegar a producción. enforce_secret_policy() lo impide.
_SECRETOS_DE_EJEMPLO = {
    "change-me-access-secret",
    "change-me-refresh-secret",
    "change_me_access_secret",
    "change_me_refresh_secret",
}
_LONGITUD_MINIMA_SECRETO = 32


class Settings(BaseSettings):
    app_name: str = "pasos-api"
    app_env: str = "production"
    app_debug: bool = False
    public_base_url: str = "https://pasos.edumind.es"
    api_v1_prefix: str = "/api/v1"
    docs_url: str = "/api/docs"
    openapi_url: str = "/api/openapi.json"
    database_url: str = "postgresql+psycopg://pasos_user:change_me@127.0.0.1:5432/pasos"
    jwt_secret_key: str = "change-me-access-secret"
    refresh_jwt_secret_key: str = "change-me-refresh-secret"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 14
    jwt_algorithm: str = "HS256"
    csrf_cookie_name: str = "pasos_csrf"
    refresh_cookie_name: str = "pasos_refresh"
    cookie_secure: bool = True
    cookie_samesite: str = "strict"
    cookie_domain: str | None = "pasos.edumind.es"
    cors_allow_origins: str = "https://pasos.edumind.es"
    rate_limit_auth_per_minute: int = 10
    rate_limit_share_per_minute: int = 60
    log_level: str = "INFO"
    authentik_enabled: bool = False
    authentik_issuer_url: str | None = None
    authentik_client_id: str | None = None
    authentik_client_secret: str | None = None
    authentik_scopes: str = "openid profile email"
    authentik_redirect_path: str = "/api/v1/auth/oidc/callback"
    authentik_auto_provision: bool = True

    model_config = SettingsConfigDict(
        env_prefix="PASOS_",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @property
    def sql_echo(self) -> bool:
        return self.app_debug

    def model_dump_safe(self) -> dict[str, Any]:
        data = self.model_dump()
        for field in (
            "jwt_secret_key",
            "refresh_jwt_secret_key",
            "database_url",
            "authentik_client_secret",
        ):
            data.pop(field, None)
        return data

    def enforce_secret_policy(self) -> None:
        """Aborta el arranque en producción si los secretos JWT son inseguros.

        En desarrollo y en pruebas no se comprueba: ahí los secretos son de
        juguete a propósito. En producción, un secreto por defecto (que está
        publicado en el repositorio) o demasiado corto es un fallo de
        configuración que debe impedir arrancar, no un aviso que se pierde en
        el log. RFC 7518 pide como mínimo 32 bytes para HMAC-SHA256.
        """
        if self.app_env != "production":
            return
        problemas: list[str] = []
        for nombre, valor in (
            ("PASOS_JWT_SECRET_KEY", self.jwt_secret_key),
            ("PASOS_REFRESH_JWT_SECRET_KEY", self.refresh_jwt_secret_key),
        ):
            normalizado = valor.strip().lower()
            if normalizado.startswith("change") or normalizado in _SECRETOS_DE_EJEMPLO:
                problemas.append(
                    f"{nombre} sigue siendo el valor de ejemplo publicado en el repositorio"
                )
            elif len(valor) < _LONGITUD_MINIMA_SECRETO:
                problemas.append(
                    f"{nombre} es demasiado corto: {len(valor)} caracteres, "
                    f"mínimo {_LONGITUD_MINIMA_SECRETO}"
                )
        if problemas:
            detalle = "; ".join(problemas)
            raise RuntimeError(
                "Configuración de seguridad inválida: " + detalle
                + ". Genera un secreto propio con: openssl rand -hex 32"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
