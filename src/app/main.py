from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from src.app.config import settings
from src.app.db.database import get_db
from src.app.db.models import LeadModel
from src.app.schemas import Lead, QualificationConfig, QualificationResult
from src.app.services.qualification import qualify_lead


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

    db.add(lead_record)
    db.commit()

    return result
