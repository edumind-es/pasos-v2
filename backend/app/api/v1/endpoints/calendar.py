from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.v1.dtos import CalendarEventResponse, CalendarFeedCreateRequest, CalendarFeedResponse
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.calendar_service import (
    create_calendar_feed,
    list_calendar_events,
    list_calendar_feeds,
    render_calendar_feed_ics,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events", response_model=list[CalendarEventResponse])
def list_calendar_events_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    scope_type: str = "personal",
    team_id: str | None = None,
) -> list[CalendarEventResponse]:
    return list_calendar_events(db, current_user, scope_type=scope_type, team_id=team_id)


@router.get("/feeds", response_model=list[CalendarFeedResponse])
def list_calendar_feeds_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CalendarFeedResponse]:
    return list_calendar_feeds(db, current_user)


@router.post("/feeds", response_model=CalendarFeedResponse, status_code=201)
def create_calendar_feed_endpoint(
    payload: CalendarFeedCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CalendarFeedResponse:
    return create_calendar_feed(db, current_user, payload)


@router.get("/feeds/{token}.ics")
def get_calendar_feed_ics_endpoint(
    token: str,
    db: DbSession,
) -> Response:
    content, filename = render_calendar_feed_ics(db, token)
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
