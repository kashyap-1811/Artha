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
from dotenv import load_dotenv
from app.services.kafka_consumer import consume_expense_events
import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

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
        host_ip = get_local_ip()
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER,
            app_name="analysis-service",
            instance_port=8084,
            instance_host=host_ip,
            instance_id=f"{host_ip}:analysis-service:8084"
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
