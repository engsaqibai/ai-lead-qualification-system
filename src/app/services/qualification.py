from src.app.schemas import Lead, QualificationConfig, QualificationResult


def _normalize(value: str) -> str:
    return value.strip().lower()


def _matches_target(value: str, targets: list[str]) -> bool:
    normalized_value = _normalize(value)

    return any(
        _normalize(target) in normalized_value
        or normalized_value in _normalize(target)
        for target in targets
    )


def _score_company_size(
    company_size: int,
    config: QualificationConfig,
) -> int:
    if company_size < config.min_company_size:
        return 0

    if config.max_company_size is not None:
        if company_size <= config.max_company_size:
            return 100

        # Still potentially valuable, but outside the configured ICP range.
        return 50

    return 100


def _score_revenue(
    annual_revenue: float | None,
    config: QualificationConfig,
) -> int:
    if config.min_annual_revenue is None:
        return 100

    if annual_revenue is None:
        return 50

    if annual_revenue >= config.min_annual_revenue:
        return 100

    return 0


def _score_need(problem: str) -> int:
    if not problem.strip():
        return 0

    if len(problem.strip()) >= 80:
        return 100

    if len(problem.strip()) >= 40:
        return 80

    if len(problem.strip()) >= 20:
        return 60

    return 40


def _score_value(desired_outcome: str) -> int:
    if not desired_outcome.strip():
        return 0

    if len(desired_outcome.strip()) >= 80:
        return 100

    if len(desired_outcome.strip()) >= 40:
        return 80

    if len(desired_outcome.strip()) >= 20:
        return 60

    return 40


def _score_authority(
    decision_role: str,
    config: QualificationConfig,
) -> int:
    if not decision_role.strip():
        return 0

    if _matches_target(decision_role, config.target_roles):
        return 100

    decision_maker_terms = [
        "decision maker",
        "decision-maker",
        "owner",
        "founder",
        "co-founder",
        "ceo",
        "cto",
        "cfo",
        "coo",
        "director",
        "head",
        "vp",
        "vice president",
    ]

    normalized_role = _normalize(decision_role)

    if any(term in normalized_role for term in decision_maker_terms):
        return 80

    return 40


def _score_timing(timeline: str | None) -> int:
    if not timeline:
        return 40

    normalized = _normalize(timeline)

    urgent_terms = [
        "immediately",
        "asap",
        "now",
        "this month",
        "30 days",
        "1 month",
        "within 3 months",
        "3 months",
    ]

    medium_terms = [
        "6 months",
        "within 6 months",
        "this year",
        "3-6 months",
    ]

    if any(term in normalized for term in urgent_terms):
        return 100

    if any(term in normalized for term in medium_terms):
        return 70

    return 50


def _score_budget(budget: float | None) -> int:
    if budget is None:
        return 40

    if budget > 0:
        return 100

    return 0


def _score_evidence(lead: Lead) -> int:
    evidence_fields = [
        lead.name,
        lead.email,
        lead.company,
        lead.industry,
        lead.job_title,
        lead.problem,
        lead.desired_outcome,
        lead.message,
    ]

    completed = sum(
        1
        for field in evidence_fields
        if isinstance(field, str) and field.strip()
    )

    return round((completed / len(evidence_fields)) * 100)


def _weighted_score(
    scores: dict[str, int],
    config: QualificationConfig,
) -> int:
    weighted_total = (
        scores["fit"] * config.fit_weight
        + scores["need"] * config.need_weight
        + scores["value"] * config.value_weight
        + scores["authority"] * config.authority_weight
        + scores["timing"] * config.timing_weight
        + scores["budget"] * config.budget_weight
        + scores["evidence"] * config.evidence_weight
    )

    return round(weighted_total / 100)


def _status(score: int, fit_score: int) -> str:
    if fit_score < 40:
        return "disqualified"

    if score >= 80:
        return "qualified"

    if score >= 60:
        return "review"

    return "nurture"


def _recommended_action(status: str) -> str:
    actions = {
        "qualified": "Route to sales for direct follow-up.",
        "review": "Review the lead and collect missing qualification information.",
        "nurture": "Add to a nurture workflow and monitor for stronger buying signals.",
        "disqualified": "Do not prioritize for sales outreach unless ICP criteria change.",
    }

    return actions[status]


def qualify_lead(
    lead: Lead,
    config: QualificationConfig,
) -> QualificationResult:
    industry_score = (
        100
        if _matches_target(lead.industry, config.target_industries)
        else 0
    )

    company_size_score = _score_company_size(
        lead.company_size,
        config,
    )

    role_score = (
        100
        if _matches_target(lead.job_title, config.target_roles)
        else 60
    )

    revenue_score = _score_revenue(
        lead.annual_revenue,
        config,
    )

    need_score = _score_need(lead.problem)
    value_score = _score_value(lead.desired_outcome)
    authority_score = _score_authority(
        lead.decision_role,
        config,
    )
    timing_score = _score_timing(lead.timeline)
    budget_score = _score_budget(lead.budget)
    evidence_score = _score_evidence(lead)

    fit_score = round(
        (
            industry_score
            + company_size_score
            + role_score
            + revenue_score
        )
        / 4
    )

    readiness_score = round(
        (
            need_score
            + value_score
            + timing_score
            + budget_score
        )
        / 4
    )

    intent_score = round(
        (
            authority_score
            + evidence_score
        )
        / 2
    )

    scores = {
        "fit": fit_score,
        "need": need_score,
        "value": value_score,
        "authority": authority_score,
        "timing": timing_score,
        "budget": budget_score,
        "evidence": evidence_score,
    }

    score = _weighted_score(scores, config)

    missing_information: list[str] = []
    reasons: list[str] = []

    if industry_score == 100:
        reasons.append("Industry matches the configured ICP.")
    else:
        reasons.append("Industry does not match the configured ICP.")

    if company_size_score == 100:
        reasons.append("Company size fits the configured ICP.")
    elif company_size_score == 50:
        reasons.append("Company size is above the preferred ICP range.")
    else:
        reasons.append("Company size is below the configured ICP minimum.")

    if revenue_score == 100:
        reasons.append("Annual revenue meets the configured minimum.")
    elif revenue_score == 50:
        missing_information.append("Annual revenue")
    else:
        reasons.append("Annual revenue is below the configured minimum.")

    if need_score >= 80:
        reasons.append("Lead describes a clear business problem.")

    if value_score >= 80:
        reasons.append("Lead describes a clear desired outcome.")

    if lead.timeline is None:
        missing_information.append("Timeline")

    if lead.budget is None:
        missing_information.append("Budget")

    if authority_score < 80:
        missing_information.append("Decision authority confirmation")

    if evidence_score < 80:
        missing_information.append("Additional qualification evidence")

    status = _status(score, fit_score)

    confidence = round(
        (
            evidence_score
            + min(fit_score, 100)
            + min(readiness_score, 100)
        )
        / 3
    )

    return QualificationResult(
        status=status,
        score=score,
        confidence=confidence,
        fit_score=fit_score,
        readiness_score=readiness_score,
        intent_score=intent_score,
        reasons=reasons,
        missing_information=missing_information,
        recommended_action=_recommended_action(status),
    )