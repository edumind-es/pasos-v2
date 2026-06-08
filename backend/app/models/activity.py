from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.board import SnapshotType


class BoardActivityEvent(TimestampMixin, Base):
    __tablename__ = "board_activity_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    share_id: Mapped[str | None] = mapped_column(
        ForeignKey("board_shares.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(24), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(128))
    actor_label: Mapped[str | None] = mapped_column(String(120))
    metadata_json: Mapped[dict] = mapped_column("metadata", SnapshotType, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ShareLearnerProgress(TimestampMixin, Base):
    __tablename__ = "share_learner_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    share_id: Mapped[str] = mapped_column(ForeignKey("board_shares.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    learner_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    learner_label: Mapped[str | None] = mapped_column(String(120))
    completed_task_ids: Mapped[list[str]] = mapped_column(SnapshotType, nullable=False, default=list)
    help_task_ids: Mapped[list[str]] = mapped_column(SnapshotType, nullable=False, default=list)
    validated_task_ids: Mapped[list[str]] = mapped_column(SnapshotType, nullable=False, default=list)
    evidence_entries: Mapped[list[dict]] = mapped_column(SnapshotType, nullable=False, default=list)
    feedback_entries: Mapped[list[dict]] = mapped_column(SnapshotType, nullable=False, default=list)
    last_event_type: Mapped[str | None] = mapped_column(String(48))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_access_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
