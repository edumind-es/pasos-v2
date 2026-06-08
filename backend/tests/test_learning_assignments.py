from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

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
                {"id": "todo", "title": "Por hacer", "order": 0},
                {"id": "done", "title": "Terminado", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Actividad guiada",
                    "description": "Resolver el paso principal.",
                    "labels": ["curricular"],
                    "color": "#45B7D1",
                    "icon": None,
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 600,
                    "createdAt": 1,
                }
            ],
        },
    }


def auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_board_assignments_and_today_view(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-assignment",
        email="teacher.assignment@example.com",
        display_name="Teacher Assignment",
    )

    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Secuencia de hoy"),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    due_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    created_assignment = client.post(
        f"/api/v1/boards/{board['id']}/assignments",
        headers=auth_header(teacher.id),
        json={
            "target_type": "student",
            "target_label": "Marta",
            "due_date": due_date,
            "notes": "Prioridad alta",
        },
    )
    assert created_assignment.status_code == 201, created_assignment.text
    assignment = created_assignment.json()
    assert assignment["target_label"] == "Marta"
    assert assignment["board_title"] == "Secuencia de hoy"

    listed = client.get(
        f"/api/v1/boards/{board['id']}/assignments",
        headers=auth_header(teacher.id),
    )
    assert listed.status_code == 200, listed.text
    assert len(listed.json()) == 1

    today = client.get(
        "/api/v1/assignments/today",
        headers=auth_header(teacher.id),
    )
    assert today.status_code == 200, today.text
    today_payload = today.json()
    assert len(today_payload) == 1
    assert today_payload[0]["id"] == assignment["id"]

    deleted = client.delete(
        f"/api/v1/boards/{board['id']}/assignments/{assignment['id']}",
        headers=auth_header(teacher.id),
    )
    assert deleted.status_code == 204, deleted.text
