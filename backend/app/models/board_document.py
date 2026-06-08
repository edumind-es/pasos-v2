from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.board import SnapshotType


class BoardDocument(TimestampMixin, Base):
    __tablename__ = "board_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_label: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False, default="note", index=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft", index=True)
    description: Mapped[str | None] = mapped_column(String(2000))
    url: Mapped[str | None] = mapped_column(String(4096))
    content: Mapped[str | None] = mapped_column(Text())
    linked_task_ids_json: Mapped[list[str]] = mapped_column("linked_task_ids", SnapshotType, nullable=False, default=list)
    tags_json: Mapped[list[str]] = mapped_column("tags", SnapshotType, nullable=False, default=list)
    metadata_json: Mapped[dict] = mapped_column("metadata", SnapshotType, nullable=False, default=dict)
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
