"""add learner support fields to share progress

Revision ID: 20260321_0005
Revises: 20260321_0004
Create Date: 2026-03-21 00:30:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0005"
down_revision = "20260321_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "share_learner_progress",
        sa.Column("help_task_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "share_learner_progress",
        sa.Column("validated_task_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "share_learner_progress",
        sa.Column("evidence_entries", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "share_learner_progress",
        sa.Column("feedback_entries", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    op.drop_column("share_learner_progress", "feedback_entries")
    op.drop_column("share_learner_progress", "evidence_entries")
    op.drop_column("share_learner_progress", "validated_task_ids")
    op.drop_column("share_learner_progress", "help_task_ids")
