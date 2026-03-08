from fastapi import FastAPI
from app.routers import analysis

app = FastAPI(
    title="Analysis Service",
    description="Provides budget and expense analytics",
    version="1.0.0"
)

app.include_router(analysis.router)

@app.get("/")
def root():
    return {"message": "Analysis Service Running"}