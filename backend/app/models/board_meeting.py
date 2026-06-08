from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.board import SnapshotType


class BoardMeeting(TimestampMixin, Base):
    __tablename__ = "board_meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_label: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(5000))
    decisions_json: Mapped[list[str]] = mapped_column("decisions", SnapshotType, nullable=False, default=list)
    linked_task_ids_json: Mapped[list[str]] = mapped_column("linked_task_ids", SnapshotType, nullable=False, default=list)
