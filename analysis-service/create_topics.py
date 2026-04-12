import asyncio
import ssl
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from app.core.config import KAFKA_BOOTSTRAP_SERVERS, KAFKA_SSL_ENABLED, KAFKA_CA_CERT, KAFKA_SERVICE_CERT, KAFKA_SERVICE_KEY

def create_ssl_context():
    context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=KAFKA_CA_CERT)
    context.load_cert_chain(certfile=KAFKA_SERVICE_CERT, keyfile=KAFKA_SERVICE_KEY)
    return context

async def create_topics():
    admin = AIOKafkaAdminClient(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        security_protocol="SSL" if KAFKA_SSL_ENABLED else "PLAINTEXT",
        ssl_context=create_ssl_context() if KAFKA_SSL_ENABLED else None
    )
    await admin.start()
    
    topics_to_create = ["company-events", "expense-events", "budget-events"]
    # get existing topics
    # Create the ones that dont exist
    new_topics = [NewTopic(name=topic, num_partitions=1, replication_factor=1) for topic in topics_to_create]
    try:
        await admin.create_topics(new_topics)
        print("Topics created successfully!")
    except Exception as e:
        print(f"Error, maybe already exists: {e}")
    finally:
        await admin.close()

if __name__ == "__main__":
    asyncio.run(create_topics())
