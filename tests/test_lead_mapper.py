from datetime import datetime, timezone

from src.app.db.models import LeadModel
from src.app.services.lead_mapper import lead_to_response


def test_lead_to_response_maps_fields_correctly():
    created_at = datetime.now(timezone.utc)
    reviewed_at = datetime.now(timezone.utc)

    lead = LeadModel(
        id=1,
        name="Mapper Test Lead",
        email="mapper@example.com",
        company="Mapper Tech",
        industry="Software",
        job_title="CTO",
        company_size=200,
        annual_revenue=5_000_000,
        problem="We need automated lead qualification.",
        desired_outcome="Prioritize qualified leads.",
        timeline="Within 3 months",
        budget=25_000,
        decision_role="Decision Maker",
        message="We want to evaluate the solution.",
        status="qualified",
        score=90,
        confidence=97,
        fit_score=100,
        readiness_score=90,
        intent_score=90,
        reasons="Strong ICP fit\nClear business problem",
        missing_information="",
        recommended_action="Route to sales for direct follow-up.",
        created_at=created_at,
        reviewed=True,
        reviewed_at=reviewed_at,
    )

    response = lead_to_response(lead)

    assert response.id == 1
    assert response.name == "Mapper Test Lead"
    assert response.email == "mapper@example.com"
    assert response.company == "Mapper Tech"
    assert response.status == "qualified"
    assert response.score == 90
    assert response.confidence == 97
    assert response.fit_score == 100
    assert response.readiness_score == 90
    assert response.intent_score == 90
    assert response.reasons == [
        "Strong ICP fit",
        "Clear business problem",
    ]
    assert response.missing_information == []
    assert response.recommended_action == (
        "Route to sales for direct follow-up."
    )
    assert response.created_at == created_at
    assert response.reviewed is True
    assert response.reviewed_at == reviewed_at


def test_lead_to_response_handles_missing_information():
    lead = LeadModel(
        id=2,
        name="Missing Info Lead",
        email="missing@example.com",
        company="Missing Tech",
        industry="Software",
        job_title="CEO",
        company_size=100,
        annual_revenue=2_000_000,
        problem="We have a lead qualification problem.",
        desired_outcome="Improve qualification.",
        timeline=None,
        budget=None,
        decision_role="Influencer",
        message="We are researching solutions.",
        status="needs_review",
        score=60,
        confidence=75,
        fit_score=80,
        readiness_score=40,
        intent_score=50,
        reasons="Good company fit",
        missing_information="Budget\nTimeline",
        recommended_action="Gather additional buying information.",
        created_at=datetime.now(timezone.utc),
        reviewed=False,
        reviewed_at=None,
    )

    response = lead_to_response(lead)

    assert response.reasons == ["Good company fit"]
    assert response.missing_information == [
        "Budget",
        "Timeline",
    ]
    assert response.reviewed is False
    assert response.reviewed_at is None