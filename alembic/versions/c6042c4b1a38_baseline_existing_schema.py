"""baseline existing schema

Revision ID: c6042c4b1a38
Revises:
Create Date: 2026-10-03
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c6042c4b1a38"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mark the existing database schema as the initial baseline."""
    pass


def downgrade() -> None:
    """Remove the baseline revision marker."""
    pass