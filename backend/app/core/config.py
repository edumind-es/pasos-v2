from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


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


@lru_cache
def get_settings() -> Settings:
    return Settings()
