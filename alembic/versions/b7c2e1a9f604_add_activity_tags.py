"""Persist tags on lead activities."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c2e1a9f604"
down_revision: Union[str, Sequence[str], None] = "9cd6bdc0e901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_activities",
        sa.Column(
            "tags",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.alter_column("lead_activities", "tags", server_default=None)


def downgrade() -> None:
    op.drop_column("lead_activities", "tags")
