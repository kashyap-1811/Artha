```mermaid
erDiagram
    %% ──────────────────────────────────────────
    %%  USER-SERVICE  (PostgreSQL)
    %% ──────────────────────────────────────────
    users {
        string  id          PK  "UUID NOT NULL"
        string  full_name       "NOT NULL"
        string  email           "NOT NULL UNIQUE"
        string  password        "nullable"
        string  provider        "nullable  e.g. google"
        string  provider_id     "nullable  OAuth UID"
        boolean active          "NOT NULL DEFAULT true"
    }

    companies {
        string  id          PK  "UUID NOT NULL"
        string  name            "NOT NULL"
        string  type            "NOT NULL  ENUM(PERSONAL,BUSINESS)"
        instant created_at      "NOT NULL"
    }

    user_companies {
        string  id          PK  "UUID NOT NULL"
        string  user_id     FK  "NOT NULL → users.id"
        string  company_id  FK  "NOT NULL → companies.id"
        string  role            "NOT NULL  ENUM(OWNER,MEMBER,VIEWER)"
        boolean active          "NOT NULL DEFAULT true"
        instant joined_at       "NOT NULL"
    }

    %% ──────────────────────────────────────────
    %%  BUDGET-SERVICE  (PostgreSQL)
    %% ──────────────────────────────────────────
    budgets {
        uuid    id          PK  "NOT NULL"
        string  company_id      "NOT NULL  (logical ref)"
        string  created_by      "NOT NULL  userId ref"
        string  name            "NOT NULL"
        decimal total_amount    "NOT NULL PRECISION(19,2)"
        date    start_date      "NOT NULL"
        date    end_date        "NOT NULL"
        string  status          "NOT NULL  ENUM(ACTIVE,CLOSED)"
        instant created_at      "NOT NULL"
        instant updated_at      "nullable"
    }

    budget_category_allocations {
        uuid    id              PK  "NOT NULL"
        uuid    budget_id       FK  "NOT NULL → budgets.id"
        string  category_name       "NOT NULL"
        decimal allocated_amount    "NOT NULL PRECISION(19,2)"
        int     alert_threshold     "nullable  e.g. 80 = 80%"
        instant created_at          "NOT NULL"
    }

    budget_audit_logs {
        uuid    id          PK  "NOT NULL"
        uuid    budget_id   FK  "NOT NULL → budgets.id"
        string  user_id         "NOT NULL  (logical ref)"
        string  action          "NOT NULL  ENUM(CREATE,UPDATE,CLOSE,DELETE,ADD_ALLOCATION,UPDATE_ALLOCATION,REMOVE_ALLOCATION)"
        instant created_at      "NOT NULL"
    }

    %% ──────────────────────────────────────────
    %%  EXPENSE-SERVICE  (PostgreSQL)
    %% ──────────────────────────────────────────
    expenses {
        uuid    id              PK  "NOT NULL"
        string  company_id          "NOT NULL  (logical ref)"
        uuid    budget_id           "NOT NULL  (logical ref)"
        uuid    allocation_id       "NOT NULL  (logical ref)"
        decimal amount              "NOT NULL PRECISION(19,2)"
        string  reference           "nullable"
        date    spent_date          "nullable"
        string  type                "ENUM(PERSONAL,BUSINESS)"
        string  status              "ENUM(PENDING,APPROVED,REJECTED)"
        boolean warning             "nullable"
        string  created_by          "nullable  userId ref"
        instant created_at          "NOT NULL"
    }

    %% ──────────────────────────────────────────
    %%  NOTIFICATION-SERVICE  (MongoDB)
    %% ──────────────────────────────────────────
    notifications {
        string  _id             PK  "ObjectId"
        string  user_id             "NOT NULL  (logical ref)"
        string  company_id          "NOT NULL  (logical ref)"
        string  budget_id           "NOT NULL  (logical ref)"
        string  allocation_id       "NOT NULL  (logical ref)"
        string  type                "NOT NULL  ENUM(THRESHOLD_ALERT,EXCEED_ALERT)"
        date    sent_at             "NOT NULL DEFAULT now()"
    }

    %% ──────────────────────────────────────────
    %%  RELATIONSHIPS
    %% ──────────────────────────────────────────
    users               ||--o{ user_companies               : "belongs to many"
    companies           ||--o{ user_companies               : "has many members"
    budgets             ||--o{ budget_category_allocations  : "has many"
    budgets             ||--o{ budget_audit_logs            : "audited by"
    expenses            }o--|| budgets                      : "belongs to (logical)"
    expenses            }o--|| budget_category_allocations  : "belongs to (logical)"
    notifications       }o--|| budget_category_allocations  : "triggered by (logical)"
```
