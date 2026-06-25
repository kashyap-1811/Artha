# Design Patterns Used in Artha — Code-Level (LLD) Analysis

This document maps the **GoF Design Patterns**, **OOD Foundations**, and **SOLID Principles** to their exact implementation locations in the Artha codebase.

---

## 1. OOD Foundations

### 1.1 Encapsulation

Every JPA entity uses Lombok `@Getter`/`@Setter` with `private` fields — data is never accessed directly. Internal state is hidden behind accessor methods.

| File | What is encapsulated |
|---|---|
| [Expense.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/entity/Expense.java) | Private fields (`amount`, `status`, `companyId`) with getters/setters |
| [Budget.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/entity/Budget.java) | Internal `allocations` set managed only via `addAllocation()` / `removeAllocation()` helper methods (L108–116) |
| [User.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/entity/User.java) | Internal `userCompanies` set managed via `addUserCompany()` / `removeUserCompany()` (L70–78) |
| [SystemMetricsHolder.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/SystemMetricsHolder.java) | Thread-safe counters (`AtomicLong`) are private, only exposed via `recordRequest()` and `snapshotAndReset()` |

### 1.2 Abstraction

Service interfaces define **what** operations exist without revealing **how** they are implemented. Controllers depend only on the abstract interface.

| Interface | Implementation | Service |
|---|---|---|
| [ExpenseService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/ExpenseService.java) | [ExpenseServiceImpl](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java) | Expense |
| [AuthorizationService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/AuthorizationService.java) | [RemoteAuthorizationService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/RemoteAuthorizationService.java) | Expense |
| [BudgetService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/service/BudgetService.java) | [BudgetServiceImpl](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/service/impl/BudgetServiceImpl.java) | Budget |
| [ICompanyService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/ICompanyService.java) | [CompanyService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/impl/CompanyService.java) | User |
| [IUserService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/IUserService.java) | [UserService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/impl/UserService.java) | User |

### 1.3 Inheritance

