from src.app.schemas import Lead, QualificationConfig
from src.app.services.qualification import qualify_lead


def test_qualified_lead():
    lead = Lead(
        name="Ali Khan",
        email="email@chatgpt.com",
        company="Tech Solutions",
        industry="Software",
        job_title="Head of Operations",
        company_size=250,
        annual_revenue=15_000_000,
        problem=(
            "Our sales team spends too much time manually "
            "qualifying inbound leads."
        ),
        desired_outcome=(
            "Automate initial lead qualification and prioritize "
            "high-value prospects."
        ),
        timeline="Within 3 months",
        budget=50_000,
        decision_role="Decision Maker",
        message=(
            "We are evaluating an AI lead qualification solution "
            "for our sales organization."
        ),
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert 0 <= result.score <= 100
    assert 0 <= result.confidence <= 100
    assert 0 <= result.fit_score <= 100
    assert 0 <= result.readiness_score <= 100
    assert 0 <= result.intent_score <= 100

def test_poor_fit_lead():
    lead = Lead(
        name="John Smith",
        email="john@example.com",
        company="Small Retail Shop",
        industry="Retail",
        job_title="Office Assistant",
        company_size=10,
        annual_revenue=100_000,
        problem="We are curious about AI.",
        desired_outcome="Learn more about AI solutions.",
        timeline=None,
        budget=None,
        decision_role="Influencer",
        message="Just exploring what is available.",
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert result.fit_score < 100
    assert result.score < 90

def test_good_fit_with_missing_buying_information():
    lead = Lead(
        name="Sarah Ahmed",
        email="sarah@example.com",
        company="Growth SaaS",
        industry="SaaS",
        job_title="Head of Sales",
        company_size=200,
        annual_revenue=8_000_000,
        problem="Our sales team is spending too much time manually reviewing inbound leads.",
        desired_outcome="Automate lead qualification and improve sales prioritization.",
        timeline=None,
        budget=None,
        decision_role="Decision Maker",
        message="We are evaluating solutions and would like to understand what is possible.",
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert result.fit_score >= 80
    assert "Timeline" in result.missing_information
    assert "Budget" in result.missing_information

def test_icp_boundary_values():
    lead = Lead(
        name="David Khan",
        email="david@example.com",
        company="Boundary Software",
        industry="Software",
        job_title="CEO",
        company_size=50,
        annual_revenue=1_000_000,
        problem="We need to automate inbound lead qualification.",
        desired_outcome="Reduce manual qualification work for our sales team.",
        timeline="Within 3 months",
        budget=25_000,
        decision_role="Decision Maker",
        message="We are actively evaluating an AI lead qualification solution.",
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert result.fit_score == 100
    assert result.status == "qualified"

def test_company_size_above_icp_maximum():
    lead = Lead(
        name="Michael Lee",
        email="michael@example.com",
        company="Enterprise Software Group",
        industry="Software",
        job_title="CEO",
        company_size=1001,
        annual_revenue=25_000_000,
        problem="We need to improve our inbound lead qualification process.",
        desired_outcome="Automatically identify and prioritize high-value leads.",
        timeline="Within 3 months",
        budget=75_000,
        decision_role="Decision Maker",
        message="We are evaluating an AI qualification platform.",
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert result.fit_score < 100

def test_strong_fit_but_weak_buying_signals():
    lead = Lead(
        name="Emma Wilson",
        email="emma@example.com",
        company="SaaS Growth Co",
        industry="SaaS",
        job_title="Head of Sales",
        company_size=300,
        annual_revenue=12_000_000,
        problem="We are interested in learning more about AI.",
        desired_outcome="Understand whether AI could help our business.",
        timeline=None,
        budget=None,
        decision_role="Influencer",
        message="We are just exploring what AI solutions are available.",
    )

    config = QualificationConfig(
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

    result = qualify_lead(lead, config)

    print(result.model_dump())

    assert result.fit_score >= 80
    assert result.readiness_score < 90
    assert result.intent_score < 90
    assert "Timeline" in result.missing_information
    assert "Budget" in result.missing_information

def test_decision_maker_has_stronger_authority_than_influencer():
    base_data = {
        "name": "Daniel Ahmed",
        "email": "daniel@example.com",
        "company": "Growth Software",
        "industry": "SaaS",
        "job_title": "Head of Sales",
        "company_size": 250,
        "annual_revenue": 10_000_000,
        "problem": "Our team spends too much time manually qualifying inbound leads.",
        "desired_outcome": "Automate qualification and prioritize high-value prospects.",
        "timeline": "Within 3 months",
        "budget": 50_000,
        "message": "We are actively evaluating an AI lead qualification solution.",
    }

    config = QualificationConfig(
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

    decision_maker = Lead(
        **base_data,
        decision_role="Decision Maker",
    )

    influencer = Lead(
        **base_data,
        decision_role="Influencer",
    )

    decision_maker_result = qualify_lead(decision_maker, config)
    influencer_result = qualify_lead(influencer, config)

    print("Decision Maker:", decision_maker_result.model_dump())
    print("Influencer:", influencer_result.model_dump())

    assert (
        decision_maker_result.intent_score
        >= influencer_result.intent_score
    )