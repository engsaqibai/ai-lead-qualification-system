"""Track when a lead activity actually occurred."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9f45a7b2d10"
down_revision: Union[str, Sequence[str], None] = "b7c2e1a9f604"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_activities",
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE lead_activities SET occurred_at = created_at "
            "WHERE occurred_at IS NULL"
        )
    )
    op.alter_column("lead_activities", "occurred_at", nullable=False)


def downgrade() -> None:
    op.drop_column("lead_activities", "occurred_at")
