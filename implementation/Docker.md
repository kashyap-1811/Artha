# 🐳 Docker Implementation

## 1. Overview

Every service in Artha is containerised using **multi-stage Docker builds** and orchestrated with **Docker Compose**. The goal is a single command (`docker compose up --build`) that starts the entire stack — all eight application services plus four supporting infrastructure containers (Redis, Kafka, Zookeeper, Kafka UI, and Redis Insight) — with automatic health-check gating, restart policies, and environment injection via a single root `.env` file.

Two compose files are provided:

| File | Purpose |
|---|---|
| `docker-compose.yml` | Full stack — all application services **and** infrastructure |
| `docker-compose.infra.yml` | Infrastructure only — Redis, Kafka, Zookeeper, Kafka UI |

---

## 2. Per-Service Dockerfile Design

All Dockerfiles use a two-stage build pattern to keep production images lean (no build tools, no dev dependencies).

### 2.1 Java / Spring Boot Services (5 services)

Applies to: `service-registry`, `api-gateway`, `user-service`, `budget`, `expense`

```
Stage 1 — builder : maven:3.9.9-eclipse-temurin-17
  • Copies pom.xml + src/
  • Runs: mvn -DskipTests clean package
  • Produces: target/*.jar

Stage 2 — runtime : eclipse-temurin:17-jre
  • Copies *.jar from builder → /app/app.jar
  • EXPOSE <service-port>
  • ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

The production image contains only the JRE and the fat JAR — Maven and source code are discarded.

| Service | Port | Image base (runtime) |
|---|---|---|
| `service-registry` | 8761 | `eclipse-temurin:17-jre` |
| `api-gateway` | 8080 | `eclipse-temurin:17-jre` |
| `user-service` | 8083 | `eclipse-temurin:17-jre` |
| `budget` | 8081 | `eclipse-temurin:17-jre` |
| `expense` | 8082 | `eclipse-temurin:17-jre` |

### 2.2 Python / FastAPI — `analysis-service`

```
Stage 1 — builder : python:3.11-slim
  • Installs gcc (needed for some Python wheels)
  • pip install -r requirements.txt

Stage 2 — runtime : python:3.11-slim
  • Copies site-packages + bin from builder (no gcc in prod image)
  • Copies app/ source directory
  • ENV PYTHONUNBUFFERED=1
  • CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084"]
```

Port: **8084**

### 2.3 Node.js / Express — `notification-service`

```
Stage 1 — builder : node:20-alpine
  • npm install --omit=dev   (production deps only)

Stage 2 — runtime : node:20-alpine
  • Copies node_modules from builder
  • Copies package.json + src/
  • ENV NODE_ENV=production
  • CMD ["node", "src/index.js"]
