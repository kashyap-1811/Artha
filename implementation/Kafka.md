# Kafka Implementation

## 1. Overview

Artha uses **Apache Kafka** as its event streaming backbone to decouple the operational microservices (expense, budget, user) from the analytical and notification services. Rather than having downstream services poll for changes or coupling them with synchronous REST calls, every significant state change is published as an immutable event to a Kafka topic. Consumers process these events at their own pace, independently of the producer.

**Three core problems Kafka solves in Artha:**

| Problem | Solution |
|---|---|
| Analytics service needs real-time data without polling PostgreSQL | Expense and budget events stream into the analysis service, which maintains a pre-aggregated MongoDB read model (CQRS pattern) |
| Notification service must send emails without blocking the expense approval request | Events are published asynchronously post-commit; the notification service processes them out-of-band |
| Transactional outbox consistency | All Java producers defer the Kafka send to `afterCommit()`, ensuring events are never published for rolled-back database transactions |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Producers (Kafka Publishers)                        │
│                                                                              │
│  expense-service  ──► expense-events ──────────────────────────────────┐    │
│  budget-service   ──► budget-events  ─────────────────────────┐        │    │
│  user-service     ──► company-events ──────────────┐          │        │    │
└────────────────────────────────────────────────────┼──────────┼────────┼────┘
                                                     │          │        │
                                         ┌───────────▼──┐  ┌───▼───┐  ┌─▼──────────────────┐
                                         │notification- │  │       │  │                    │
                                         │service       │  │analys-│  │  analysis-service  │
                                         │(Node.js /    │  │is-ser-│  │  (Python / AIOKafka│
                                         │ KafkaJS)     │  │vice   │  │   budget consumer) │
                                         │              │  │       │  │                    │
                                         │ expense-     │  │expense│  │ budget-events      │
                                         │  consumer    │  │consumer│ │ consumer           │
                                         │ company-     │  │       │  │                    │
                                         │  consumer    │  │MongoDB│  │  MongoDB Atlas     │
                                         │              │  │Atlas  │  │  budget_metadata   │
                                         │ → SendGrid   │  │budget_│  │  budget_expenses   │
                                         │   email      │  │expens-│  │                    │
                                         │   alerts     │  │es     │  │                    │
                                         └──────────────┘  └───────┘  └────────────────────┘
```

**Event flow summary:**

1. A user action (approve expense, create budget, add member) triggers a write to PostgreSQL inside a `@Transactional` method.
2. After the transaction commits, `KafkaEventPublisher.send()` dispatches the serialised event JSON to the appropriate topic.
3. Consumer services receive the event from their topic partition and process it asynchronously.
4. `analysis-service` writes the event data into MongoDB Atlas and invalidates the relevant Redis cache keys.
5. `notification-service` evaluates budget thresholds, fetches additional context via internal REST calls, and sends emails via SendGrid.

---

## 3. Kafka Topics

| Topic | Producer | Consumers | Purpose |
|---|---|---|---|
| `expense-events` | `expense-service` | `analysis-service`, `notification-service` | Approved expense lifecycle events (create / update / delete) |
| `budget-events` | `budget-service` | `analysis-service` | Budget and category allocation lifecycle events |
| `company-events` | `user-service` | `notification-service` | Company membership change events (add / remove / role change) |

### Topic Partitioning and Keys

All events are keyed by a domain identifier so related events land in the same partition and are processed in order:

| Topic | Partition key |
|---|---|
| `expense-events` | `expense.id` (UUID string) |
| `budget-events` | `budget.id` (UUID string) |
| `company-events` | `company.id` (String) |

---

## 4. Event Schemas

### 4.1 `expense-events` — `ExpenseResponse`

Published by `expense-service` only for **APPROVED** expenses. The `action` field identifies the lifecycle stage.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "companyId": "comp-abc123",
  "budgetId": "550e8400-e29b-41d4-a716-446655440002",
  "allocationId": "550e8400-e29b-41d4-a716-446655440003",
  "allocationName": "Marketing",
  "amount": 1500.00,
  "oldAmount": 0,
  "spentDate": "2026-03-15",
  "type": "OPERATIONAL",
  "reference": "INV-2026-001",
  "status": "APPROVED",
  "action": "CREATED",
  "warning": false,
  "createdAt": "2026-03-15T10:30:00"
}
```

