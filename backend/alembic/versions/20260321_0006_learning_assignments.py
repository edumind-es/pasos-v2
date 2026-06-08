"""add learning assignments

Revision ID: 20260321_0006
Revises: 20260321_0005
Create Date: 2026-03-21 01:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0006"
down_revision = "20260321_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_assignments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("creator_id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("team_id", sa.String(length=36), nullable=True),
        sa.Column("target_type", sa.String(length=16), nullable=False),
        sa.Column("target_label", sa.String(length=160), nullable=False),
        sa.Column("target_key", sa.String(length=120), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_learning_assignments_board_id", "learning_assignments", ["board_id"], unique=False)
    op.create_index("ix_learning_assignments_creator_id", "learning_assignments", ["creator_id"], unique=False)
    op.create_index("ix_learning_assignments_organization_id", "learning_assignments", ["organization_id"], unique=False)
    op.create_index("ix_learning_assignments_team_id", "learning_assignments", ["team_id"], unique=False)
    op.create_index("ix_learning_assignments_target_label", "learning_assignments", ["target_label"], unique=False)
    op.create_index("ix_learning_assignments_target_key", "learning_assignments", ["target_key"], unique=False)
    op.create_index("ix_learning_assignments_status", "learning_assignments", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("learning_assignments")
