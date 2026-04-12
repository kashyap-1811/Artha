# 🐳 Docker Implementation

## 1. Overview

Every service in Artha is containerised using **multi-stage Docker builds** and orchestrated with **Docker Compose**. All production images run as **non-root users** for improved security. Two compose files serve distinct purposes:

| File | Purpose |
|---|---|
| `docker-compose.yml` | **Production deployment** — all eight application services + Nginx reverse proxy; connects to cloud-managed Kafka (SSL) and Redis (TLS) |
| `docker-compose.infra.yml` | **Local development infrastructure** — Redis, Zookeeper, Kafka, Kafka UI, and Redis Insight (no application services) |

In production mode (`docker compose up --build`), all services start behind Nginx which is the **only external entry point** on ports 80/443. Individual service ports are never exposed to the host — all inter-service communication uses the internal `artha-net` Docker bridge network.

For local development, `docker-compose.infra.yml` provides supporting infrastructure (Kafka, Redis, etc.) so application services can be run natively on the host with hot-reload.

---

## 2. Per-Service Dockerfile Design

All Dockerfiles use a two-stage build pattern to keep production images lean (no build tools, no dev dependencies).

### 2.1 Java / Spring Boot Services (5 services)

Applies to: `service-registry`, `api-gateway`, `user-service`, `budget`, `expense`

```
Stage 1 — builder : maven:3.9.9-eclipse-temurin-17
  • Copies pom.xml
  • Runs: mvn dependency:go-offline   (pre-fetches all Maven deps as a cached layer)
  • Copies src/
  • Runs: mvn -DskipTests clean package
  • Produces: target/*.jar

Stage 2 — runtime : eclipse-temurin:17-jre
  • Installs curl (required by Docker health checks)
  • Creates non-root user: spring:spring
  • USER spring:spring
  • Copies *.jar from builder → /app/app.jar
  • EXPOSE <service-port>
  • ENTRYPOINT ["java",
      "-Xms128m", "-Xmx256m",             (heap bounds — tuned for 8 GB droplet)
      "-XX:+UseG1GC",                      (low-pause garbage collector)
      "-XX:+UseStringDeduplication",
      "-Djava.security.egd=file:/dev/./urandom",
      "-jar", "/app/app.jar"]
```

The production image contains only the JRE and the fat JAR — Maven, source code, and build tools are discarded. The `mvn dependency:go-offline` step ensures Maven dependencies are a separate, cached Docker layer, making rebuilds significantly faster.

| Service | Port | Runtime image | Container memory limit |
|---|---|---|---|
| `service-registry` | 8761 | `eclipse-temurin:17-jre` | 384 MB |
| `api-gateway` | 8080 | `eclipse-temurin:17-jre` | 450 MB |
| `user-service` | 8083 | `eclipse-temurin:17-jre` | 512 MB |
| `budget` | 8081 | `eclipse-temurin:17-jre` | 512 MB |
| `expense` | 8082 | `eclipse-temurin:17-jre` | 512 MB |

### 2.2 Python / FastAPI — `analysis-service`

```
Stage 1 — builder : python:3.11-slim
  • Installs gcc (needed for some Python wheels)
  • pip install -r requirements.txt

Stage 2 — runtime : python:3.11-slim
  • Installs wget (required by Docker health checks)
  • Creates non-root user: appuser
  • USER appuser
  • Copies site-packages + bin from builder (no gcc in prod image)
  • Copies app/ source directory
  • ENV PYTHONUNBUFFERED=1
  • CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084"]
```

Port: **8084** | Memory limit: **384 MB**

### 2.3 Node.js / Express — `notification-service`

```
Stage 1 — builder : node:20-alpine
  • npm ci --omit=dev   (production dependencies only, reproducible install)

Stage 2 — runtime : node:20-alpine
  • Copies node_modules from builder
  • Copies package.json + src/
  • USER node               (built-in non-root user in node:alpine images)
  • ENV NODE_ENV=production
  • CMD ["node", "src/index.js"]
```

Port: **8086** | Memory limit: **256 MB**

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

> **Note:** The `artha-frontend` image is built independently and deployed separately. It is not included in `docker-compose.yml`.

---

## 3. docker-compose.yml — Production Deployment

This file orchestrates the full application stack targeting a **production server** (e.g., a single DigitalOcean Droplet with 8 GB RAM / 2 vCPU). It does **not** spin up Kafka, Zookeeper, Redis, or any local infrastructure — those are expected to be cloud-managed external services. All credentials and connection strings are injected via the root `.env` file.

Services in `docker-compose.yml`:

