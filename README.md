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
- **Automated README Updates** — A GitHub Actions workflow (`.github/workflows/update-readme.yml`) now ensures the `README.md` file remains in sync with significant codebase changes. Using OpenAI's GPT-based model, the workflow generates and commits updates directly to the documentation upon detecting meaningful updates in the repository.

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
| Relational Database | P