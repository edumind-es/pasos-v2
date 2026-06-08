from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    BoardActivityEventResponse,
    BoardInsightsResponse,
    BoardLearnerInsightResponse,
    LearnerFeedbackRequest,
    ShareActivityRequest,
    ShareActivityResponse,
    TaskEvidenceEntryDTO,
    TaskFeedbackEntryDTO,
)
from app.core.errors import ApiError
from app.models.activity import BoardActivityEvent, ShareLearnerProgress
from app.models.board import Board
from app.models.share import BoardShare
from app.models.user import User
from app.services.board_service import get_board_for_user


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def coerce_utc(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _unique_task_ids(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _serialize_evidence_entries(values: list[TaskEvidenceEntryDTO]) -> list[dict]:
    by_task: dict[str, dict] = {}
    for entry in values:
        by_task[entry.task_id] = entry.model_dump(mode="json")
    return list(by_task.values())


def _merge_evidence_entries(current: list[dict], incoming: list[TaskEvidenceEntryDTO]) -> list[dict]:
    merged: dict[str, dict] = {}
    for entry in current:
        task_id = entry.get("task_id")
        if task_id:
            merged[str(task_id)] = entry
    for entry in incoming:
        merged[entry.task_id] = entry.model_dump(mode="json")
    return list(merged.values())


def _feedback_entry_response(entry: dict) -> TaskFeedbackEntryDTO:
    return TaskFeedbackEntryDTO.model_validate(entry)


def _evidence_entry_response(entry: dict) -> TaskEvidenceEntryDTO:
    return TaskEvidenceEntryDTO.model_validate(entry)


def get_active_share_by_code(db: Session, code: str) -> BoardShare:
    share = db.scalar(select(BoardShare).where(BoardShare.code == code.upper()))
    now = utcnow()
    if not share or coerce_utc(share.revoked_at) is not None or coerce_utc(share.expires_at) <= now:
        raise ApiError(404, "share_not_found", "Share code is invalid or expired")
    if share.max_uses is not None and share.use_count >= share.max_uses:
        raise ApiError(410, "share_exhausted", "Share code is no longer available")
    return share


def record_board_activity(
    db: Session,
    *,
    board_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str | None = None,
    actor_label: str | None = None,
    share_id: str | None = None,
    metadata: dict | None = None,
    commit: bool = False,
) -> BoardActivityEvent:
    event = BoardActivityEvent(
        id=str(uuid4()),
        board_id=board_id,
        share_id=share_id,
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        actor_label=actor_label,
        metadata_json=metadata or {},
        occurred_at=utcnow(),
    )
    db.add(event)
    if commit:
        db.commit()
    return event


def _learner_insight_response(
    learner: ShareLearnerProgress,
    *,
    share_code: str | None,
    total_tasks: int,
) -> BoardLearnerInsightResponse:
    completed_count = len(learner.completed_task_ids)
    progress_percent = round((completed_count / total_tasks) * 100) if total_tasks else 0
    evidence_entries = [_evidence_entry_response(entry) for entry in learner.evidence_entries]
    feedback_entries = [_feedback_entry_response(entry) for entry in learner.feedback_entries]
    return BoardLearnerInsightResponse(
        learner_key=learner.learner_key,
        learner_label=learner.learner_label,
        share_code=share_code,
        completed_count=completed_count,
        total_tasks=total_tasks,
        progress_percent=progress_percent,
        last_event_type=learner.last_event_type,
        last_access_at=learner.last_access_at,
        help_task_count=len(learner.help_task_ids),
        evidence_count=len(evidence_entries),
        feedback_count=len(feedback_entries),
        validated_count=len(learner.validated_task_ids),
        help_task_ids=learner.help_task_ids,
        validated_task_ids=learner.validated_task_ids,
        evidence_entries=evidence_entries,
        feedback_entries=feedback_entries,
    )


def record_share_activity(
    db: Session,
    code: str,
    payload: ShareActivityRequest,
) -> ShareActivityResponse:
    share = get_active_share_by_code(db, code)
    board = db.scalar(select(Board).where(Board.id == share.board_id))
    if not board:
        raise ApiError(404, "board_not_found", "Shared board no longer exists")

    learner = db.scalar(
        select(ShareLearnerProgress).where(
            ShareLearnerProgress.share_id == share.id,
            ShareLearnerProgress.learner_key == payload.learner_key,
        )
    )
    completed_task_ids = _unique_task_ids(payload.completed_task_ids)
    help_task_ids = _unique_task_ids(payload.help_task_ids)
    total_tasks = len(board.snapshot.get("tasks", []))
    last_access_at = payload.last_access_at or utcnow()

    if learner is None:
        learner = ShareLearnerProgress(
            id=str(uuid4()),
            share_id=share.id,
            board_id=board.id,
            learner_key=payload.learner_key,
            learner_label=payload.learner_label,
            completed_task_ids=completed_task_ids,
            help_task_ids=help_task_ids,
            validated_task_ids=[],
            evidence_entries=_serialize_evidence_entries(payload.evidence_entries),
            feedback_entries=[],
            last_event_type=payload.event_type,
            started_at=last_access_at,
            last_access_at=last_access_at,
        )
        db.add(learner)
    else:
        learner.completed_task_ids = (
            completed_task_ids
            if payload.event_type != "accessed" or completed_task_ids
            else learner.completed_task_ids
        )
        learner.help_task_ids = (
            help_task_ids
            if payload.event_type != "accessed" or help_task_ids
            else learner.help_task_ids
        )
        learner.evidence_entries = (
            _merge_evidence_entries(learner.evidence_entries, payload.evidence_entries)
            if payload.event_type != "accessed" or payload.evidence_entries
            else learner.evidence_entries
        )
        learner.last_event_type = payload.event_type
        learner.last_access_at = last_access_at
        if payload.learner_label:
            learner.learner_label = payload.learner_label

        completed_task_ids = learner.completed_task_ids
        help_task_ids = learner.help_task_ids

    progress_percent = round((len(completed_task_ids) / total_tasks) * 100) if total_tasks else 0
    record_board_activity(
        db,
        board_id=board.id,
        share_id=share.id,
        event_type=payload.event_type,
        actor_type="student",
        actor_id=payload.learner_key,
        actor_label=payload.learner_label,
        metadata={
            "share_code": share.code,
            "completed_count": len(completed_task_ids),
            "total_tasks": total_tasks,
            "progress_percent": progress_percent,
            "help_task_count": len(help_task_ids),
            "evidence_count": len(learner.evidence_entries),
        },
    )
    db.commit()

    return ShareActivityResponse(
        code=share.code,
        learner_key=payload.learner_key,
        learner_label=learner.learner_label,
        completed_task_ids=completed_task_ids,
        help_task_ids=learner.help_task_ids,
        validated_task_ids=learner.validated_task_ids,
        evidence_entries=[_evidence_entry_response(entry) for entry in learner.evidence_entries],
        feedback_entries=[_feedback_entry_response(entry) for entry in learner.feedback_entries],
        progress_percent=progress_percent,
        last_access_at=last_access_at,
    )


def add_teacher_feedback(
    db: Session,
    board_id: str,
    user: User,
    payload: LearnerFeedbackRequest,
) -> BoardLearnerInsightResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "board_forbidden", "Insufficient permissions to review learner activity")

    share = get_active_share_by_code(db, payload.share_code)
    if share.board_id != board.id:
        raise ApiError(404, "share_not_found", "Share code is invalid for this board")

    learner = db.scalar(
        select(ShareLearnerProgress).where(
            ShareLearnerProgress.share_id == share.id,
            ShareLearnerProgress.learner_key == payload.learner_key,
        )
    )
    if learner is None:
        raise ApiError(404, "learner_not_found", "Learner progress not found")

    now = utcnow()
    feedback_entries = list(learner.feedback_entries)
    feedback_entries.append({
        "task_id": payload.task_id,
        "message": payload.message,
        "status": payload.status,
        "author_label": user.display_name or user.email,
        "created_at": now.isoformat(),
    })
    learner.feedback_entries = feedback_entries

    validated_task_ids = _unique_task_ids(learner.validated_task_ids)
    if payload.status == "validated":
        validated_task_ids = _unique_task_ids([*validated_task_ids, payload.task_id])
    elif payload.status == "needs_revision":
        validated_task_ids = [task_id for task_id in validated_task_ids if task_id != payload.task_id]
    learner.validated_task_ids = validated_task_ids

    if payload.resolve_help_request:
        learner.help_task_ids = [task_id for task_id in learner.help_task_ids if task_id != payload.task_id]

    learner.last_event_type = "teacher_feedback_added"
    record_board_activity(
        db,
        board_id=board.id,
        share_id=share.id,
        event_type="teacher_feedback_added" if payload.status != "validated" else "task_validated",
        actor_type="teacher",
        actor_id=user.id,
        actor_label=user.display_name or user.email,
        metadata={
            "share_code": share.code,
            "learner_key": learner.learner_key,
            "task_id": payload.task_id,
            "status": payload.status,
        },
    )
    db.commit()
    db.refresh(learner)
    total_tasks = len(board.snapshot.get("tasks", []))
    return _learner_insight_response(learner, share_code=share.code, total_tasks=total_tasks)


def get_board_insights(db: Session, board_id: str, user: User) -> BoardInsightsResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "board_forbidden", "Insufficient permissions to inspect board activity")

    shares = db.scalars(
        select(BoardShare)
        .where(BoardShare.board_id == board.id)
        .order_by(desc(BoardShare.created_at))
    ).all()
    learners = db.scalars(
        select(ShareLearnerProgress)
        .where(ShareLearnerProgress.board_id == board.id)
        .order_by(desc(ShareLearnerProgress.last_access_at))
    ).all()
    events = db.scalars(
        select(BoardActivityEvent)
        .where(BoardActivityEvent.board_id == board.id)
        .order_by(desc(BoardActivityEvent.occurred_at))
        .limit(12)
    ).all()

    total_tasks = len(board.snapshot.get("tasks", []))
    learner_responses: list[BoardLearnerInsightResponse] = []
    completed_learners = 0

    for learner in learners:
        completed_count = len(learner.completed_task_ids)
        if total_tasks > 0 and completed_count >= total_tasks:
            completed_learners += 1
        share = next((item for item in shares if item.id == learner.share_id), None)
        learner_responses.append(_learner_insight_response(learner, share_code=share.code if share else None, total_tasks=total_tasks))

    recent_events = [
        BoardActivityEventResponse(
            id=event.id,
            event_type=event.event_type,
            actor_type=event.actor_type,
            actor_id=event.actor_id,
            actor_label=event.actor_label,
            metadata=event.metadata_json,
            occurred_at=event.occurred_at,
        )
        for event in events
    ]

    return BoardInsightsResponse(
        board_id=board.id,
        board_title=board.title,
        total_tasks=total_tasks,
        active_share_count=len([share for share in shares if share.revoked_at is None]),
        share_access_count=sum(share.use_count for share in shares),
        learner_count=len(learner_responses),
        completed_learners=completed_learners,
        learners=learner_responses,
        recent_events=recent_events,
    )


def purge_old_activity_events(db: Session, *, days: int = 90) -> int:
    """Elimina eventos de actividad con más de `days` días. Retorna el número de filas eliminadas."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = db.execute(
        delete(BoardActivityEvent).where(BoardActivityEvent.occurred_at < cutoff)
    )
    db.commit()
    return result.rowcount


def count_activity_events(db: Session) -> int:
    """Cuenta el total de eventos de actividad en la base de datos."""
    return db.scalar(select(func.count()).select_from(BoardActivityEvent)) or 0
