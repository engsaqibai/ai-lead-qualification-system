from fastapi.testclient import TestClient

from src.app.db.database import SessionLocal, get_db
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

def test_create_lead_rolls_back_on_database_error():
    payload = {
        "name": "Rollback Test Lead",
        "email": "rollback-test@example.com",
        "company": "Rollback Tech",
        "industry": "Software",
        "job_title": "CTO",
        "company_size": 200,
        "annual_revenue": 5_000_000,
        "problem": "We need better lead qualification.",
        "desired_outcome": "Automatically prioritize qualified leads.",
        "timeline": "Within 3 months",
        "budget": 25_000,
        "decision_role": "Decision Maker",
        "message": "We want to evaluate the solution.",
    }

    class FailingSession:
        def add(self, record):
            self.record = record

        def commit(self):
            raise Exception("database failure")

        def rollback(self):
            self.rolled_back = True

        def close(self):
            pass

    failing_session = FailingSession()

    def override_get_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.post("/leads", json=payload)

        assert response.status_code == 500
        assert failing_session.rolled_back is True

    finally:
        app.dependency_overrides.clear()

def test_review_lead_returns_500_on_database_error():
    class FailingSession:
        def get(self, model, lead_id):
            return LeadModel(
                id=lead_id,
                name="Review Rollback Test",
                email="review-rollback@example.com",
                company="Rollback Tech",
                industry="Software",
                job_title="CTO",
                company_size=200,
                annual_revenue=5_000_000,
                problem="We need better lead qualification.",
                desired_outcome="Automatically prioritize qualified leads.",
                timeline="Within 3 months",
                budget=25_000,
                decision_role="Decision Maker",
                message="We want to evaluate the solution.",
                status="qualified",
                score=90,
                confidence=95,
                fit_score=25,
                readiness_score=20,
                intent_score=15,
                reasons="Strong fit",
                missing_information="",
                recommended_action="Contact immediately",
            )

        def commit(self):
            raise Exception("database failure")

        def rollback(self):
            self.rolled_back = True

        def refresh(self, record):
            pass

    failing_session = FailingSession()

    def override_get_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.patch("/leads/999/review")

        assert response.status_code == 500
        assert response.json()["detail"] == "Failed to review lead"
        assert failing_session.rolled_back is True
    finally:
        app.dependency_overrides.clear()

def test_get_leads_returns_500_on_database_error():
    class FailingSession:
        def query(self, model):
            raise Exception("database failure")

    failing_session = FailingSession()

    def override_get_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/leads")
        assert response.status_code == 500
    finally:
        app.dependency_overrides.clear()

def test_get_lead_returns_500_on_database_error():
    class FailingSession:
        def get(self, model, lead_id):
            raise Exception("database failure")

    failing_session = FailingSession()

    def override_get_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/leads/999")

        assert response.status_code == 500
        assert response.json()["detail"] == "Failed to retrieve lead"
    finally:
        app.dependency_overrides.clear()

def test_create_lead_activity_persists_to_database():
    lead_payload = {
        "name": "Activity Database Test",
        "email": "activity-database-test@example.com",
        "company": "Activity Tech",
        "industry": "Software",
        "job_title": "CTO",
        "company_size": 200,
        "annual_revenue": 5_000_000,
        "problem": "We need better lead qualification.",
        "desired_outcome": "Automatically prioritize qualified leads.",
        "timeline": "Within 3 months",
        "budget": 25_000,
        "decision_role": "Decision Maker",
        "message": "We want to evaluate the solution.",
    }

    create_response = client.post(
        "/leads",
        json=lead_payload,
    )

    assert create_response.status_code == 200

    db = SessionLocal()

    try:
        lead = (
            db.query(LeadModel)
            .filter(LeadModel.email == lead_payload["email"])
            .first()
        )

        assert lead is not None

        activity_response = client.post(
            f"/leads/{lead.id}/activities",
            json={
                "activity_type": "email",
                "outcome": "replied",
                "notes": "Lead replied positively.",
            },
        )

        assert activity_response.status_code == 200

        activity_data = activity_response.json()

        assert activity_data["lead_id"] == lead.id
        assert activity_data["activity_type"] == "email"
        assert activity_data["outcome"] == "replied"
        assert activity_data["notes"] == "Lead replied positively."

    finally:
        db.close()


def test_create_lead_activity_returns_500_on_database_error():
    class FailingSession:
        def get(self, model, lead_id):
            return LeadModel(
                id=lead_id,
                name="Activity Rollback Test",
                email="activity-rollback@example.com",
                company="Rollback Tech",
                industry="Software",
                job_title="CTO",
                company_size=200,
                annual_revenue=5_000_000,
                problem="We need better lead qualification.",
                desired_outcome="Automatically prioritize qualified leads.",
                timeline="Within 3 months",
                budget=25_000,
                decision_role="Decision Maker",
                message="We want to evaluate the solution.",
                status="qualified",
                score=90,
                confidence=95,
                fit_score=25,
                readiness_score=20,
                intent_score=15,
                reasons="Strong fit",
                missing_information="",
                recommended_action="Contact immediately",
            )

        def add(self, record):
            self.record = record

        def commit(self):
            raise Exception("database failure")

        def rollback(self):
            self.rolled_back = True

        def refresh(self, record):
            pass

    failing_session = FailingSession()

    def override_get_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.post(
            "/leads/999/activities",
            json={
                "activity_type": "email",
                "outcome": "sent",
                "notes": "Test activity.",
            },
        )

        assert response.status_code == 500
        assert response.json()["detail"] == (
            "Failed to create lead activity"
        )
        assert failing_session.rolled_back is True

    finally:
        app.dependency_overrides.clear()