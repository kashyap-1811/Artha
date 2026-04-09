import os
from dotenv import load_dotenv

load_dotenv(override=False) # Load local .env
load_dotenv("../.env", override=False) # Load root .env

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8080")
MONGO_DETAILS = os.getenv("MONGO_DETAILS")
EUREKA_SERVER = os.getenv("EUREKA_SERVER", "http://localhost:8761/eureka/")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_SSL = os.getenv("REDIS_SSL", "false").lower() == "true"
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ANALYSIS_EXPENSE_GROUP_ID = os.getenv("ANALYSIS_EXPENSE_GROUP_ID", "analysis-expense-group")
ANALYSIS_BUDGET_GROUP_ID = os.getenv("ANALYSIS_BUDGET_GROUP_ID", "analysis-budget-group")