| Container | Internal port | External access |
|---|---|---|
| `nginx` | 80, 443 | Exposed on host ports 80 / 443 — sole entry point |
| `service-registry` | 8761 | Internal only |
| `api-gateway` | 8080 | Internal only (via Nginx) |
| `user-service` | 8083 | Internal only |
| `budget-service` | 8081 | Internal only |
| `expense-service` | 8082 | Internal only |
| `notification-service` | 8086 | Internal only |
| `analysis-service` | 8084 | Internal only |

### 3.1 Nginx Reverse Proxy

Nginx is the **only container with ports exposed to the host**. It listens on port **80** (HTTP) and port **443** (HTTPS, after Certbot setup) and proxies all traffic to `api-gateway:8080` on the internal Docker network.

```
Internet ──► Nginx :80/:443 ──► api-gateway:8080 ──► internal services
```

The Nginx configuration (`nginx/nginx.conf`) includes:

- Rate limiting: 10 req/s per IP with a burst of 20
- Gzip compression for text, CSS, JS, and JSON responses
- WebSocket support via `Upgrade` / `Connection` header forwarding
- Health check endpoint at `GET /health` (returns `{"status":"ok"}`)
- HTTPS server block (commented out — configure Certbot and uncomment to enable TLS)

### 3.2 Startup Order and Health Checks

`depends_on` with `condition: service_healthy` ensures each service only starts after its dependencies pass their health checks.

```
service-registry ──healthy──► api-gateway ──healthy──► nginx
service-registry ──healthy──► user-service
service-registry ──healthy──►  budget-service  (also waits for user-service)
service-registry ──healthy──► expense-service  (also waits for user-service)
service-registry ──healthy──► notification-service
service-registry ──healthy──► analysis-service
```

Health check summary:

| Container | Health check command | Start period | Interval / Retries |
|---|---|---|---|
| `service-registry` | `curl -s http://localhost:8761/actuator/health` | 60 s | 20 s / 5 |
| `api-gateway` | `curl -s http://localhost:8080/actuator/health` | 60 s | 20 s / 5 |
| `user-service` | `curl -s http://localhost:8083/actuator/health` | 60 s | 20 s / 5 |
| `budget-service` | `curl -s http://localhost:8081/actuator/health` | 60 s | 20 s / 5 |
| `expense-service` | `curl -s http://localhost:8082/actuator/health` | 60 s | 20 s / 5 |
| `notification-service` | `wget --spider http://localhost:8086/health` | 20 s | 20 s / 5 |
| `analysis-service` | `wget --spider http://localhost:8084/docs` | 20 s | 20 s / 5 |

All containers use `restart: unless-stopped` to automatically recover from transient failures.

### 3.3 Kafka — Cloud-Managed with SSL

The production stack connects to a **cloud-managed Kafka** cluster (e.g., Confluent Cloud) over SSL/TLS. No local Kafka or Zookeeper container is included in `docker-compose.yml`.

Each service that uses Kafka receives these environment variables:

```yaml
KAFKA_BOOTSTRAP_SERVERS:           ${KAFKA_BOOTSTRAP_SERVERS}     # e.g. pkc-xxx.region.confluent.cloud:9092
KAFKA_SECURITY_PROTOCOL:           ${KAFKA_SECURITY_PROTOCOL:-SSL}
KAFKA_SSL_TRUSTSTORE_PASSWORD:     ${KAFKA_SSL_TRUSTSTORE_PASSWORD}
KAFKA_SSL_KEYSTORE_PASSWORD:       ${KAFKA_SSL_KEYSTORE_PASSWORD}
SPRING_KAFKA_SSL_TRUST_STORE_LOCATION: file:/app/certs/client.truststore.jks
SPRING_KAFKA_SSL_KEY_STORE_LOCATION:   file:/app/certs/client.keystore.p12
```

The `./certs/` directory is mounted **read-only** into every service that connects to Kafka:

```yaml
volumes:
  - ./certs:/app/certs:ro    # Java services
  - ./certs:/app/src/certs:ro  # notification-service
  - ./certs:/app/app/certs:ro  # analysis-service
```

The `./certs/` directory must contain:

```
certs/
  client.truststore.jks   — Java Truststore (CA certificate for SSL verification)
  client.keystore.p12     — PKCS12 Keystore (client certificate + private key)
```

> These files are ignored by Git. **Never commit certificate files to version control.**

### 3.4 Redis — Cloud-Managed with TLS

The production stack connects to a **cloud-managed Redis** instance (e.g., Redis Cloud, DigitalOcean Managed Redis) over TLS. No local Redis container is included in `docker-compose.yml`.

Environment variables used by api-gateway, budget-service, expense-service, and analysis-service:

