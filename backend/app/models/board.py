from __future__ import annotations

from sqlalchemy import JSON, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

SnapshotType = JSON().with_variant(JSONB, "postgresql")


class Board(TimestampMixin, Base):
    __tablename__ = "boards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    organization_id: Mapped[str | None] = mapped_column(String(36), index=True)
    team_id: Mapped[str | None] = mapped_column(String(36), index=True)
    context_type: Mapped[str | None] = mapped_column(String(24), index=True)
    board_type: Mapped[str | None] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    snapshot: Mapped[dict] = mapped_column(SnapshotType, nullable=False, default=dict)
    metadata_json: Mapped[dict] = mapped_column("metadata", SnapshotType, nullable=False, default=dict)
