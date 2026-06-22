# Security Implementation Analysis

This document outlines the security architecture and implementation details across the various microservices in the Artha project, which includes Spring Boot, FastAPI, and Node.js services.

## 1. API Gateway (Centralized Authentication)
The **API Gateway** serves as the primary entry point for all client requests and is responsible for edge security.
* **Technology:** Spring WebFlux Security.
* **Mechanism:** It uses a `JwtAuthenticationFilter` to intercept and validate JWT tokens before routing requests to downstream services.
* **Configuration:** 
  * CSRF is disabled.
  * Explicit CORS configurations are defined to allow specific origins and methods.
  * Whitelisted routes (e.g., `/auth/**`, `/oauth2/**`, `/internal/**`, `/actuator/**`) bypass authentication.
  * All other requests (`anyExchange().authenticated()`) strictly require a valid JWT.

## 2. User Service (Identity & Access Management)
The **User Service** acts as the identity provider for the system.
* **Technology:** Spring Security.
* **Mechanism:** Handles token generation, user validation, and OAuth2 integration.
* **Configuration:**
  * Uses an `OAuth2AuthenticationSuccessHandler` for social logins.
  * Implements its own `JwtAuthenticationFilter` and `AuthenticationProvider` to validate and issue tokens.
  * Exposes public endpoints for authentication while keeping internal inter-service endpoints accessible without JWTs (using network isolation).

## 3. Delegated Authentication (Trust Model)
The core domain services rely on the API Gateway to handle authentication. They operate on a "trust the gateway" model.
* **Budget & Expense Services (Spring Boot):**
  * The `SecurityConfig` in these services explicitly allows all requests at the web/HTTP layer (`auth.anyRequest().permitAll()`).
  * They expect the Gateway to have already validated the JWT and forwarded necessary identity headers (like `X-User-Id`).
* **Analysis Service (FastAPI):**
  * Does not implement internal FastAPI authentication guards (like `Depends(get_current_user)`).
  * Extracts the `Authorization` and `X-User-Id` headers from the request context and passes them to internal service calls to maintain identity context.

## 4. Service-Layer Authorization (RBAC)
While the web layer of domain services permits all requests, **authorization** (Role-Based Access Control) is strictly enforced at the business logic (service) layer.
* Services like Budget and Expense utilize components like `RemoteAuthorizationService` to perform role checks based on the `X-User-Id` before allowing operations on entities (e.g., companies, budgets, expenses).

## 5. Internal & Background Services
* **Notification Service (Node.js/Express):** 
  * Operates strictly as a background worker.
  * It consumes events asynchronously from Kafka (e.g., `expenseConsumer`, `companyConsumer`).
  * It exposes basic health and info endpoints but no functional public APIs, thereby not requiring JWT validation. It is secured by network architecture (not exposed externally).

## 6. Stateless Sessions
Across the entire Spring Boot ecosystem (API Gateway, User Service, Budget, Expense), session management is strictly set to **STATELESS** (`SessionCreationPolicy.STATELESS`). The system relies entirely on stateless JWTs for maintaining user identity and session.
