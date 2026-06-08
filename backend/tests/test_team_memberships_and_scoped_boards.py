from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.core.security import create_access_token
from app.main import app
from app.models.user import User
from app.services.user_identity_service import build_workspace_code


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
                {"id": "todo", "title": "Por hacer", "order": 0},
                {"id": "done", "title": "Hecho", "order": 1},
            ],
            "tasks": [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Preparar evidencia",
                    "description": "Subir evidencia",
                    "labels": ["inicio"],
                    "color": "#45B7D1",
                    "icon": None,
                    "pictograms": [],
                    "attachments": [],
                    "durationSeconds": 60,
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


def test_team_owner_can_add_member_and_list_members(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="admin-user",
        email="admin@example.com",
        display_name="Admin",
    )
    teacher = create_user(
        db_session,
        user_id="teacher-user",
        email="teacher@example.com",
        display_name="Teacher",
    )

    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Colegio Faro"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Departamento de Lenguas", "team_type": "department"},
    ).json()

    add_member = client.post(
        f"/api/v1/teams/{team['id']}/members",
        headers=auth_header(admin.id),
        json={"user_email": teacher.email, "role": "editor"},
    )
    assert add_member.status_code == 201, add_member.text
    payload = add_member.json()
    assert payload["user"]["email"] == teacher.email
    assert payload["role"] == "editor"
    assert payload["user"]["workspace_code"] == build_workspace_code(teacher.id)

    listed = client.get(
        f"/api/v1/teams/{team['id']}/members",
        headers=auth_header(admin.id),
    )
    assert listed.status_code == 200, listed.text
    members = listed.json()
    assert len(members) == 2
    assert {member["role"] for member in members} == {"owner", "editor"}


def test_team_owner_can_add_member_by_user_code(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="admin-code-user",
        email="admin-code@example.com",
        display_name="Admin Code",
    )
    teacher = create_user(
        db_session,
        user_id="teacher-code-user",
        email="teacher-code@example.com",
        display_name="Teacher Code",
    )

    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Colegio Codigo"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Equipo Codigo", "team_type": "project"},
    ).json()

    response = client.post(
        f"/api/v1/teams/{team['id']}/members",
        headers=auth_header(admin.id),
        json={"user_code": build_workspace_code(teacher.id), "role": "viewer"},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["user"]["id"] == teacher.id
    assert payload["user"]["workspace_code"] == build_workspace_code(teacher.id)


def test_team_membership_controls_board_visibility_and_updates(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="admin-board-user",
        email="admin-board@example.com",
        display_name="Admin Board",
    )
    editor = create_user(
        db_session,
        user_id="editor-board-user",
        email="editor-board@example.com",
        display_name="Editor Board",
    )
    viewer = create_user(
        db_session,
        user_id="viewer-board-user",
        email="viewer-board@example.com",
        display_name="Viewer Board",
    )

    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Colegio Horizonte"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Equipo Directivo", "team_type": "leadership", "visibility": "organization"},
    ).json()

    for target, role in ((editor, "editor"), (viewer, "viewer")):
        response = client.post(
            f"/api/v1/teams/{team['id']}/members",
            headers=auth_header(admin.id),
            json={"user_id": target.id, "role": role},
        )
        assert response.status_code == 201, response.text

    created = client.post(
        "/api/v1/boards",
        headers=auth_header(editor.id),
        json=board_payload(
            "Seguimiento trimestral",
            organization_id=organization["id"],
            team_id=team["id"],
            context_type="team",
            board_type="team_coordination",
        ),
    )
    assert created.status_code == 201, created.text
    board = created.json()
    assert board["team_id"] == team["id"]
    assert board["organization_id"] == organization["id"]
    assert board["role"] == "owner"

    viewer_list = client.get(
        f"/api/v1/boards?team_id={team['id']}",
        headers=auth_header(viewer.id),
    )
    assert viewer_list.status_code == 200, viewer_list.text
    boards = viewer_list.json()
    assert len(boards) == 1
    assert boards[0]["id"] == board["id"]
    assert boards[0]["role"] == "viewer"

    forbidden_update = client.put(
        f"/api/v1/boards/{board['id']}",
        headers=auth_header(viewer.id),
        json=board_payload(
            "Seguimiento actualizado",
            organization_id=organization["id"],
            team_id=team["id"],
            context_type="team",
            board_type="team_coordination",
        ),
    )
    assert forbidden_update.status_code == 403, forbidden_update.text
    assert forbidden_update.json()["error"]["code"] == "board_forbidden"


def test_create_board_is_idempotent_for_existing_owner_board(client: TestClient, db_session: Session) -> None:
    teacher = create_user(
        db_session,
        user_id="sync-owner-user",
        email="sync-owner@example.com",
        display_name="Sync Owner",
    )

    payload = board_payload("Mi Primer Tablero", id="local-board-1")
    created = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=payload,
    )
    assert created.status_code == 201, created.text

    updated_payload = board_payload("Mi Primer Tablero actualizado", id="local-board-1")
    repeated = client.post(
        "/api/v1/boards",
        headers=auth_header(teacher.id),
        json=updated_payload,
    )

    assert repeated.status_code == 201, repeated.text
    repeated_payload = repeated.json()
    assert repeated_payload["id"] == "local-board-1"
    assert repeated_payload["title"] == "Mi Primer Tablero actualizado"
    assert repeated_payload["role"] == "owner"

    listed = client.get("/api/v1/boards", headers=auth_header(teacher.id))
    assert listed.status_code == 200, listed.text
    boards = listed.json()
    assert [board["id"] for board in boards] == ["local-board-1"]
