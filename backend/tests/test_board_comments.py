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


def board_payload(title: str, **extra: object) -> dict[str, object]:
    return {
        "title": title,
        "snapshot": {
            "columns": [
                {"id": "todo", "title": "Pendiente", "order": 0},
                {"id": "done", "title": "Cerrado", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Preparar orden del día",
                    "description": "Definir acuerdos del equipo.",
                    "labels": ["equipo"],
                    "color": "#45B7D1",
                    "icon": None,
                    "taskType": "agreement",
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 300,
                    "createdAt": 1,
                }
            ],
        },
        **extra,
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


def test_team_board_comments_store_mentions(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-comments",
        email="teacher.comments@example.com",
        display_name="Teacher Comments",
    )

    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Seguimiento de reunión", context_type="team", board_type="meeting_followup"),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    created_comment = client.post(
        f"/api/v1/boards/{board['id']}/comments",
        headers=auth_header(teacher.id),
        json={"message": "Revisamos acuerdos con @marta y @equipo-azul."},
    )
    assert created_comment.status_code == 201, created_comment.text
    payload = created_comment.json()
    assert payload["mentions"] == ["equipo-azul", "marta"]

    listed = client.get(
        f"/api/v1/boards/{board['id']}/comments",
        headers=auth_header(teacher.id),
    )
    assert listed.status_code == 200, listed.text
    comments = listed.json()
    assert len(comments) == 1
    assert comments[0]["message"].startswith("Revisamos acuerdos")
