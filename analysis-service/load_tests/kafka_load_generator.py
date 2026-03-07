"""
Direct Kafka Load Generator for Artha Analysis Service
------------------------------------------------------
This script acts as a mock "Expense Service". It forcefully pumps hundreds or thousands 
of random expense approval events directly into the local Kafka topic ('expense-events').

Purpose: To stress-test the Analysis Service's Python Kafka Consumer and MongoDB Atlas,
proving to faculty that the pipeline handles scale, rapid updates, and multiple companies gracefully.

Usage:
    source venv/bin/activate
    python load_tests/kafka_load_generator.py

Adjust `TOTAL_EVENTS_TO_GENERATE` to increase/decrease the load.
"""

import json
import uuid
import random
import time
from datetime import datetime, timedelta
from kafka import KafkaProducer

# Configuration
KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092'
KAFKA_TOPIC = 'expense-events'
TOTAL_EVENTS_TO_GENERATE = 500  # Number of expense approval events to dump into Kafka
MESSAGES_PER_SECOND = 50        # Throttle to avoid breaking local Docker instantly

# Mock Data Pools (Simulate 5 companies, each with 2 budgets, and random categories)
COMPANIES = [str(uuid.uuid4()) for _ in range(5)]
BUDGETS_PER_COMPANY = 2
BUDGET_MAP = {company: [str(uuid.uuid4()) for _ in range(BUDGETS_PER_COMPANY)] for company in COMPANIES}
CATEGORIES = ["Software", "Travel", "Office Supplies", "Meals", "Marketing", "Server Infrastructure"]

def get_random_date_this_year():
    """Returns a random ISO-8601 date string from within the last 120 days."""
    days_back = random.randint(0, 120)
    random_date = datetime.utcnow() - timedelta(days=days_back)
    return random_date.isoformat() + "Z"

def generate_random_expense_event():
    """Generates a JSON payload matching the exact structure from the Java Expense Service."""
    company_id = random.choice(COMPANIES)
    budget_id = random.choice(BUDGET_MAP[company_id])
    category = random.choice(CATEGORIES)
    amount = round(random.uniform(10.0, 5000.0), 2)
    expense_uuid = str(uuid.uuid4())

    event = {
        "id": expense_uuid,
        "companyId": company_id,
        "budgetId": budget_id,
        "allocationName": category,
        "amount": amount,
        "spentDate": get_random_date_this_year(),
        "type": random.choice(["BUSINESS", "PERSONAL"]),
        "reference": f"LoadTest-{expense_uuid[:8]}",
        "createdBy": "LoadTesterBot",
        "role": "OWNER"
    }
    return event

def run_load_test():
    print(f"🚀 Initializing Kafka Producer to {KAFKA_BOOTSTRAP_SERVERS}...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            retries=3
        )
    except Exception as e:
        print(f"❌ Failed to connect to Kafka. Is Docker running? Error: {e}")
        return

    print(f"✅ Connected! Pumping {TOTAL_EVENTS_TO_GENERATE} events into '{KAFKA_TOPIC}'...")

    total_sent = 0
    start_time = time.time()

    for i in range(TOTAL_EVENTS_TO_GENERATE):
        event = generate_random_expense_event()
        
        # Publish to Kafka
        producer.send(KAFKA_TOPIC, event)
        total_sent += 1

        # Print progress every 10% 
        if total_sent % max(1, (TOTAL_EVENTS_TO_GENERATE // 10)) == 0:
            print(f"   ... Sent {total_sent}/{TOTAL_EVENTS_TO_GENERATE} events")

        # Basic throttling
        time.sleep(1.0 / MESSAGES_PER_SECOND)

    producer.flush()
    elapsed = time.time() - start_time
    print(f"\n🎉 Load Test Complete!")
    print(f"📊 Summary: Sent {total_sent} expense events in {elapsed:.2f} seconds.")
    print("👉 Now check the Analysis Service logs or MongoDB Atlas to see them arrive instantly!")

if __name__ == "__main__":
    run_load_test()
