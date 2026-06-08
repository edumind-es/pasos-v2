from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    CalendarEventResponse,
    CalendarFeedCreateRequest,
    CalendarFeedResponse,
)
from app.core.config import get_settings
from app.core.errors import ApiError
from app.models.calendar_feed import CalendarFeed
from app.models.learning_assignment import LearningAssignment
from app.models.organization_membership import OrganizationMembership
from app.models.team import Team
from app.models.team_membership import TeamMembership
from app.models.user import User
from app.services.board_service import list_user_boards


def _calendar_feed_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.public_base_url.rstrip('/')}{settings.api_v1_prefix}/calendar/feeds/{token}.ics"


def _calendar_feed_response(feed: CalendarFeed) -> CalendarFeedResponse:
    return CalendarFeedResponse(
        id=feed.id,
        name=feed.name,
        scope_type=feed.scope_type,  # type: ignore[arg-type]
        organization_id=feed.organization_id,
        team_id=feed.team_id,
        include_task_due_dates=bool(feed.metadata_json.get("include_task_due_dates", True)),
        include_assignments=bool(feed.metadata_json.get("include_assignments", True)),
        is_active=feed.is_active,
        url=_calendar_feed_url(feed.token),
        created_at=feed.created_at,
        updated_at=feed.updated_at,
    )


def _parse_snapshot_datetime(raw_value: object) -> datetime | None:
    if raw_value is None:
        return None
    if isinstance(raw_value, datetime):
        value = raw_value
    elif isinstance(raw_value, str):
        normalized = raw_value.replace("Z", "+00:00")
        try:
            value = datetime.fromisoformat(normalized)
        except ValueError:
            return None
    else:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _get_team_scope(db: Session, team_id: str, user: User) -> Team:
    team = db.scalar(select(Team).where(Team.id == team_id, Team.is_archived.is_(False)))
    if not team:
        raise ApiError(404, "team_not_found", "Team not found")

    team_membership = db.scalar(
        select(TeamMembership).where(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == user.id,
            TeamMembership.status == "active",
        )
    )
    if team_membership:
        return team

    org_membership = db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == team.organization_id,
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.status == "active",
        )
    )
    if org_membership and org_membership.role in {"organization_admin", "leadership"}:
        return team

    raise ApiError(403, "calendar_forbidden", "Insufficient permissions for this team calendar")


def _resolve_scope_boards(
    db: Session,
    user: User,
    *,
    scope_type: str,
    team_id: str | None = None,
) -> list:
    visible_boards = list_user_boards(db, user)
    if scope_type == "team":
        if not team_id:
            raise ApiError(422, "calendar_team_required", "Team calendars require team_id")
        _get_team_scope(db, team_id, user)
        return [board for board in visible_boards if board.team_id == team_id]

    return [board for board in visible_boards if not board.team_id]


def list_calendar_events(
    db: Session,
    user: User,
    *,
    scope_type: str = "personal",
    team_id: str | None = None,
    include_task_due_dates: bool = True,
    include_assignments: bool = True,
    days_before: int = 7,
    days_ahead: int = 35,
) -> list[CalendarEventResponse]:
    boards = _resolve_scope_boards(db, user, scope_type=scope_type, team_id=team_id)
    if not boards:
        return []

    board_map = {board.id: board for board in boards}
    board_ids = list(board_map.keys())
    now = datetime.now(timezone.utc)
    range_start = now - timedelta(days=days_before)
    range_end = now + timedelta(days=days_ahead)
    events: list[CalendarEventResponse] = []

    if include_task_due_dates:
        for board in boards:
            for task in board.snapshot.tasks:
                due_at = _parse_snapshot_datetime(task.dueDate)
                if not due_at or due_at < range_start or due_at > range_end:
                    continue
                events.append(
                    CalendarEventResponse(
                        id=f"t-{board.id[:24]}-{task.id[:24]}",
                        event_type="task_due",
                        title=task.title[:160],
                        description=task.description[:4000] if task.description else None,
                        start_at=due_at,
                        end_at=due_at + timedelta(hours=1),
                        board_id=board.id,
                        board_title=board.title,
                        organization_id=board.organization_id,
                        team_id=board.team_id,
                        target_label=None,
                    )
                )

    if include_assignments:
        assignments = db.scalars(
            select(LearningAssignment)
            .where(
                LearningAssignment.board_id.in_(board_ids),
                LearningAssignment.status == "active",
                LearningAssignment.due_date.is_not(None),
                LearningAssignment.due_date >= range_start,
                LearningAssignment.due_date <= range_end,
            )
            .order_by(LearningAssignment.due_date.asc(), LearningAssignment.created_at.asc())
        ).all()
        for assignment in assignments:
            board = board_map.get(assignment.board_id)
            if board is None or assignment.due_date is None:
                continue
            due_at = _normalize_datetime(assignment.due_date)
            description = assignment.metadata_json.get("notes")
            events.append(
                CalendarEventResponse(
                    id=f"a-{assignment.id}",
                    event_type="assignment_due",
                    title=f"{assignment.target_label}: {board.title}"[:160],
                    description=description[:4000] if isinstance(description, str) else None,
                    start_at=due_at,
                    end_at=due_at + timedelta(hours=1),
                    board_id=board.id,
                    board_title=board.title,
                    organization_id=assignment.organization_id,
                    team_id=assignment.team_id,
                    target_label=assignment.target_label,
                )
            )

    events.sort(key=lambda event: (event.start_at, event.title.lower(), event.id))
    return events


