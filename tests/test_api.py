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

def test_get_leads():
    response = client.get("/leads?skip=0&limit=2")

    assert response.status_code == 200

    data = response.json()

    assert len(data) <= 2

    if len(data) == 2:
        assert data[0]["id"] > data[1]["id"]


def test_get_leads_pagination():
    payload = {
        "name": "Pagination Test Lead",
        "email": "pagination-first@example.com",
        "company": "Pagination Test Co",
        "industry": "Technology",
        "job_title": "Sales Manager",
        "company_size": "250",
        "annual_revenue": 1_000_000,
        "problem": "Lead qualification takes too much time",
        "desired_outcome": "Improve sales efficiency",
        "timeline": "Within 3 months",
        "budget": 50_000,
        "decision_role": "Decision Maker",
        "message": "Testing lead pagination.",
    }

    first_create = client.post("/leads", json=payload)
    assert first_create.status_code == 200

    payload["name"] = "Pagination Test Lead Two"
    payload["email"] = "pagination-second@example.com"

    second_create = client.post("/leads", json=payload)
    assert second_create.status_code == 200

    first_response = client.get("/leads?skip=0&limit=1")
    second_response = client.get("/leads?skip=1&limit=1")

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    first_data = first_response.json()
    second_data = second_response.json()

    assert len(first_data) == 1
    assert len(second_data) == 1
    assert first_data[0]["id"] > second_data[0]["id"]


def test_get_leads_invalid_pagination():
    negative_skip_response = client.get("/leads?skip=-1")
    zero_limit_response = client.get("/leads?limit=0")
    excessive_limit_response = client.get("/leads?limit=101")

    assert negative_skip_response.status_code == 422
    assert zero_limit_response.status_code == 422
    assert excessive_limit_response.status_code == 422

def test_review_lead():
    payload = {
        "name": "Review Test Lead",
        "email": "review-test@example.com",
        "company": "Review Tech",
        "industry": "Software",
        "job_title": "CTO",
        "company_size": 200,
        "annual_revenue": 5_000_000,
        "problem": "Our sales team needs automated lead qualification.",
        "desired_outcome": "Prioritize qualified leads automatically.",
        "timeline": "Within 3 months",
        "budget": 25_000,
        "decision_role": "Decision Maker",
        "message": "We want to evaluate the solution.",
    }

    create_response = client.post("/leads", json=payload)

    assert create_response.status_code == 200

    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )

    assert leads_response.status_code == 200

    lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    assert lead["reviewed"] is False
    assert lead["reviewed_at"] is None

    review_response = client.patch(
        f"/leads/{lead['id']}/review"
    )

    assert review_response.status_code == 200

    reviewed_lead = review_response.json()

    assert reviewed_lead["id"] == lead["id"]
    assert reviewed_lead["reviewed"] is True
    assert reviewed_lead["reviewed_at"] is not None

