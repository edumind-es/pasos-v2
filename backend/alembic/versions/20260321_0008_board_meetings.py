"""add board meetings

Revision ID: 20260321_0008
Revises: 20260321_0007
Create Date: 2026-03-21 02:40:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0008"
down_revision = "20260321_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "board_meetings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(length=32), nullable=False),
        sa.Column("author_label", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("summary", sa.String(length=5000), nullable=True),
        sa.Column("decisions", sa.JSON(), nullable=False),
        sa.Column("linked_task_ids", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_board_meetings_board_id", "board_meetings", ["board_id"], unique=False)
    op.create_index("ix_board_meetings_author_id", "board_meetings", ["author_id"], unique=False)


def downgrade() -> None:
    op.drop_table("board_meetings")
