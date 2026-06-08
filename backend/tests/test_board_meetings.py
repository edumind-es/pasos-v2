from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.core.security import create_access_token
from app.main import app
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


def board_payload(title: str) -> dict[str, object]:
    return {
        "title": title,
        "snapshot": {
            "columns": [
                {"id": "agenda", "title": "Agenda", "order": 0},
                {"id": "followup", "title": "Seguimiento", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "agenda",
                    "title": "Revisar plan lector",
                    "description": "Ajustar acuerdos del departamento.",
                    "labels": ["equipo"],
                    "color": "#45B7D1",
                    "icon": None,
                    "taskType": "agreement",
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 300,
                    "createdAt": 1,
                },
                {
                    "id": "task-2",
                    "columnId": "agenda",
                    "title": "Actualizar acta",
                    "description": "Documento de seguimiento.",
                    "labels": ["documento"],
                    "color": "#4ECDC4",
                    "icon": None,
                    "taskType": "document",
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 300,
                    "createdAt": 2,
                },
            ],
        },
        "context_type": "team",
        "board_type": "meeting_followup",
    }


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_board_meetings_create_and_list(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-meetings",
        email="teacher.meetings@example.com",
        display_name="Teacher Meetings",
    )

    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Seguimiento semanal"),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    created_meeting = client.post(
        f"/api/v1/boards/{board['id']}/meetings",
        headers=auth_header(teacher.id),
        json={
            "title": "Reunión de coordinación del lunes",
            "summary": "Se revisan acuerdos y documentación pendiente.",
            "decisions": [
                "Cerrar el acuerdo del plan lector antes del viernes",
                "Compartir el documento actualizado con el equipo",
            ],
            "linked_task_ids": ["task-1", "task-2"],
        },
    )
    assert created_meeting.status_code == 201, created_meeting.text
    payload = created_meeting.json()
    assert payload["title"] == "Reunión de coordinación del lunes"
    assert payload["linked_task_ids"] == ["task-1", "task-2"]
    assert len(payload["decisions"]) == 2

    listed = client.get(
        f"/api/v1/boards/{board['id']}/meetings",
        headers=auth_header(teacher.id),
    )
    assert listed.status_code == 200, listed.text
    meetings = listed.json()
    assert len(meetings) == 1
    assert meetings[0]["summary"].startswith("Se revisan acuerdos")
