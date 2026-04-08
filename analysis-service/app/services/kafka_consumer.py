import json
import logging
import os
from aiokafka import AIOKafkaConsumer
import asyncio
from app.core.cache import clear_analysis_cache
from app.core.config import KAFKA_BOOTSTRAP_SERVERS

logger = logging.getLogger(__name__)


EXPENSE_TOPIC = "expense-events"
BUDGET_TOPIC = "budget-events"

async def consume_expense_events(app):
    while True:
        try:
            consumer = AIOKafkaConsumer(
                EXPENSE_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="analysis-expense-group",
                value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None,
                enable_auto_commit=False,
                auto_offset_reset='earliest'
            )

            await consumer.start()
            logger.info(f"Started Expense Consumer on {KAFKA_BOOTSTRAP_SERVERS}, topic: {EXPENSE_TOPIC}")

            try:
                db = app.state.mongodb_client.get_database("artha_analysis")
                collection = db.get_collection("budget_expenses")

                async for msg in consumer:
                    expense_data = msg.value
                    if not expense_data: continue
                    
                    action = expense_data.get("action", "CREATED")
                    budget_id = expense_data.get("budgetId")
                    company_id = expense_data.get("companyId")
                    expense_id = expense_data.get("id")
                    allocation_id = expense_data.get("allocationId")
                    amount = expense_data.get("amount", 0.0)
                    allocation_name = expense_data.get("allocationName") or "Uncategorized"

                    if not budget_id or not company_id: continue

                    if action == "CREATED":
                        await collection.update_one(
                            {"budget_id": budget_id, "company_id": company_id},
                            {
                                "$inc": {"total_approved_amount": amount},
                                "$push": {
                                    "expense_history": {
                                        "expense_id": expense_id,
                                        "allocation_id": allocation_id,
                                        "category": allocation_name,
                                        "amount": amount,
                                        "date": expense_data.get("spentDate")
                                    }
                                }
                            },
                            upsert=True
                        )
                    elif action == "UPDATED":
                        old_amount = expense_data.get("oldAmount", 0.0)
                        diff = amount - old_amount
                        await collection.update_one(
                            {"budget_id": budget_id, "company_id": company_id, "expense_history.expense_id": expense_id},
                            {
                                "$inc": {"total_approved_amount": diff},
                                "$set": {
                                    "expense_history.$.amount": amount,
                                    "expense_history.$.allocation_id": allocation_id,
                                    "expense_history.$.category": allocation_name,
                                    "expense_history.$.date": expense_data.get("spentDate")
                                }
                            }
                        )
                    elif action == "DELETED":
                        await collection.update_one(
                            {"budget_id": budget_id, "company_id": company_id},
                            {
                                "$inc": {"total_approved_amount": -amount},
                                "$pull": {"expense_history": {"expense_id": expense_id}}
                            }
                        )
                    
                    # Invalidate Cache
                    await clear_analysis_cache(app.state.redis, company_id=company_id, budget_id=budget_id)
                    
                    # Manual commit after successful DB write
                    await consumer.commit()
                    
            finally:
                await consumer.stop()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Expense Consumer error: {e}")
            await asyncio.sleep(10)

async def consume_budget_events(app):
    while True:
        try:
            consumer = AIOKafkaConsumer(
                BUDGET_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="analysis-budget-group",
                value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None,
                enable_auto_commit=False,
                auto_offset_reset='earliest'
            )

            await consumer.start()
            logger.info(f"Started Budget Consumer on {KAFKA_BOOTSTRAP_SERVERS}, topic: {BUDGET_TOPIC}")

            try:
                db = app.state.mongodb_client.get_database("artha_analysis")
                metadata_coll = db.get_collection("budget_metadata")
                expenses_coll = db.get_collection("budget_expenses")

                async for msg in consumer:
                    event = msg.value
                    if not event: continue
                    
                    action = event.get("action")
                    event_id = event.get("id")
                    
                    # Distinguish between Budget and Allocation via explicit eventType
                    event_type = event.get("eventType", "")
                    is_allocation = event_type.startswith("ALLOCATION")

                    if action == "DELETED":
                        await metadata_coll.delete_one({"id": event_id})
                        
                        if is_allocation:
                            budget_id = event.get("budgetId")
                            await expenses_coll.update_one(
                                {"budget_id": budget_id},
                                {"$set": {"expense_history.$[elem].category": "Uncategorized", "expense_history.$[elem].allocation_id": None}},
                                array_filters=[{"elem.allocation_id": event_id}]
                            )
                            await clear_analysis_cache(app.state.redis, budget_id=budget_id)
                        else:
                            await clear_analysis_cache(app.state.redis, budget_id=event_id)
                    else:
                        await metadata_coll.update_one(
                            {"id": event_id},
                            {"$set": event},
                            upsert=True
                        )
                        
                        # Clear caches for this budget/company
                        company_id = event.get("companyId")
                        await clear_analysis_cache(app.state.redis, company_id=company_id)
                        if not is_allocation: 
                            await clear_analysis_cache(app.state.redis, budget_id=event_id)
                        
                        # Handle Name Change Propagation for Allocations
                        if is_allocation and action == "UPDATED":
                            budget_id = event.get("budgetId")
                            new_name = event.get("categoryName")
                            logger.info(f"Propagating allocation name change: {event_id} -> {new_name}")
                            
                            await expenses_coll.update_one(
                                {"budget_id": budget_id},
                                {"$set": {"expense_history.$[elem].category": new_name}},
                                array_filters=[{"elem.allocation_id": event_id}]
                            )
                            await clear_analysis_cache(app.state.redis, budget_id=budget_id)
                    
                    # Manual commit after successful processing
                    await consumer.commit()
            finally:
                await consumer.stop()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Budget Consumer error: {e}")
            await asyncio.sleep(10)
