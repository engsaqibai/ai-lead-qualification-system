from fastapi import FastAPI

app = FastAPI(title="AI Lead Qualification System")


@app.get("/health")
def health_check():
    return {"status": "healthy"}