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
- [Event-Driven Flow](#event-driven-flow)
- [API Overview](#api-overview)
- [Implementation Deep-Dives](#implementation-deep-dives)
- [⚡ Optimization & Refactoring](#-optimization--refactoring)

---

## Features

- **User Authentication** — Register and log in with email/password or Google OAuth 2.0; sessions are secured with JWT tokens.
- **Company Management** — Users can create companies and invite members. Each user can belong to multiple companies with different roles (Owner / Member). A personal company is automatically created for every new user.
- **Fiscal Budget Management** — Create time-bounded budgets (e.g., *January 2026*) with a total limit, and allocate amounts to named categories such as *Operational*, *Marketing*, *Payroll*, *Travel*, etc.
- **Expense Tracking** — Log expenses against the active budget's categories. The application tracks spending in real time and shows how much of each category's allocation remains.
- **Approval Workflow** — Company owners can approve or reject pending expenses submitted by members.
- **Expense History** — Past expenses are grouped by month for easy review.
- **Budget Progress Visualization** — A progress bar shows total spending vs. the budget limit, and highlights when the budget is near or over its cap (> 90 %).
- **Budget Alert Notifications** — Automated emails are sent to company owners when category spending reaches a configurable threshold (default 80 %) or exceeds 100 % of the allocated amount. Alerts are deduplicated — each alert type is sent only once per allocation. Emails are delivered via **SendGrid**.
- **Company Membership Notifications** — When a member is added to, removed from, or has their role changed in a company, a personalised HTML email is sent to the affected user via SendGrid. These events are published to the `company-events` Kafka topic and consumed by the Notification Service asynchronously.
- **Analytics Dashboard** — A dedicated Python service computes complex financial metrics on top of event-sourced data cached in MongoDB Atlas:
  - *Company Health Score* — classifies a company as **On Track**, **At Risk**, or **Over Budget**.
  - *Category Breakdown* — company-wide spending aggregated by category with percentages, ready for Pie/Donut charts.
  - *Month-over-Month Spending Trend* — detects whether spending is accelerating or slowing down with MoM growth percentages.
  - *Top Spenders Leaderboard* — ranks allocations by total spend for a specific budget.
  - *Active Budget Analysis* — aggregated view across all active budgets of a company.
- **Redis Response Caching** — The Expense and Budget services cache hot read endpoints (company expenses, budget lists, budget details, and chart data) in Redis using Spring Cache with a 5-minute TTL and immediate write-path eviction. The Python Analysis service adds a second Redis caching layer on top of MongoDB so that dashboard API calls are served in under 1 ms on cache hits.
- **Redis Rate Limiting** — The API Gateway enforces per-user (or per-IP) rate limits using Redis to protect all backend services from abuse.
- **Event-Driven CQRS Architecture** — Expense, budget, and company membership events are published to Apache Kafka (`expense-events`, `budget-events`, and `company-events` topics). The Analysis Service and Notification Service consume these events asynchronously, enabling O(1) dashboard reads and real-time email alerts without blocking the core request path.

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
                    budget created   ──►│   Apache Kafka       │─ ┘
                    membership changed─►│  expense-events      │
                                        │  budget-events       │
                                        │  company-events      │
                                        └──────────┬───────────┘
                                                   │
                               ┌───────────────────▼──────────────────┐
                               │                                      │
                    ┌──────────▼──────────┐            ┌──────────────▼───────┐
                    │  analysis-service   │            │ notification-service │
                    │  Kafka consumer     │            │  Kafka consumer      │
                    │  (expense-events +  │            │  (expense-events +   │
                    │   budget-events)    │            │   company-events)    │
                    │  → MongoDB Atlas    │            │  → Email via SendGrid│
                    │    (CQRS cache)     │            │                      │
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
| Notification (Node.js) | Node.js, Express, KafkaJS, SendGrid (@sendgrid/mail) |
| Service Discovery | Spring Cloud Netflix Eureka, eureka-js-client |
| API Gateway | Spring Cloud Gateway, Redis (rate limiting) |
| Security | Spring Security, JWT (jjwt 0.12.6), OAuth 2.0 (Google) |
| Relational Database | PostgreSQL (via Spring Data JPA / Neon) |
| NoSQL / Cache | MongoDB Atlas (Motor async driver), Redis (Spring Cache — expense & budget services) |
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
| `notification-service` | 8086 | Node.js / Express | Event-driven email alerts via SendGrid — budget threshold & exceeded notifications, plus company membership change emails |
| `artha-frontend` | 5173 | React / Vite | React SPA — dashboards, modals, forms |

### Supporting Infrastructure

| Component | Port | Description |
|---|---|---|
| Redis | 6379 | In-memory store for API Gateway rate limiting and service-level response caching (expense & budget) |
| Apache Kafka | 9092 | Message broker for `expense-events`, `budget-events`, and `company-events` topics |
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

All Docker-based runtime configuration is managed through the root `.env` file.

1. Copy `.env.example` to `.env`.
2. Fill in all required values (database URLs, JWT, OAuth, MongoDB, SMTP).
3. Keep `.env` out of version control.

---

## Run with Docker Compose

This repository includes Docker support for all Java services, the frontend, and the full event-driven infrastructure (Kafka, Zookeeper, Redis, Kafka UI).

> **Note:** Each backend service uses its existing Neon PostgreSQL database. No local Postgres container is created. Internal service-to-service URLs are wired through Docker networking.

### Full Stack (recommended)

Create your environment file first:

```bash
cp .env.example .env
```

Then start everything:

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
| `redis` | http://localhost:6379 |
| `kafka` | http://localhost:9092 |
| `zookeeper` | http://localhost:2181 |
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
- Start a Kafka consumer on the `company-events` topic, and send personalised HTML emails to users when they are added to, removed from, or have their role changed in a company.
- Deliver all emails via **SendGrid** — set `SENDGRID_API_KEY` and `FROM_EMAIL` in your environment (see `.env.example`).

### 6. Start the Frontend

```bash
cd artha-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Event-Driven Flow

### Expense Approval

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

### Company Membership Changes

When a company owner **adds, removes, or changes the role of a member**, the following pipeline executes:

```
user-service  ──publish──►  Kafka topic: company-events
                                   │
                                   ▼
                      notification-service consumer
                      • Determines event type:
                        - MEMBER_ADDED   → sends "Welcome to the Team!" email
                        - MEMBER_REMOVED → sends "Membership Revoked" email
                        - ROLE_CHANGED   → sends "Role Updated" email
                      • Personalised HTML email sent to the affected user via SendGrid
```

### Budget Lifecycle Events

When a company owner **creates, updates, or deletes a budget or category allocation**, the following pipeline executes:

```
budget-service  ──publish──►  Kafka topic: budget-events
                                      │
                                      ▼
                         analysis-service consumer
                         • Upserts budget and allocation metadata
                           into the budget_metadata collection
                         • On allocation UPDATED: propagates
                           categoryName changes across expense history
                         • On allocation DELETED: marks matching
                           expenses as "Uncategorized" in MongoDB
                         → Dashboard reads use up-to-date allocation metadata
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
| POST | `/api/companies` | user-service | Create a business company |
| GET | `/api/companies/my` | user-service | List all companies for the current user |
| GET | `/api/companies/my/personal` | user-service | Get the current user's personal company |
| GET | `/api/companies/{companyId}/members` | user-service | Get all members of a company |
| GET | `/api/companies/{companyId}/members/{userId}` | user-service | Get a specific member's role |
| POST | `/api/companies/{companyId}/members` | user-service | Add a member to a company — triggers `company-events` Kafka event |
| DELETE | `/api/companies/{companyId}/members/{userId}` | user-service | Remove a member from a company — triggers `company-events` Kafka event |
| PUT | `/api/companies/{companyId}/members/{userId}/role` | user-service | Change a member's role — triggers `company-events` Kafka event |

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
| GET | `/api/expenses/chart?companyId=&days=` | expense | Get approved spending totals grouped by category (for charts) |
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

---

## Implementation Deep-Dives

Detailed write-ups on key cross-cutting concerns implemented in this project:

| Topic | File | Summary |
|---|---|---|
| **Dynamic Rate Limiting** | [`implementation/Rate-limiting.md`](implementation/Rate-limiting.md) | Per-user adaptive rate limiting in the API Gateway using Redis token buckets, active-user tracking, and health-based limit calculation. |
| **Caching** | [`implementation/Caching.md`](implementation/Caching.md) | Three-layer caching strategy: Spring `@Cacheable` + Redis for expense and budget read endpoints; Python `cache_response` decorator + Redis for analytics endpoints; MongoDB as a CQRS event-sourced read model for O(1) dashboard queries. |
| **⚡ Optimization & Refactoring** | [`implementation/optimization.md`](implementation/optimization.md) | Second-round backend optimization: DB indexes, N+1 HTTP fix in FastAPI, async I/O fix, constraint-based validation, and aggregation query optimization across user, budget, and expense services. |

---

## ⚡ Optimization & Refactoring

A focused second round of backend optimization was applied across the Java Spring Boot and Python FastAPI services. Full details in [`implementation/optimization.md`](implementation/optimization.md).

**Key improvements:**

- **Fixed N+1 HTTP calls** in `getExpenseChart` — replaced sequential per-category HTTP requests with a single batched async call, eliminating O(n) latency scaling.
- **Replaced blocking I/O in FastAPI** — switched from `requests` to `httpx.AsyncClient` inside async endpoints to prevent event-loop starvation under concurrent load.
- **Added database indexes** on `expense.company_id` (+ composite), `user_company (company_id, active)`, `user_company (user_id, active)`, and `company.type` — converts full-table scans to O(log n) lookups.
- **Optimized budget summary query** — replaced multi-query in-memory aggregation with a single `GROUP BY` query at the database layer.
- **Replaced in-memory filtering with DB `COUNT`** — existence checks and record counts now execute at the database level.
- **Constraint-based validation** in `addMember`, `delete`, and `create` — removed pre-check SELECT queries, cutting DB round trips per operation from 2 to 1 and eliminating TOCTOU race conditions.

**Performance highlights (warm-execution averages, non-cached):**

| Endpoint | Before (ms) | After (ms) | Improvement |
|---|---|---|---|
| `POST /auth/login` | 1507 | 913 | **+39%** |
| `GET /api/users/{id}` | 1037 | 703 | **+32%** |
| `POST /api/budgets` | 1668 | 1294 | **+22%** |
| `GET /api/users/by-email` | 1216 | 1078 | **+11%** |

