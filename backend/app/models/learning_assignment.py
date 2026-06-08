from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.board import SnapshotType


class LearningAssignment(TimestampMixin, Base):
    __tablename__ = "learning_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    creator_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    organization_id: Mapped[str | None] = mapped_column(String(36), index=True)
    team_id: Mapped[str | None] = mapped_column(String(36), index=True)
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    target_label: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    target_key: Mapped[str | None] = mapped_column(String(120), index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", SnapshotType, nullable=False, default=dict)
