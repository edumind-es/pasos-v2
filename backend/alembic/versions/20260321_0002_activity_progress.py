"""add board activity and learner progress tables

Revision ID: 20260321_0002
Revises: 20260302_0001
Create Date: 2026-03-21 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0002"
down_revision = "20260302_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "board_activity_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("share_id", sa.String(length=36), sa.ForeignKey("board_shares.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(length=48), nullable=False),
        sa.Column("actor_type", sa.String(length=24), nullable=False),
        sa.Column("actor_id", sa.String(length=128), nullable=True),
        sa.Column("actor_label", sa.String(length=120), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_board_activity_events_board_id", "board_activity_events", ["board_id"], unique=False)
    op.create_index("ix_board_activity_events_share_id", "board_activity_events", ["share_id"], unique=False)
    op.create_index("ix_board_activity_events_event_type", "board_activity_events", ["event_type"], unique=False)

    op.create_table(
        "share_learner_progress",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("share_id", sa.String(length=36), sa.ForeignKey("board_shares.id", ondelete="CASCADE"), nullable=False),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("learner_key", sa.String(length=128), nullable=False),
        sa.Column("learner_label", sa.String(length=120), nullable=True),
        sa.Column("completed_task_ids", sa.JSON(), nullable=False),
        sa.Column("last_event_type", sa.String(length=48), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_access_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_share_learner_progress_share_id", "share_learner_progress", ["share_id"], unique=False)
    op.create_index("ix_share_learner_progress_board_id", "share_learner_progress", ["board_id"], unique=False)
    op.create_index("ix_share_learner_progress_learner_key", "share_learner_progress", ["learner_key"], unique=False)


def downgrade() -> None:
    op.drop_table("share_learner_progress")
    op.drop_table("board_activity_events")
