# Caching Implementation

## 1. Overview

**Caching** stores the result of an expensive operation so that subsequent requests for the same data can be served instantly from an in-memory store rather than repeating the original computation (database query, HTTP call, or complex aggregation). Without caching, every request would hit the database even when the data has not changed between requests — wasting I/O, CPU, and response-time budget.

Artha uses caching at three distinct layers:

| Layer | Where | Store | Pattern |
|---|---|---|---|
| **Service-level response cache** | Expense service, Budget service | Redis (Spring Cache) | `@Cacheable` / manual `CacheManager` eviction |
| **Analytics read-through cache** | Analysis service | Redis (Python async) | Custom `@cache_response` decorator |
| **Event-sourced read model** | Analysis service | MongoDB Atlas | CQRS — Kafka events materialise a pre-computed read store |

Each layer targets a different problem. The service caches eliminate redundant PostgreSQL reads for hot list endpoints. The analytics Redis cache absorbs repeated dashboard API calls. The MongoDB read model removes the need to run complex aggregations on every analytics request by maintaining an always-current pre-computed document store updated in real time via Kafka.

---

## 2. Architecture

```
Client
  │
  ▼
API Gateway (Spring Cloud Gateway)
  │  JWT validation · Redis rate limiting
  ▼
┌───────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│  expense-service  │   │  budget-service   │   │  analysis-service   │
│  (Spring Boot)    │   │  (Spring Boot)    │   │  (FastAPI / Python) │
│                   │   │                   │   │                     │
│ @Cacheable        │   │ @Cacheable        │   │ @cache_response     │
│  ↓ Redis          │   │  ↓ Redis          │   │  ↓ Redis            │
│  ↓ PostgreSQL     │   │  ↓ PostgreSQL     │   │  ↓ MongoDB Atlas    │
└───────────────────┘   └───────────────────┘   └──────────┬──────────┘
        │                       │                           │
        └───────────────────────┴───────────────────────────┘
                                │ Kafka events (expense-events, budget-events)
                                ▼
                       analysis-service Kafka consumer
                       → Upserts pre-computed data into MongoDB Atlas
                         (CQRS read model — O(1) dashboard reads)
```

**Read path:**

1. An authenticated client calls, e.g., `GET /api/expenses?companyId=abc`.
2. The API Gateway validates the JWT and forwards the request to `expense-service`.
3. `expense-service` checks Redis for key `company_expenses::abc`.
   - **Cache hit** → deserialise the JSON from Redis and return immediately (no DB query).
   - **Cache miss** → query PostgreSQL, serialise the result to Redis with a 5-minute TTL, then return.

**Invalidation path:**

4. A user submits, approves, or rejects an expense.
5. The write method calls `evictCompanyCaches(companyId, budgetId)`, which removes the stale Redis entries immediately.
6. The next read re-populates the cache from PostgreSQL.

---

## 3. Spring Redis Cache (Expense & Budget Services)

Both `expense-service` and `budget-service` use **Spring Cache** backed by Redis.

### 3.1 Configuration

`CacheConfig.java` (identical structure in both services):

```java
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
    ObjectMapper mapper = new ObjectMapper();
    mapper.registerModule(new JavaTimeModule());

    // Store Java type metadata in every JSON value so Jackson can restore
    // the correct concrete type (e.g., List<ExpenseResponse>) on deserialisation.
    mapper.activateDefaultTyping(
        LaissezFaireSubTypeValidator.instance,
        ObjectMapper.DefaultTyping.NON_FINAL,
        JsonTypeInfo.As.PROPERTY
    );

    GenericJackson2JsonRedisSerializer serializer =
        new GenericJackson2JsonRedisSerializer(mapper);

    RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(5))          // entries expire after 5 minutes
        .disableCachingNullValues()               // never cache a null result
        .serializeKeysWith(...)                   // keys stored as plain strings
        .serializeValuesWith(...);                // values stored as typed JSON

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(config)
        .transactionAware()                       // cache writes participate in TX
        .build();
}
```

