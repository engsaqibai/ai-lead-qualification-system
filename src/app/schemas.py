from pydantic import BaseModel


class Lead(BaseModel):
    name: str
    email: str
    company: str
    job_title: str
    company_size: int
    message: str