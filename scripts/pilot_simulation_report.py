#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.core.db import get_db_session  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


def make_session_factory(database_url: str):
    engine = create_engine(database_url, future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


def main() -> int:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_dir = REPO_ROOT / ".build" / "audit" / f"pilot-simulation-{timestamp}"
    output_dir.mkdir(parents=True, exist_ok=True)

    os.environ["PASOS_PUBLIC_BASE_URL"] = "https://pilot.local"
    get_settings.cache_clear()

    with tempfile.TemporaryDirectory(prefix="pasos-pilot-") as tmp_dir:
        db_path = Path(tmp_dir) / "pilot-simulation.db"
        engine, session_factory = make_session_factory(f"sqlite+pysqlite:///{db_path}")
        Base.metadata.create_all(engine)
        session = session_factory()

        def override_db():
            yield session

        app.dependency_overrides[get_db_session] = override_db

        try:
            with TestClient(app) as client:
                yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
                tomorrow = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

                health = client.get("/api/v1/health")
                register = client.post(
                    "/api/v1/auth/register",
                    json={
                        "email": f"pilot.{timestamp}@example.com",
                        "display_name": "Pilot Director",
                        "password": "SeguraPilot123",
                    },
                )
                token = register.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}

                organization = client.post(
                    "/api/v1/organizations",
                    headers=headers,
                    json={"name": "Centro Piloto Simulado", "plan_type": "school"},
                )
                organization_id = organization.json()["id"]

                team = client.post(
                    f"/api/v1/organizations/{organization_id}/teams",
                    headers=headers,
                    json={"name": "Equipo Motor", "team_type": "project", "visibility": "organization"},
                )
                team_id = team.json()["id"]

                board = client.post(
                    "/api/v1/boards",
                    headers=headers,
                    json={
                        "title": "Piloto institucional",
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
                                    "title": "Preparar documento marco",
                                    "taskType": "document",
                                    "labels": ["claustro"],
                                    "startDate": yesterday,
                                    "dueDate": yesterday,
                                    "ownerLabel": "Jefatura",
                                    "effortPoints": 3,
                                    "dependencyTaskIds": [],
                                    "pictograms": [],
                                    "attachments": [],
                                    "createdAt": 1,
                                },
                                {
                                    "id": "task-2",
                                    "columnId": "review",
                                    "title": "Revisar progreso de grupo",
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
                                    "title": "Hito de consejo escolar",
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
                personal_board_id = personal_board.json()["id"]

                assignment = client.post(
                    f"/api/v1/boards/{board_id}/assignments",
                    headers=headers,
                    json={
                        "target_type": "group",
                        "target_label": "Grupo Piloto 5A",
                        "target_key": "grupo-5a",
                        "due_date": tomorrow,
                        "notes": "Seguimiento de aula piloto",
                    },
                )

                document = client.post(
                    f"/api/v1/boards/{board_id}/documents",
                    headers=headers,
                    json={
                        "title": "Acta de seguimiento",
                        "kind": "note",
                        "status": "in_review",
                        "content": "Pendiente de validacion del equipo directivo.",
                        "linked_task_ids": ["task-1"],
                        "tags": ["piloto", "seguimiento"],
                    },
                )

                share = client.post(
                    f"/api/v1/boards/{personal_board_id}/share",
                    headers=headers,
                    json={"permission": "viewer", "ttl_hours": 24, "allow_anonymous": True},
                )
                share_code = share.json()["code"]

                activity = client.post(
                    f"/api/v1/share/{share_code}/activity",
                    json={
                        "learner_key": "pilot-student",
                        "learner_label": "Alumno piloto",
                        "event_type": "progress_updated",
                        "completed_task_ids": ["personal-task-1"],
                        "help_task_ids": ["personal-task-2"],
                        "evidence_entries": [
                            {
                                "task_id": "personal-task-1",
                                "note": "Evidencia de simulacion para el piloto.",
                                "submitted_at": datetime.now(timezone.utc).isoformat(),
                            }
                        ],
                        "last_access_at": datetime.now(timezone.utc).isoformat(),
                    },
                )

                insights = client.get(f"/api/v1/boards/{personal_board_id}/insights", headers=headers)
                executive = client.get(
                    f"/api/v1/executive/dashboard?organization_id={organization_id}&period_days=30",
                    headers=headers,
                )
                executive_csv = client.get(
                    f"/api/v1/executive/dashboard.csv?organization_id={organization_id}&period_days=30",
                    headers=headers,
                )

                report = {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "scenario": "pilot_controlled_center_simulation",
                    "status_codes": {
                        "health": health.status_code,
                        "register": register.status_code,
                        "organization": organization.status_code,
                        "team": team.status_code,
                        "board": board.status_code,
                        "assignment": assignment.status_code,
                        "document": document.status_code,
                        "share": share.status_code,
                        "activity": activity.status_code,
                        "insights": insights.status_code,
                        "executive": executive.status_code,
                        "executive_csv": executive_csv.status_code,
                    },
                    "entities": {
                        "organization_id": organization_id,
                        "team_id": team_id,
                        "board_id": board_id,
                        "personal_board_id": personal_board_id,
                        "share_code": share_code,
                    },
                    "executive_summary": executive.json()["summary"],
                    "learner_summary": {
                        "learner_count": insights.json()["learner_count"],
                        "completed_learners": insights.json()["completed_learners"],
                        "recent_events": len(insights.json()["recent_events"]),
                    },
                    "artifacts": {
                        "dashboard_json": str(output_dir / "executive_dashboard.json"),
                        "dashboard_csv": str(output_dir / "executive_dashboard.csv"),
                    },
                }

                write_json(output_dir / "pilot_simulation_report.json", report)
                write_json(output_dir / "executive_dashboard.json", executive.json())
                (output_dir / "executive_dashboard.csv").write_text(executive_csv.text, encoding="utf-8")

                print(json.dumps(report, indent=2, ensure_ascii=True))
        finally:
            app.dependency_overrides.clear()
            session.close()
            Base.metadata.drop_all(engine)
            engine.dispose()
            get_settings.cache_clear()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
