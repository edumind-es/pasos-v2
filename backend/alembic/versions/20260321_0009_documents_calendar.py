"""add board documents and calendar feeds

Revision ID: 20260321_0009
Revises: 20260321_0008
Create Date: 2026-03-21 20:25:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260321_0009"
down_revision = "20260321_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "board_documents",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(length=32), nullable=False),
        sa.Column("author_label", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("url", sa.String(length=4096), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("linked_task_ids", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("current_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_board_documents_board_id", "board_documents", ["board_id"], unique=False)
    op.create_index("ix_board_documents_author_id", "board_documents", ["author_id"], unique=False)
    op.create_index("ix_board_documents_kind", "board_documents", ["kind"], unique=False)
    op.create_index("ix_board_documents_status", "board_documents", ["status"], unique=False)

    op.create_table(
        "board_document_versions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("document_id", sa.String(length=36), sa.ForeignKey("board_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("board_id", sa.String(length=36), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(length=32), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("url", sa.String(length=4096), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("linked_task_ids", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_board_document_versions_document_id", "board_document_versions", ["document_id"], unique=False)
    op.create_index("ix_board_document_versions_board_id", "board_document_versions", ["board_id"], unique=False)
    op.create_index("ix_board_document_versions_author_id", "board_document_versions", ["author_id"], unique=False)

    op.create_table(
        "calendar_feeds",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("team_id", sa.String(length=36), nullable=True),
        sa.Column("scope_type", sa.String(length=24), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("token", sa.String(length=80), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_calendar_feeds_owner_id", "calendar_feeds", ["owner_id"], unique=False)
    op.create_index("ix_calendar_feeds_organization_id", "calendar_feeds", ["organization_id"], unique=False)
    op.create_index("ix_calendar_feeds_team_id", "calendar_feeds", ["team_id"], unique=False)
    op.create_index("ix_calendar_feeds_scope_type", "calendar_feeds", ["scope_type"], unique=False)
    op.create_index("ix_calendar_feeds_token", "calendar_feeds", ["token"], unique=True)


def downgrade() -> None:
    op.drop_table("calendar_feeds")
    op.drop_table("board_document_versions")
    op.drop_table("board_documents")