```yaml
REDIS_HOST:     ${REDIS_HOST}
REDIS_PORT:     ${REDIS_PORT}
REDIS_PASSWORD: ${REDIS_PASSWORD:-}
REDIS_SSL:      ${REDIS_SSL:-true}
```

### 3.5 Eureka Instance Registration

All Java services register with explicit Eureka instance metadata so they are routable inside Docker by hostname (not by ephemeral container IP):

```yaml
EUREKA_INSTANCE_HOSTNAME:         <service-name>     # e.g. api-gateway
EUREKA_INSTANCE_PREFER_IP_ADDRESS: "false"
EUREKA_INSTANCE_INSTANCE_ID:      ${SERVER_IP}:<service-name>:<port>
```

These values are set automatically by `docker-compose.yml` — no manual configuration needed.

### 3.6 Log Rotation

Every container uses structured JSON logging with rotation to prevent disk exhaustion:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 4. docker-compose.infra.yml — Local Development Infrastructure

This file starts only the supporting infrastructure so application services can be run natively on the host machine (with hot-reload, faster iteration) without Docker build overhead.

| Container | Image | Host Port | Purpose |
|---|---|---|---|
| `redis` | `redis:7-alpine` | 6379 | Rate limiting (API Gateway) + response cache (expense, budget, analysis) |
| `redis-insight` | `redislabs/redisinsight:1.14.0` | 8087:8001 | Web UI to inspect Redis keys and streams |
| `zookeeper` | `confluentinc/cp-zookeeper:7.8.0` | 2181 | Kafka coordination service |
| `kafka` | `confluentinc/cp-kafka:7.8.0` | 9092 / 29092 | Message broker for `expense-events`, `budget-events`, `company-events` |
| `kafka-ui` | `provectuslabs/kafka-ui:latest` | 8085:8080 | Web UI to monitor topics and consumer groups |

**Kafka dual-listener setup** (local dev, PLAINTEXT — no SSL):

| Listener | Address | Consumers |
|---|---|---|
| `PLAINTEXT_HOST` | `${SERVER_IP:-localhost}:9092` | Host-machine clients (services running natively, Kafka UI) |
| `PLAINTEXT_INTERNAL` | `kafka:29092` | Containers communicating within Docker |

Set `SERVER_IP` in your `.env` to your machine's LAN IP (e.g., `192.168.1.10`) if you need Kafka reachable from another device on the network. This value is also used when constructing Eureka instance IDs for Java services.

---

## 5. Running the Stack in Production

