from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.core.security import create_access_token
from app.main import app
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.team import Team
from app.models.team_membership import TeamMembership
from app.models.user import User


def create_user(db_session: Session, *, user_id: str, email: str, display_name: str) -> User:
    user = User(
        id=user_id,
        email=email,
        display_name=display_name,
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def board_payload(title: str, due_date: str, team_id: str | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": title,
        "snapshot": {
            "columns": [
                {"id": "todo", "title": "Por hacer", "order": 0},
                {"id": "done", "title": "Hecho", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Entregar documento",
                    "description": "Fecha limite del recurso principal.",
                    "labels": ["agenda"],
                    "color": "#96CEB4",
                    "icon": None,
                    "taskType": "document",
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 300,
                    "dueDate": due_date,
                    "createdAt": 1,
                }
            ],
        },
    }
    if team_id:
        payload["team_id"] = team_id
        payload["context_type"] = "team"
        payload["board_type"] = "team_coordination"
    return payload


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_personal_calendar_feed_exposes_events_and_ics(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-calendar",
        email="teacher.calendar@example.com",
        display_name="Teacher Calendar",
    )

    due_date = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Agenda personal", due_date),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    created_assignment = client.post(
        f"/api/v1/boards/{board['id']}/assignments",
        headers=auth_header(teacher.id),
        json={
            "target_type": "student",
            "target_label": "Marta",
            "due_date": due_date,
            "notes": "Revisar antes de la tutoria",
        },
    )
    assert created_assignment.status_code == 201, created_assignment.text

    created_feed = client.post(
        "/api/v1/calendar/feeds",
        headers=auth_header(teacher.id),
        json={
            "name": "Agenda personal Pasos",
            "scope_type": "personal",
            "include_task_due_dates": True,
            "include_assignments": True,
        },
    )
    assert created_feed.status_code == 201, created_feed.text
    feed = created_feed.json()
    assert feed["scope_type"] == "personal"
    assert feed["url"].endswith(".ics")

    events = client.get(
        "/api/v1/calendar/events",
        headers=auth_header(teacher.id),
    )
    assert events.status_code == 200, events.text
    event_types = {item["event_type"] for item in events.json()}
    assert event_types >= {"task_due", "assignment_due"}

    feeds = client.get(
        "/api/v1/calendar/feeds",
        headers=auth_header(teacher.id),
    )
    assert feeds.status_code == 200, feeds.text
    assert len(feeds.json()) == 1

    ics_response = client.get(feed["url"].replace("https://staging.pasos.test", ""))
    assert ics_response.status_code == 200, ics_response.text
    assert "BEGIN:VCALENDAR" in ics_response.text
    assert "BEGIN:VEVENT" in ics_response.text
    assert "Agenda personal" in ics_response.text


def test_team_calendar_feed_filters_team_scope(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-team-calendar",
        email="teacher.team.calendar@example.com",
        display_name="Teacher Team Calendar",
    )
    organization = Organization(
        id=str(uuid4()),
        name="Centro Demo",
        slug="centro-demo",
        plan_type="school",
        is_active=True,
        metadata_json={},
    )
    team = Team(
        id=str(uuid4()),
        organization_id=organization.id,
        name="Claustro Primaria",
        slug="claustro-primaria",
        team_type="cycle",
        visibility="organization",
        is_archived=False,
        metadata_json={},
    )
    db_session.add_all([organization, team])
    db_session.commit()
    db_session.add_all(
        [
            OrganizationMembership(
                id=str(uuid4()),
                organization_id=organization.id,
                user_id=teacher.id,
                role="organization_admin",
                status="active",
            ),
            TeamMembership(
                id=str(uuid4()),
                team_id=team.id,
                user_id=teacher.id,
                role="owner",
                status="active",
            ),
        ]
    )
    db_session.commit()

    due_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Agenda de equipo", due_date, team.id),
    )
    assert created_board.status_code == 201, created_board.text

    created_feed = client.post(
        "/api/v1/calendar/feeds",
        headers=auth_header(teacher.id),
        json={
            "name": "Agenda Claustro Primaria",
            "scope_type": "team",
            "team_id": team.id,
            "include_task_due_dates": True,
            "include_assignments": False,
        },
    )
    assert created_feed.status_code == 201, created_feed.text
    feed = created_feed.json()
    assert feed["team_id"] == team.id

    events = client.get(
        f"/api/v1/calendar/events?scope_type=team&team_id={team.id}",
        headers=auth_header(teacher.id),
    )
    assert events.status_code == 200, events.text
    payload = events.json()
    assert len(payload) == 1
    assert payload[0]["team_id"] == team.id
    assert payload[0]["event_type"] == "task_due"
