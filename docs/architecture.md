# Artha — Architecture & Technology Decisions

This document explains each infrastructure technology used in Artha: what it is, why it was chosen, and exactly how it is implemented inside this repository.

---

## Table of Contents

1. [Rate Limiting → Redis](#1-rate-limiting--redis)
2. [Messaging Queue → Kafka](#2-messaging-queue--kafka)
3. [Containerization → Docker](#3-containerization--docker)
4. [Service Registry → Netflix Eureka](#4-service-registry--netflix-eureka)
5. [API Gateway → Spring Cloud Gateway](#5-api-gateway--spring-cloud-gateway)
6. [Why Individual Database per Microservice](#6-why-individual-database-per-microservice)

---

## 1. Rate Limiting → Redis

### What it is

Rate limiting controls how many requests a client (user, session, or IP address) can make within a fixed time window. Redis is used as the backing store because it supports fast, atomic counter operations that work correctly even when multiple gateway instances are running simultaneously.

### Why it is added

- **Abuse prevention** — Stops bots, credential-stuffing attacks, and denial-of-service spikes before they reach backend services.
- **Fair usage** — Ensures one heavy user cannot consume all available capacity and degrade the experience for everyone else.
- **Stability** — Prevents a single noisy caller from triggering cascading failures across downstream services (user-service, budget, expense).
- **Horizontal-scale correctness** — Because the counter lives in a shared Redis instance, the limit is enforced correctly even when multiple API Gateway pods are running.

### How it is implemented in this project

**Infrastructure** — Redis runs as the `redis` service in both compose files:

| File | Service | Image | Port |
|---|---|---|---|
| `docker-compose.yml` | `redis` | `redis:7-alpine` | `6379` |
| `docker-compose.infra.yml` | `redis` | `redis:7-alpine` | `6379` |

Redis uses append-only persistence (`--appendonly yes`) and a named volume (`redis-data`). The gateway connects to it via the environment variables:

```yaml
# docker-compose.yml — api-gateway service
SPRING_DATA_REDIS_HOST: redis
SPRING_DATA_REDIS_PORT: 6379
```

**Maven dependency** — `api-gateway/pom.xml` includes the reactive Redis starter required by Spring Cloud Gateway's built-in rate-limiter filter:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

**Key resolver** — `api-gateway/src/main/java/com/artha/apigateway/config/RateLimitConfig.java` defines a Spring bean named `userKeyResolver` that decides which bucket a request counts against, using a priority chain:

1. `X-User-Id` header injected by the JWT filter (most precise — per authenticated user).
2. JWT claim `userId` extracted directly from the `Bearer` token.
3. JWT claim `email` (fallback for older tokens without `userId`).
4. Client IP address (for unauthenticated requests such as `/auth/login`).
5. Literal string `"anonymous"` (last resort).

The Redis key format used by Spring Cloud Gateway's `RequestRateLimiter` filter is therefore prefixed with one of: `user-id:`, `email:`, or `ip:`.

**Rate-limit filter** — The actual `redis-rate-limiter` filter (token-bucket algorithm) and its `replenishRate` / `burstCapacity` values are configured in `api-gateway/src/main/resources/application.yaml` (gitignored to keep secrets out of version control). The filter is wired to the `userKeyResolver` bean defined above.

**Verification** — Load tests in `api-gateway/k6/rate-limit-auth-hello.js` use k6 to fire 100 requests/second and assert that HTTP `429 Too Many Requests` responses are returned once the limit is exceeded.

---

## 2. Messaging Queue → Kafka

### What it is

Apache Kafka is a distributed event-streaming platform. Producers publish records to named topics, and consumers read them asynchronously in their own time and at their own pace. Kafka retains messages on disk, so consumers can replay events and late joiners can catch up.

### Why it is added

- **Decoupling** — The expense-service does not need to know about the analysis-service or the notification-service. It just publishes an event and moves on.
- **Reliability** — Even if a consumer is temporarily down (e.g., during a deployment), messages are retained in Kafka and processed once the consumer restarts.
- **Performance** — Long-running work (sending emails, updating MongoDB analytics caches) is moved off the synchronous HTTP request path, so the expense approval API responds in milliseconds instead of seconds.
- **CQRS read model** — The analysis-service consumes events to build a pre-aggregated MongoDB cache, enabling O(1) dashboard reads without hitting the relational database.
- **Replay** — If the analytics cache needs to be rebuilt, the consumer can be reset to replay past events from the beginning of the topic.

### How it is implemented in this project

**Infrastructure** — Kafka runs alongside Zookeeper as part of the Confluent Platform images:

| Service | Image | Ports |
|---|---|---|
| `zookeeper` | `confluentinc/cp-zookeeper:7.8.0` | `2181` |
| `kafka` | `confluentinc/cp-kafka:7.8.0` | `9092` (host), `29092` (Docker internal) |
| `kafka-ui` | `provectuslabs/kafka-ui:latest` | `8085` |

Two advertised listeners are configured so the broker is reachable from both the host machine (for local development) and from inside Docker:

```yaml
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT_HOST://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
```

**Topic** — A single topic named **`expense-events`** carries all expense-approval events. No separate DLQ or schema registry is used; messages are JSON-serialized Java objects.

**Producer — expense-service (Java / Spring Boot)**

`expense/pom.xml` includes:
```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

`expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java` injects `KafkaTemplate<String, Object>` and publishes to the topic after an expense is approved:

```java
kafkaTemplate.send("expense-events", response);
```

This is called in two places: immediately after creation when the expense is auto-approved (owner or personal), and inside the `approveExpense` method after the database record is updated. The `ExpenseResponse` object (with `budgetId`, `companyId`, `allocationName`, `amount`, `spentDate`, etc.) is serialized to JSON by Spring Kafka.

The bootstrap server address is supplied via the environment variable `SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092` (see `docker-compose.yml`).

**Consumer — analysis-service (Python / FastAPI)**

`analysis-service/requirements.txt` includes `aiokafka==0.12.0`.

`analysis-service/app/services/kafka_consumer.py` starts an `AIOKafkaConsumer` as a background `asyncio` task (launched from the FastAPI `lifespan` context in `app/main.py`):

- **Topic**: `expense-events`
- **Group ID**: `analysis-group`
- **Bootstrap server**: read from env var `KAFKA_BOOTSTRAP_SERVERS` (default `localhost:9092`; Docker override `kafka:29092`)
- **On each message**: upserts a document in MongoDB Atlas collection `artha_analysis.budget_expenses` — incrementing `total_approved_amount` and appending to the `expense_history` array (CQRS write side).
- Includes a retry loop: if Kafka is unreachable, the consumer waits 10 seconds and tries again.

**Consumer — notification-service (Node.js)**

`notification-service/package.json` includes `"kafkajs": "^2.2.4"`.

`notification-service/src/consumers/expenseConsumer.js` creates a KafkaJS consumer:

- **Topic**: `expense-events`
- **Group ID**: read from env var `KAFKA_GROUP_ID` (default `notification-service-group`)
- **Bootstrap broker**: read from env var `KAFKA_BROKER` (default `localhost:9092`; Docker override `kafka:29092`)
- **On each message**: calls `notificationService.handleExpenseEvent(eventData)` which checks category spending thresholds and sends HTML email alerts via Nodemailer + SMTP.
- Includes a retry loop: on connection failure, retries after 10 seconds.

---

## 3. Containerization → Docker

### What it is

Docker packages an application and all of its dependencies into a portable, immutable image. Each image runs as an isolated container, guaranteeing that the service behaves identically in every environment — a developer's laptop, CI, and production.

### Why it is added

- **Consistency** — Eliminates "works on my machine" problems. Every developer and deployment pipeline uses the exact same runtime.
- **Local infrastructure** — Kafka, Zookeeper, Redis, and Kafka UI can all be started with a single command rather than requiring complex local installations.
- **Simplified deployment** — Services are versioned images that can be deployed, rolled back, or scaled independently.
- **Foundation for orchestration** — Docker images are the building block for Kubernetes, ECS, and other orchestrators if the project grows.

### How it is implemented in this project

**Dockerfiles** — Every service has its own `Dockerfile` at the root of the service directory. Java services and the Python service use **multi-stage builds** to keep the final image small:

| Service | Dockerfile | Build stage | Runtime image |
|---|---|---|---|
| `service-registry` | `service-registry/Dockerfile` | `maven:3.9.9-eclipse-temurin-17` | `eclipse-temurin:17-jre` |
| `api-gateway` | `api-gateway/Dockerfile` | `maven:3.9.9-eclipse-temurin-17` | `eclipse-temurin:17-jre` |
| `user-service` | `user-service/Dockerfile` | `maven:3.9.9-eclipse-temurin-17` | `eclipse-temurin:17-jre` |
| `budget` | `budget/Dockerfile` | `maven:3.9.9-eclipse-temurin-17` | `eclipse-temurin:17-jre` |
| `expense` | `expense/Dockerfile` | `maven:3.9.9-eclipse-temurin-17` | `eclipse-temurin:17-jre` |
| `analysis-service` | `analysis-service/Dockerfile` | `python:3.11-slim` (pip install) | `python:3.11-slim` |
| `notification-service` | `notification-service/Dockerfile` | `node:20-alpine` (npm install) | `node:20-alpine` |
| `artha-frontend` | `artha-frontend/Dockerfile` | *(single stage)* | `node:20-alpine` |

**Compose files** — Two Docker Compose files are provided:

| File | Purpose | Command |
|---|---|---|
| `docker-compose.yml` | Full stack: all services + all infrastructure | `docker compose up --build` |
| `docker-compose.infra.yml` | Infrastructure only (Redis, Kafka, Zookeeper, Kafka UI) | `docker compose -f docker-compose.infra.yml up -d` |

The infrastructure-only file is used during local development when developers prefer to run Java, Python, and Node services directly from the terminal (faster iteration).

**Networking** — All containers in `docker-compose.yml` share the default Compose network. Services reference each other by container/service name (e.g., `redis`, `kafka`, `service-registry`). Internal Kafka traffic uses the `PLAINTEXT_INTERNAL://kafka:29092` listener to avoid routing through the host.

**Volumes** — Two named volumes (`redis-data`, `kafka-data`) persist data across container restarts so that Redis keys and Kafka topic data are not lost on `docker compose down` (without `--volumes`).

---

## 4. Service Registry → Netflix Eureka

### What it is

A service registry is a runtime directory of available service instances. Each microservice registers itself on startup (advertising its hostname and port) and periodically sends heartbeats to prove it is still alive. Clients or the API Gateway query the registry to discover where to route a request, instead of relying on hardcoded addresses.

### Why it is added

- **Dynamic discovery** — Service instances can start, stop, or move without any configuration change in other services or the gateway.
- **No hardcoded URLs** — The API Gateway routes requests by service name (e.g., `lb://USER-SERVICE`) and lets Eureka resolve the actual network address at runtime.
- **Health-based routing** — Unhealthy instances are automatically removed from the registry after missed heartbeats, so the gateway never routes to a dead pod.
- **Multi-language support** — Both the Python and Node.js services register with Eureka using dedicated client libraries, making all services discoverable through the same registry.

### How it is implemented in this project

**Registry server** — `service-registry/` is a standalone Spring Boot application with a single annotation:

```java
// service-registry/src/main/java/com/artha/service_registry/ServiceRegistryApplication.java
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication { ... }
```

Configuration in `service-registry/src/main/resources/application.yaml`:

```yaml
server:
  port: 8761
spring:
  application:
    name: service-registry
eureka:
  client:
    register-with-eureka: false   # The server does not register itself
    fetch-registry: false
```

The registry dashboard is available at `http://localhost:8761`.

**Java client services** — `api-gateway`, `user-service`, `budget`, and `expense` all include `spring-cloud-starter-netflix-eureka-client` in their `pom.xml`. They register automatically on startup. In Docker, the registry URL is supplied via:

```yaml
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/
```

**Python client — analysis-service** — Uses `py_eureka_client==0.13.3` (see `analysis-service/requirements.txt`). Registration happens in the FastAPI `lifespan` startup hook in `analysis-service/app/main.py`:

```python
await eureka_client.init_async(
    eureka_server=EUREKA_SERVER,         # from EUREKA_SERVER env var
    app_name="analysis-service",
    instance_port=8084,
    instance_host="localhost"
)
```

The `EUREKA_SERVER` value is loaded from a `.env` file via `python-dotenv` (`analysis-service/app/core/config.py`).

**Node.js client — notification-service** — Uses `eureka-js-client==4.5.0` (see `notification-service/package.json`). The client is configured in `notification-service/src/config/eureka.js` and registered as `NOTIFICATION-SERVICE` on port 8086. The Eureka host and port are provided via `EUREKA_HOST` and `EUREKA_PORT` environment variables.

---

## 5. API Gateway → Spring Cloud Gateway

### What it is

An API Gateway is the single entry point for all client traffic. Instead of clients calling each microservice directly, every request passes through the gateway, which handles cross-cutting concerns centrally and forwards the request to the correct backend service.

### Why it is added

- **Single entry point** — The React frontend only needs to know one URL (`http://localhost:8080`); the gateway handles routing to all backend services.
- **Centralized JWT validation** — Authentication is enforced in one place. Backend services trust the gateway and do not need to validate tokens themselves.
- **Redis-backed rate limiting** — Applied globally at the gateway before requests reach any backend service (see [Section 1](#1-rate-limiting--redis)).
- **Header enrichment** — After validating the JWT, the gateway injects `X-User-Id` into the forwarded request so backend services can identify the caller without re-parsing the token.
- **CORS** — Cross-origin rules are managed at the gateway level.
- **Observability** — `RequestTimingFilterConfig.java` logs end-to-end latency for every request passing through the gateway.

### How it is implemented in this project

**Module** — `api-gateway/` is a Spring Boot application using `spring-cloud-starter-gateway` (WebFlux / reactive). Key dependencies in `api-gateway/pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
```

**Routing** — Routes are declared in `api-gateway/src/main/resources/application.yaml` (gitignored). Each route uses a `lb://` URI so Spring Cloud Gateway resolves the target host from the Eureka registry at runtime:

```
/auth/**        → lb://USER-SERVICE
/api/users/**   → lb://USER-SERVICE
/api/companies/** → lb://USER-SERVICE
/api/budgets/** → lb://BUDGET
/api/expenses/** → lb://EXPENSE
/analysis/**    → lb://ANALYSIS-SERVICE
```

The `RequestRateLimiter` filter (using the `userKeyResolver` bean) and a `redis-rate-limiter` configuration are attached to each route in the same `application.yaml`.

**JWT filter** — `api-gateway/src/main/java/com/artha/apigateway/security/JwtAuthenticationFilter.java` is a reactive `WebFilter` that:
1. Extracts the `Authorization: Bearer <token>` header.
2. Validates the token using `JwtUtil.java` (`jjwt` library, HMAC-SHA key from `${jwt.secret}`).
3. Injects `X-User-Id` and `X-Email` headers into the mutated request forwarded to the downstream service.

**Security config** — `api-gateway/src/main/java/com/artha/apigateway/security/SecurityConfig.java` uses `@EnableWebFluxSecurity` and permits `/auth/**` and `/users/auth/**` without a JWT (login/signup), while requiring authentication for all other routes.

**Rate-limit key resolver** — `api-gateway/src/main/java/com/artha/apigateway/config/RateLimitConfig.java` defines the `userKeyResolver` bean (see [Section 1](#1-rate-limiting--redis)).

**Request timing** — `api-gateway/src/main/java/com/artha/apigateway/config/RequestTimingFilterConfig.java` is a `GlobalFilter` (order `-1`, runs first) that logs the total gateway processing time in milliseconds for every expense, budget, user, and analysis endpoint.

---

## 6. Why Individual Database per Microservice

### What it is

In Artha's microservices architecture, each service owns its own data store. No service reads or writes another service's database directly; inter-service communication happens exclusively through HTTP APIs or Kafka events.

### Why it is done this way

- **Independent deployability** — A schema change in the budget service requires no coordination with the expense service. Teams can evolve their own data model and deploy independently.
- **Appropriate storage technology per use case** — Relational data (users, companies, budgets, allocations, expenses) lives in PostgreSQL where ACID transactions and foreign-key integrity matter. Pre-aggregated analytics data and notification deduplication records live in MongoDB Atlas, which is schema-flexible and optimized for the document-shaped data the analysis engine produces.
- **Fault isolation** — A database slowdown or outage in one service does not directly impact others. The expense service continues to accept submissions even if the analytics database is temporarily unavailable.
- **Avoiding the shared-database anti-pattern** — A single shared database creates implicit coupling: any service can read or modify any table, making it impossible to change a schema without checking every consumer. This recreates the coupling of a monolith while adding the operational complexity of microservices.
- **Independent scaling** — Each database can be sized and scaled for its own workload.

### How it is implemented in this project

| Service | Database | Technology | Notes |
|---|---|---|---|
| `user-service` | `user_service` schema | PostgreSQL (Neon cloud) | Users, companies, roles; Spring Data JPA |
| `budget` | `budget_service` schema | PostgreSQL (Neon cloud) | Budgets, allocations; Spring Data JPA |
| `expense` | `expense_service` schema | PostgreSQL (Neon cloud) | Expenses; Spring Data JPA |
| `analysis-service` | `artha_analysis` DB | MongoDB Atlas | `budget_expenses` collection — CQRS read cache |
| `notification-service` | `artha_notifications` DB | MongoDB Atlas | Notification deduplication records |

**Cross-service data access patterns:**

1. **Synchronous HTTP (read-time enrichment)** — The expense-service calls the budget-service via `BudgetServiceClient.java` and the user-service via `UserServiceClient.java` to resolve allocation names and verify company membership at request time. These calls go through the gateway using `lb://` URIs so Eureka provides the actual address.

2. **Asynchronous Kafka (write-time projection)** — When an expense is approved, the expense-service publishes an `expense-events` Kafka message. The analysis-service consumes it and upserts a pre-aggregated document into MongoDB Atlas (`artha_analysis.budget_expenses`). Subsequent analytics reads are O(1) fetches from MongoDB; the relational expense table is not queried at dashboard load time. This is a CQRS read model.

3. **No shared tables, no cross-service JOINs** — The budget and user schemas live in separate Neon databases. No service has connection credentials to another service's database.

**Database migrations** — Each Java service manages its own schema with Spring Data JPA's `spring.jpa.hibernate.ddl-auto` setting (configured in each service's `application.yaml`, gitignored). The Python and Node.js services use MongoDB's schemaless nature for flexible evolution.
