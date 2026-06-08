from __future__ import annotations

import csv
import io

from app.api.v1.dtos import ExecutiveDashboardResponse


def export_executive_dashboard_csv(payload: ExecutiveDashboardResponse) -> str:
    """Serializa el dashboard ejecutivo a CSV plano con secciones etiquetadas."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["section", "id", "label", "value", "extra_1", "extra_2", "extra_3", "extra_4"])

    summary = payload.summary
    for row_id, label, value in [
        ("total_boards", "Tableros", summary.total_boards),
        ("total_tasks", "Tareas", summary.total_tasks),
        ("completed_tasks", "Tareas completadas", summary.completed_tasks),
        ("progress_percent", "Avance global", f"{summary.progress_percent}%"),
        ("blocked_count", "Bloqueadas", summary.blocked_count),
        ("delayed_count", "Retrasadas", summary.delayed_count),
        ("overdue_milestone_count", "Hitos vencidos", summary.overdue_milestone_count),
        ("pending_document_count", "Documentos pendientes", summary.pending_document_count),
        ("recurrent_blocker_count", "Bloqueos recurrentes", summary.recurrent_blocker_count),
    ]:
        writer.writerow(["summary", row_id, label, value, "", "", "", ""])

    for team in payload.teams:
        writer.writerow([
            "team_metric", team.team_id or "organization", team.team_name,
            f"{team.progress_percent}%", team.board_count,
            team.blocked_count, team.delayed_count, team.pending_document_count,
        ])

    for owner in payload.owners:
        writer.writerow([
            "owner_metric", owner.owner_label, owner.owner_label,
            owner.task_count, owner.effort_points,
            owner.blocked_count, owner.delayed_count, owner.board_count,
        ])

    for project in payload.projects:
        writer.writerow([
            "project_progress", project.board_id, project.board_title,
            f"{project.progress_percent}%", project.team_name or "",
            project.blocked_count, project.delayed_count, project.pending_document_count,
        ])

    for blocker in payload.recurring_blockers:
        writer.writerow([
            "recurring_blocker", blocker.blocker_label, blocker.blocker_label,
            blocker.blocked_task_count, blocker.board_count,
            " | ".join(blocker.board_titles), " | ".join(blocker.owner_labels), "",
        ])

    for document in payload.pending_documents:
        writer.writerow([
            "pending_document", document.document_id, document.title,
            document.status, document.board_title,
            document.team_name or "", document.author_label or "", document.age_days,
        ])

    for milestone in payload.overdue_milestones:
        writer.writerow([
            "overdue_milestone", milestone.task_id, milestone.title,
            milestone.delayed_days, milestone.board_title,
            milestone.team_name or "", milestone.owner_label or "",
            milestone.due_at.isoformat(),
        ])

    return buffer.getvalue()
