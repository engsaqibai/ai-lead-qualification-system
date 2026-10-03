from fastapi.testclient import TestClient

from src.app.main import app


client = TestClient(app)


def test_create_lead_success():
    payload = {
        "name": "Ali Khan",
        "email": "email@chatgpt.com",
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

    assert data["status"] == "qualified"
    assert data["score"] == 90
    assert data["confidence"] == 97
    assert data["fit_score"] == 100
    assert data["readiness_score"] == 90
    assert data["intent_score"] == 90
    assert data["reasons"]
    assert data["missing_information"] == []
    assert data["recommended_action"] == (
        "Route to sales for direct follow-up."
    )

def test_create_lead_invalid_email():
    payload = {
        "name": "Ali Khan",
        "email": "not-an-email",
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

    assert response.status_code == 422

def test_create_lead_missing_required_field():
    payload = {
        "name": "Ali Khan",
        "email": "email@chatgpt.com",
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
        "decision_role": "Decision Maker"
    }

    response = client.post("/leads", json=payload)

    assert response.status_code == 422

def test_create_lead_invalid_company_size():
    payload = {
        "name": "Ali Khan",
        "email": "email@chatgpt.com",
        "company": "Tech Solutions",
        "industry": "Software",
        "job_title": "Head of Operations",
        "company_size": 0,
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

    assert response.status_code == 422