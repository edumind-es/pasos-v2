from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import TimelineOverviewResponse
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.timeline_service import get_timeline_overview

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/overview", response_model=TimelineOverviewResponse)
def get_timeline_overview_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    organization_id: str | None = None,
    team_id: str | None = None,
    board_id: str | None = None,
) -> TimelineOverviewResponse:
    return get_timeline_overview(
        db,
        current_user,
        organization_id=organization_id,
        team_id=team_id,
        board_id=board_id,
    )