**`action` values:**

| Action | Trigger |
|---|---|
| `CREATED` | Expense approved (`approveExpense`) |
| `UPDATED` | Approved expense amount or details changed (`updateExpense` when `status == APPROVED`) |
| `DELETED` | Approved expense deleted (`deleteExpense` when `status == APPROVED`) |

> Pending and rejected expenses do **not** generate Kafka events — only approved expenses affect the analytics read model and may trigger budget notifications.

### 4.2 `budget-events` — `BudgetEvent` or `AllocationEvent`

Both event types share the `budget-events` topic. The `eventType` field identifies which domain object changed:

**`BudgetEvent`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "companyId": "comp-abc123",
  "name": "Q1 2026 Budget",
  "totalAmount": 50000.00,
  "status": "ACTIVE",
  "action": "CREATED",
  "eventType": "BUDGET_CREATED"
}
```

| `eventType` | `action` | Trigger |
|---|---|---|
| `BUDGET_CREATED` | `CREATED` | `createBudget` |
| `BUDGET_UPDATED` | `UPDATED` | `updateBudget` |
| `BUDGET_CLOSED` | `CLOSED` | `closeBudget` |
| `BUDGET_DELETED` | `DELETED` | `removeBudget` |

**`AllocationEvent`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "budgetId": "550e8400-e29b-41d4-a716-446655440002",
  "categoryName": "Marketing",
  "allocatedAmount": 10000.00,
  "alertThreshold": 80,
  "action": "CREATED",
  "eventType": "ALLOCATION_CREATED"
}
```

| `eventType` | `action` | Trigger |
|---|---|---|
| `ALLOCATION_CREATED` | `CREATED` | `addCategoryAllocation` |
| `ALLOCATION_UPDATED` | `UPDATED` | `updateAllocation` |
| `ALLOCATION_DELETED` | `DELETED` | `removeCategoryAllocation` |

The `analysis-service` consumer distinguishes the two types by checking `event.get("eventType").startsWith("ALLOCATION")`.

### 4.3 `company-events` — `CompanyMemberEvent`

```json
{
  "eventType": "MEMBER_ADDED",
  "companyId": "comp-abc123",
  "companyName": "Acme Corp",
  "targetUserId": "user-789",
  "targetUserEmail": "alice@example.com",
  "targetUserFullName": "Alice Smith",
  "newRole": "ADMIN"
}
```

| `eventType` | Trigger |
|---|---|
| `MEMBER_ADDED` | `addMember` in `CompanyService` |
| `MEMBER_REMOVED` | `removeMember` in `CompanyService` |
| `ROLE_CHANGED` | Role update in `CompanyService` |

---

## 5. Java Producers (Spring Kafka)

### 5.1 KafkaEventPublisher — Transactional-Aware

All three Java services (`expense-service`, `budget-service`, `user-service`) share an identical `KafkaEventPublisher` component:

```java
@Component
@Slf4j
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void send(String topic, String key, Object event) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            // Inside a @Transactional method — defer send until after DB commit
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doSend(topic, key, event);
                }
            });
        } else {
            // No active transaction — send immediately
            doSend(topic, key, event);
        }
    }

    private void doSend(String topic, String key, Object event) {
        kafkaTemplate.send(topic, key, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish event to topic: {} with key: {}", topic, key, ex);
            } else {
                log.debug("Successfully published event to topic: {} with key: {}", topic, key);
            }
        });
    }
}
```

**Why defer to `afterCommit()`?**

All write operations in the Java services run inside `@Transactional` methods. If the Kafka send happened *before* the transaction committed:

