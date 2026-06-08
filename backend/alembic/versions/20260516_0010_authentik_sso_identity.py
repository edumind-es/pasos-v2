"""add authentik sso identity fields

Revision ID: 20260516_0010
Revises: 20260321_0009
Create Date: 2026-05-16 10:15:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260516_0010"
down_revision = "20260321_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(length=32), nullable=False, server_default="local"),
    )
    op.add_column("users", sa.Column("oidc_subject", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_auth_provider", "users", ["auth_provider"], unique=False)
    op.create_index("ix_users_oidc_subject", "users", ["oidc_subject"], unique=True)
    op.alter_column("users", "auth_provider", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_users_oidc_subject", table_name="users")
    op.drop_index("ix_users_auth_provider", table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "oidc_subject")
    op.drop_column("users", "auth_provider")
