"""Record the kind of lead activity, including automated system events."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e6f8a1c2b3"
down_revision: Union[str, Sequence[str], None] = "c9f45a7b2d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_activities",
        sa.Column(
            "activity_kind",
            sa.String(length=30),
            nullable=False,
            server_default="activity",
        ),
    )


def downgrade() -> None:
    op.drop_column("lead_activities", "activity_kind")