- A transaction rollback (e.g., validation failure, DB error) would still result in an event being published — consumers would receive an event for a change that never actually persisted.
- By registering the send in `afterCommit()`, the event is only dispatched once the database row is durably committed.

**Failure handling:** If the Kafka broker is unavailable after commit, the event is lost (at-most-once delivery). This is an acceptable trade-off for this use case — the analytics read model will resync when the next event arrives, and the notification service uses deduplication to avoid double alerts.

### 5.2 Spring Kafka Producer Configuration

Both `expense-service` and `budget-service` have identical Kafka producer configuration (in `application.properties`):

```properties
# Kafka producer
spring.kafka.producer.bootstrap-servers=${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer

# SSL (for production cloud Kafka)
spring.kafka.properties.security.protocol=${KAFKA_SECURITY_PROTOCOL:PLAINTEXT}
spring.kafka.ssl.trust-store-location=classpath:certs/client.truststore.jks
spring.kafka.ssl.trust-store-password=${KAFKA_SSL_TRUSTSTORE_PASSWORD:}
spring.kafka.ssl.key-store-location=classpath:certs/client.keystore.p12
spring.kafka.ssl.key-store-password=${KAFKA_SSL_KEYSTORE_PASSWORD:}
spring.kafka.ssl.key-password=${KAFKA_SSL_KEYSTORE_PASSWORD:}
```

Events are serialised to JSON using `JsonSerializer`. The partition key is always the domain entity ID (String), so Spring Kafka's `KafkaTemplate.send(topic, key, value)` sends them to a consistent partition per entity.

---

## 6. Python Consumer — Analysis Service (`AIOKafkaConsumer`)

The `analysis-service` runs two independent async consumer loops — one for `expense-events` and one for `budget-events`.

### 6.1 Consumer Lifecycle

```python
async def consume_expense_events(app):
    while True:
        try:
            consumer = AIOKafkaConsumer(
                "expense-events",
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id=ANALYSIS_EXPENSE_GROUP_ID,      # "analysis-expense-group"
                value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None,
                enable_auto_commit=False,                # Manual commit after DB write
                auto_offset_reset='earliest',
                security_protocol="SSL" if KAFKA_SSL_ENABLED else "PLAINTEXT",
                ssl_context=create_ssl_context() if KAFKA_SSL_ENABLED else None
            )
            await consumer.start()
            try:
                async for msg in consumer:
                    # ... process event ...
                    await consumer.commit()   # Commit only after successful MongoDB write
            finally:
                await consumer.stop()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Expense Consumer error: {e}")
            await asyncio.sleep(10)          # Retry after 10 s on unexpected error
```

Key design decisions:

| Decision | Reason |
|---|---|
| **`enable_auto_commit=False`** | Offsets are committed manually only after the MongoDB upsert succeeds, preventing data loss if the service crashes mid-processing |
| **`auto_offset_reset='earliest'`** | On first startup or consumer group reset, replay from the beginning of the topic to rebuild the MongoDB read model from scratch |
| **Retry loop** | If the broker is temporarily unavailable or the consumer crashes, the loop restarts after 10 seconds |
| **`asyncio.CancelledError` break** | Cleanly exits the loop during graceful shutdown |

### 6.2 Expense Event Processing

| `action` field | MongoDB operation |
|---|---|
| `CREATED` | `update_one` with `$inc` on `total_approved_amount` + `$push` expense entry to `expense_history` (upsert=True) |
| `UPDATED` | `update_one` with `$inc` of the diff (`amount - oldAmount`) + `$set` the matching `expense_history` entry by `expense_id` |
| `DELETED` | `update_one` with `$inc` of `-amount` + `$pull` expense entry by `expense_id` |

After every operation, `clear_analysis_cache(redis, company_id, budget_id)` evicts the Redis cache keys for that company/budget using a `keys("company_analysis:comp-xxx:*")` pattern scan.

