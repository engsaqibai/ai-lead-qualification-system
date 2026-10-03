from fastapi.testclient import TestClient

from src.app.db.database import SessionLocal
from src.app.db.models import LeadModel
from src.app.main import app


client = TestClient(app)


def test_create_lead_persists_to_database():
    payload = {
        "name": "Database Test Lead",
        "email": "database-persistence-test@example.com",
        "company": "Tech Solutions",
        "industry": "Software",
        "job_title": "Head of Operations",
        "company_size": 250,
        "annual_revenue": 15_000_000,
        "problem": (
            "Our sales team spends too much time manually "
            "qualifying inbound leads."
        ),
        "desired_outcome": (
            "Automate initial lead qualification and prioritize "
            "high-value prospects."
        ),
        "timeline": "Within 3 months",
        "budget": 50_000,
        "decision_role": "Decision Maker",
        "message": (
            "We are evaluating an AI lead qualification solution "
            "for our sales organization."
        ),
    }

    response = client.post("/leads", json=payload)

    assert response.status_code == 200

    data = response.json()

    db = SessionLocal()

    try:
        lead = (
            db.query(LeadModel)
            .filter(LeadModel.email == payload["email"])
            .first()
        )

        assert lead is not None
        assert lead.name == payload["name"]
        assert lead.company == payload["company"]

        assert lead.status == data["status"]
        assert lead.score == data["score"]
        assert lead.confidence == data["confidence"]
        assert lead.fit_score == data["fit_score"]
        assert lead.readiness_score == data["readiness_score"]
        assert lead.intent_score == data["intent_score"]

    finally:
        db.close()
