```mermaid
classDiagram

    %% ═══════════════════════════════════════════════════════════
    %%  ENUMERATIONS
    %% ═══════════════════════════════════════════════════════════
    class UserCompanyRole {
        <<enumeration>>
        OWNER
        MEMBER
        VIEWER
    }
    class CompanyType {
        <<enumeration>>
        PERSONAL
        BUSINESS
    }
    class BudgetStatus {
        <<enumeration>>
        ACTIVE
        CLOSED
    }
    class BudgetAction {
        <<enumeration>>
        CREATE
        UPDATE
        CLOSE
        DELETE
        ADD_ALLOCATION
        UPDATE_ALLOCATION
        REMOVE_ALLOCATION
    }
    class ExpenseStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
    }
    class ExpenseType {
        <<enumeration>>
        PERSONAL
        BUSINESS
    }
    class NotificationType {
        <<enumeration>>
        THRESHOLD_ALERT
        EXCEED_ALERT
    }

    %% ═══════════════════════════════════════════════════════════
    %%  USER-SERVICE  ─  Domain Entities
    %% ═══════════════════════════════════════════════════════════
    class User {
        +String id
        +String fullName
        +String email
        -String password
        +String provider
        +String providerId
        +boolean active
        +Set~UserCompany~ userCompanies
        +addUserCompany(uc: UserCompany) void
        +removeUserCompany(uc: UserCompany) void
    }
    class Company {
        +String id
        +String name
        +CompanyType type
        +Instant createdAt
        +Set~UserCompany~ userCompanies
        +addUserCompany(uc: UserCompany) void
        +removeUserCompany(uc: UserCompany) void
    }
    class UserCompany {
        +String id
        +User user
        +Company company
        +UserCompanyRole role
        +boolean active
        +Instant joinedAt
    }

    User "1" --> "0..*" UserCompany : has
    Company "1" --> "0..*" UserCompany : has
    UserCompany --> UserCompanyRole
    Company --> CompanyType

    %% ─── User-Service: Repositories ───
    class UserRepository {
        <<interface>>
        +findByEmail(email: String) Optional~User~
        +existsByEmail(email: String) boolean
    }
    class CompanyRepository {
        <<interface>>
        +findById(id: String) Optional~Company~
    }
    class UserCompanyRepository {
        <<interface>>
        +findByUserIdAndCompanyId(uid: String, cid: String) Optional~UserCompany~
        +findByCompanyId(cid: String) List~UserCompany~
    }
    UserRepository ..> User : manages
    CompanyRepository ..> Company : manages
    UserCompanyRepository ..> UserCompany : manages

    %% ─── User-Service: Services ───
    class IUserService {
        <<interface>>
        +create(user: User) User
        +findById(id: String) User
        +update(id: String, req: UpdateUserRequest) User
        +ensurePersonalCompany(userId: String) void
    }
    class ICompanyService {
        <<interface>>
        +createCompanyWithOwner(owner: User, company: Company) Company
        +addMember(user: User, company: Company, role: UserCompanyRole) Company
        +removeMember(user: User, company: Company) Company
        +changeRole(user: User, company: Company, newRole: UserCompanyRole) Company
        +getById(id: String) Company
        +delete(id: String) void
        +getCompanyMembers(companyId: String) List~CompanyMemberResponse~
    }
    class IUserCompanyService {
        <<interface>>
        +getUserCompanies(userId: String) List~UserCompanyResponse~
        +getCompanyForUser(userId: String, companyId: String) UserCompany
    }
    class AuthService {
        -UserRepository userRepository
        -IUserService userService
        -PasswordEncoder passwordEncoder
        -JwtUtil jwtUtil
        -AuthenticationManager authManager
        +signup(req: SignupRequest) SignupResponse
        +login(req: LoginRequest) LoginResponse
    }
    class KafkaEventPublisher {
        -KafkaTemplate kafkaTemplate
        +publishCompanyMemberEvent(event: CompanyMemberEvent) void
    }

    IUserService <|.. UserService : implements
    ICompanyService <|.. CompanyService : implements
    IUserCompanyService <|.. UserCompanyService : implements
    AuthService --> IUserService
    AuthService --> UserRepository
    CompanyService --> KafkaEventPublisher

    %% ─── User-Service: Security ───
    class JwtUtil_User {
        <<component>>
        -String secretKey
        -long expirationMs
        +generateToken(userId: String, email: String) String
        +validateToken(token: String) boolean
        +getEmailFromToken(token: String) String
        +getUserIdFromToken(token: String) String
    }
    class JwtAuthFilter_User {
        <<component>>
        -JwtUtil_User jwtUtil
        +doFilterInternal(req, res, chain) void
    }
    class OAuth2SuccessHandler {
        <<component>>
        -JwtUtil_User jwtUtil
        -IUserService userService
        +onAuthenticationSuccess(req, res, auth) void
    }

    JwtAuthFilter_User --> JwtUtil_User
    OAuth2SuccessHandler --> JwtUtil_User

    %% ─── User-Service: Controllers ───
    class AuthController {
        -AuthService authService
        +signup(req: SignupRequest) SignupResponse
        +login(req: LoginRequest) LoginResponse
    }
    class CompanyController {
        -ICompanyService companyService
        +createCompany(userId: String, req: CreateCompanyRequest) CompanyResponse
        +getMembers(companyId: String) List~CompanyMemberResponse~
        +addMember(companyId: String, userId: String, req: AddMemberRequest) void
        +removeMember(companyId: String, userId: String, targetId: String) void
        +changeRole(companyId: String, userId: String, req: MemberRequest) void
        +deleteCompany(companyId: String, userId: String) void
    }
    class UserController {
        -IUserService userService
        +getProfile(userId: String) UserResponse
        +updateProfile(userId: String, req: UpdateUserRequest) UserResponse
        +getUserCompanies(userId: String) List~UserCompanyResponse~
    }

    AuthController --> AuthService
    CompanyController --> ICompanyService
    UserController --> IUserService

    %% ═══════════════════════════════════════════════════════════
    %%  BUDGET-SERVICE  ─  Domain Entities
    %% ═══════════════════════════════════════════════════════════
    class Budget {
        +UUID id
        +String companyId
        +String createdBy
        +String name
        +BigDecimal totalAmount
        +LocalDate startDate
        +LocalDate endDate
        +BudgetStatus status
        +Instant createdAt
        +Instant updatedAt
        +Set~BudgetCategoryAllocation~ allocations
        +addAllocation(a: BudgetCategoryAllocation) void
        +removeAllocation(a: BudgetCategoryAllocation) void
    }
    class BudgetCategoryAllocation {
        +UUID id
        +Budget budget
        +String categoryName
        +BigDecimal allocatedAmount
        +Integer alertThreshold
        +Instant createdAt
    }
    class BudgetAuditLog {
        +UUID id
        +UUID budgetId
        +String userId
        +BudgetAction action
        +Instant createdAt
    }

    Budget "1" *-- "0..*" BudgetCategoryAllocation : contains
    Budget "1" --> "0..*" BudgetAuditLog : audited by
    Budget --> BudgetStatus
    BudgetAuditLog --> BudgetAction

    %% ─── Budget-Service: Repositories ───
    class BudgetRepository {
        <<interface>>
        +findByCompanyIdAndStatus(cid: String, s: BudgetStatus) List~Budget~
        +findByCompanyId(cid: String) List~Budget~
    }
    class BudgetCategoryAllocationRepository {
        <<interface>>
        +findByBudgetId(budgetId: UUID) List~BudgetCategoryAllocation~
        +findAllByIdIn(ids: List~UUID~) List~BudgetCategoryAllocation~
    }
    class BudgetAuditLogRepository {
        <<interface>>
        +findByBudgetId(budgetId: UUID) List~BudgetAuditLog~
    }
    BudgetRepository ..> Budget : manages
    BudgetCategoryAllocationRepository ..> BudgetCategoryAllocation : manages
    BudgetAuditLogRepository ..> BudgetAuditLog : manages

    %% ─── Budget-Service: Services ───
    class BudgetService {
        <<interface>>
        +createBudget(userId, companyId, name, total, start, end) Budget
        +getActiveBudget(userId, companyId) List~BudgetResponseDTO~
        +getAllBudgets(userId, companyId) List~BudgetResponseDTO~
        +closeBudget(userId, budgetId) void
        +addCategoryAllocation(userId, budgetId, category, amount, threshold) BudgetCategoryAllocation
        +removeCategoryAllocation(userId, budgetId, allocationId) void
        +updateAllocation(userId, budgetId, allocationId, req) BudgetCategoryAllocation
        +updateBudget(userId, budgetId, req) Budget
        +removeBudget(userId, budgetId) void
        +getAllDetailOfBudget(userId, budgetId) BudgetResponseDTO
        +getAllocationNames(ids) Map~UUID-String~
    }
    class BudgetServiceImpl {
        -BudgetRepository budgetRepo
        -BudgetCategoryAllocationRepository allocationRepo
        -BudgetAuditLogRepository auditRepo
        -AuthorizationService authService
    }
    class AuthorizationService_Budget {
        <<interface>>
        +authorize(userId: String, companyId: String, action: Action) void
    }
    class RemoteAuthorizationService_Budget {
        -RestTemplate restTemplate
        -String userServiceUrl
        +authorize(userId, companyId, action) void
    }

    BudgetService <|.. BudgetServiceImpl : implements
    BudgetServiceImpl --> BudgetRepository
    BudgetServiceImpl --> BudgetCategoryAllocationRepository
    BudgetServiceImpl --> BudgetAuditLogRepository
    BudgetServiceImpl --> AuthorizationService_Budget
    AuthorizationService_Budget <|.. RemoteAuthorizationService_Budget : implements

    %% ─── Budget-Service: Controller ───
    class BudgetController {
        -BudgetService budgetService
        +createBudget(userId, req) BudgetResponseDTO
        +getActiveBudget(userId, companyId) List~BudgetResponseDTO~
        +getAllBudgets(userId, companyId) List~BudgetResponseDTO~
        +closeBudget(userId, budgetId) void
        +addAllocation(userId, budgetId, req) BudgetAllocationResponseDTO
        +removeAllocation(userId, budgetId, allocationId) void
        +updateAllocation(userId, budgetId, allocationId, req) BudgetAllocationResponseDTO
        +updateBudget(userId, budgetId, req) BudgetResponseDTO
        +removeBudget(userId, budgetId) void
        +getAllDetailOfBudget(userId, budgetId) BudgetResponseDTO
        +getAllocationNames(ids) Map~UUID-String~
    }
    BudgetController --> BudgetService

    %% ═══════════════════════════════════════════════════════════
    %%  EXPENSE-SERVICE  ─  Domain Entities
    %% ═══════════════════════════════════════════════════════════
    class Expense {
        +UUID id
        +String companyId
        +UUID budgetId
        +UUID allocationId
        +BigDecimal amount
        +String reference
        +LocalDate spentDate
        +ExpenseType type
        +ExpenseStatus status
        +Boolean warning
        +String createdBy
        +Instant createdAt
    }

    Expense --> ExpenseStatus
    Expense --> ExpenseType

    %% ─── Expense-Service: Repository ───
    class ExpenseRepository {
        <<interface>>
        +findByCompanyId(cid: String) List~Expense~
        +findByBudgetId(bid: UUID) List~Expense~
        +findByAllocationId(aid: UUID) List~Expense~
        +findApprovedByCompanyAndDateRange(cid, from, to) List~Expense~
    }
    ExpenseRepository ..> Expense : manages

    %% ─── Expense-Service: Services ───
    class ExpenseService {
        <<interface>>
        +createExpense(userId, req) ExpenseResponse
        +getExpense(userId, id) ExpenseResponse
        +getCompanyExpenses(userId, companyId) List~ExpenseResponse~
        +getExpensesByBudgetId(userId, budgetId) List~ExpenseResponse~
        +getExpensesByAllocationId(userId, allocationId) List~ExpenseResponse~
        +approveExpense(userId, id) ExpenseResponse
        +rejectExpense(userId, id) ExpenseResponse
        +getBudgetSummary(userId, budgetId) BudgetExpenseSummaryResponse
        +getExpenseChart(userId, companyId, days) List~CategoryExpenseDTO~
        +updateExpense(userId, id, req) ExpenseResponse
        +deleteExpense(userId, id) void
    }
    class ExpenseServiceImpl {
        -ExpenseRepository expenseRepo
        -AuthorizationService_Expense authService
        -KafkaTemplate kafkaTemplate
        -RestTemplate restTemplate
    }
    class AuthorizationService_Expense {
        <<interface>>
        +authorize(userId, companyId, action) void
    }
    class RemoteAuthorizationService_Expense {
        -RestTemplate restTemplate
        -String userServiceUrl
        +authorize(userId, companyId, action) void
    }

    ExpenseService <|.. ExpenseServiceImpl : implements
    ExpenseServiceImpl --> ExpenseRepository
    ExpenseServiceImpl --> AuthorizationService_Expense
    AuthorizationService_Expense <|.. RemoteAuthorizationService_Expense : implements

    %% ─── Expense-Service: Controller ───
    class ExpenseController {
        -ExpenseService expenseService
        +createExpense(userId, req) ExpenseResponse
        +getExpense(userId, id) ExpenseResponse
        +getExpenses(userId, companyId) List~ExpenseResponse~
        +getExpensesByBudget(userId, budgetId) List~ExpenseResponse~
        +getExpensesByAllocation(userId, allocationId) List~ExpenseResponse~
        +approveExpense(userId, id) ExpenseResponse
        +rejectExpense(userId, id) ExpenseResponse
        +getBudgetSummary(userId, budgetId) BudgetExpenseSummaryResponse
        +getExpenseChart(userId, companyId, days) List~CategoryExpenseDTO~
        +updateExpense(userId, id, req) ExpenseResponse
        +deleteExpense(userId, id) void
    }
    ExpenseController --> ExpenseService

    %% ═══════════════════════════════════════════════════════════
    %%  NOTIFICATION-SERVICE  (Node.js / MongoDB)
    %% ═══════════════════════════════════════════════════════════
    class Notification {
        +ObjectId _id
        +String userId
        +String companyId
        +String budgetId
        +String allocationId
        +NotificationType type
        +Date sentAt
    }
    Notification --> NotificationType

    class NotificationService_NS {
        -String apiGatewayUrl
        +handleExpenseEvent(event) Promise~void~
        +handleCompanyEvent(event) Promise~void~
        -triggerAlert(type, userId, email, ...) Promise~void~
    }
    class EmailService {
        +sendEmail(to, subject, text, html) Promise~void~
    }
    class ExpenseConsumer {
        -KafkaConsumer consumer
        +startExpenseConsumer() Promise~void~
    }
    class CompanyConsumer {
        -KafkaConsumer consumer
        +startCompanyConsumer() Promise~void~
    }

    ExpenseConsumer --> NotificationService_NS : delegates
    CompanyConsumer --> NotificationService_NS : delegates
    NotificationService_NS --> EmailService : uses
    NotificationService_NS --> Notification : persists

    %% ═══════════════════════════════════════════════════════════
    %%  ANALYSIS-SERVICE  (Python / FastAPI)
    %% ═══════════════════════════════════════════════════════════
    class CategoryBreakdown {
        +str name
        +float allocated
        +float spent
    }
    class BudgetAnalysis {
        +str budget_id
        +str budget_name
        +float total_amount
        +float total_expense
        +float remaining
        +str health_score
        +List~CategoryBreakdown~ category_breakdown
    }
    class ActiveBudgetAnalysisResponse {
        +str company_id
        +List~BudgetAnalysis~ active_budgets
        +float overall_category_spent
    }
    class AnalysisService_AS {
        -Redis cache
        +get_active_budget_analysis(companyId) ActiveBudgetAnalysisResponse
        +compute_health_score(remaining, total) str
    }
    class KafkaConsumer_AS {
        -AIOKafkaConsumer consumer
        +start() void
        +process_expense_event(event) void
        +invalidate_cache(companyId) void
    }
    class AnalysisRouter {
        +get_analysis(companyId, userId) ActiveBudgetAnalysisResponse
    }

    ActiveBudgetAnalysisResponse "1" *-- "0..*" BudgetAnalysis
    BudgetAnalysis "1" *-- "0..*" CategoryBreakdown
    AnalysisRouter --> AnalysisService_AS
    KafkaConsumer_AS --> AnalysisService_AS : invalidates cache
    AnalysisService_AS --> ActiveBudgetAnalysisResponse : returns

    %% ═══════════════════════════════════════════════════════════
    %%  API GATEWAY  (Spring Cloud Gateway)
    %% ═══════════════════════════════════════════════════════════
    class JwtUtil_GW {
        <<component>>
        +validateToken(token) boolean
        +getEmailFromToken(token) String
        +getUserIdFromToken(token) String
    }
    class JwtAuthFilter_GW {
        <<component>>
        -JwtUtil_GW jwtUtil
        +filter(exchange, chain) Mono~Void~
    }
    class RateLimitConfig {
        <<component>>
        -JwtUtil_GW jwtUtil
        -boolean rateLimitingEnabled
        +userKeyResolver() KeyResolver
    }
    class ActiveUserTrackingFilter {
        <<component>>
        -ReactiveRedisTemplate redisTemplate
        +filter(exchange, chain) Mono~Void~
    }
    class SystemMetricsHolder {
        <<component>>
        -double cpuUsage
        -double memUsage
        +getCpuUsage() double
        +refresh() void
    }
    class DynamicRateLimitUpdater {
        <<component>>
        -SystemMetricsHolder metrics
        -ReactiveRedisTemplate redisTemplate
        +updateRateLimits() void
    }

    JwtAuthFilter_GW --> JwtUtil_GW
    RateLimitConfig --> JwtUtil_GW
    DynamicRateLimitUpdater --> SystemMetricsHolder
    ActiveUserTrackingFilter ..> DynamicRateLimitUpdater : feeds metrics

    %% ═══════════════════════════════════════════════════════════
    %%  KAFKA EVENT CONTRACTS  (cross-service)
    %% ═══════════════════════════════════════════════════════════
    class CompanyMemberEvent {
        +String eventType
        +String companyId
        +String companyName
        +String targetUserId
        +String targetUserEmail
        +String targetUserFullName
        +String newRole
    }
    class ExpenseEvent {
        +UUID expenseId
        +String companyId
        +UUID budgetId
        +UUID allocationId
        +String status
        +BigDecimal amount
    }

    KafkaEventPublisher ..> CompanyMemberEvent : publishes
    CompanyConsumer ..> CompanyMemberEvent : consumes
    ExpenseServiceImpl ..> ExpenseEvent : publishes
    ExpenseConsumer ..> ExpenseEvent : consumes
```
