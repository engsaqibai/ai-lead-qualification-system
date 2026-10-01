from pydantic import BaseModel, EmailStr, Field


class Lead(BaseModel):
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