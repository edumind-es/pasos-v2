from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.main import app


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_headers(client: TestClient) -> dict[str, str]:
    email = f"pilot.{datetime.now(timezone.utc).timestamp()}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "display_name": "Pilot Center Admin",
            "password": "SeguraPilot123",
        },
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_pilot_center_flow_covers_core_modules(client: TestClient) -> None:
    headers = auth_headers(client)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    organization = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={"name": "Centro Piloto", "plan_type": "school"},
    )
    assert organization.status_code == 201, organization.text
    organization_id = organization.json()["id"]

    team = client.post(
        f"/api/v1/organizations/{organization_id}/teams",
        headers=headers,
        json={"name": "Equipo de Innovacion", "team_type": "project", "visibility": "organization"},
    )
    assert team.status_code == 201, team.text
    team_id = team.json()["id"]

    board = client.post(
        "/api/v1/boards",
        headers=headers,
        json={
            "title": "Piloto de acompanamiento",
            "organization_id": organization_id,
            "team_id": team_id,
            "context_type": "team",
            "board_type": "organization_project",
            "snapshot": {
                "columns": [
                    {"id": "todo", "title": "Por hacer", "order": 0},
                    {"id": "review", "title": "Listo para revisar", "order": 1},
                    {"id": "done", "title": "Hecho", "order": 2},
                ],
                "tasks": [
                    {
                        "id": "task-1",
                        "columnId": "todo",
                        "title": "Diseñar plantilla de seguimiento",
                        "taskType": "document",
                        "labels": ["claustro"],
                        "startDate": yesterday,
                        "dueDate": yesterday,
                        "ownerLabel": "Coordinacion",
                        "effortPoints": 3,
                        "dependencyTaskIds": [],
                        "pictograms": [],
                        "attachments": [],
                        "createdAt": 1,
                    },
                    {
                        "id": "task-2",
                        "columnId": "review",
                        "title": "Revisar evidencias del alumnado",
                        "taskType": "learning_step",
                        "labels": ["aula"],
                        "startDate": yesterday,
                        "dueDate": tomorrow,
                        "ownerLabel": "Tutorias",
                        "effortPoints": 5,
                        "dependencyTaskIds": ["task-1"],
                        "pictograms": [],
                        "attachments": [],
                        "createdAt": 2,
                    },
                    {
                        "id": "task-3",
                        "columnId": "todo",
                        "title": "Hito de claustro",
                        "taskType": "milestone",
                        "labels": ["hito"],
                        "dueDate": yesterday,
                        "ownerLabel": "Direccion",
                        "effortPoints": 2,
                        "dependencyTaskIds": ["task-2"],
                        "pictograms": [],
                        "attachments": [],
                        "createdAt": 3,
                    },
                ],
            },
        },
    )
    assert board.status_code == 201, board.text
    board_id = board.json()["id"]

    personal_board = client.post(
        "/api/v1/boards",
        headers=headers,
        json={
            "title": "Secuencia piloto de aula",
            "snapshot": {
                "columns": [
                    {"id": "todo", "title": "Por hacer", "order": 0},
                    {"id": "done", "title": "Hecho", "order": 1},
                ],
                "tasks": [
                    {
                        "id": "personal-task-1",
                        "columnId": "todo",
                        "title": "Paso de aula",
                        "taskType": "learning_step",
                        "labels": ["aula"],
                        "dueDate": tomorrow,
                        "ownerLabel": "Tutorias",
                        "effortPoints": 1,
                        "dependencyTaskIds": [],
                        "pictograms": [],
                        "attachments": [],
                        "createdAt": 10,
                    },
                    {
                        "id": "personal-task-2",
                        "columnId": "todo",
                        "title": "Evidencia final",
                        "taskType": "evidence",
                        "labels": ["evidencia"],
                        "dueDate": tomorrow,
                        "ownerLabel": "Tutorias",
                        "effortPoints": 1,
                        "dependencyTaskIds": [],
                        "pictograms": [],
                        "attachments": [],
                        "createdAt": 11,
                    },
                ],
            },
        },
    )
    assert personal_board.status_code == 201, personal_board.text
    personal_board_id = personal_board.json()["id"]

    assignment = client.post(
        f"/api/v1/boards/{board_id}/assignments",
        headers=headers,
        json={
            "target_type": "group",
            "target_label": "Grupo 5A",
            "target_key": "5a",
            "due_date": tomorrow,
            "notes": "Pilotar con el grupo de referencia",
        },
    )
    assert assignment.status_code == 201, assignment.text

    document = client.post(
        f"/api/v1/boards/{board_id}/documents",
        headers=headers,
        json={
            "title": "Acta de seguimiento piloto",
            "kind": "note",
            "status": "in_review",
            "content": "Pendiente de validacion por jefatura de estudios.",
            "linked_task_ids": ["task-1"],
            "tags": ["piloto", "seguimiento"],
        },
    )
    assert document.status_code == 201, document.text

    share = client.post(
        f"/api/v1/boards/{personal_board_id}/share",
        headers=headers,
        json={"permission": "viewer", "ttl_hours": 24, "allow_anonymous": True},
    )
    assert share.status_code == 200, share.text
    share_code = share.json()["code"]

    activity = client.post(
        f"/api/v1/share/{share_code}/activity",
        json={
            "learner_key": "pilot-learner",
            "learner_label": "Alumno piloto",
            "event_type": "progress_updated",
            "completed_task_ids": ["personal-task-1"],
            "help_task_ids": ["personal-task-2"],
            "evidence_entries": [
                {
                    "task_id": "personal-task-1",
                    "note": "Se adjunta evidencia piloto.",
                    "submitted_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "last_access_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert activity.status_code == 200, activity.text

    executive = client.get(
        f"/api/v1/executive/dashboard?organization_id={organization_id}&period_days=30",
        headers=headers,
    )
    assert executive.status_code == 200, executive.text
    payload = executive.json()

    assert payload["summary"]["total_boards"] == 1
    assert payload["summary"]["pending_document_count"] == 1
    assert payload["summary"]["overdue_milestone_count"] == 1
    assert payload["projects"][0]["board_title"] == "Piloto de acompanamiento"

    dashboard_csv = client.get(
        f"/api/v1/executive/dashboard.csv?organization_id={organization_id}&period_days=30",
        headers=headers,
    )
    assert dashboard_csv.status_code == 200, dashboard_csv.text
    assert "pending_document" in dashboard_csv.text

    insights = client.get(
        f"/api/v1/boards/{personal_board_id}/insights",
        headers=headers,
    )
    assert insights.status_code == 200, insights.text
    insights_payload = insights.json()
    assert insights_payload["learner_count"] == 1
    assert insights_payload["learners"][0]["progress_percent"] >= 33
