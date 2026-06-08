from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.activity_service import count_activity_events, purge_old_activity_events

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/activity-events/stats")
def activity_event_stats(
    db: DbSession,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, int]:
    """Devuelve el total de eventos de actividad almacenados."""
    return {"total_activity_events": count_activity_events(db)}


@router.delete("/activity-events/purge")
def purge_activity_events(
    db: DbSession,
    _current_user: Annotated[User, Depends(get_current_user)],
    days: int = 90,
) -> dict[str, int | str]:
    """Elimina eventos de actividad con más de `days` días (defecto: 90). Requiere autenticación."""
    if days < 30:
        days = 30
    deleted = purge_old_activity_events(db, days=days)
    return {"deleted_rows": deleted, "retention_days": days}