### 6.3 Budget Event Processing

| `eventType` | MongoDB operation |
|---|---|
| `BUDGET_CREATED` / `BUDGET_UPDATED` / `BUDGET_CLOSED` | `update_one` upsert in `budget_metadata` collection + clear company Redis cache |
| `BUDGET_DELETED` | `delete_one` from `budget_metadata` + clear budget Redis cache |
| `ALLOCATION_CREATED` / `ALLOCATION_UPDATED` | `update_one` upsert in `budget_metadata` + clear company Redis cache |
| `ALLOCATION_UPDATED` (name change) | Additionally propagates the new `categoryName` to matching `expense_history` entries in `budget_expenses` via array filters |
| `ALLOCATION_DELETED` | `delete_one` from `budget_metadata` + sets matching expense history entries to `"Uncategorized"` |

### 6.4 SSL Context (Aiven Kafka)

The analysis service connects to Aiven-managed Kafka using PEM certificate files:

```python
def create_ssl_context():
    context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=KAFKA_CA_CERT)
    context.load_cert_chain(certfile=KAFKA_SERVICE_CERT, keyfile=KAFKA_SERVICE_KEY)
    return context
```

Certificate paths are resolved relative to the application root (`BASE_DIR = /app/app` inside Docker):

```
/app/app/certs/ca.pem          — CA certificate for server authentication
/app/app/certs/service.cert    — Client certificate
/app/app/certs/service.key     — Client private key
```

---

## 7. Node.js Consumer — Notification Service (KafkaJS)

The `notification-service` runs two KafkaJS consumers started at application boot.

### 7.1 Consumer Setup

```js
const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    ssl: process.env.KAFKAJS_SSL === 'true' ? {
        rejectUnauthorized: false,
        ca:   [fs.readFileSync('src/certs/ca.pem',       'utf-8')],
        key:   fs.readFileSync('src/certs/service.key',   'utf-8'),
        cert:  fs.readFileSync('src/certs/service.cert',  'utf-8')
    } : undefined
});

// Expense consumer
const consumer = kafka.consumer({
    groupId: process.env.NOTIFICATION_EXPENSE_GROUP_ID || 'notification-expense-group'
});
await consumer.subscribe({ topic: 'expense-events' });

// Company consumer
const companyConsumer = kafka.consumer({
    groupId: process.env.NOTIFICATION_COMPANY_GROUP_ID || 'notification-company-group'
});
await companyConsumer.subscribe({ topic: 'company-events' });
```

Both consumers use `connectAndRun` with a 10-second retry loop so that transient broker unavailability does not crash the service.

### 7.2 Expense Event Handling

On receiving an `expense-events` message:

1. Skip events where `status !== 'APPROVED'` — only approved expenses require notification checks.
2. Fetch company members via `GET /internal/user/api/companies/{companyId}/members`.
3. Identify the company OWNER; abort if none found.
4. Fetch full budget details via `GET /internal/budget/api/budgets/{budgetId}/details` (authenticated as the owner).
5. Find the allocation matching `allocationId` in the budget response.
6. Fetch all approved expenses for the allocation via `GET /internal/expense/api/expenses/allocation/{allocationId}`.
7. Compute `spentPercentage = totalSpent / allocatedAmount * 100`.
8. Trigger alert email if threshold conditions are met:
   - `spentPercentage >= 100` → `EXCEED_ALERT` (budget exceeded)
   - `spentPercentage >= alertThreshold` → `THRESHOLD_ALERT` (threshold reached)

**Deduplication:** Before sending an email, the service checks MongoDB `notifications` collection for an existing `{allocationId, type}` document. If one exists, the alert is skipped. This prevents repeated emails for the same threshold breach.

### 7.3 Company Event Handling

On receiving a `company-events` message, the service sends a personalised email to `targetUserEmail` based on `eventType`:

