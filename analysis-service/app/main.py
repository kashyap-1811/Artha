import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from dotenv import load_dotenv
import py_eureka_client.eureka_client as eureka_client
from app.routers import analysis

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Register with Eureka
    eureka_server = os.getenv("EUREKA_SERVER", "http://localhost:8761/eureka")
    await eureka_client.init_async(
        eureka_server=eureka_server,
        app_name="analysis-service",
        instance_port=8084
    )
    yield
    # Unregister from Eureka
    await eureka_client.stop_async()

app = FastAPI(
    title="Analysis Service",
    description="Provides budget and expense analytics",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(analysis.router)

@app.get("/")
def root():
    return {"message": "Analysis Service Running"}

# venv\Scripts\Activate    
# uvicorn app.main:app --host 0.0.0.0 --port 8084 --reload
