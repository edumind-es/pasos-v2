from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.api.v1.dtos import ExecutiveDashboardResponse
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.executive_exporter import export_executive_dashboard_csv
from app.services.executive_service import get_executive_dashboard

router = APIRouter(prefix="/executive", tags=["executive"])


@router.get("/dashboard", response_model=ExecutiveDashboardResponse)
def get_executive_dashboard_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    organization_id: str | None = None,
    team_id: str | None = None,
    board_id: str | None = None,
    owner_label: str | None = None,
    period_days: int = 30,
) -> ExecutiveDashboardResponse:
    return get_executive_dashboard(
        db,
        current_user,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
        owner_label=owner_label,
        period_days=period_days,
    )


@router.get("/dashboard.csv", response_class=PlainTextResponse)
def export_executive_dashboard_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    organization_id: str | None = None,
    team_id: str | None = None,
    board_id: str | None = None,
    owner_label: str | None = None,
    period_days: int = 30,
) -> PlainTextResponse:
    payload = get_executive_dashboard(
        db,
        current_user,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
        owner_label=owner_label,
        period_days=period_days,
    )
    return PlainTextResponse(
        export_executive_dashboard_csv(payload),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=pasos-executive-dashboard.csv",
        },
    )
