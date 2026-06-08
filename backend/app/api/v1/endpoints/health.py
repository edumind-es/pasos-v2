from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.v1.dtos import HealthResponse
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version="0.1.0",
        environment=settings.app_env,
        timestamp=datetime.now(timezone.utc),
    )
