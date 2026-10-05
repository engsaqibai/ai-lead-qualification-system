from src.app.db.models import LeadModel
from src.app.schemas import LeadResponse


def lead_to_response(lead: LeadModel) -> LeadResponse:
    return LeadResponse(
        id=lead.id,
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
        status=lead.status,
        score=lead.score,
        confidence=lead.confidence,
        fit_score=lead.fit_score,
        readiness_score=lead.readiness_score,
        intent_score=lead.intent_score,
        reasons=lead.reasons.split("\n") if lead.reasons else [],
        missing_information=(
            lead.missing_information.split("\n")
            if lead.missing_information
            else []
        ),
        recommended_action=lead.recommended_action,
        created_at=lead.created_at,
        reviewed=lead.reviewed,
        reviewed_at=lead.reviewed_at,
        next_action=lead.next_action,
        next_action_at=lead.next_action_at,
    )