| `eventType` | Email subject | Email content |
|---|---|---|
| `MEMBER_ADDED` | `You've been added to {companyName}` | Welcome email with role |
| `MEMBER_REMOVED` | `Update regarding {companyName}` | Membership revoked notice |
| `ROLE_CHANGED` | `Role updated in {companyName}` | New role announcement |

Company event emails are not deduplicated — each event generates exactly one email.

---

## 8. Consumer Groups

| Consumer group ID | Service | Topic |
|---|---|---|
| `notification-expense-group` | `notification-service` | `expense-events` |
| `notification-company-group` | `notification-service` | `company-events` |
| `analysis-expense-group` | `analysis-service` | `expense-events` |
| `analysis-budget-group` | `analysis-service` | `budget-events` |

Each group receives **all** messages from its topic independently. Both `analysis-service` and `notification-service` consume from `expense-events` using separate consumer groups, so both receive every event.

Consumer group IDs are externalised as environment variables:

```yaml
# docker-compose.yml
NOTIFICATION_EXPENSE_GROUP_ID: ${NOTIFICATION_EXPENSE_GROUP_ID:-notification-expense-group}
NOTIFICATION_COMPANY_GROUP_ID: ${NOTIFICATION_COMPANY_GROUP_ID:-notification-company-group}
ANALYSIS_EXPENSE_GROUP_ID:     ${ANALYSIS_EXPENSE_GROUP_ID:-analysis-expense-group}
ANALYSIS_BUDGET_GROUP_ID:      ${ANALYSIS_BUDGET_GROUP_ID:-analysis-budget-group}
```

---

## 9. SSL / TLS Configuration

### 9.1 Production (Cloud-Managed Kafka)

Production deployments use a cloud-managed Kafka cluster (Aiven or Confluent Cloud) over SSL/TLS. Certificate files are mounted read-only into each container via Docker Compose:

```yaml
volumes:
  - ./certs:/app/certs:ro        # Java services (expense, budget, user)
  - ./certs:/app/src/certs:ro    # notification-service
  - ./certs:/app/app/certs:ro    # analysis-service
```

The `./certs/` directory at the repository root must contain:

| File | Format | Used by |
|---|---|---|
| `client.truststore.jks` | JKS | Java services (Spring Kafka SSL truststore) |
| `client.keystore.p12` | PKCS12 | Java services (Spring Kafka SSL keystore) |
| `ca.pem` | PEM | Python (`aiokafka`) and Node.js (`kafkajs`) |
| `service.cert` | PEM | Python and Node.js |
| `service.key` | PEM | Python and Node.js |

> These files are excluded by `.gitignore`. **Never commit certificate files to version control.**

### 9.2 Java SSL Properties

```properties
spring.kafka.properties.security.protocol=SSL
spring.kafka.ssl.trust-store-location=classpath:certs/client.truststore.jks
spring.kafka.ssl.trust-store-password=${KAFKA_SSL_TRUSTSTORE_PASSWORD}
spring.kafka.ssl.key-store-location=classpath:certs/client.keystore.p12
spring.kafka.ssl.key-store-password=${KAFKA_SSL_KEYSTORE_PASSWORD}
spring.kafka.ssl.key-password=${KAFKA_SSL_KEYSTORE_PASSWORD}
```

For Docker deployments, `SPRING_KAFKA_SSL_TRUST_STORE_LOCATION` and `SPRING_KAFKA_SSL_KEY_STORE_LOCATION` override the classpath locations to use the mounted volume path (`file:/app/certs/`).

### 9.3 Python SSL Configuration

Controlled by `KAFKA_SSL_ENABLED=true` in the environment. When enabled, `create_ssl_context()` builds a standard `ssl.SSLContext` from the PEM files at `BASE_DIR/certs/`.

### 9.4 Node.js SSL Configuration

Controlled by `KAFKAJS_SSL=true`. When set, the KafkaJS client is constructed with an `ssl` block containing the PEM certificate contents read synchronously at startup.

---

## 10. Local Development Infrastructure