Key decisions:

| Decision | Reason |
|---|---|
| **Default typing enabled** | `List<ExpenseResponse>` would otherwise deserialise as `List<LinkedHashMap>`. Type information embedded in the JSON value allows Jackson to reconstruct the exact object graph. |
| **`disableCachingNullValues()`** | A `null` result usually signals a missing entity or a DB error; caching it would make the service incorrectly return `null` for up to 5 minutes even after the entity is created. |
| **5-minute TTL** | A balance between cache hit rate and data freshness. Stale data is at most 5 minutes old *if* an eviction was somehow missed. Normal write paths always evict immediately. |
| **`transactionAware()`** | Cache writes are deferred until the enclosing `@Transactional` method commits, preventing a race where a partial write populates the cache before the DB row is visible. |

### 3.2 Cached Endpoints — Expense Service

| Cache name | Key | Method | Description |
|---|---|---|---|
| `company_expenses` | `#companyId` | `getCompanyExpenses` | All expenses for a company |
| `budget_summary` | `#budgetId` | `getBudgetSummary` | Total approved amount per budget |
| `company_expense_chart` | `#companyId` | `getExpenseChart` | Category-level approved spend for charts |

```java
@Cacheable(value = "company_expenses", key = "#companyId")
public List<ExpenseResponse> getCompanyExpenses(String userId, String companyId) {
    log.info("Cache miss for getCompanyExpenses, companyId: {}", companyId);
    // DB query only runs on a cache miss
    return expenseRepository.findByCompanyId(companyId)
        .stream().map(ExpenseMapper::toResponse).collect(Collectors.toList());
}
```

### 3.3 Cached Endpoints — Budget Service

| Cache name | Key | Method | Description |
|---|---|---|---|
| `company_budgets` | `#companyId` | `getActiveBudget` | Currently active budget for a company |
| `company_budgets_list` | `#companyId` | `getAllBudgets` | All budgets for a company |
| `budget_details` | `#budgetId` | `getAllDetailOfBudget` | Full budget details including allocations |

```java
@CacheEvict(value = {"company_budgets", "company_budgets_list"}, key = "#companyId")
public BudgetResponse createBudget(String companyId, ...) { ... }

@Cacheable(value = "budget_details", key = "#budgetId")
public BudgetDetailResponse getAllDetailOfBudget(UUID budgetId, ...) { ... }
```

### 3.4 Cache Eviction Strategy

Eviction in both services is **explicit and eager** — the cache is invalidated synchronously at the end of every write operation, before the HTTP response is returned. This means the very next read always fetches fresh data from PostgreSQL.

```java
private void evictCompanyCaches(String companyId, UUID budgetId) {
    if (cacheManager == null) return;

    var expensesCache = cacheManager.getCache("company_expenses");
    if (expensesCache != null) expensesCache.evict(companyId);

    var chartCache = cacheManager.getCache("company_expense_chart");
    if (chartCache != null) chartCache.evict(companyId);

    if (budgetId != null) {
        var summaryCache = cacheManager.getCache("budget_summary");
        if (summaryCache != null) summaryCache.evict(budgetId);
    }

    log.info("Finished local cache eviction for companyId: {}", companyId);
}
```

Write operations that trigger eviction:

| Operation | Trigger |
|---|---|
| Create expense | `evictCompanyCaches` |
| Update expense | `evictCompanyCaches` |
| Approve expense | `evictCompanyCaches` |
| Reject expense | `evictCompanyCaches` |
| Delete expense | `evictCompanyCaches` |
| Create budget | `@CacheEvict` annotation |
| Update budget | `evictCompanyCaches` |
| Delete budget | `evictCompanyCaches` |
| Create allocation | `evictCompanyCaches` |
| Update allocation | `evictCompanyCaches` |
| Delete allocation | `evictCompanyCaches` |

