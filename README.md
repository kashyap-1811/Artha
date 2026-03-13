# Artha — Microservices Budget & Expense Tracker

**Artha** (Sanskrit for *wealth* / *finance*) is a full-stack, microservices-based application that helps companies manage their budgets and track expenses. It supports multi-company management, fiscal-period budgeting with category allocations, an approval workflow for expenses, real-time analytics, and automated email budget alerts — all secured with JWT authentication and protected by Redis-backed rate limiting.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Services](#services)
- [Getting Started](#getting-started)
- [Run with Docker Compose](#run-with-docker-compose)
- [API Overview](#api-overview)

---

## Features

- **User Authentication** — Register and log in with email/password or Google OAuth 2.0; sessions are secured with JWT tokens.
- **Company Management** — Users can create companies and invite members. Each user can belong to multiple companies with different roles (Owner / Member). A personal company is automatically created for every new user.
- **Fiscal Budget Management** — Create time-bounded budgets (e.g., *January 2026*) with a total limit, and allocate amounts to named categories such as *Operational*, *Marketing*, *Payroll*, *Travel*, etc.
- **Expense Tracking** — Log expenses against the active budget's categories. The application tracks spending in real time and shows how much of each category's allocation remains.
- **Approval Workflow** — Company owners can approve or reject pending expenses submitted by members.
- **Expense History** — Past expenses are grouped by month for easy review.
- **Budget Progress Visualization** — A progress bar shows total spending vs. the budget limit, and highlights when the budget is near or over its cap (> 90 %).
- **Budget Alert Notifications** — Automated emails are sent to company owners when category spending reaches a configurable threshold (default 80 %) or exceeds 100 % of the allocated amount. Alerts are deduplicated — each alert type is sent only once per allocation.
- **Analytics Dashboard** — A dedicated Python service computes complex financial metrics on top of event-sourced data cached in MongoDB Atlas:
  - *Company Health Score* — classifies a company as **On Track**, **At Risk**, or **Over Budget**.
  - *Category Breakdown* — company-wide spending aggregated by category with percentages, ready for Pie/Donut charts.
  - *Month-over-Month Spending Trend* — detects whether spending is accelerating or slowing down with MoM growth percentages.
  - *Top Spenders Leaderboard* — ranks allocations by total spend for a specific budget.
  - *Active Budget Analysis* — aggregated view across all active budgets of a company.
- **Redis Rate Limiting** — The API Gateway enforces per-user (or per-IP) rate limits using Redis to protect all backend services from abuse.
- **Event-Driven CQRS Architecture** — Expense approval events are published to Apache Kafka. The Analysis Service and Notification Service consume these events asynchronously, enabling O(1) dashboard reads and real-time email alerts without blocking the core request path.

---

## Architecture

Artha follows a microservices architecture coordinated through a service registry and an API gateway. New services communicate via Apache Kafka for asynchronous event processing.

```
                        ┌─────────────────────┐
                        │   React Frontend    │
                        │  (artha-frontend)   │
                        └────────┬────────────┘
                                 │ HTTP
                        ┌────────▼────────────┐
                        │    API Gateway      │  JWT validation · Redis rate limiting
                        │   (api-gateway)     │  Route forwarding · CORS
                        └──┬──────┬──────┬────┘
                           │      │      │
          ┌────────────────▼─┐ ┌──▼───┐ ┌▼──────────┐  ┌──────────────────┐
          │  user-service    │ │budget│ │  expense  │  │ analysis-service │
          │  (auth,          │ │      │ │           │  │  (Python FastAPI)│
          │   companies)     │ │      │ │           │  └┬─────────┬───────┘
          └──────────────────┘ └──────┘ └──────┬────┘   │         │
                           │      │            │        │         │
                    ┌──────▼──────▼────────────▼────────▼─┐       │
                    │       Service Registry              │       │
                    │     (Netflix Eureka Server)         │       │
                    └─────────────────────────────────────┘       │
                                                                  │
                    expense approved ──►┌──────────────────────┐  │
                                        │   Apache Kafka       │─ ┘
                                        │  (expense-events)    │
                                        └──────────┬───────────┘
                                                   │
                               ┌───────────────────▼──────────────────┐
                               │                                      │
                    ┌──────────▼──────────┐            ┌──────────────▼───────┐
                    │  analysis-service   │            │ notification-service │
                    │  Kafka consumer     │            │  Kafka consumer      │
                    │  → MongoDB Atlas    │            │  → MongoDB Atlas     │
                    │    (CQRS cache)     │            │  → Email via SMTP    │
                    └─────────────────────┘            └──────────────────────┘
```

All Java/Spring Boot services register with the Eureka service registry. The Python Analysis Service and Node.js Notification Service also register with Eureka so they are routable through the API Gateway.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite, Recharts |
| Backend (Java) | Java 17, Spring Boot 3.2.5, Spring Cloud 2023.0.1 |
| Analysis (Python) | Python 3.11, FastAPI, Uvicorn |
| Notification (Node.js) | Node.js, Express, KafkaJS, Nodemailer |
| Service Discovery | Spring Cloud Netflix Eureka, eureka-js-client |
| API Gateway | Spring Cloud Gateway, Redis (rate limiting) |
| Security | Spring Security, JWT (jjwt 0.12.6), OAuth 2.0 (Google) |
| Relational Database | PostgreSQL (via Spring Data JPA / Neon) |
| NoSQL / Cache | MongoDB Atlas (Motor async driver) |
| Message Broker | Apache Kafka 7.8.0 + Zookeeper |
| Data Processing | Pandas, NumPy (Python analysis engine) |
| Observability | Spring Boot Actuator, Kafka UI |
| Containerization | Docker, Docker Compose (multi-stage builds) |
| Dev Tooling | Lombok, Spring Boot DevTools, Nodemon |

---

## Services

| Service | Port | Language / Framework | Description |
|---|---|---|---|
| `service-registry` | 8761 | Java / Spring Boot | Netflix Eureka service discovery server |
| `api-gateway` | 8080 | Java / Spring Cloud Gateway | Central entry point — JWT validation, Redis rate limiting, CORS, routing |
| `user-service` | 8083 | Java / Spring Boot | User registration/login, JWT issuance, Google OAuth, company management |
| `budget` | 8081 | Java / Spring Boot | Fiscal budget CRUD and category allocation management |
| `expense` | 8082 | Java / Spring Boot | Expense submission, listing, approval/rejection, Kafka event publishing |
| `analysis-service` | 8084 | Python / FastAPI | Analytics engine — health scores, category breakdown, spending trends, leaderboard |
| `notification-service` | 8086 | Node.js / Express | Event-driven email alerts — budget threshold & exceeded notifications |
| `artha-frontend` | 5173 | React / Vite | React SPA — dashboards, modals, forms |

### Supporting Infrastructure

| Component | Port | Description |
|---|---|---|
| Redis | 6379 | In-memory store for API Gateway rate limiting |
| Apache Kafka | 9092 | Message broker for `expense-events` topic |
| Zookeeper | 2181 | Kafka coordination service |
| Kafka UI | 8085 | Web UI for monitoring Kafka topics and consumer groups |
| MongoDB Atlas | cloud | NoSQL store for analysis cache (`artha_analysis` DB) and notification deduplication |

---

## Getting Started

### Prerequisites

- Java 17+ and Maven 3.8+
- Python 3.11+ and pip
- Node.js 18+ and npm
- PostgreSQL (or use the existing Neon cloud instance configured in each service)
- Docker Desktop (Docker Compose v2) — required for Kafka, Zookeeper, Redis, and Kafka UI

### Environment Variables

Before starting, configure the following environment variables (via `.env` files or your shell) for the services that require them:

**analysis-service** (`.env` in `analysis-service/`):
```
MONGO_DETAILS=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
API_GATEWAY_URL=http://localhost:8080
EUREKA_SERVER=http://localhost:8761/eureka/
```

**notification-service** (`.env` in `notification-service/`):
```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/artha_notifications
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=notification-service-group
API_GATEWAY_URL=http://localhost:8080
EUREKA_HOST=localhost
EUREKA_PORT=8761
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
PORT=8086
```

---

## Run with Docker Compose

This repository includes Docker support for all Java services, the frontend, and the full event-driven infrastructure (Kafka, Zookeeper, Redis, Kafka UI).

> **Note:** Each backend service uses its existing Neon PostgreSQL database. No local Postgres container is created. Internal service-to-service URLs are wired through Docker networking.

### Full Stack (recommended)

```bash
docker compose up --build
```

This starts:

| Container | URL |
|---|---|
| `service-registry` | http://localhost:8761 |
| `api-gateway` | http://localhost:8080 |
| `user-service` | http://localhost:8083 |
| `budget-service` | http://localhost:8081 |
| `expense-service` | http://localhost:8082 |
| `frontend` | http://localhost:5173 |
| `redis` | localhost:6379 |
| `kafka` | localhost:9092 |
| `zookeeper` | localhost:2181 |
| `kafka-ui` | http://localhost:8085 |

To stop all containers:

```bash
docker compose down
```

### Infrastructure Only (for local development)

If you prefer to run Java/Python/Node services natively, start only the infrastructure containers:

```bash
docker compose -f docker-compose.infra.yml up -d
```

---

## Manual / Local Development Setup

### 1. Start the Infrastructure

```bash
docker compose -f docker-compose.infra.yml up -d
```

### 2. Start the Service Registry

```bash
cd service-registry
./mvnw spring-boot:run
```

### 3. Start the Java Backend Services

Start each of the following in separate terminals (in any order after the registry is up):

```bash
cd api-gateway  && ./mvnw spring-boot:run
cd user-service && ./mvnw spring-boot:run
cd budget       && ./mvnw spring-boot:run
cd expense      && ./mvnw spring-boot:run
```

> Configure your PostgreSQL connection details in each service's `src/main/resources/application.properties` (or `application.yml`) before starting.

### 4. Start the Analysis Service (Python / FastAPI)

```bash
cd analysis-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8084 --reload
```

The Analysis Service will:
- Register with Eureka so the API Gateway can route `/analysis/**` requests to it.
- Connect to MongoDB Atlas to read pre-cached expense data.
- Start a background Kafka consumer on the `expense-events` topic to update its MongoDB cache in real time.

### 5. Start the Notification Service (Node.js)

```bash
cd notification-service
npm install
npm run dev
```

The Notification Service will:
- Register with Eureka as `NOTIFICATION-SERVICE` on port 8086.
- Connect to MongoDB Atlas for notification deduplication.
- Start a Kafka consumer on the `expense-events` topic, and send HTML email alerts to company owners when category spending reaches the alert threshold or exceeds 100 %.

### 6. Start the Frontend

```bash
cd artha-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Event-Driven Flow

When a company owner **approves an expense**, the following pipeline executes:

```
expense-service  ──publish──►  Kafka topic: expense-events
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
   analysis-service consumer                   notification-service consumer
   • Upserts expense into MongoDB Atlas         • Fetches budget & allocation details
     budget_expenses collection                 • Calculates total spent vs. allocated
   • Increments total_approved_amount           • Sends THRESHOLD_ALERT email if ≥ 80%
   • Appends to expense_history array           • Sends EXCEED_ALERT email if ≥ 100%
   → Dashboard reads are now O(1)              • Deduplicates alerts in MongoDB
```

---

## API Overview

All requests (except auth endpoints) must include an `Authorization: Bearer <token>` header.

### Authentication & Users

| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/auth/signup` | user-service | Register a new user |
| POST | `/auth/login` | user-service | Log in and receive a JWT |
| GET | `/api/users/{userId}` | user-service | Get user profile |

### Company Management

| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/api/companies` | user-service | Create a company |
| GET | `/api/companies/my` | user-service | List companies for the current user |
| GET | `/api/companies/{companyId}/members` | user-service | Get members of a company |

### Budget Management

| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/api/budgets` | budget | Create a fiscal budget |
| GET | `/api/budgets?companyId=` | budget | List all budgets for a company |
| GET | `/api/budgets/active?companyId=` | budget | Get currently active budgets for a company |
| GET | `/api/budgets/{budgetId}/details` | budget | Get full budget details including allocations |
| POST | `/api/budgets/{budgetId}/allocations` | budget | Add a category allocation to a budget |
| DELETE | `/api/budgets/{budgetId}/allocations/{allocationId}` | budget | Remove a category allocation |

### Expense Management

| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/api/expenses` | expense | Submit a new expense |
| GET | `/api/expenses?companyId=` | expense | List all expenses for a company |
| GET | `/api/expenses/allocation/{allocationId}` | expense | Get all expenses for a specific allocation |
| POST | `/api/expenses/{expenseId}/approve` | expense | Approve a pending expense (owner only) — triggers Kafka event |
| POST | `/api/expenses/{expenseId}/reject` | expense | Reject a pending expense (owner only) |

### Analytics (Analysis Service)

All analytics endpoints are routed through the API Gateway at `/analysis/**`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analysis/company/{companyId}/health` | Company health scorecard — total budget, total spend, remaining balance, health score (*On Track / At Risk / Over Budget*), and per-category breakdown |
| GET | `/analysis/budget/{budgetId}/breakdown` | Per-budget analysis — allocation vs. actual spend by category, budget health score |
| GET | `/analysis/company/{companyId}/active-budget` | Aggregated analysis across all active budgets of a company |
| GET | `/analysis/company/{companyId}/category-breakdown` | Company-wide spending grouped by category with percentages — optimised for Pie/Donut charts |
| GET | `/analysis/company/{companyId}/spending-trend` | Month-over-month spending trend with growth percentages and trend direction (*UP / DOWN / FLAT*) — optimised for Line/Bar charts |
| GET | `/analysis/budget/{budgetId}/top-spenders` | Leaderboard of allocations ranked by total spend for a specific budget — optimised for horizontal Bar charts |