def test_get_leads_reviewed_filter():
    payload = {
        "name": "Filter Test Lead",
        "email": "filter-test@example.com",
        "company": "Filter Tech",
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

    create_response = client.post("/leads", json=payload)

    assert create_response.status_code == 200

    leads_response = client.get(
        "/leads",
        params={"reviewed": False, "limit": 100},
    )

    assert leads_response.status_code == 200

    unreviewed_leads = leads_response.json()

    lead = next(
        lead
        for lead in unreviewed_leads
        if lead["email"] == payload["email"]
    )

    assert lead["reviewed"] is False

    review_response = client.patch(
        f"/leads/{lead['id']}/review"
    )

    assert review_response.status_code == 200

    reviewed_response = client.get(
        "/leads",
        params={"reviewed": True, "limit": 100},
    )

    assert reviewed_response.status_code == 200

    reviewed_leads = reviewed_response.json()

    reviewed_lead = next(
        lead
        for lead in reviewed_leads
        if lead["email"] == payload["email"]
    )

    assert reviewed_lead["reviewed"] is True


def test_get_leads_reviewed_filter_with_pagination():
    response = client.get(
        "/leads",
        params={
            "reviewed": False,
            "skip": 0,
            "limit": 2,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) <= 2

    for lead in data:
        assert lead["reviewed"] is False

def test_get_leads_status_filter():
    qualified_response = client.get(
        "/leads",
        params={
            "status": "qualified",
            "limit": 100,
        },
    )

    assert qualified_response.status_code == 200

    qualified_leads = qualified_response.json()

    for lead in qualified_leads:
        assert lead["status"] == "qualified"

    disqualified_response = client.get(
        "/leads",
        params={
            "status": "disqualified",
            "limit": 100,
        },
    )

    assert disqualified_response.status_code == 200

    disqualified_leads = disqualified_response.json()

    for lead in disqualified_leads:
        assert lead["status"] == "disqualified"

def test_get_leads_status_and_reviewed_filters():
    response = client.get(
        "/leads",
        params={
            "status": "qualified",
            "reviewed": False,
            "limit": 100,
        },
    )

    assert response.status_code == 200

    data = response.json()

    for lead in data:
        assert lead["status"] == "qualified"
        assert lead["reviewed"] is False

def test_review_nonexistent_lead():
    response = client.patch("/leads/999999/review")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}

def test_get_lead_by_id():
    payload = {
        "name": "Single Lead Test",
        "email": "single-lead@example.com",
        "company": "Single Lead Tech",
        "industry": "Software",
        "job_title": "CTO",
        "company_size": 200,
        "annual_revenue": 5_000_000,
        "problem": "We need better lead qualification.",
        "desired_outcome": "Automatically prioritize high-value leads.",
        "timeline": "Within 3 months",
        "budget": 25_000,
        "decision_role": "Decision Maker",
        "message": "We want to evaluate the solution.",
    }

    create_response = client.post("/leads", json=payload)

    assert create_response.status_code == 200

    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )

    assert leads_response.status_code == 200

    lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    response = client.get(f"/leads/{lead['id']}")

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == lead["id"]
    assert data["email"] == payload["email"]
    assert data["name"] == payload["name"]
    assert data["company"] == payload["company"]
    assert data["status"] == lead["status"]
    assert data["score"] == lead["score"]
    assert data["reviewed"] is False
    assert data["reviewed_at"] is None


def test_get_nonexistent_lead():
    response = client.get("/leads/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}

def test_create_lead_activity():
    lead_response = client.post(
        "/leads",
        json={
            "name": "Activity Test",
            "email": "activity@example.com",
            "company": "Activity Corp",
            "industry": "Software",
            "job_title": "CEO",
            "company_size": 100,
            "annual_revenue": 2_000_000,
            "problem": "Need better lead qualification",
            "desired_outcome": "Improve sales efficiency",
            "timeline": "This month",
            "budget": 5000,
            "decision_role": "Decision Maker",
            "message": "We need a solution.",
        },
    )

    assert lead_response.status_code == 200

    lead_id = client.get("/leads").json()[0]["id"]

    response = client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "email",
            "outcome": "replied",
            "notes": "Lead replied positively.",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["lead_id"] == lead_id
    assert data["activity_type"] == "email"
    assert data["outcome"] == "replied"
    assert data["notes"] == "Lead replied positively."
    assert "created_at" in data


def test_get_lead_activities():
    lead_response = client.post(
        "/leads",
        json={
            "name": "Activities Test",
            "email": "activities@example.com",
            "company": "Activities Corp",
            "industry": "Software",
            "job_title": "CTO",
            "company_size": 100,
            "annual_revenue": 2_000_000,
            "problem": "Need better qualification",
            "desired_outcome": "Increase conversions",
            "timeline": "This month",
            "budget": 5000,
            "decision_role": "Decision Maker",
            "message": "We are evaluating solutions.",
        },
    )

    assert lead_response.status_code == 200

    lead_id = client.get("/leads").json()[0]["id"]

    client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "call",
            "outcome": "connected",
            "notes": "Discovery call completed.",
        },
    )

    client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "email",
            "outcome": "replied",
            "notes": "Follow-up email received.",
        },
    )

    response = client.get(f"/leads/{lead_id}/activities")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2
    assert all(activity["lead_id"] == lead_id for activity in data)


