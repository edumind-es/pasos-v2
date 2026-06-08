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


def auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def board_payload(title: str) -> dict[str, object]:
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    return {
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
                    "title": "Preparar borrador",
                    "description": "Trabajo inicial del proyecto.",
                    "labels": ["proyecto"],
                    "taskType": "task",
                    "startDate": yesterday,
                    "dueDate": yesterday,
                    "ownerLabel": "Ana",
                    "effortPoints": 3,
                    "dependencyTaskIds": [],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 1,
                },
                {
                    "id": "task-2",
                    "columnId": "todo",
                    "title": "Validar plan",
                    "description": "Depende del borrador.",
                    "labels": ["proyecto"],
                    "taskType": "task",
                    "startDate": tomorrow,
                    "dueDate": tomorrow,
                    "ownerLabel": "Ana",
                    "effortPoints": 5,
                    "dependencyTaskIds": ["task-1"],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 2,
                },
                {
                    "id": "task-3",
                    "columnId": "todo",
                    "title": "Hito de aprobacion",
                    "description": "Hito directivo final.",
                    "labels": ["hito"],
                    "taskType": "milestone",
                    "dueDate": tomorrow,
                    "ownerLabel": "Luis",
                    "effortPoints": 2,
                    "dependencyTaskIds": ["task-2"],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 3,
                },
            ],
        },
    }


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_timeline_overview_reports_blocked_delayed_and_capacity(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-timeline",
        email="teacher.timeline@example.com",
        display_name="Teacher Timeline",
    )

    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Proyecto de centro"),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    response = client.get(
        f"/api/v1/timeline/overview?board_id={board['id']}",
        headers=auth_header(teacher.id),
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["item_count"] == 3
    assert payload["blocked_count"] == 2
    assert payload["delayed_count"] == 1
    assert payload["milestone_risk_count"] == 1
    assert {item["task_id"] for item in payload["items"]} == {"task-1", "task-2", "task-3"}

    alerts = {(alert["task_id"], alert["alert_type"]) for alert in payload["alerts"]}
    assert ("task-1", "delayed") in alerts
    assert ("task-2", "blocked") in alerts
    assert ("task-3", "milestone_at_risk") in alerts

    capacities = {capacity["owner_label"]: capacity for capacity in payload["capacities"]}
    assert capacities["Ana"]["task_count"] == 2
    assert capacities["Ana"]["effort_points"] == 8
    assert capacities["Luis"]["task_count"] == 1