### 3.5 Redis Key Format

Spring Cache stores each entry under a key built as:

```
{cacheName}::{key}
```

Examples:

```
company_expenses::comp-123
budget_summary::550e8400-e29b-41d4-a716-446655440000
company_expense_chart::comp-123
company_budgets::comp-123
budget_details::550e8400-e29b-41d4-a716-446655440001
```

You can inspect them directly in Redis:

```bash
# List all expense cache entries
redis-cli KEYS "company_expenses::*"

# Inspect a specific entry (pretty-printed)
redis-cli GET "company_expenses::comp-123" | python3 -m json.tool

# Manually evict a stale entry
redis-cli DEL "company_expenses::comp-123"

# Check remaining TTL (seconds)
redis-cli TTL "company_expenses::comp-123"
```

---

## 4. Analytics Redis Cache (Analysis Service)

The Python `analysis-service` applies a second caching layer on top of MongoDB. Even though MongoDB reads are already fast (pre-aggregated documents), popular dashboard endpoints can still receive bursts of concurrent requests. The Redis layer collapses these bursts into a single MongoDB read per 5-minute window.

### 4.1 `cache_response` Decorator

```python
def cache_response(ttl: int = 300, key_prefix: str = "cache"):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            request = ...  # extracted from args/kwargs

            company_id = kwargs.get("company_id") or kwargs.get("budget_id")
            cache_key = f"{key_prefix}:{company_id}:{request.url.path}"

            redis = request.app.state.redis

            cached_data = await redis.get(cache_key)
            if cached_data:
                return json.loads(cached_data)   # cache hit — return immediately

            result = await func(*args, **kwargs)  # cache miss — call the endpoint

            if result:
                await redis.setex(cache_key, ttl, json.dumps(result, default=str))

            return result
        return wrapper
    return decorator
```

**Key format:** `{key_prefix}:{company_id|budget_id}:{url.path}`

Examples:
```
company_analysis:comp-123:/analysis/company/comp-123/health
budget_analysis:budget-456:/analysis/budget/budget-456/top-spenders
```

### 4.2 Cached Endpoints

| Endpoint | Cache key prefix | TTL |
|---|---|---|
| `GET /company/{company_id}/health` | `company_analysis` | 300 s |
| `GET /budget/{budget_id}/analysis` | `budget_analysis` | 300 s |
| `GET /company/{company_id}/active-budget` | `company_analysis` | 300 s |
| `GET /company/{company_id}/category-breakdown` | `company_analysis` | 300 s |
| `GET /company/{company_id}/spending-trend` | `company_analysis` | 300 s |
| `GET /budget/{budget_id}/top-spenders` | `budget_analysis` | 300 s |

### 4.3 Cache Invalidation

Unlike the Spring services, the Analysis service invalidates its Redis cache **event-driven** via Kafka. When the Kafka consumer processes an approved expense or a budget change, it calls `clear_analysis_cache` before finishing:

```python
async def clear_analysis_cache(redis, company_id: str = None, budget_id: str = None):
    patterns = []
    if company_id:
        patterns.append(f"company_analysis:{company_id}:*")
    if budget_id:
        patterns.append(f"budget_analysis:{budget_id}:*")

    for pattern in patterns:
        keys = await redis.keys(pattern)
        if keys:
            await redis.delete(*keys)
```

This pattern-based deletion removes **all** cached variants for a company or budget at once — health score, breakdown, trend, active budgets — ensuring no endpoint serves stale aggregated data after an event arrives.

---

## 5. MongoDB as a CQRS Read Model (Analysis Service)

Redis caches the *response JSON*. MongoDB stores the *source of truth for analytics data* in a pre-computed, event-sourced read model. This is a CQRS (Command Query Responsibility Segregation) pattern: writes go to the operational PostgreSQL databases in the expense and budget services; the analysis service maintains a separate, denormalised MongoDB store that is purpose-built for fast reads.