### Step 1 — Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2) or Docker Engine + Docker Compose plugin on Linux
- Git
- A cloud-managed Kafka cluster with SSL (e.g., [Confluent Cloud](https://confluent.cloud)) — provides the bootstrap server address and SSL certificate files
- A cloud-managed Redis instance with TLS (e.g., [Redis Cloud](https://redis.com/try-free/), DigitalOcean Managed Redis) — provides host, port, and password

### Step 2 — Clone the Repository

```bash
git clone https://github.com/kashyap-1811/Artha.git
cd Artha
```

### Step 3 — Create the `.env` File

```bash
cp .env.example .env
```

Open `.env` and fill in every placeholder. The tables below describe each variable.

#### Shared / Infrastructure

| Variable | Default | Description |
|---|---|---|
| `SERVER_IP` | `localhost` | Server's public IP — used in Eureka instance IDs and Kafka advertised listeners |
| `REDIS_HOST` | — | Cloud Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_SSL` | `true` | Enable TLS for Redis connections |
| `KAFKA_BOOTSTRAP_SERVERS` | — | Cloud Kafka broker, e.g. `pkc-xxx.region.confluent.cloud:9092` |
| `KAFKA_SECURITY_PROTOCOL` | `SSL` | Kafka security protocol |
| `KAFKA_SSL_TRUSTSTORE_PASSWORD` | — | Password for `certs/client.truststore.jks` |
| `KAFKA_SSL_KEYSTORE_PASSWORD` | — | Password for `certs/client.keystore.p12` |
| `KAFKAJS_SSL` | `true` | Enable SSL in notification-service's KafkaJS client |
| `KAFKA_SSL_ENABLED` | `true` | Enable SSL in analysis-service's Kafka consumer |

#### Kafka Consumer Group IDs

| Variable | Default | Description |
|---|---|---|
| `NOTIFICATION_EXPENSE_GROUP_ID` | `notification-expense-group` | Notification service — expense events consumer group |
| `NOTIFICATION_COMPANY_GROUP_ID` | `notification-company-group` | Notification service — company events consumer group |
| `ANALYSIS_EXPENSE_GROUP_ID` | `analysis-expense-group` | Analysis service — expense events consumer group |
| `ANALYSIS_BUDGET_GROUP_ID` | `analysis-budget-group` | Analysis service — budget events consumer group |

#### Database — PostgreSQL (per service)

Each Java service connects to its own PostgreSQL database. [Neon](https://neon.tech) (serverless Postgres) works well; any accessible PostgreSQL instance is supported.

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

#### CORS

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of origins the API Gateway will accept |

### Step 4 — Place Kafka SSL Certificates

Create the `certs/` directory and copy the SSL certificate files obtained from your Kafka provider:

```bash
mkdir certs
cp /path/to/client.truststore.jks certs/
cp /path/to/client.keystore.p12   certs/
```

> `certs/` is ignored by Git. Never commit certificate files to version control.

### Step 5 — Build and Start the Stack

```bash
docker compose up --build
```

> First build takes several minutes while Maven resolves dependencies and Docker pulls base images. Subsequent builds are much faster — `mvn dependency:go-offline` ensures Maven dependencies are a cached layer that is only re-fetched when `pom.xml` changes.

All containers start in dependency order. The stack is fully ready when Eureka registration messages appear in the logs for each service and the Nginx health check passes.

### Step 6 — Access the Application

All traffic enters through Nginx. Individual service ports are not exposed to the host.

| Endpoint | URL | Notes |
|---|---|---|
| **Application (via Nginx)** | `http://<server-ip>` | All API requests pass through Nginx → API Gateway |
| **HTTPS (after Certbot)** | `https://<your-domain>` | Uncomment the HTTPS block in `nginx/nginx.conf` after setting up TLS |
| **Nginx health check** | `http://<server-ip>/health` | Returns `{"status":"ok"}` — useful for load balancer probes |

To inspect a service directly during debugging (without going through Nginx):

```bash
docker compose exec api-gateway curl localhost:8080/actuator/health
docker compose exec service-registry curl localhost:8761/actuator/health
```

### Step 7 — Stop the Stack

```bash
docker compose down
```

---

## 6. Infrastructure-Only Mode (Local Development)

Run infrastructure containers for Kafka, Redis, and their UIs while running application services natively for faster iteration:

```bash
docker compose -f docker-compose.infra.yml up -d
```

This starts: **Redis** (6379), **Redis Insight** (8087), **Zookeeper** (2181), **Kafka** (9092), and **Kafka UI** (8085).

When services are running locally (outside Docker), use these connection values instead of the Docker-internal ones:

| Variable | Docker Compose value | Local dev value |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:29092` | `localhost:9092` |
| `REDIS_HOST` | `redis` | `localhost` |

Each service's `src/main/resources/application.properties.example` (Java) or `.env.example` (Python/Node) provides local configuration templates.

**Local dev access:**

| Service | URL |
|---|---|
| **Kafka UI** | http://localhost:8085 |
| **Redis Insight** | http://localhost:8087 |
| Kafka broker | localhost:9092 |
| Redis | localhost:6379 |

---

## 7. Using Pre-Built Images (Optional)

If pre-built images are published to Docker Hub, skip the local build by replacing the `build:` block for any service in `docker-compose.yml`:

```yaml
# Replace this:
build:
  context: ./api-gateway
  dockerfile: Dockerfile

# With this:
image: kashyap1811/artha-api-gateway:<tag>
```

Then run without the `--build` flag:

```bash
docker compose up
```

> The root `.env` file and `./certs/` directory are always required regardless of whether you build locally or use pre-built images.

---

## 8. Summary

| Concern | Implementation |
|---|---|
| Build strategy | Multi-stage builds for all services; production images contain only runtime artifacts |
| Security | All containers run as non-root users (`spring:spring`, `appuser`, `node`) |
| Startup ordering | `depends_on: condition: service_healthy` with per-container health checks and start periods |
| External infrastructure | Cloud-managed Kafka (SSL) and Redis (TLS) — not run locally in production compose |
| Local dev infrastructure | `docker-compose.infra.yml` — Redis, Kafka + Zookeeper, Kafka UI, Redis Insight |
| Nginx | Single external entry point on ports 80/443; proxies all traffic to `api-gateway:8080` |
| SSL/TLS certs | Kafka SSL certs in `./certs/` mounted read-only into each service that uses Kafka |
| Memory limits | Hard `mem_limit` per container, tuned for an 8 GB / 2 vCPU droplet |
| Log rotation | `json-file` driver, `max-size: 10m`, `max-file: 3` on every container |
| Restart policy | `restart: unless-stopped` on every container |
| JVM tuning | `-Xms128m -Xmx256m -XX:+UseG1GC -XX:+UseStringDeduplication` on all Java services |
