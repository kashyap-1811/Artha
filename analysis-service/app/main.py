import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from contextlib import asynccontextmanager
from py_eureka_client import eureka_client
from app.routers import analysis
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_DETAILS, EUREKA_SERVER
import asyncio
import certifi
from app.services.kafka_consumer import consume_expense_events

class Database:
    client: AsyncIOMotorClient = None

db = Database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to MongoDB Atlas
    print("Connecting to MongoDB Atlas...")
    db.client = AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())
    app.state.mongodb_client = db.client
    print("Successfully connected to MongoDB Atlas!")

    # Startup: Register with Eureka
    try:
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER,
            app_name="analysis-service",
            instance_port=8084,
            instance_host="localhost"
        )
    except Exception as e:
        print(f"Eureka init failed (this is non-fatal for local testing): {e}")

    # Start Kafka Consumer in the background
    kafka_task = asyncio.create_task(consume_expense_events(app))
        
    yield
    
    # Cancel the Kafka Consumer task gracefully
    kafka_task.cancel()
    try:
        await kafka_task
    except asyncio.CancelledError:
        print("Kafka Consumer task cancelled.")
    
    # Shutdown: De-register and close DB
    print("Disconnecting from MongoDB...")
    db.client.close()
    
    try:
        await eureka_client.stop_async()
    except Exception as e:
        pass

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