### 5.1 Collections

**`budget_expenses`** — materialised view of approved spending per budget:

```json
{
  "budget_id": "550e8400-...",
  "company_id": "comp-123",
  "total_approved_amount": 4250.00,
  "expense_history": [
    {
      "expense_id": "exp-789",
      "allocation_id": "alloc-111",
      "category": "Marketing",
      "amount": 1500.00,
      "date": "2026-03-15"
    }
  ]
}
```

**`budget_metadata`** — allocation names and amounts needed to compute utilisation percentages:

```json
{
  "id": "alloc-111",
  "companyId": "comp-123",
  "categoryName": "Marketing",
  "totalAmount": 5000.00,
  "action": "CREATED"
}
```

### 5.2 Kafka-Driven Updates

The Kafka consumer (`kafka_consumer.py`) keeps MongoDB in sync with real-time events:

| Kafka topic | Event | MongoDB operation |
|---|---|---|
| `expense-events` | Expense created | `$inc` total, `$push` to history |
| `expense-events` | Expense updated | `$inc` diff, `$set` history entry |
| `expense-events` | Expense deleted | `$inc` negative amount, `$pull` from history |
| `budget-events` | Budget/allocation created | `upsert` metadata document |
| `budget-events` | Allocation updated | `$set` categoryName + propagate to expense_history |
| `budget-events` | Allocation deleted | Mark matching expenses as "Uncategorized" |

### 5.3 Why MongoDB for this Layer?

| Reason | Explanation |
|---|---|
| **O(1) dashboard reads** | The health score, breakdown percentages, and trend data are pre-computed by the Kafka consumer. A dashboard read is a single `find_one` on an already-aggregated document — no JOIN, no GROUP BY. |
| **Schema flexibility** | The `expense_history` array inside a budget document evolves naturally as expenses are added or removed without schema migrations. |
| **Decoupling** | The analysis service owns its own data store. Even if the expense or budget PostgreSQL databases are temporarily unavailable, the analytics layer continues to serve data from its MongoDB cache. |
| **Event-sourced correctness** | Because every state change is captured as a Kafka event and replayed into MongoDB, the read model is always eventually consistent with the source of truth. |

---

## 6. Request Flow Example — Analytics Dashboard

```
Browser requests GET /analysis/company/comp-123/health
        │
        ▼
API Gateway → analysis-service
        │
        ▼
 @cache_response decorator checks Redis
        │
  ┌─────┴────────────────────────────┐
  │ Cache hit?                       │ Cache miss
  │ Return JSON immediately          │
  └──────────────────────────────────┘
                                     ▼
                          fetch_company_health_data()
                                     │
                                     ▼
                     MongoDB find_one("budget_expenses")
                     MongoDB find_one("budget_metadata")
                                     │
                                     ▼
                     Compute health score (Python)
                                     │
                                     ▼
                     Store JSON in Redis (TTL 300 s)
                                     │
                                     ▼
                              Return response
```

---

## 7. Behaviour Scenarios

| Scenario | Cache layer | Behaviour |
|---|---|---|
| First request for company expenses | Redis (Spring) | Cache miss → PostgreSQL query → cached for 5 minutes |
| Same request within 5 minutes | Redis (Spring) | Cache hit → no DB query |
| New expense submitted | Redis (Spring) | Cache evicted immediately → next read re-populates |
| Analytics dashboard first load | Redis (Python) → MongoDB | Redis miss → MongoDB `find_one` (pre-aggregated) → cached 5 min |
| Analytics dashboard within 5 minutes | Redis (Python) | Cache hit → no MongoDB query |
| Expense approved via Kafka | MongoDB + Redis (Python) | MongoDB updated via Kafka consumer → Redis cache cleared for company/budget |
| Category allocation renamed | MongoDB | `expense_history` entries in MongoDB updated; Redis cache cleared |
| Redis unreachable | Spring Cache | Requests fall through to PostgreSQL (degraded performance, no data loss) |
| TTL expires before explicit eviction | Redis | Next request re-populates automatically; at most 5 minutes stale |