```

Port: **8086**

### 2.4 React / Vite — `artha-frontend`

```
Stage 1 — builder : node:20-alpine
  • npm ci
  • ARG VITE_API_BASE_URL (defaults to http://localhost:8080)
  • npm run build  → /app/dist

Stage 2 — runtime : nginx:1.27-alpine
  • Copies /app/dist → /usr/share/nginx/html
  • Copies nginx.conf → /etc/nginx/conf.d/default.conf
  • EXPOSE 80
```

The build-time argument `VITE_API_BASE_URL` is injected at compose build time from the root `.env` file. Nginx serves the static bundle and handles client-side routing via `try_files $uri $uri/ /index.html`.

Port: **80** (mapped to host `5173`)

---

## 3. docker-compose.yml — Full Stack

### 3.1 Startup Order and Health Checks

Docker Compose `depends_on` with `condition: service_healthy` guarantees that downstream services only start once their dependencies are ready.

```
zookeeper  ──healthy──►  kafka  ──healthy──►  ┐
                                               ├──►  user-service
service-registry ──healthy──►  api-gateway     ├──►  budget-service
                                               ├──►  expense-service
redis ──healthy──►  api-gateway                ├──►  notification-service
redis ──healthy──►  budget-service             └──►  analysis-service
redis ──healthy──►  expense-service
redis ──healthy──►  analysis-service
```

Health check summary:

| Container | Health check command | Interval / Retries |
|---|---|---|
| `service-registry` | `curl -f http://localhost:8761/actuator/health` | 15 s / 5 |
| `redis` | `redis-cli ping` | 10 s / 5 |
| `zookeeper` | `nc -z localhost 2181` | 10 s / 5 |
| `kafka` | `nc -z localhost 9092` | 10 s / 5 (30 s start period) |

All containers use `restart: unless-stopped` to recover from transient failures.

### 3.2 Kafka Networking

Kafka exposes two listeners:

| Listener | Address | Consumers |
|---|---|---|
| `PLAINTEXT_HOST` | `${SERVER_IP:-localhost}:9092` | Host-machine clients (local dev tools, Kafka UI on laptop) |
| `PLAINTEXT_INTERNAL` | `kafka:29092` | All Docker containers (application services) |

Set `SERVER_IP` in your `.env` to your machine's LAN IP (e.g. `192.168.1.10`) if you need to connect from another device, or leave it as `localhost` for local-only access. This value is also used when constructing Eureka instance IDs for the Java services.

### 3.3 Eureka Instance Registration

All Java services are configured with explicit Eureka instance metadata so they are routable inside Docker by hostname (not by container IP):

```yaml
EUREKA_INSTANCE_HOSTNAME: <service-name>          # e.g. api-gateway
EUREKA_INSTANCE_PREFER_IP_ADDRESS: "false"
EUREKA_INSTANCE_INSTANCE_ID: ${SERVER_IP}:<service-name>:<port>
```

These values are set automatically by `docker-compose.yml` — you do not need to configure them manually.

### 3.4 Environment Variable Injection

All sensitive configuration and infrastructure URLs are passed to containers via the root `.env` file. The `docker-compose.yml` maps each variable with a sensible default where applicable:

```yaml
KAFKA_BOOTSTRAP_SERVERS: ${KAFKA_BOOTSTRAP_SERVERS:-kafka:29092}
REDIS_HOST: ${REDIS_HOST:-redis}
REDIS_PORT: ${REDIS_PORT:-6379}
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/
```

Variables with no default (database URLs, JWT secret, OAuth credentials, MongoDB URIs, SendGrid key) **must** be provided in `.env` before running the stack.

---

## 4. Infrastructure Containers

| Container | Image | Host Port | Purpose |
|---|---|---|---|
| `redis` | `redis:7-alpine` | 6379 | Rate limiting (API Gateway) + response cache (expense, budget, analysis) |
| `redis-insight` | `redislabs/redisinsight:1.14.0` | 8087 | Web UI to inspect Redis keys and streams |
| `zookeeper` | `confluentinc/cp-zookeeper:7.8.0` | 2181 | Kafka coordination service |
| `kafka` | `confluentinc/cp-kafka:7.8.0` | 9092 / 29092 | Message broker for `expense-events`, `budget-events`, `company-events` |
| `kafka-ui` | `provectuslabs/kafka-ui:latest` | 8085 | Web UI to monitor topics and consumer groups |

---

## 5. Running the Project with Docker

### Step 1 — Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- Git

### Step 2 — Clone the Repository

```bash
git clone https://github.com/kashyap-1811/Artha.git
cd Artha
```

### Step 3 — Create the `.env` File

Copy the provided example and fill in your secrets:

```bash
cp .env.example .env
```

Open `.env` and populate every placeholder value. The table below explains each variable:

#### Shared Infrastructure

| Variable | Default in Compose | Description |
|---|---|---|
| `EUREKA_SERVER_URL` | `http://service-registry:8761/eureka/` | Eureka service registry URL (leave as-is for Docker) |
| `REDIS_HOST` | `redis` | Redis hostname (leave as-is for Docker) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | _(empty)_ | Redis password (leave empty unless you secure Redis) |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:29092` | Kafka broker for Java/Python services (leave as-is) |
| `KAFKA_BROKER` | `kafka:29092` | Kafka broker for notification-service (leave as-is) |
| `KAFKA_GROUP_ID` | `notification-service-group` | Kafka consumer group for notification-service |
| `SERVER_IP` | `localhost` | Your host machine IP — used for Kafka advertised listeners and Eureka instance IDs; change when accessing from another device |

#### Database — PostgreSQL (per service)

Each Java service connects to its own PostgreSQL database. Artha uses [Neon](https://neon.tech) (serverless Postgres) by default, but any accessible PostgreSQL instance works.

| Variable | Service | Description |
|---|---|---|
| `USER_DB_URL` | user-service | JDBC URL, e.g. `jdbc:postgresql://host/db` |
| `USER_DB_USERNAME` | user-service | Database username |
| `USER_DB_PASSWORD` | user-service | Database password |
| `BUDGET_DB_URL` | budget-service | JDBC URL |
| `BUDGET_DB_USERNAME` | budget-service | Database username |
| `BUDGET_DB_PASSWORD` | budget-service | Database password |
| `EXPENSE_DB_URL` | expense-service | JDBC URL |
| `EXPENSE_DB_USERNAME` | expense-service | Database username |
| `EXPENSE_DB_PASSWORD` | expense-service | Database password |

#### Auth & OAuth2

| Variable | Description |
|---|---|
| `JWT_SECRET` | Strong random string used to sign and verify JWT tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

#### NoSQL — MongoDB Atlas

| Variable | Service | Description |
|---|---|---|
| `MONGO_DETAILS` | analysis-service | MongoDB connection string for the `artha_analysis` database |
| `MONGODB_URI` | notification-service | MongoDB connection string for notification deduplication |

#### Email — SendGrid

| Variable | Description |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for sending alert and membership emails |
| `FROM_EMAIL` | Verified sender email address in your SendGrid account |

#### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | API Gateway URL embedded into the React build at build time |

#### CORS

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of origins allowed by the API Gateway |

### Step 4 — Build and Start the Full Stack

```bash
docker compose up --build
```

> First build takes several minutes while Maven downloads dependencies and Docker pulls base images. Subsequent builds are much faster thanks to layer caching.

All containers start in dependency order. The stack is fully ready when you see Eureka registration logs from each service.

### Step 5 — Access the Application

| Service | URL |
|---|---|
| **React Frontend** | http://localhost:5173 |
| **API Gateway** | http://localhost:8080 |
| **Eureka Dashboard** | http://localhost:8761 |
| **Kafka UI** | http://localhost:8085 |
| **Redis Insight** | http://localhost:8087 |

### Step 6 — Stop the Stack

```bash
docker compose down
```

To also remove named volumes (Redis data, etc.):

```bash
docker compose down -v
```

---

## 6. Infrastructure-Only Mode (Local Development)

If you want to run the application services natively (e.g., for faster iteration with hot-reload) but still need Kafka, Zookeeper, Redis, and their UIs, start only the infra containers:

```bash
docker compose -f docker-compose.infra.yml up -d
```

This starts: Redis, Redis Insight, Zookeeper, Kafka, and Kafka UI — nothing else.

Then run each service locally using its own `.env.example` as a guide (see each service's `README` section or the root `README.md`).

---

## 7. Fetching the Pre-Built Image (Optional)

If a pre-built image is published to Docker Hub or GitHub Container Registry, you can skip the local build entirely. Replace `<tag>` with the desired version:

```bash
# Pull a specific service image (example for api-gateway)
docker pull kashyap1811/artha-api-gateway:<tag>
```

To use pulled images in compose instead of building locally, replace the `build:` block for the relevant service in `docker-compose.yml` with:

```yaml
image: kashyap1811/artha-api-gateway:<tag>
```

Then run:

```bash
# No --build flag needed when using pre-pulled images
docker compose up
```

> The root `.env` file is always required regardless of whether you build locally or pull pre-built images.

---

## 8. Summary

| Concern | Implementation |
|---|---|
| Build strategy | Multi-stage builds for all services; production images contain only runtime artifacts |
| Startup ordering | `depends_on` with `condition: service_healthy` and per-container health checks |
| Configuration | Single root `.env` file; per-service `.env.example` for local development |
| Infrastructure | Redis, Kafka + Zookeeper, Kafka UI, Redis Insight — all containerised |
| Kafka networking | Dual-listener setup: `PLAINTEXT_HOST` for host access, `PLAINTEXT_INTERNAL` for container-to-container |
| Restart policy | `restart: unless-stopped` on every container |
| Frontend build arg | `VITE_API_BASE_URL` passed at build time so the React bundle targets the correct API Gateway |
