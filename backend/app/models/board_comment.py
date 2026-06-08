from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.board import SnapshotType


class BoardComment(TimestampMixin, Base):
    __tablename__ = "board_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_label: Mapped[str | None] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    mentions_json: Mapped[list[str]] = mapped_column("mentions", SnapshotType, nullable=False, default=list)