---

## 8. Performance Considerations

- **Zero-latency writes.** Cache eviction in the Spring services is synchronous and runs in the same thread as the write operation. Evicting a single key from Redis is an O(1) `DEL` command — it adds negligible overhead to write paths.
- **Pattern-based delete is intentionally scoped.** `redis.keys("company_analysis:comp-123:*")` in the Python service scans only keys matching the prefix. The pattern is narrow enough (one company or budget at a time) that it completes in a single round-trip even with thousands of cached entries.
- **Non-blocking analytics cache.** The Python `cache_response` decorator uses `async/await` throughout — Redis reads and writes are non-blocking `asyncio` operations and do not hold up other FastAPI request handlers.
- **MongoDB read model eliminates N+1 joins.** Without the pre-aggregated MongoDB documents, computing a company health score would require joining budget, allocation, and expense rows across PostgreSQL, potentially touching hundreds of rows. The event-sourced model reduces this to a single document fetch.
- **TTL as a safety net.** Even if a bug in the eviction logic caused a stale entry to linger, the 5-minute TTL guarantees it is automatically removed. Critical paths such as expense approval always trigger explicit eviction, so the TTL is a last-resort safeguard rather than the primary freshness mechanism.

---

## 9. Advantages

| Advantage | Explanation |
|---|---|
| **Reduced database load** | Repeated reads for company expenses, budget details, and analytics data are served from Redis without touching PostgreSQL or MongoDB. |
| **Fast dashboard responses** | Analytics endpoints return pre-computed JSON from Redis in under 1 ms for cache hits, compared to tens of milliseconds for a MongoDB aggregation pipeline. |
| **Data consistency** | Explicit write-path eviction and Kafka-driven invalidation ensure cached data is never observably stale after a user-initiated change. |
| **Independent scalability** | The analysis service can handle a large number of concurrent dashboard requests without scaling the expense or budget databases, because all reads hit Redis or MongoDB. |
| **Graceful degradation** | If Redis becomes unavailable, Spring Cache falls back to direct PostgreSQL queries; the Python service falls back to direct MongoDB queries. The system is slower but never broken. |

---

## 10. Possible Improvements

- **Per-user cache keys.** Currently, `company_expenses` is keyed only on `companyId`. If different users in the same company have different permission levels (owners see all expenses, members see only their own), the cache key should include `userId` to avoid serving an owner's view to a member.
- **Cache stampede protection.** When a popular cache entry expires, many concurrent requests may all find a miss simultaneously and all query the database at once. A **probabilistic early expiration** or **request coalescing** pattern (where only one request fetches the data while others wait for and reuse that single result) would prevent this thundering-herd scenario.
- **Distributed cache invalidation for multi-instance deployments.** The current Spring `CacheManager.evict()` call only removes the entry from the Redis cluster, which is correct for a Redis-backed cache. However, if any service were to use a local in-process cache (e.g., Caffeine) as an L1 in front of Redis, each service instance would need a pub/sub invalidation message to clear its own L1.
- **Cache warming on startup.** After a service restarts, all caches are cold. A startup job that pre-loads the most frequently accessed company and budget IDs into Redis would reduce the cold-start latency spike.
- **Separate TTLs per cache name.** All caches currently share a 5-minute TTL. Endpoint-specific TTLs (e.g., a shorter TTL for the budget summary that changes frequently, a longer TTL for historical spending trends that are immutable) would improve both hit rates and freshness.
- **Metrics and observability.** Spring Boot Actuator exposes cache hit/miss rates via `/actuator/caches` when `spring-boot-starter-cache` is on the classpath. Exporting these metrics to a monitoring dashboard (Prometheus + Grafana) would surface cache effectiveness and alert on sudden drops in hit rate.
