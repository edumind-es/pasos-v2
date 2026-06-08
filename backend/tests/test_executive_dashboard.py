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


def board_payload(title: str, task_specs: list[dict[str, object]], **extra: object) -> dict[str, object]:
    return {
        "title": title,
        "snapshot": {
            "columns": [
                {"id": "todo", "title": "Por hacer", "order": 0},
                {"id": "done", "title": "Hecho", "order": 1},
            ],
            "tasks": task_specs,
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


def test_executive_dashboard_aggregates_center_risk_and_progress(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="executive-admin",
        email="executive-admin@example.com",
        display_name="Executive Admin",
    )

    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Centro Faro", "plan_type": "school"},
    ).json()
    directivo = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Equipo Directivo", "team_type": "leadership", "visibility": "organization"},
    ).json()
    tic = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Comision TIC", "team_type": "project", "visibility": "organization"},
    ).json()

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    board_one = client.post(
        "/api/v1/boards",
        headers=auth_header(admin.id),
        json=board_payload(
            "Seguimiento trimestral",
            [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Revision directiva",
                    "labels": ["revision"],
                    "taskType": "task",
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
                    "title": "Actualizar protocolo",
                    "labels": ["documento"],
                    "taskType": "document",
                    "dueDate": tomorrow,
                    "ownerLabel": "Bea",
                    "effortPoints": 5,
                    "dependencyTaskIds": ["task-1"],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 2,
                },
                {
                    "id": "task-3",
                    "columnId": "todo",
                    "title": "Hito trimestral",
                    "labels": ["hito"],
                    "taskType": "milestone",
                    "dueDate": yesterday,
                    "ownerLabel": "Luis",
                    "effortPoints": 2,
                    "dependencyTaskIds": ["task-2"],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 3,
                },
            ],
            organization_id=organization["id"],
            team_id=directivo["id"],
            context_type="team",
            board_type="team_coordination",
        ),
    )
    assert board_one.status_code == 201, board_one.text
    board_one_id = board_one.json()["id"]

    board_two = client.post(
        "/api/v1/boards",
        headers=auth_header(admin.id),
        json=board_payload(
            "Plan digital de centro",
            [
                {
                    "id": "task-a",
                    "columnId": "todo",
                    "title": "Revision directiva",
                    "labels": ["revision"],
                    "taskType": "task",
                    "dueDate": tomorrow,
                    "ownerLabel": "Clara",
                    "effortPoints": 2,
                    "dependencyTaskIds": [],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 4,
                },
                {
                    "id": "task-b",
                    "columnId": "todo",
                    "title": "Publicar circular",
                    "labels": ["comunicacion"],
                    "taskType": "task",
                    "dueDate": tomorrow,
                    "ownerLabel": "Clara",
                    "effortPoints": 1,
                    "dependencyTaskIds": ["task-a"],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 5,
                },
                {
                    "id": "task-c",
                    "columnId": "done",
                    "title": "Checklist final",
                    "labels": ["checklist"],
                    "taskType": "task",
                    "dueDate": yesterday,
                    "ownerLabel": "Clara",
                    "effortPoints": 1,
                    "dependencyTaskIds": [],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 6,
                },
            ],
            organization_id=organization["id"],
            team_id=tic["id"],
            context_type="team",
            board_type="organization_project",
        ),
    )
    assert board_two.status_code == 201, board_two.text
    board_two_id = board_two.json()["id"]

    for board_id, title, status in (
        (board_one_id, "Acta de seguimiento", "draft"),
        (board_two_id, "Plan TIC pendiente", "in_review"),
    ):
        created_document = client.post(
            f"/api/v1/boards/{board_id}/documents",
            headers=auth_header(admin.id),
            json={
                "title": title,
                "kind": "note",
                "status": status,
                "content": "Documento de trabajo",
                "linked_task_ids": [],
                "tags": ["claustro"],
            },
        )
        assert created_document.status_code == 201, created_document.text

    response = client.get(
        f"/api/v1/executive/dashboard?organization_id={organization['id']}&period_days=30",
        headers=auth_header(admin.id),
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["summary"]["total_boards"] == 2
    assert payload["summary"]["total_tasks"] == 6
    assert payload["summary"]["completed_tasks"] == 1
    assert payload["summary"]["blocked_count"] == 3
    assert payload["summary"]["delayed_count"] == 2
    assert payload["summary"]["overdue_milestone_count"] == 1
    assert payload["summary"]["pending_document_count"] == 2
    assert payload["summary"]["recurrent_blocker_count"] == 1

    teams = {team["team_name"]: team for team in payload["teams"]}
    assert teams["Equipo Directivo"]["blocked_count"] == 2
    assert teams["Equipo Directivo"]["pending_document_count"] == 1
    assert teams["Comision TIC"]["completed_tasks"] == 1

    projects = {project["board_title"]: project for project in payload["projects"]}
    assert projects["Seguimiento trimestral"]["overdue_milestone_count"] == 1
    assert projects["Plan digital de centro"]["progress_percent"] == 33

    blockers = {blocker["blocker_label"]: blocker for blocker in payload["recurring_blockers"]}
    assert blockers["Revision directiva"]["blocked_task_count"] == 2
    assert blockers["Revision directiva"]["board_count"] == 2

    assert len(payload["pending_documents"]) == 2
    assert payload["overdue_milestones"][0]["title"] == "Hito trimestral"


def test_executive_dashboard_csv_export(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="executive-export-admin",
        email="executive-export@example.com",
        display_name="Executive Export",
    )

    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Centro Exporta", "plan_type": "school"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Equipo Innovacion", "team_type": "project", "visibility": "organization"},
    ).json()

    created = client.post(
        "/api/v1/boards",
        headers=auth_header(admin.id),
        json=board_payload(
            "Proyecto de innovacion",
            [
                {
                    "id": "task-1",
                    "columnId": "todo",
                    "title": "Definir piloto",
                    "labels": ["pilot"],
                    "taskType": "task",
                    "ownerLabel": "Rocio",
                    "effortPoints": 3,
                    "dependencyTaskIds": [],
                    "pictograms": [],
                    "attachments": [],
                    "createdAt": 1,
                }
            ],
            organization_id=organization["id"],
            team_id=team["id"],
            context_type="team",
            board_type="organization_project",
        ),
    )
    assert created.status_code == 201, created.text

    response = client.get(
        f"/api/v1/executive/dashboard.csv?organization_id={organization['id']}",
        headers=auth_header(admin.id),
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    assert "section,id,label,value" in response.text
    assert "project_progress" in response.text
    assert "Proyecto de innovacion" in response.text
