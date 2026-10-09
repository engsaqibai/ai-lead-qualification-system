"""Create the initial leads schema."""

from alembic import op
import sqlalchemy as sa

revision = "a8c1d2e3f4a5"
down_revision = "c6042c4b1a38"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(255), nullable=False),
        sa.Column("job_title", sa.String(255), nullable=False),
        sa.Column("company_size", sa.Integer(), nullable=False),
        sa.Column("annual_revenue", sa.Float(), nullable=True),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("desired_outcome", sa.Text(), nullable=False),
        sa.Column("timeline", sa.String(255), nullable=True),
        sa.Column("budget", sa.Float(), nullable=True),
        sa.Column("decision_role", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("fit_score", sa.Integer(), nullable=False),
        sa.Column("readiness_score", sa.Integer(), nullable=False),
        sa.Column("intent_score", sa.Integer(), nullable=False),
        sa.Column("reasons", sa.Text(), nullable=False),
        sa.Column("missing_information", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leads_id", "leads", ["id"], unique=False)


def downgrade():
    op.drop_index("ix_leads_id", table_name="leads")
    op.drop_table("leads")
