from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query

from sqlalchemy.orm import Session

from src.app.config import settings
from src.app.db.database import get_db
from src.app.db.models import LeadActivityModel, LeadModel
from src.app.schemas import (
    Lead,
    LeadActivityCreate,
    LeadActivityResponse,
    LeadResponse,
    QualificationConfig,
    QualificationResult,
)

from src.app.services.qualification import qualify_lead
from src.app.services.lead_mapper import lead_to_response


app = FastAPI(title=settings.app_name)


qualification_config = QualificationConfig(
    target_industries=["Software", "SaaS"],
    min_company_size=50,
    max_company_size=1000,
    target_roles=[
        "CEO",
        "CTO",
        "Head of Sales",
        "Head of Operations",
    ],
    min_annual_revenue=1_000_000,
    fit_weight=25,
    need_weight=20,
    value_weight=15,
    authority_weight=15,
    timing_weight=10,
    budget_weight=10,
    evidence_weight=5,
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
    }


@app.post("/leads", response_model=QualificationResult)
def create_lead(
    lead: Lead,
    db: Session = Depends(get_db),
):
    result = qualify_lead(lead, qualification_config)

    lead_record = LeadModel(
        name=lead.name,
        email=lead.email,
        company=lead.company,
        industry=lead.industry,
        job_title=lead.job_title,
        company_size=lead.company_size,
        annual_revenue=lead.annual_revenue,
        problem=lead.problem,
        desired_outcome=lead.desired_outcome,
        timeline=lead.timeline,
        budget=lead.budget,
        decision_role=lead.decision_role,
        message=lead.message,
        status=result.status,
        score=result.score,
        confidence=result.confidence,
        fit_score=result.fit_score,
        readiness_score=result.readiness_score,
        intent_score=result.intent_score,
        reasons="\n".join(result.reasons),
        missing_information="\n".join(result.missing_information),
        recommended_action=result.recommended_action,
    )

    try:
        db.add(lead_record)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
        status_code=500,
        detail="Failed to create lead",
        )

    return result


@app.get("/leads", response_model=list[LeadResponse])
def get_leads(
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    reviewed: bool | None = Query(default=None),
    status: str | None = Query(default=None),
):
    try:
        query = (
            db.query(LeadModel)
            .order_by(LeadModel.id.desc())
        )

        if reviewed is not None:
            query = query.filter(LeadModel.reviewed == reviewed)

        if status is not None:
            query = query.filter(LeadModel.status == status)

        leads = (
            query
            .offset(skip)
            .limit(limit)
            .all()
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve leads",
        )

    return [lead_to_response(lead) for lead in leads]

@app.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    try:
        lead = db.get(LeadModel, lead_id)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve lead",
        )

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    return lead_to_response(lead)

@app.patch("/leads/{lead_id}/review", response_model=LeadResponse)
def review_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = db.get(LeadModel, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    lead.reviewed = True
    lead.reviewed_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(lead)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to review lead",
        )

    return lead_to_response(lead)

@app.post(
    "/leads/{lead_id}/activities",
    response_model=LeadActivityResponse,
)
def create_lead_activity(
    lead_id: int,
    activity: LeadActivityCreate,
    db: Session = Depends(get_db),
):
    lead = db.get(LeadModel, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    activity_record = LeadActivityModel(
        lead_id=lead_id,
        activity_type=activity.activity_type,
        outcome=activity.outcome,
        notes=activity.notes,
    )

    try:
        db.add(activity_record)
        db.commit()
        db.refresh(activity_record)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create lead activity",
        )

    return activity_record

@app.get(
    "/leads/{lead_id}/activities",
    response_model=list[LeadActivityResponse],
)
def get_lead_activities(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = db.get(LeadModel, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    try:
        activities = (
            db.query(LeadActivityModel)
            .filter(LeadActivityModel.lead_id == lead_id)
            .order_by(LeadActivityModel.id.desc())
            .all()
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve lead activities",
        )

    return activities