| Example | File |
|---|---|
| `JwtAuthenticationFilter extends OncePerRequestFilter` | [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/security/JwtAuthenticationFilter.java#L19) — inherits the servlet filter lifecycle |
| `AccessDeniedException extends RuntimeException` | [AccessDeniedException.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/exception/AccessDeniedException.java) — custom exception hierarchy |
| `ResourceNotFoundException extends RuntimeException` | [ResourceNotFoundException.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/exception/ResourceNotFoundException.java) |
| `ExpenseRepository extends JpaRepository` | [ExpenseRepository.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/repository/ExpenseRepository.java#L16) — inherits all CRUD operations |

### 1.4 Polymorphism

| Example | File | Detail |
|---|---|---|
| `AuthorizationService` interface | [RemoteAuthorizationService.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/RemoteAuthorizationService.java#L11) | `ExpenseServiceImpl` calls `authorizationService.checkPermission()` without knowing whether it's remote, local, or mocked — the implementation can be swapped. |
| `WebFilter` interface | [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/security/JwtAuthenticationFilter.java#L16) | Spring's `WebFilter` polymorphically calls `filter()` on the Gateway's JWT filter |
| `GlobalFilter` interface | [ActiveUserTrackingFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/ActiveUserTrackingFilter.java#L21) | Implements `GlobalFilter` + `Ordered` — Spring invokes it polymorphically |
| `ExpenseStatus` enum | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L49-L62) | Status-based polymorphic branching (`PERSONAL` → auto-approve, `BUSINESS` + `OWNER` → approve, else → pending) |

### 1.5 Coupling and Cohesion

**Low Coupling:**
- Services communicate only through interfaces (e.g., `ExpenseService` → `AuthorizationService`).
- Cross-service calls go through HTTP clients ([UserServiceClient](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/client/UserServiceClient.java), [BudgetServiceClient](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/client/BudgetServiceClient.java)), not direct database access.
- Async communication via Kafka topics further decouples producers from consumers.

**High Cohesion:**
- Each package handles one concern: `entity/` = data, `repository/` = persistence, `service/` = business logic, `controller/` = HTTP, `kafka/` = messaging, `mapper/` = transformations, `dto/` = data transfer, `config/` = configuration.

### 1.6 Composition over Inheritance

| Example | File | Detail |
|---|---|---|
| `ExpenseServiceImpl` composes `AuthorizationService`, `KafkaEventPublisher`, `BudgetServiceClient`, `CacheManager` | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L36-L40) | Instead of inheriting behaviors, it injects them as dependencies |
| `Budget` composes `Set<BudgetCategoryAllocation>` | [Budget.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/entity/Budget.java#L84-L91) | Uses `@OneToMany` composition, not inheritance from an "allocation parent" |
| `User` composes `Set<UserCompany>` | [User.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/entity/User.java#L60-L66) | User "has" company memberships, doesn't extend them |

---

## 2. SOLID Principles

### 2.1 Single Responsibility Principle (SRP)

Each class has **one reason to change**:

| Class | Single Responsibility |
|---|---|
| [ExpenseController](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/controller/ExpenseController.java) | HTTP request/response mapping only |
| [ExpenseServiceImpl](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java) | Business logic only |
| [ExpenseRepository](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/repository/ExpenseRepository.java) | Database queries only |
| [ExpenseMapper](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/mapper/ExpenseMapper.java) | Entity ↔ DTO conversion only |
| [KafkaEventPublisher](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/KafkaEventPublisher.java) | Publishing events to Kafka only |
| [OutboxScheduler](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/OutboxScheduler.java) | Retrying failed outbox messages only |
| [RemoteAuthorizationService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/RemoteAuthorizationService.java) | Authorization checking only |
| [emailService.js](file:///c:/CE/CE%20SEM-VI/SDP/Artha/notification-service/src/services/emailService.js) | Sending emails via SendGrid only |
| [SystemMetricsHolder](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/SystemMetricsHolder.java) | Accumulating request metrics only |

### 2.2 Open-Closed Principle (OCP)

- **`GlobalExceptionHandler`** ([GlobalExceptionHandler.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/exception/GlobalExceptionHandler.java)): Open for extension — you can add a new `@ExceptionHandler` method for any new exception type without modifying existing handlers.
- **`AuthorizationService` interface**: If authorization logic changes (e.g., from remote HTTP calls to a local cache-based check), only the implementation class changes — `ExpenseServiceImpl` is **closed** for modification.
- **API Gateway routes** ([application.yaml](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/resources/application.yaml#L23-L141)): New services can be added by appending route definitions — existing routes remain untouched.

### 2.3 Liskov Substitution Principle (LSP)

- `RemoteAuthorizationService implements AuthorizationService`: Any code depending on `AuthorizationService` can substitute `RemoteAuthorizationService` (or a test mock) without behavioral changes.
- `ExpenseServiceImpl implements ExpenseService`: The controller (`ExpenseController`) works with the interface — any compliant implementation can be substituted.
- `JwtAuthenticationFilter extends OncePerRequestFilter`: Can be substituted wherever Spring expects a servlet `Filter`.

### 2.4 Interface Segregation Principle (ISP)

- [AuthorizationService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/AuthorizationService.java) has **only 1 method** (`checkPermission`) — clients are not forced to depend on methods they don't use.
- [IUserService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/IUserService.java), [ICompanyService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/ICompanyService.java), [IUserCompanyService](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/IUserCompanyService.java) are **three separate interfaces** instead of one bloated "UserManagement" interface — each controller only depends on the interface it needs.

### 2.5 Dependency Inversion Principle (DIP)

- **High-level modules depend on abstractions, not concrete classes:**
  - [ExpenseController](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/controller/ExpenseController.java#L18) depends on `ExpenseService` (interface), not `ExpenseServiceImpl`.
  - [ExpenseServiceImpl](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L37) depends on `AuthorizationService` (interface), not `RemoteAuthorizationService`.
  - Spring's `@RequiredArgsConstructor` + constructor injection wires the concrete implementation at runtime via the IoC container.

---

## 3. Creational Design Patterns

### 3.1 Builder Pattern

Used extensively via Lombok `@Builder` for step-by-step construction of complex objects:

| Class | File |
|---|---|
| `Expense.builder()...build()` | [ExpenseMapper.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/mapper/ExpenseMapper.java#L17-L29) |
| `ExpenseResponse.builder()...build()` | [ExpenseMapper.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/mapper/ExpenseMapper.java#L33-L49) |
| `OutboxMessage.builder()...build()` | [KafkaEventPublisher.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/KafkaEventPublisher.java#L32-L37) |
| `UserCompany.builder()...build()` | [CompanyService.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/impl/CompanyService.java#L44-L47) |
| `User.builder()...build()` | [AuthService.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/AuthService.java#L37-L42) |
| `CompanyMemberEvent.builder()...build()` | [CompanyService.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/impl/CompanyService.java#L94-L102) |
| `BudgetResponseDTO.builder()...build()` | [BudgetMapper.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/mapper/BudgetMapper.java#L21-L39) |
| `BudgetExpenseSummaryResponse.builder()...build()` | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L245-L250) |

### 3.2 Singleton Pattern (via Spring IoC)

All Spring `@Component`, `@Service`, `@Configuration`, and `@Bean` classes are **singletons by default** in the application context:

| Singleton bean | File |
|---|---|
| `ExpenseServiceImpl` | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L30) (`@Service`) |
| `CompanyService` | [CompanyService.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/services/impl/CompanyService.java#L18) (`@Service`) |
| `KafkaEventPublisher` | [KafkaEventPublisher.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/KafkaEventPublisher.java#L13) (`@Component`) |
| `JwtUtil` | [JwtUtil.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/security/JwtUtil.java) (`@Component`) |
| `RedisCacheManager` (bean) | [CacheConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/config/CacheConfig.java#L21-L22) (`@Bean`) |
| `RestTemplate` (bean) | [RestTemplateConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/config/RestTemplateConfig.java#L14-L15) (`@Bean`) |
| `Database` (Python singleton) | [main.py](file:///c:/CE/CE%20SEM-VI/SDP/Artha/analysis-service/app/main.py#L27-L30) — single `Database()` instance holding the MongoDB client |

### 3.3 Factory Method Pattern

| Example | File | Detail |
|---|---|---|
| `@Bean public RestTemplate restTemplate()` | [RestTemplateConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/config/RestTemplateConfig.java#L14-L21) | A factory method that creates and configures a `RestTemplate` object with timeouts and load balancing |
| `@Bean public RedisCacheManager cacheManager()` | [CacheConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/config/CacheConfig.java#L21-L47) | A factory method that produces a fully-configured `RedisCacheManager` with serializers and TTL |
| `RedisRateLimiter.Config` creation | [DynamicRateLimitUpdater.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/DynamicRateLimitUpdater.java#L148-L156) | Creates config objects per route in `initializeDefaultRouteConfigs()` |

---

## 4. Structural Design Patterns

### 4.1 Facade Pattern

| Facade | File | What it simplifies |
|---|---|---|
| `ExpenseController` | [ExpenseController.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/controller/ExpenseController.java) | Provides a simple HTTP interface hiding the complex interaction of `ExpenseService` → `AuthorizationService` → `KafkaEventPublisher` → `BudgetServiceClient` → `CacheManager` |
| `BudgetServiceClient` | [BudgetServiceClient.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/client/BudgetServiceClient.java) | Hides the complexity of HTTP calls, header injection, and JSON parsing behind simple methods like `getAllocationName()` |
| `KafkaEventPublisher` | [KafkaEventPublisher.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/KafkaEventPublisher.java) | Hides the complexity of outbox persistence, transaction synchronization, and Kafka publishing behind a single `send(topic, key, event)` call |

### 4.2 Proxy Pattern

| Proxy | File | Detail |
|---|---|---|
| API Gateway (routing proxy) | [application.yaml](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/resources/application.yaml#L23-L141) | Acts as a reverse proxy — clients call the gateway, which transparently forwards to backend services via `lb://service-name` |
| `JwtAuthenticationFilter` (security proxy) | [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/security/JwtAuthenticationFilter.java) | Intercepts requests before they reach the real service, validating JWT and mutating headers — a protection proxy |
| Spring `@Cacheable` proxy | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L108) | Spring creates a runtime proxy around `getCompanyExpenses()` that checks Redis cache before invoking the real method — a caching proxy |
| `@Transactional` proxy | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L33) | Spring wraps the class in a proxy that manages DB transaction boundaries (begin/commit/rollback) |

### 4.3 Decorator Pattern

| Decorator | File | Detail |
|---|---|---|
| `@Cacheable` decorator | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L108-L109) | Decorates `getCompanyExpenses()`, `getBudgetSummary()`, `getExpenseChart()`, `getDailyExpenseTrend()` with Redis caching behavior without modifying the methods |
| `@Transactional` decorator | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L33) | Decorates all methods with transaction management |
| `@LoadBalanced` decorator | [RestTemplateConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/config/RestTemplateConfig.java#L15) | Decorates RestTemplate with client-side load balancing (Eureka-aware) |
| Python `@cache_response()` decorator | [cache.py](file:///c:/CE/CE%20SEM-VI/SDP/Artha/analysis-service/app/core/cache.py#L6-L45) | Custom Python decorator that wraps analysis endpoints with Redis caching |

### 4.4 Adapter Pattern

| Adapter | File | Detail |
|---|---|---|
| `UserServiceClient` | [UserServiceClient.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/client/UserServiceClient.java) | Adapts the User Service's REST API into a local Java method call (`getUserRole()`), converting HTTP responses to `UserCompanyRole` enum |
| `BudgetServiceClient` | [BudgetServiceClient.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/client/BudgetServiceClient.java) | Adapts the Budget Service's REST API into `getAllocationName()` and `getAllocationNamesBatch()` methods |
| `ExpenseMapper` | [ExpenseMapper.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/mapper/ExpenseMapper.java) | Adapts between `CreateExpenseRequest` ↔ `Expense` entity ↔ `ExpenseResponse` DTO (different interfaces for different layers) |

### 4.5 Composite Pattern

| Composite | File | Detail |
|---|---|---|
| `Budget` → `Set<BudgetCategoryAllocation>` | [Budget.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/entity/Budget.java#L84-L91) | A Budget is a composite containing multiple allocations — operations on the budget cascade to its children (`CascadeType.ALL`, `orphanRemoval`) |
| `Company` → `Set<UserCompany>` | [Company.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/entity/Company.java#L38-L44) | A Company is a composite containing multiple memberships |
| `User` → `Set<UserCompany>` | [User.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/entity/User.java#L60-L66) | A User is a composite containing multiple company associations |

---

## 5. Behavioral Design Patterns

### 5.1 Observer Pattern

Implemented via **Apache Kafka's publish-subscribe model**:

| Producer (Subject) | Topic | Consumer (Observer) |
|---|---|---|
| [KafkaEventPublisher](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/kafka/KafkaEventPublisher.java) in Expense Service | `expense-events` | [kafka_consumer.py](file:///c:/CE/CE%20SEM-VI/SDP/Artha/analysis-service/app/services/kafka_consumer.py#L21) — Analysis Service |
| | | [expenseConsumer.js](file:///c:/CE/CE%20SEM-VI/SDP/Artha/notification-service/src/consumers/expenseConsumer.js) — Notification Service |
| [KafkaEventPublisher](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/KafkaEventPublisher.java) in Budget Service | `budget-events` | [kafka_consumer.py](file:///c:/CE/CE%20SEM-VI/SDP/Artha/analysis-service/app/services/kafka_consumer.py#L134) — Analysis Service |
| [KafkaEventPublisher](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/kafka/KafkaEventPublisher.java) in User Service | `company-events` | [companyConsumer.js](file:///c:/CE/CE%20SEM-VI/SDP/Artha/notification-service/src/consumers/companyConsumer.js) — Notification Service |

> Producers publish events without knowing who subscribes. Consumers react independently — classic Observer.

### 5.2 Strategy Pattern

| Context | Strategy Interface | Concrete Strategies | File |
|---|---|---|---|
| `ExpenseServiceImpl` | `AuthorizationService` | `RemoteAuthorizationService` (could be swapped for `LocalAuthorizationService`, `MockAuthorizationService`, etc.) | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L37) |
| `DynamicRateLimitUpdater` | Health-based limiting | `computeHealthBasedLimit()` implements a decision tree strategy that varies rate limits based on CPU/latency/error metrics | [DynamicRateLimitUpdater.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/DynamicRateLimitUpdater.java#L267-L290) |
| API Gateway | `KeyResolver` | `userKeyResolver` bean determines how to identify users for rate limiting (by user ID or IP) | [RateLimitConfig.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/RateLimitConfig.java) |

### 5.3 Chain of Responsibility Pattern

Implemented via **Spring filter chains**:

| Chain | Filters (in order) | Files |
|---|---|---|
| API Gateway request pipeline | `ActiveUserTrackingFilter` → `JwtAuthenticationFilter` → `RequestRateLimiter` → Route Handler | [ActiveUserTrackingFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/config/ActiveUserTrackingFilter.java), [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/api-gateway/src/main/java/com/artha/apigateway/security/JwtAuthenticationFilter.java) |
| User Service security chain | `JwtAuthenticationFilter` → `SecurityFilterChain` → Controller | [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/security/JwtAuthenticationFilter.java) |
| Exception handling chain | `AccessDeniedException` → `IllegalArgumentException` → `IllegalStateException` → `ResourceNotFoundException` → `RuntimeException` | [GlobalExceptionHandler.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/exception/GlobalExceptionHandler.java) |

> Each filter decides whether to handle the request or pass it along via `filterChain.doFilter()` / `chain.filter()`.

### 5.4 State Pattern

The **Expense approval workflow** uses `ExpenseStatus` enum as state:

| State | Allowed Transitions | File |
|---|---|---|
| `PENDING` | → `APPROVED`, → `REJECTED` | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L181-L183) |
| `APPROVED` | Terminal (no further state changes) | L181: `if (expense.getStatus() != ExpenseStatus.PENDING) throw` |
| `REJECTED` | Terminal | L221: same guard |

State-dependent behavior: Only `APPROVED` expenses trigger Kafka events (L76, L202, L347, L373).

### 5.5 Template Method Pattern

| Template | File | Detail |
|---|---|---|
| `OncePerRequestFilter.doFilterInternal()` | [JwtAuthenticationFilter.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/user-service/src/main/java/com/artha/user/security/JwtAuthenticationFilter.java#L23-L62) | Spring defines the filter lifecycle; the subclass overrides only the `doFilterInternal()` step |
| JPA `@PrePersist` / `@PreUpdate` hooks | [Expense.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/entity/Expense.java#L61-L64), [Budget.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/entity/Budget.java#L95-L104) | JPA's persistence lifecycle is the template; entities define hook methods (`onCreate()`, `onUpdate()`) |

### 5.6 Iterator Pattern

| Example | File | Detail |
|---|---|---|
| Java Stream API | [ExpenseServiceImpl.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/expense/src/main/java/com/artha/expense/service/impl/ExpenseServiceImpl.java#L118-L120) | `expenses.stream().map(ExpenseMapper::toResponse).collect(...)` — iterating over collections uniformly |
| Kafka async iterator | [kafka_consumer.py](file:///c:/CE/CE%20SEM-VI/SDP/Artha/analysis-service/app/services/kafka_consumer.py#L42) | `async for msg in consumer:` — iterating over an infinite stream of Kafka messages |
| Outbox message loop | [OutboxScheduler.java](file:///c:/CE/CE%20SEM-VI/SDP/Artha/budget/src/main/java/com/artha/budget/kafka/OutboxScheduler.java#L40) | `for (OutboxMessage message : failedMessages)` — iterating over pending outbox entries |

---

## Summary Table

| Pattern Category | Pattern | Used In Artha? | Primary Location |
|---|---|---|---|
| **OOD** | Encapsulation | ✅ | All entities (private fields + accessors) |
| | Abstraction | ✅ | Service interfaces (`ExpenseService`, `ICompanyService`, etc.) |
| | Inheritance | ✅ | `OncePerRequestFilter`, `JpaRepository`, custom exceptions |
| | Polymorphism | ✅ | `AuthorizationService`, `WebFilter`, `GlobalFilter` |
| | Low Coupling | ✅ | Interface-based injection, Kafka, HTTP clients |
| | Composition over Inheritance | ✅ | Entity relationships, service composition |
| **SOLID** | SRP | ✅ | Every class in the layered architecture |
| | OCP | ✅ | `GlobalExceptionHandler`, Gateway route config |
| | LSP | ✅ | All interface-implementation pairs |
| | ISP | ✅ | `IUserService`, `ICompanyService`, `AuthorizationService` |
| | DIP | ✅ | Controller → Interface → Implementation pattern |
| **Creational** | Singleton | ✅ | Spring beans (`@Service`, `@Component`, `@Bean`) |
| | Builder | ✅ | Lombok `@Builder` on all entities and DTOs |
| | Factory Method | ✅ | `@Bean` factory methods in config classes |
| **Structural** | Facade | ✅ | Controllers, `KafkaEventPublisher`, service clients |
| | Proxy | ✅ | API Gateway, `@Cacheable`, `@Transactional` |
| | Decorator | ✅ | `@Cacheable`, `@Transactional`, `@LoadBalanced`, `@cache_response` |
| | Adapter | ✅ | `UserServiceClient`, `BudgetServiceClient`, `ExpenseMapper` |
| | Composite | ✅ | Budget→Allocations, User→UserCompanies |
| **Behavioral** | Observer | ✅ | Kafka pub-sub (`expense-events`, `budget-events`, `company-events`) |
| | Strategy | ✅ | `AuthorizationService`, rate limiting strategies |
| | Chain of Responsibility | ✅ | Spring filter chains, exception handler chain |
| | State | ✅ | `ExpenseStatus` (PENDING → APPROVED/REJECTED) |
| | Template Method | ✅ | `OncePerRequestFilter`, JPA lifecycle hooks |
| | Iterator | ✅ | Java Streams, Kafka async iterator, outbox loops |
