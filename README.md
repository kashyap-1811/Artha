# Artha — Microservices Budget & Expense Tracker

**Artha** (Sanskrit for *wealth* / *finance*) is a full-stack, microservices-based application that helps companies manage their budgets and track expenses. It supports multi-company management, fiscal-period budgeting with category allocations, and an approval workflow for expenses — all secured with JWT authentication.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Services](#services)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)

---

## Features

- **User Authentication** — Register and log in with email/password or Google OAuth 2.0; sessions are secured with JWT tokens.
- **Company Management** — Users can create companies and invite members. Each user can belong to multiple companies with different roles (Owner / Member).
- **Fiscal Budget Management** — Create time-bounded budgets (e.g., *January 2026*) with a total limit, and allocate amounts to named categories such as *Operational*, *Marketing*, *Payroll*, *Travel*, etc.
- **Expense Tracking** — Log expenses against the active budget's categories. The application tracks spending in real time and shows how much of each category's allocation remains.
- **Approval Workflow** — Company owners can approve or reject pending expenses submitted by members.
- **Expense History** — Past expenses are grouped by month for easy review.
- **Budget Progress Visualization** — A progress bar shows total spending vs. the budget limit, and highlights when the budget is near or over its cap (> 90 %).

---

## Architecture

Artha follows a microservices architecture coordinated through a service registry and an API gateway:

```
                        ┌─────────────────────┐
                        │   React Frontend     │
                        │  (artha-frontend)    │
                        └────────┬────────────┘
                                 │ HTTP
                        ┌────────▼────────────┐
                        │    API Gateway       │  JWT validation
                        │   (api-gateway)      │  Route forwarding
                        └──┬──────┬──────┬────┘
                           │      │      │
               ┌───────────▼┐  ┌──▼───┐ ┌▼─────────┐
               │ user-service│  │budget│ │ expense  │
               │  (auth,     │  │      │ │          │
               │  companies) │  │      │ │          │
               └─────────────┘  └──────┘ └──────────┘
                           │      │      │
                    ┌──────▼──────▼──────▼──────┐
                    │     Service Registry        │
                    │   (Netflix Eureka Server)   │
                    └────────────────────────────┘
```

All backend services register with the Eureka service registry and communicate via the API gateway.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite |
| Backend | Java 17, Spring Boot 3.2.5 |
| Service Discovery | Spring Cloud Netflix Eureka |
| API Gateway | Spring Cloud Gateway |
| Security | Spring Security, JWT (jjwt 0.12), OAuth 2.0 (Google) |
| Database | PostgreSQL (via Spring Data JPA) |
| Utility | Lombok, Spring Boot Actuator |

---

## Services

| Service | Port | Description |
|---|---|---|
| `service-registry` | 8761 | Netflix Eureka service discovery server |
| `api-gateway` | 8080 | Central entry point — JWT validation, CORS, routing |
| `user-service` | — | User registration/login, JWT issuance, company management |
| `budget` | 8081 | Fiscal budget CRUD and category allocation management |
| `expense` | 8082 | Expense submission, listing, approval/rejection |
| `artha-frontend` | 5173 | React SPA — dashboards, modals, forms |

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL (running instance)
- Node.js 18+ and npm

### 1. Start the Service Registry

```bash
cd service-registry
./mvnw spring-boot:run
```

### 2. Start the Backend Services

Start each of the following in separate terminals (in any order after the registry is up):

```bash
cd api-gateway  && ./mvnw spring-boot:run
cd user-service && ./mvnw spring-boot:run
cd budget       && ./mvnw spring-boot:run
cd expense      && ./mvnw spring-boot:run
```

> Configure your PostgreSQL connection details in each service's `src/main/resources/application.properties` (or `application.yml`) before starting.

### 3. Start the Frontend

```bash
cd artha-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API Overview

All requests (except auth endpoints) must include a `Bearer <token>` header.

| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | user-service | Register a new user |
| POST | `/api/auth/login` | user-service | Log in and receive a JWT |
| GET | `/api/users/{id}` | user-service | Get user profile |
| POST | `/api/companies` | user-service | Create a company |
| GET | `/api/companies/my` | user-service | List companies for the current user |
| POST | `/api/budgets` | budget | Create a fiscal budget |
| GET | `/api/budgets?companyId=` | budget | List all budgets for a company |
| GET | `/api/budgets/active?companyId=` | budget | Get the currently active budget |
| POST | `/api/budgets/{id}/allocations` | budget | Add a category allocation to a budget |
| DELETE | `/api/budgets/{id}/allocations/{aid}` | budget | Remove a category allocation |
| POST | `/api/expenses` | expense | Submit a new expense |
| GET | `/api/expenses?companyId=` | expense | List all expenses for a company |
| POST | `/api/expenses/{id}/approve` | expense | Approve a pending expense (owner only) |
| POST | `/api/expenses/{id}/reject` | expense | Reject a pending expense (owner only) |