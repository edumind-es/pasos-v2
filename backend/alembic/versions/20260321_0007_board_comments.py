"""add board comments

Revision ID: 20260321_0007
Revises: 20260321_0006
Create Date: 2026-03-21 01:20:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0007"
down_revision = "20260321_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "board_comments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(length=32), nullable=False),
        sa.Column("author_label", sa.String(length=120), nullable=True),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("mentions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_board_comments_board_id", "board_comments", ["board_id"], unique=False)
    op.create_index("ix_board_comments_author_id", "board_comments", ["author_id"], unique=False)


def downgrade() -> None:
    op.drop_table("board_comments")
