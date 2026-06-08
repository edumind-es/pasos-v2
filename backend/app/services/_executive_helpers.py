"""Helpers internos para el dashboard ejecutivo — no importar fuera de services/."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.api.v1.dtos import ExecutiveSummaryResponse, TimelineItemResponse

_COMPLETED_COLUMN_TOKENS = (
    "terminado", "hecho", "validado", "publicado", "cerrado", "done", "complete",
)
_PENDING_DOCUMENT_STATUSES = {"draft", "in_review"}


def empty_executive_summary() -> ExecutiveSummaryResponse:
    return ExecutiveSummaryResponse(
        total_boards=0,
        total_tasks=0,
        completed_tasks=0,
        progress_percent=0,
        blocked_count=0,
        delayed_count=0,
        overdue_milestone_count=0,
        pending_document_count=0,
        recurrent_blocker_count=0,
    )


@dataclass
class TeamAccumulator:
    team_id: str | None
    team_name: str
    board_ids: set[str] = field(default_factory=set)
    total_tasks: int = 0
    completed_tasks: int = 0
    blocked_count: int = 0
    delayed_count: int = 0
    overdue_milestone_count: int = 0
    pending_document_count: int = 0


@dataclass
class OwnerAccumulator:
    owner_label: str
    board_ids: set[str] = field(default_factory=set)
    task_count: int = 0
    effort_points: int = 0
    blocked_count: int = 0
    delayed_count: int = 0


def normalize_label(value: str | None) -> str:
    return (value or "").strip()


def normalize_key(value: str | None) -> str:
    return normalize_label(value).casefold()


def progress_percent(completed: int, total: int) -> int:
    if total <= 0:
        return 0
    return round((completed / total) * 100)


def team_label(team_name: str | None, context_type: str | None) -> str:
    if team_name:
        return team_name
    if context_type == "organization":
        return "Centro / claustro"
    return "Espacio personal"


def is_completed(column_title: str | None, pedagogical_status: str | None) -> bool:
    normalized = (column_title or "").strip().lower()
    if any(token in normalized for token in _COMPLETED_COLUMN_TOKENS):
        return True
    return pedagogical_status == "validated"


def matches_owner(owner_label: str | None, owner_filter: str | None) -> bool:
    if not owner_filter:
        return True
    return normalize_key(owner_label) == normalize_key(owner_filter)


def within_alert_window(item: TimelineItemResponse, window_start: datetime) -> bool:
    if item.end_at is None:
        return True
    end_at = item.end_at if item.end_at.tzinfo else item.end_at.replace(tzinfo=timezone.utc)
    return end_at >= window_start
