## 3.3 Sequence diagrams

### OAuth (Google login)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant GW as API Gateway
    participant US as user-service
    participant Google as Google OAuth2
    participant DB as user_db

    User->>FE: Click "Continue with Google"
    FE->>GW: GET /oauth2/authorization/google
    GW->>US: Forward request (oauth route is public)
    US->>Google: Redirect to Google consent screen
    Google-->>User: Show consent + authenticate
    User->>Google: Approve consent
    Google-->>US: OAuth2 callback with auth code
    US->>Google: Exchange code for user profile
    Google-->>US: email, name, sub(providerId)

    US->>DB: Find user by email
    alt Existing user
        DB-->>US: User found
        opt provider missing
            US->>DB: Update provider=google, providerId
        end
    else New user
        DB-->>US: User not found
        US->>DB: Create user(provider=google, active=true)
        US->>DB: Ensure personal company for new user
    end

    US->>US: Generate JWT (claims: sub=email, userId, exp)
    US-->>User: 302 Redirect to FRONTEND_URL/oauth-callback?token=JWT
    User->>FE: Open /oauth-callback?token=JWT
    FE->>FE: Save token + userId in localStorage
    FE-->>User: Navigate to /dashboard
```

### Add new expense

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant GW as API Gateway
    participant ES as expense-service
    participant AUTH as RemoteAuthorizationService
    participant US as user-service
    participant EDB as expense_db
    participant BS as budget-service
    participant Kafka as Kafka(expense-events)

    User->>FE: Submit add expense form
    FE->>GW: POST /expense/api/expenses + Bearer JWT
    GW->>GW: Validate JWT and extract userId
    GW->>ES: Forward request with X-User-Id header

    ES->>AUTH: checkPermission(userId, companyId, CREATE_EXPENSE)
    AUTH->>US: GET /api/companies/{companyId}/members/{userId}
    US-->>AUTH: role (OWNER/MEMBER/VIEWER)
    AUTH-->>ES: Allow or deny action

    alt Unauthorized
        ES-->>GW: 403 Access denied
        GW-->>FE: 403
        FE-->>User: Show error
    else Authorized
        ES->>ES: Decide status by rules
        note right of ES: PERSONAL => APPROVED\nBUSINESS + OWNER => APPROVED\nBUSINESS + non-OWNER => PENDING
        ES->>EDB: Save expense
        ES->>ES: Evict company caches

        alt Saved status is APPROVED
            ES->>BS: GET allocation name (internal budget route)
            BS-->>ES: allocationName
            ES->>Kafka: Publish ExpenseResponse(action=CREATED)
        end

        ES-->>GW: ExpenseResponse
        GW-->>FE: 200 OK + expense payload
        FE-->>User: Show updated expense list
    end
```

## 3.4 Activity diagrams

### JWT signup flow

```mermaid
flowchart TD
    A([Start]) --> B[User submits signup form]
    B --> C[POST /auth/signup]
    C --> D{Email already exists?}
    D -- Yes --> E[Return error: Email already in use]
    E --> Z([End])
    D -- No --> F[Encode password]
    F --> G[Create user record]
    G --> H[Ensure personal company]
    H --> I[Return SignupResponse{id,email}]
    I --> J[Frontend optionally calls /auth/login]
    J --> Z
```

### JWT login flow

```mermaid
flowchart TD
    A([Start]) --> B[User submits login form]
    B --> C[POST /auth/login]
    C --> D[Authenticate email+password]
    D --> E{Credentials valid?}
    E -- No --> F[401 Unauthorized]
    F --> Z([End])
    E -- Yes --> G[Load user by email]
    G --> H[Generate JWT with sub=email + userId + exp]
    H --> I[Return LoginResponse{jwt,userId}]
    I --> J[Frontend stores JWT in localStorage]
    J --> K[Subsequent API calls send Bearer token]
    K --> L[Gateway validates JWT]
    L --> M[Gateway forwards X-User-Id to services]
    M --> Z
```
