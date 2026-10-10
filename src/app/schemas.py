from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class Lead(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def strip_string_whitespace(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value

    name: str
    email: EmailStr
    company: str
    industry: str
    job_title: str
    company_size: int = Field(gt=0)
    annual_revenue: float | None = Field(default=None, gt=0)

    problem: str
    desired_outcome: str
    timeline: str | None = None
    budget: float | None = Field(default=None, gt=0)

    decision_role: str
    message: str

class QualificationResult(BaseModel):
    status: str
    score: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)

    fit_score: int = Field(ge=0, le=100)
    readiness_score: int = Field(ge=0, le=100)
    intent_score: int = Field(ge=0, le=100)

    reasons: list[str]
    missing_information: list[str]
    recommended_action: str

class QualificationConfig(BaseModel):
    target_industries: list[str]
    min_company_size: int = Field(gt=0)
    max_company_size: int | None = Field(default=None, gt=0)
    target_roles: list[str]
    min_annual_revenue: float | None = Field(default=None, gt=0)

    fit_weight: int = Field(ge=0, le=100)
    need_weight: int = Field(ge=0, le=100)
    value_weight: int = Field(ge=0, le=100)
    authority_weight: int = Field(ge=0, le=100)
    timing_weight: int = Field(ge=0, le=100)
    budget_weight: int = Field(ge=0, le=100)
    evidence_weight: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_weight_total(self):
        total = (
            self.fit_weight
            + self.need_weight
            + self.value_weight
            + self.authority_weight
            + self.timing_weight
            + self.budget_weight
            + self.evidence_weight
        )

        if total != 100:
            raise ValueError(
                f"Qualification weights must total 100, got {total}"
            )

        return self

class LeadResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    company: str
    industry: str
    job_title: str
    company_size: int
    annual_revenue: float | None
    problem: str
    desired_outcome: str
    timeline: str | None
    budget: float | None
    decision_role: str
    message: str

    status: str
    score: int
    confidence: int
    fit_score: int
    readiness_score: int
    intent_score: int

    reasons: list[str]
    missing_information: list[str]
    recommended_action: str

    created_at: datetime

    reviewed: bool
    reviewed_at: datetime | None

    next_action: str | None
    next_action_at: datetime | None

class LeadNextActionUpdate(BaseModel):
    next_action: str = Field(min_length=1, max_length=500)
    next_action_at: datetime | None = None

class SalesActionResponse(BaseModel):
    lead_id: int
    name: str
    company: str
    status: str
    score: int
    next_action: str
    next_action_at: datetime

class LeadActivityCreate(BaseModel):
    activity_type: str
    outcome: str | None = None
    notes: str | None = None


class LeadActivityResponse(BaseModel):
    id: int
    lead_id: int
    activity_type: str
    outcome: str | None
    notes: str | None
    created_at: datetime