def test_create_lead_activity_for_nonexistent_lead():
    response = client.post(
        "/leads/999999/activities",
        json={
            "activity_type": "email",
            "outcome": "sent",
            "notes": "Test activity.",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"


def test_get_lead_activities_for_nonexistent_lead():
    response = client.get("/leads/999999/activities")

    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"

def test_update_lead_next_action():
    payload = {
        "name": "Next Action Test",
        "email": "next-action@example.com",
        "company": "Next Action Tech",
        "industry": "Software",
        "job_title": "CTO",
        "company_size": 200,
        "annual_revenue": 5_000_000,
        "problem": "We need better lead qualification.",
        "desired_outcome": "Prioritize high-value leads.",
        "timeline": "Within 3 months",
        "budget": 25_000,
        "decision_role": "Decision Maker",
        "message": "We want to evaluate the solution.",
    }

    create_response = client.post("/leads", json=payload)

    assert create_response.status_code == 200

    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )

    lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    response = client.patch(
        f"/leads/{lead['id']}/next-action",
        json={
            "next_action": "Book discovery call",
            "next_action_at": "2026-10-06T15:00:00Z",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == lead["id"]
    assert data["next_action"] == "Book discovery call"
    assert data["next_action_at"] is not None

    assert data["recommended_action"] != data["next_action"]

def test_update_next_action_for_nonexistent_lead():
    response = client.patch(
        "/leads/999999/next-action",
        json={
            "next_action": "Book discovery call",
            "next_action_at": "2026-10-06T15:00:00Z",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}

def test_update_next_action_with_empty_action():
    response = client.patch(
        "/leads/999999/next-action",
        json={
            "next_action": "",
            "next_action_at": None,
        },
    )

    assert response.status_code == 422

def test_get_sales_actions():
    payload = {
        "name": "Sales Queue Test",
        "email": "sales-queue@example.com",
        "company": "Sales Queue Tech",
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
        json=payload,
    )

    assert create_response.status_code == 200

    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )

    lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    update_response = client.patch(
        f"/leads/{lead['id']}/next-action",
        json={
            "next_action": "Schedule discovery call",
            "next_action_at": "2099-01-01T10:00:00Z",
        },
    )

    assert update_response.status_code == 200

    response = client.get("/sales/actions")

    assert response.status_code == 200

    data = response.json()

    sales_action = next(
        action
        for action in data
        if action["lead_id"] == lead["id"]
    )

    assert sales_action["next_action"] == "Schedule discovery call"
    assert sales_action["company"] == payload["company"]

def test_get_sales_actions_upcoming_filter():
    response = client.get(
        "/sales/actions",
        params={"due": "upcoming"},
    )

    assert response.status_code == 200

    data = response.json()

    for action in data:
        assert action["next_action"] is not None
        assert action["next_action_at"] is not None

def test_get_sales_actions_invalid_filter():
    response = client.get(
        "/sales/actions",
        params={"due": "invalid"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid due filter"

def test_sales_workflow_end_to_end():
    payload = {
        "name": "Sales Workflow Test",
        "email": "sales-workflow@example.com",
        "company": "Sales Workflow Tech",
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

    # 1. Lead enters the system
    create_response = client.post(
        "/leads",
        json=payload,
    )

    assert create_response.status_code == 200

    lead = create_response.json()

    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )

    assert leads_response.status_code == 200

    created_lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    lead_id = created_lead["id"]

    # 2. Salesperson reviews the lead
    review_response = client.patch(
        f"/leads/{lead_id}/review"
    )

    assert review_response.status_code == 200

    reviewed_lead = review_response.json()

    assert reviewed_lead["reviewed"] is True
    assert reviewed_lead["reviewed_at"] is not None

    # 3. Salesperson records a sales activity
    activity_response = client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "call",
            "outcome": "connected",
            "notes": "Discovery call completed.",
        },
    )

    assert activity_response.status_code == 200

    activity = activity_response.json()

    assert activity["lead_id"] == lead_id
    assert activity["activity_type"] == "call"
    assert activity["outcome"] == "connected"

    # 4. Salesperson defines the actual next action
    next_action_response = client.patch(
        f"/leads/{lead_id}/next-action",
        json={
            "next_action": "Send proposal",
            "next_action_at": "2099-01-15T10:00:00Z",
        },
    )

    assert next_action_response.status_code == 200

    updated_lead = next_action_response.json()

    assert updated_lead["next_action"] == "Send proposal"
    assert updated_lead["next_action_at"] is not None
    assert updated_lead["recommended_action"] != updated_lead["next_action"]

    # 5. Salesperson can see the lead in the sales action queue
    sales_actions_response = client.get("/sales/actions")

    assert sales_actions_response.status_code == 200

    sales_actions = sales_actions_response.json()

    sales_action = next(
        action
        for action in sales_actions
        if action["lead_id"] == lead_id
    )

    assert sales_action["name"] == payload["name"]
    assert sales_action["company"] == payload["company"]
    assert sales_action["next_action"] == "Send proposal"
    assert sales_action["next_action_at"] is not None

def test_pilot_sales_workflow():
    payload = {
        "name": "Pilot Customer",
        "email": "pilot-customer@example.com",
        "company": "Pilot SaaS",
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

    # 1. Lead enters the system
    response = client.post("/leads", json=payload)
    assert response.status_code == 200

    # Current POST /leads response is QualificationResult,
    # so obtain the persisted lead from GET /leads.
    leads_response = client.get(
        "/leads",
        params={"limit": 100},
    )
    assert leads_response.status_code == 200

    lead = next(
        lead
        for lead in leads_response.json()
        if lead["email"] == payload["email"]
    )

    lead_id = lead["id"]

    # 2. Salesperson reviews the qualification
    response = client.patch(f"/leads/{lead_id}/review")
    assert response.status_code == 200
    assert response.json()["reviewed"] is True

    # 3. Salesperson records first contact
    response = client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "call",
            "outcome": "Interested",
            "notes": "Customer wants a product evaluation.",
        },
    )
    assert response.status_code == 200

    # 4. Salesperson chooses the REAL next action
    response = client.patch(
        f"/leads/{lead_id}/next-action",
        json={
            "next_action": "Schedule product demo",
            "next_action_at": "2030-01-15T10:00:00Z",
        },
    )
    assert response.status_code == 200

    updated_lead = response.json()
    assert updated_lead["next_action"] == "Schedule product demo"
    assert updated_lead["next_action_at"] is not None

    # 5. Lead appears in the sales action queue
    response = client.get("/sales/actions")
    assert response.status_code == 200

    actions = response.json()

    pilot_action = next(
        action
        for action in actions
        if action["lead_id"] == lead_id
    )

    assert pilot_action["next_action"] == "Schedule product demo"

    # 6. Salesperson completes the follow-up
    response = client.post(
        f"/leads/{lead_id}/activities",
        json={
            "activity_type": "demo",
            "outcome": "Completed",
            "notes": "Product demo completed successfully.",
        },
    )
    assert response.status_code == 200

    # 7. Salesperson moves the lead to the next real action
    response = client.patch(
        f"/leads/{lead_id}/next-action",
        json={
            "next_action": "Send proposal",
            "next_action_at": "2030-01-20T10:00:00Z",
        },
    )
    assert response.status_code == 200

    final_lead = response.json()

    assert final_lead["reviewed"] is True
    assert final_lead["next_action"] == "Send proposal"
    assert final_lead["next_action_at"] is not None

    # 8. Activity history contains the complete sales journey
    response = client.get(f"/leads/{lead_id}/activities")
    assert response.status_code == 200

    activities = response.json()

    assert len(activities) >= 2
    assert any(
        activity["activity_type"] == "call"
        for activity in activities
    )
    assert any(
        activity["activity_type"] == "demo"
        for activity in activities
    )