from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Lead(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def strip_string_whitespace(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator(
        "name", "company", "industry", "job_title", "problem",
        "desired_outcome", "decision_role", "message",
    )
    @classmethod
    def reject_blank_required_strings(cls, value):
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("annual_revenue", "budget", mode="before")
    @classmethod
    def blank_optional_numbers_are_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("timeline", mode="before")
    @classmethod
    def blank_timeline_is_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    company: str = Field(min_length=1, max_length=255)
    industry: str = Field(min_length=1, max_length=255)
    job_title: str = Field(min_length=1, max_length=255)
    company_size: int = Field(gt=0)
    annual_revenue: float | None = Field(default=None, gt=0)
    problem: str = Field(min_length=1)
    desired_outcome: str = Field(min_length=1)
    timeline: str | None = None
    budget: float | None = Field(default=None, gt=0)
    decision_role: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)


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
            self.fit_weight + self.need_weight + self.value_weight
            + self.authority_weight + self.timing_weight
            + self.budget_weight + self.evidence_weight
        )
        if total != 100:
            raise ValueError(f"Qualification weights must total 100, got {total}")
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
    next_action: str | None = Field(default=None, max_length=500)
    next_action_at: datetime | None = None

    @field_validator("next_action", mode="before")
    @classmethod
    def normalize_next_action(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @model_validator(mode="after")
    def clear_due_date_when_action_is_cleared(self):
        if self.next_action is None:
            self.next_action_at = None
        return self


class SalesActionResponse(BaseModel):
    lead_id: int
    name: str
    company: str
    status: str
    score: int
    next_action: str
    next_action_at: datetime


class LeadActivityCreate(BaseModel):
    activity_type: Literal["call", "email", "meeting", "note", "other", "demo"]
    outcome: str | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("activity_type", mode="before")
    @classmethod
    def normalize_activity_type(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("outcome", "notes", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value):
        if value is None or value == "":
            return []
        if isinstance(value, str):
            value = value.split(",")
        if not isinstance(value, list):
            raise ValueError("Tags must be a list or comma-separated text.")
        normalized = []
        seen = set()
        for item in value:
            if isinstance(item, str):
                tag = item.strip()
                key = tag.casefold()
                if tag and key not in seen:
                    normalized.append(tag)
                    seen.add(key)
        return normalized


class LeadActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    activity_type: str
    outcome: str | None
    notes: str | None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class GlobalActivityResponse(BaseModel):
    id: int
    lead_id: int
    lead_name: str
    company: str
    activity_type: str
    outcome: str | None
    notes: str | None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
