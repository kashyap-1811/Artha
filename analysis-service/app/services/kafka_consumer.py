import json
import logging
import os
from aiokafka import AIOKafkaConsumer
import asyncio
from app.core.config import MONGO_DETAILS

logger = logging.getLogger(__name__)

# Read from env so it works locally (localhost:9092) and inside Docker (kafka:29092)
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = "expense-events"

async def consume_expense_events(app):
    """
    Background Kafka consumer task.
    Listens to 'expense-events' and updates standard MongoDB Atlas analysis collections.
    """
    while True:
        try:
            consumer = AIOKafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="analysis-group",
                value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None
            )

            await consumer.start()
            logger.info(f"Started Kafka Consumer on {KAFKA_BOOTSTRAP_SERVERS}, topic: {KAFKA_TOPIC}")

            try:
                # We need the motor client that was initialized in main.py
                db = app.state.mongodb_client.get_database("artha_analysis")
                collection = db.get_collection("budget_expenses")

                async for msg in consumer:
                    expense_data = msg.value
                    logger.info(f"Received Expense Event: {expense_data}")

                    # CQRS pattern -> We store pre-calculated or grouped data for instant reads later
                    if expense_data and "budgetId" in expense_data and "companyId" in expense_data:
                        
                        # The Java expense-service now resolves allocationName before publishing to kafka.
                        allocation_name = expense_data.get("allocationName") or "Uncategorized"
                        logger.info(f"Processing expense: allocationName={allocation_name}, amount={expense_data.get('amount')}")

                        # Upsert record so that the frontend can fetch this blazing fast
                        await collection.update_one(
                            {"budget_id": expense_data["budgetId"], "company_id": expense_data["companyId"]},
                            {
                                "$inc": {"total_approved_amount": expense_data.get("amount", 0.0)},
                                "$push": {
                                    "expense_history": {
                                        "expense_id": expense_data.get("id"),
                                        "category": allocation_name,
                                        "amount": expense_data.get("amount"),
                                        "date": expense_data.get("spentDate")
                                    }
                                }
                            },
                            upsert=True
                        )
                        logger.info(f"Cached expense for budget {expense_data['budgetId']} with category '{allocation_name}'")
            finally:
                await consumer.stop()
                logger.info("Kafka Consumer stopped.")

        except asyncio.CancelledError:
            logger.info("Kafka Consumer shutdown gracefully.")
            break
        except Exception as e:
            logger.error(f"Error connecting to Kafka (is it running?): {e}. Retrying in 10s...")
            await asyncio.sleep(10)
