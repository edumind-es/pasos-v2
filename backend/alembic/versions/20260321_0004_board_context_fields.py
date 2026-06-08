"""add board context fields

Revision ID: 20260321_0004
Revises: 20260321_0003
Create Date: 2026-03-21 01:10:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0004"
down_revision = "20260321_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("boards", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.add_column("boards", sa.Column("team_id", sa.String(length=36), nullable=True))
    op.add_column("boards", sa.Column("context_type", sa.String(length=24), nullable=True))
    op.add_column("boards", sa.Column("board_type", sa.String(length=32), nullable=True))
    op.create_index("ix_boards_organization_id", "boards", ["organization_id"], unique=False)
    op.create_index("ix_boards_team_id", "boards", ["team_id"], unique=False)
    op.create_index("ix_boards_context_type", "boards", ["context_type"], unique=False)
    op.create_index("ix_boards_board_type", "boards", ["board_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_boards_board_type", table_name="boards")
    op.drop_index("ix_boards_context_type", table_name="boards")
    op.drop_index("ix_boards_team_id", table_name="boards")
    op.drop_index("ix_boards_organization_id", table_name="boards")
    op.drop_column("boards", "board_type")
    op.drop_column("boards", "context_type")
    op.drop_column("boards", "team_id")
    op.drop_column("boards", "organization_id")
