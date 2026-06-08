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
                {"id": "todo", "title": "Por hacer", "order": 0},
                {"id": "review", "title": "Revision", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Preparar material",
                    "description": "Documento base del proyecto.",
                    "labels": ["recurso"],
                    "color": "#45B7D1",
                    "icon": None,
                    "taskType": "document",
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 300,
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


def test_board_documents_create_update_list_versions_and_delete(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="teacher-documents",
        email="teacher.documents@example.com",
        display_name="Teacher Documents",
    )

    created_board = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=board_payload("Recursos de apoyo"),
    )
    assert created_board.status_code == 201, created_board.text
    board = created_board.json()

    created_document = client.post(
        f"/api/v1/boards/{board['id']}/documents",
        headers=auth_header(teacher.id),
        json={
            "title": "Guia del proyecto",
            "kind": "link",
            "status": "draft",
            "description": "Documento compartido con el equipo.",
            "url": "https://example.com/guia-proyecto",
            "linked_task_ids": ["task-1"],
            "tags": ["guia", "claustro"],
        },
    )
    assert created_document.status_code == 201, created_document.text
    document = created_document.json()
    assert document["current_version"] == 1
    assert document["linked_task_ids"] == ["task-1"]

    listed = client.get(
        f"/api/v1/boards/{board['id']}/documents",
        headers=auth_header(teacher.id),
    )
    assert listed.status_code == 200, listed.text
    assert len(listed.json()) == 1

    updated_document = client.put(
        f"/api/v1/boards/{board['id']}/documents/{document['id']}",
        headers=auth_header(teacher.id),
        json={
            "title": "Guia del proyecto actualizada",
            "kind": "note",
            "status": "published",
            "description": "Version final compartida con el claustro.",
            "content": "Checklist final y acuerdos del equipo.",
            "url": None,
            "linked_task_ids": ["task-1"],
            "tags": ["guia", "publicado"],
        },
    )
    assert updated_document.status_code == 200, updated_document.text
    updated_payload = updated_document.json()
    assert updated_payload["current_version"] == 2
    assert updated_payload["status"] == "published"
    assert updated_payload["kind"] == "note"

    versions = client.get(
        f"/api/v1/boards/{board['id']}/documents/{document['id']}/versions",
        headers=auth_header(teacher.id),
    )
    assert versions.status_code == 200, versions.text
    versions_payload = versions.json()
    assert [version["version_number"] for version in versions_payload] == [2, 1]

    deleted = client.delete(
        f"/api/v1/boards/{board['id']}/documents/{document['id']}",
        headers=auth_header(teacher.id),
    )
    assert deleted.status_code == 204, deleted.text

    listed_after_delete = client.get(
        f"/api/v1/boards/{board['id']}/documents",
        headers=auth_header(teacher.id),
    )
    assert listed_after_delete.status_code == 200, listed_after_delete.text
    assert listed_after_delete.json() == []
