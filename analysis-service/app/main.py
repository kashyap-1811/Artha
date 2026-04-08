import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from contextlib import asynccontextmanager
from py_eureka_client import eureka_client # type: ignore
from app.routers import analysis
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_DETAILS, EUREKA_SERVER, REDIS_HOST, REDIS_PORT
import asyncio
import certifi
import redis.asyncio as redis # type: ignore
from dotenv import load_dotenv
from app.services.kafka_consumer import consume_expense_events, consume_budget_events
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
 
    # Connect to Redis
    print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    app.state.redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    print("Successfully connected to Redis!")

    # Startup: Register with Eureka
    try:
        # If running in Docker, always use the service name for internal routing
        # If running locally, prefer SERVER_IP
        in_docker = os.path.exists("/.dockerenv")
        server_ip = os.getenv("SERVER_IP", "localhost")
        
        if in_docker:
            host_ip = "analysis-service"
        else:
            host_ip = server_ip if server_ip != "localhost" else get_local_ip()
            
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER,
            app_name="analysis-service",
            instance_port=8084,
            instance_host=host_ip,
            instance_id=f"{server_ip if server_ip != 'localhost' else host_ip}:analysis-service:8084"
        )
    except Exception as e:
        print(f"Eureka init failed: {e}")

    # Start Kafka Consumers in the background
    expense_task = asyncio.create_task(consume_expense_events(app))
    budget_task = asyncio.create_task(consume_budget_events(app))
        
    yield
    
    # Cancel the Kafka Consumer tasks gracefully
    expense_task.cancel()
    budget_task.cancel()
    try:
        await asyncio.gather(expense_task, budget_task, return_exceptions=True)
    except Exception:
        pass
    print("Kafka Consumers stopped.")
    
    # Shutdown: De-register and close DB
    print("Disconnecting from MongoDB...")
    db.client.close()
    
    try:
        await eureka_client.stop_async()
    except Exception as e:
        pass
 
    print("Disconnecting from Redis...")
    await app.state.redis.close()

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
