import os
from dotenv import load_dotenv

load_dotenv(override=False) # Load local .env
load_dotenv("../.env", override=False) # Load root .env

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8080")
MONGO_DETAILS = os.getenv("MONGO_DETAILS")
EUREKA_SERVER = os.getenv("EUREKA_SERVER_URL", "http://localhost:8761/eureka/")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_SSL = os.getenv("REDIS_SSL", "false").lower() == "true"
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_SSL_ENABLED = os.getenv("KAFKA_SSL_ENABLED", "false").lower() == "true"
ANALYSIS_EXPENSE_GROUP_ID = os.getenv("ANALYSIS_EXPENSE_GROUP_ID", "analysis-expense-group")
ANALYSIS_BUDGET_GROUP_ID = os.getenv("ANALYSIS_BUDGET_GROUP_ID", "analysis-budget-group")

# Kafka SSL
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CERTS_DIR = os.path.join(BASE_DIR, "certs")
if not os.path.exists(CERTS_DIR):
    CERTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "..", "certs")
    
KAFKA_CA_CERT = os.path.join(CERTS_DIR, "ca.pem")
KAFKA_SERVICE_CERT = os.path.join(CERTS_DIR, "service.cert")
KAFKA_SERVICE_KEY = os.path.join(CERTS_DIR, "service.key")
