import os

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8080")
MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb+srv://pjasmita7_db_user:UGC2rixqoIncb5hQ@cluster0.lwzn7a9.mongodb.net/?appName=Cluster0")
EUREKA_SERVER = os.getenv("EUREKA_SERVER", "http://localhost:8761/eureka/")