`docker-compose.infra.yml` provides a local single-broker Kafka cluster without SSL for development:

```
┌────────────────────────────────────┐
│  docker-compose.infra.yml          │
│                                    │
│  zookeeper  (port 2181)            │
│  kafka      (port 9092 / 29092)    │
│  kafka-ui   (port 8085)            │
└────────────────────────────────────┘
```

**Dual-listener setup:**

| Listener name | Address | Purpose |
|---|---|---|
| `PLAINTEXT_HOST` | `${SERVER_IP:-localhost}:9092` | Host-machine services (running natively) |
| `PLAINTEXT_INTERNAL` | `kafka:29092` | Container-to-container communication |

When running services natively (outside Docker), use `KAFKA_BOOTSTRAP_SERVERS=localhost:9092` and `KAFKA_SECURITY_PROTOCOL=PLAINTEXT`.

**Kafka UI** is available at `http://localhost:8085` to inspect topics, consumer group lag, and individual messages during development.

**Create topics manually (optional):**

```bash
# Using the helper script included in notification-service
node notification-service/src/create-topics.js
```

---

## 11. Performance — Load Test Results

A load test was conducted against the full `expense-events → analysis-service → MongoDB Atlas` pipeline on 7 March 2026.

| Metric | Value |
|---|---|
| Total events generated | 500 |
| Total execution time | 11.95 s |
| Average producer throughput | ~41.8 messages/s |
| Consumer (analysis-service) errors | 0 |
| MongoDB upsert operations | 500 |
| Data loss | 0 |

All 500 events were consumed and persisted by the analysis service with zero errors. Post-test validation confirmed correct category breakdown, spending trend, and top-spender calculations across all test companies and budgets.

---

## 12. Advantages

| Advantage | Explanation |
|---|---|
| **Loose coupling** | Expense, budget, and user services publish events without knowing who consumes them. Adding a new consumer (e.g., an audit service) requires zero changes to producers. |
| **Transactional safety** | Deferring Kafka sends to `afterCommit()` prevents phantom events for rolled-back transactions. |
| **Asynchronous processing** | Budget threshold checks (which involve multiple HTTP calls to fetch members, budget details, and expenses) happen out-of-band — they do not add latency to the expense approval response. |
| **Event replay** | `auto_offset_reset='earliest'` allows the analysis service to rebuild its MongoDB read model from scratch by replaying the full event history. |
| **Independent scaling** | Consumer services can be scaled horizontally; Kafka distributes partitions across instances within the same consumer group. |
| **Operational visibility** | Kafka UI exposes topic offsets, consumer group lag, and message contents. Redis stores the current computed analytics in human-readable JSON, inspectable with `redis-cli`. |

---

## 13. Possible Improvements

- **Dead-letter topic (DLT).** Messages that fail processing after N retries are currently dropped (the consumer logs the error and sleeps 10 s before retrying the entire consumer). A dedicated DLT would capture failed messages for manual inspection and replay without blocking the main topic.
- **Idempotent producers.** Spring Kafka's `enable.idempotence=true` option ensures each message is written to the broker exactly once even if the producer retries due to a transient network error. This guards against duplicate events caused by producer-side retries.
- **Schema registry.** Currently, event schemas are informal (plain JSON objects). Integrating a Confluent Schema Registry with Avro or Protobuf schemas would enforce schema evolution rules and prevent consumers from breaking when producer DTOs change.
- **Transactional Kafka producer.** Spring Kafka supports full Kafka transactions (`spring.kafka.producer.transaction-id-prefix`). With this, the producer and the DB write could participate in a distributed transaction, guaranteeing atomic commit/abort across both systems.
- **Multi-partition topics.** All topics currently use the default single partition. Adding multiple partitions would allow multiple consumer instances to process events in parallel, improving throughput for high-volume deployments.
- **Consumer group lag monitoring.** Exporting Kafka consumer group lag to Prometheus/Grafana would provide an early warning when the analysis or notification service falls behind the producer.