def list_calendar_feeds(db: Session, user: User) -> list[CalendarFeedResponse]:
    feeds = db.scalars(
        select(CalendarFeed)
        .where(
            CalendarFeed.owner_id == user.id,
            CalendarFeed.is_active.is_(True),
        )
        .order_by(desc(CalendarFeed.updated_at), desc(CalendarFeed.created_at))
    ).all()
    return [_calendar_feed_response(feed) for feed in feeds]


def create_calendar_feed(
    db: Session,
    user: User,
    payload: CalendarFeedCreateRequest,
) -> CalendarFeedResponse:
    team: Team | None = None
    organization_id: str | None = None
    team_id: str | None = None
    if payload.scope_type == "team":
        if not payload.team_id:
            raise ApiError(422, "calendar_team_required", "Team calendars require team_id")
        team = _get_team_scope(db, payload.team_id, user)
        organization_id = team.organization_id
        team_id = team.id

    existing = db.scalar(
        select(CalendarFeed).where(
            CalendarFeed.owner_id == user.id,
            CalendarFeed.scope_type == payload.scope_type,
            CalendarFeed.team_id == team_id,
            CalendarFeed.is_active.is_(True),
            CalendarFeed.name == payload.name,
        )
    )
    if existing:
        existing.metadata_json = {
            "include_task_due_dates": payload.include_task_due_dates,
            "include_assignments": payload.include_assignments,
        }
        db.commit()
        db.refresh(existing)
        return _calendar_feed_response(existing)

    feed = CalendarFeed(
        id=str(uuid4()),
        owner_id=user.id,
        organization_id=organization_id,
        team_id=team_id,
        scope_type=payload.scope_type,
        name=payload.name,
        token=secrets.token_urlsafe(30),
        is_active=True,
        metadata_json={
            "include_task_due_dates": payload.include_task_due_dates,
            "include_assignments": payload.include_assignments,
        },
    )
    db.add(feed)
    db.commit()
    db.refresh(feed)
    return _calendar_feed_response(feed)


def get_calendar_feed(db: Session, token: str) -> CalendarFeed:
    feed = db.scalar(
        select(CalendarFeed).where(
            CalendarFeed.token == token,
            CalendarFeed.is_active.is_(True),
        )
    )
    if feed is None:
        raise ApiError(404, "calendar_feed_not_found", "Calendar feed not found")
    return feed


def list_calendar_feed_events(db: Session, token: str) -> list[CalendarEventResponse]:
    feed = get_calendar_feed(db, token)
    user = db.scalar(select(User).where(User.id == feed.owner_id, User.is_active.is_(True)))
    if user is None:
        raise ApiError(404, "calendar_feed_not_found", "Calendar feed not found")

    return list_calendar_events(
        db,
        user,
        scope_type=feed.scope_type,
        team_id=feed.team_id,
        include_task_due_dates=bool(feed.metadata_json.get("include_task_due_dates", True)),
        include_assignments=bool(feed.metadata_json.get("include_assignments", True)),
        days_before=30,
        days_ahead=120,
    )


def _escape_ical(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", r"\;")
        .replace(",", r"\,")
        .replace("\r\n", r"\n")
        .replace("\n", r"\n")
    )


def _format_ical_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def render_calendar_feed_ics(db: Session, token: str) -> tuple[str, str]:
    feed = get_calendar_feed(db, token)
    events = list_calendar_feed_events(db, token)
    generated_at = datetime.now(timezone.utc)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EDUmind//Pasos//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape_ical(feed.name)}",
    ]

    for event in events:
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{_escape_ical(event.id)}@pasos.edumind.es",
                f"DTSTAMP:{_format_ical_datetime(generated_at)}",
                f"DTSTART:{_format_ical_datetime(event.start_at)}",
                f"DTEND:{_format_ical_datetime(event.end_at)}",
                f"SUMMARY:{_escape_ical(event.title)}",
                f"CATEGORIES:{_escape_ical(event.event_type)}",
            ]
        )
        if event.description:
            lines.append(f"DESCRIPTION:{_escape_ical(event.description)}")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    filename = f"{feed.name.lower().replace(' ', '-')[:40] or 'pasos'}.ics"
    return "\r\n".join(lines) + "\r\n", filename
