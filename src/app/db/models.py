from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.app.db.database import Base


class LeadModel(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(320))
    company: Mapped[str] = mapped_column(String(255))
    industry: Mapped[str] = mapped_column(String(255))
    job_title: Mapped[str] = mapped_column(String(255))

    company_size: Mapped[int] = mapped_column(Integer)
    annual_revenue: Mapped[float | None] = mapped_column(Float, nullable=True)

    problem: Mapped[str] = mapped_column(Text)
    desired_outcome: Mapped[str] = mapped_column(Text)
    timeline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)

    decision_role: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(50))
    score: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[int] = mapped_column(Integer)

    fit_score: Mapped[int] = mapped_column(Integer)
    readiness_score: Mapped[int] = mapped_column(Integer)
    intent_score: Mapped[int] = mapped_column(Integer)

    reasons: Mapped[str] = mapped_column(Text)
    missing_information: Mapped[str] = mapped_column(Text)
    recommended_action: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    reviewed: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

class LeadActivityModel(Base):
    __tablename__ = "lead_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    lead_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    activity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    outcome: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )