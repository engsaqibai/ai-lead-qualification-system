from fastapi import FastAPI

from src.app.config import settings
from src.app.schemas import Lead


app = FastAPI(title=settings.app_name)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
    }


@app.post("/leads")
def create_lead(lead: Lead):
    return {
        "message": "Lead received",
        "lead": lead,
    }