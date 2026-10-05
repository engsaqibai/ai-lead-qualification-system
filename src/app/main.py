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
    LeadNextActionUpdate,
    LeadResponse,
    QualificationConfig,
    QualificationResult,
    SalesActionResponse,
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
        next_action=result.recommended_action,
        next_action_at=None,
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

@app.patch(
    "/leads/{lead_id}/next-action",
    response_model=LeadResponse,
)
def update_lead_next_action(
    lead_id: int,
    action: LeadNextActionUpdate,
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

    lead.next_action = action.next_action
    lead.next_action_at = action.next_action_at

    try:
        db.commit()
        db.refresh(lead)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update lead next action",
        )

    return lead_to_response(lead)

@app.get(
    "/sales/actions",
    response_model=list[SalesActionResponse],
)
def get_sales_actions(
    due: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    if due not in {None, "overdue", "today", "upcoming"}:
        raise HTTPException(
            status_code=422,
            detail="Invalid due filter",
        )

    query = (
        db.query(LeadModel)
        .filter(
            LeadModel.next_action.isnot(None),
            LeadModel.next_action_at.isnot(None),
        )
    )

    if due == "overdue":
        query = query.filter(
            LeadModel.next_action_at < now,
        )

    elif due == "today":
        start_of_day = now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

        end_of_day = start_of_day.replace(
            hour=23,
            minute=59,
            second=59,
            microsecond=999999,
        )

        query = query.filter(
            LeadModel.next_action_at >= start_of_day,
            LeadModel.next_action_at <= end_of_day,
        )

    elif due == "upcoming":
        end_of_day = now.replace(
            hour=23,
            minute=59,
            second=59,
            microsecond=999999,
        )

        query = query.filter(
            LeadModel.next_action_at > end_of_day,
        )

    try:
        actions = (
            query
            .order_by(LeadModel.next_action_at.asc())
            .all()
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve sales actions",
        )

    return [
        SalesActionResponse(
            lead_id=lead.id,
            name=lead.name,
            company=lead.company,
            status=lead.status,
            score=lead.score,
            next_action=lead.next_action,
            next_action_at=lead.next_action_at,
        )
        for lead in actions
    ]

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