import os
from dotenv import load_dotenv

load_dotenv()

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8080")
MONGO_DETAILS = os.getenv("MONGO_DETAILS")
EUREKA_SERVER = os.getenv("EUREKA_SERVER", "http://localhost:8761/eureka/")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
