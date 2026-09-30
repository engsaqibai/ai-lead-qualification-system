from fastapi import FastAPI

from src.app.config import settings


app = FastAPI(title=settings.app_name)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
    }