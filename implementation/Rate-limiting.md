# Dynamic Rate Limiting Implementation

## 1. Overview

**Rate limiting** controls how many requests a client can make to a service within a given time window. Without it, a single misbehaving client or a sudden traffic spike can exhaust server resources and bring down the entire system.

**Static rate limiting** assigns a fixed limit to every user regardless of current system conditions — e.g., "every user gets 10 req/s, always." This is simple but wasteful: when only 2 users are active, a 280 RPS system gives each user only 10 RPS while 260 RPS sits idle. Under heavy load, a fixed high limit can still allow the system to be overwhelmed.

**Dynamic (adaptive) rate limiting** solves both problems. The per-user limit is calculated in real time based on how many users are currently active and how healthy the system is. When fewer users are online, each user gets a higher share of capacity. When the system is stressed (high CPU, high latency, high error rate), limits are automatically reduced to protect it.

---

## 2. Architecture

The rate limiting stack sits entirely inside the **API Gateway** and uses **Redis** as the shared token store.

```
Client
  │
  ▼
API Gateway (Spring Cloud Gateway)
  ├── JwtAuthenticationFilter      — validates JWT, injects X-User-Id header
  ├── ActiveUserTrackingFilter     — records user identity and request metrics in Redis
  ├── RequestRateLimiter filter    — enforces per-user token-bucket limit via Redis
  └── DynamicRateLimitUpdater      — scheduler thread that recalculates limits every 10 s
          │
          ├── Redis (active_users ZSET)       — sliding-window active user set
          ├── Redis (rate_limit:per_user)     — stores the last applied limit
          └── RedisRateLimiter in-memory map  — route configs updated every 10 s
  │
  ▼
Backend Services (user-service, budget-service, expense-service, …)
```

**Request flow:**

1. Client sends HTTP request with `Authorization: Bearer <token>`.
2. `JwtAuthenticationFilter` validates the token and injects the `X-User-Id` header.
3. `ActiveUserTrackingFilter` writes the user identity to the `active_users` sorted set in Redis and starts recording latency/error metrics for this request.
4. The `RequestRateLimiter` filter checks the user's token bucket in Redis. If tokens are available, the request is forwarded; otherwise `429 Too Many Requests` is returned immediately.
5. Every 10 seconds, `DynamicRateLimitUpdater` reads the current active user count and system metrics, computes the new per-user limit, and updates the in-memory `RedisRateLimiter` config for all routes.

---

## 3. Redis Rate Limiter (Spring Cloud Gateway)

Spring Cloud Gateway's built-in `RedisRateLimiter` implements the **token bucket** algorithm. Redis stores the bucket state for every unique key (user or IP).

Three parameters control the bucket behaviour:

| Parameter | Description |
|---|---|
| `replenishRate` | Tokens added to the bucket per second — effectively the steady-state RPS limit. |
| `burstCapacity` | Maximum tokens the bucket can hold — allows short bursts above the steady rate. Set to `replenishRate * 2` in this project. |
| `requestedTokens` | Tokens consumed per request. Fixed at `1` — every request costs one token. |

**Example:** `replenishRate=10, burstCapacity=20`  
- A user making exactly 10 req/s indefinitely will never be rate-limited.  
- A user sending 20 requests in 1 second will consume the burst capacity immediately, then be capped at 10 req/s.  
- A user idle for 2 seconds accumulates 20 tokens (full bucket) and can burst again.

Redis stores the bucket as two keys per user per route:
```
request_rate_limiter.{key}.tokens    ← current token count
request_rate_limiter.{key}.timestamp ← last refill timestamp
```

These operations are executed as a Lua script inside Redis, making each check-and-decrement atomic.

---

## 4. KeyResolver (User Identification)

The `KeyResolver` (`userKeyResolver` bean in `RateLimitConfig`) determines which *bucket* a request is counted against. It is called for every incoming request before the token check.

**Resolution order:**

1. **`X-User-Id` header** — injected by `JwtAuthenticationFilter` after successful JWT validation. Most authenticated requests resolve here.
2. **JWT `Authorization` header** — if the header is present but `X-User-Id` is missing, the JWT is parsed directly to extract `userId` or `email`.
3. **Remote IP address** — fallback for unauthenticated requests (e.g., the `/auth/**` login/register endpoints).
4. **`"anonymous"`** — last resort if no identity can be determined.

```java
// Priority 1: X-User-Id header (set by JwtAuthenticationFilter)
String userIdHeader = exchange.getRequest().getHeaders().getFirst("X-User-Id");
if (StringUtils.hasText(userIdHeader)) {
    return Mono.just("user-id:" + userIdHeader);
}

// Priority 2: Parse JWT directly
String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
if (authHeader != null && authHeader.startsWith("Bearer ")) {
    String token = authHeader.substring(7);
    if (jwtUtil.validateToken(token)) {
        String userId = jwtUtil.getUserIdFromToken(token);
        if (StringUtils.hasText(userId)) return Mono.just("user-id:" + userId);
        String email = jwtUtil.getEmailFromToken(token);
        if (StringUtils.hasText(email)) return Mono.just("email:" + email);
    }
}

// Priority 3: IP address fallback
InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
if (remoteAddress != null) return Mono.just("ip:" + remoteAddress.getAddress().getHostAddress());

return Mono.just("anonymous");
```

Identifying users individually (not just by IP) is important because:
- Multiple users behind the same NAT share a single IP — IP-only limits would unfairly throttle them together.
- A malicious user cannot exhaust another user's quota by spoofing traffic from the same IP.

---

## 5. Active User Tracking

`ActiveUserTrackingFilter` is a `GlobalFilter` that runs on every request (order `-2`, before the rate limiter). It maintains the `active_users` **sorted set** in Redis.

```java
// Score = current Unix epoch second
double score = (double) Instant.now().getEpochSecond();
redisTemplate.opsForZSet().add(ACTIVE_USERS_KEY, userId, score).subscribe(...);
```

Each entry is: `member = "user:<id>"` (or `"ip:<addr>"`), `score = epoch second of last request`.

**Sliding window logic:**

In `DynamicRateLimitUpdater`, entries older than `activeUserWindowSeconds` (default 120 s) are evicted before counting:

```java
long windowStart = nowEpoch - activeUserWindowSeconds;
// Remove entries with score < windowStart
redisTemplate.opsForZSet().removeRangeByScore(ACTIVE_USERS_KEY, Range.unbounded(), Range.exclusive(windowStart)).block();
// Count remaining
Long count = redisTemplate.opsForZSet().count(ACTIVE_USERS_KEY, Range.closed(windowStart, nowEpoch)).block();
```

A **sliding window** is used instead of a fixed 120-second bucket because it counts users who made a request *in the last 120 seconds*, regardless of when the window started. This avoids the "thundering herd" problem that occurs when a fixed window resets and all users are suddenly counted as zero.

---

## 6. Load Testing and Capacity

The value `safe-rps: 280` was derived empirically through load testing the full microservices stack under production-like conditions.

**How it was derived:**
- Load tests were run against the API Gateway with increasing request rates.
- At ~300–320 RPS, response latencies began to climb noticeably and error rates increased.
- A **safety margin** was applied to leave headroom for background processes, GC pauses, and burst traffic.
- `safe_rps = 280` was chosen as the safe operating ceiling — below the point of degradation.

**Why a safe capacity matters:**

Operating at 100 % of theoretical throughput leaves no buffer. Even a small spike can push the system into overload. By capping at 280 RPS, the system can absorb short bursts while remaining stable.

---

## 7. Dynamic Limit Calculation

The per-user limit is computed from two inputs and then clamped to a safe range.

**Step 1 — User-based limit:**

```
user_based_limit = safe_rps / active_users
```

| Active users | Calculated limit | Applied limit (after clamp) |
|---|---|---|
| 1 | 280 | 40 (capped by max) |
| 7 | 40 | 40 |
| 14 | 20 | 20 |
| 56 | 5 | 5 |
| 280 | 1 | 5 (floored by min) |

**Step 2 — Health-based limit** (see [Section 8](#8-dynamicratelimitupdater)):

The system also computes an independent upper bound based on CPU usage, average latency, and error rate.

**Step 3 — Combine and clamp:**

```
raw_limit   = min(user_based_limit, health_based_limit)
final_limit = clamp(raw_limit, min=5, max=40)
```

The more conservative of the two limits is chosen, then clamped between the configured floor and ceiling:

- **min = 5 req/s** — every authenticated user can always make at least five requests per second.
- **max = 40 req/s** — no single user monopolises capacity, even when very few users are active.

---

## 8. DynamicRateLimitUpdater

`DynamicRateLimitUpdater` is a `@Configuration` class with `@EnableScheduling`. Its core method runs on a `ThreadPoolTaskScheduler` thread every **10 seconds** — never on the Netty event loop.

```java
@Scheduled(fixedRate = 10_000)
public void adaptRateLimits() {
    // 1. Evict expired active-user entries
    // 2. Count active users in sliding window
    // 3. Snapshot + reset the 10-second metrics window
    // 4. Read CPU usage from Micrometer
    // 5. user_based_limit = safeRps / activeUsers
    // 6. health_based_limit = computeHealthBasedLimit(cpu, latency, errorRate)
    // 7. final_limit = clamp(min(user, health), MIN, MAX)
    // 8. Apply to all route configs if the limit changed
}
```

**Health-based limit decision tree** (`computeHealthBasedLimit`):

```
error_rate > 3%  OR  avg_latency > 500 ms  →  emergency: 1 RPS
cpu > 85%                                  →  emergency: 1 RPS
cpu > 75%                                  →  degraded:  2 RPS
otherwise                                  →  healthy:   maxLimit (no constraint)
```

**Applying the limit to routes:**

```java
private void applyLimitToAllRoutes(int replenishRate) {
    int burst = replenishRate * 2;
    redisRateLimiter.getConfig().forEach((routeId, config) -> {
        config.setReplenishRate(replenishRate);
        config.setBurstCapacity(burst);
    });
}
```

The update is only applied when `finalLimit != lastAppliedLimit`, avoiding unnecessary log noise and Redis writes on stable traffic.

**Redis persistence for observability:**

The computed limit is also stored in Redis under the key `rate_limit:per_user`. This allows operators to inspect or override the current limit without restarting the service:

```bash
# Inspect current limit
redis-cli GET rate_limit:per_user

# Force emergency throttle (5 RPS regardless of algorithm)
redis-cli SET rate_limit:per_user 5

# Resume adaptive algorithm
redis-cli DEL rate_limit:per_user
```

**Startup initialisation:**

`@PostConstruct initializeDefaultRouteConfigs()` pre-populates the `RedisRateLimiter` config map for all routes at startup. Without this, Spring Cloud Gateway lazily initialises each route's config on first request, leaving the first 10-second window unmanaged.

---

## 9. Applying Limits to Routes

Each route in `application.yml` includes a `RequestRateLimiter` filter:

```yaml
- id: expense-service
  uri: lb://expense-service
  predicates:
    - Path=/expense/**
  filters:
    - StripPrefix=1
    - name: RequestRateLimiter
      args:
        redis-rate-limiter.replenishRate: 5
        redis-rate-limiter.burstCapacity: 10
        redis-rate-limiter.requestedTokens: 1
        key-resolver: "#{@userKeyResolver}"
```

The `replenishRate: 5` and `burstCapacity: 10` in the YAML are **safe defaults** — they are the fallback values used only if the `DynamicRateLimitUpdater` has not yet run (e.g., the very first few seconds after startup). In practice, `@PostConstruct` overwrites these with `maxLimit` (40 RPS) immediately at startup, and the scheduler updates them further within 10 seconds.

Internal service-to-service routes (`/internal/**`) deliberately **do not** have a `RequestRateLimiter` filter — they bypass rate limiting entirely since they are called by trusted backend services over the internal network, not by end users.

---

## 10. Behaviour Scenarios

| Scenario | Active users | User-based limit | Health limit | Final limit |
|---|---|---|---|---|
| Low traffic | 2 | 140 RPS | unconstrained | 40 RPS (capped by max) |
| Moderate traffic | 28 | 10 RPS | unconstrained | 10 RPS |
| High traffic | 100 | 2 RPS | unconstrained | 5 RPS (floored by min) |
| Peak traffic | 280 | 1 RPS | unconstrained | 5 RPS (floored by min) |
| CPU spike (> 85 %) | any | any | 1 RPS (emergency) | 5 RPS (floored by min) |
| High latency (> 500 ms) | any | any | 1 RPS (emergency) | 5 RPS (floored by min) |
| High error rate (> 3 %) | any | any | 1 RPS (emergency) | 5 RPS (floored by min) |
| Single user, healthy system | 1 | 280 RPS | unconstrained | 40 RPS (capped by max) |

**Key behaviours:**

- **Few users → high per-user limit.** Idle capacity is redistributed rather than wasted. A single developer testing in isolation gets the full `maxLimit` (40 RPS).
- **Many users → low per-user limit.** Capacity is spread fairly. No single user can crowd out others.
- **System under stress → limits collapse automatically.** CPU spikes, slow responses, or cascading errors all trigger the emergency floor (clamped to `minLimit` of 5 RPS) without any human intervention.
- **Recovery is automatic.** Once metrics normalise in the next 10-second window, the limit rises back to the appropriate user-based value.

---

## 11. Performance Considerations

- **Non-blocking request path.** `ActiveUserTrackingFilter` uses reactive (`subscribe`, `doFinally`) operations — it never calls `.block()`. The Netty event loop is never blocked.
- **Scheduler-based updates.** The heavy computation (Redis range queries, metric snapshots, config updates) runs on a `ThreadPoolTaskScheduler` thread, completely isolated from the request processing path.
- **Redis operations are lightweight.** `ZADD`, `ZREMRANGEBYSCORE`, and `ZCOUNT` are O(log N) operations. With at most a few thousand active users, these complete in under 1 ms.
- **No-op on stable traffic.** The `lastAppliedLimit` guard means that if the computed limit is unchanged between cycles, no Redis write or config update occurs.
- **Lock-free metrics.** `SystemMetricsHolder` uses `AtomicLong` with CAS operations — no locks, no contention between the reactive request threads and the scheduler thread.

---

## 12. Advantages

| Advantage | Explanation |
|---|---|
| **Fair distribution** | Every active user gets an equal share of available capacity. |
| **System protection** | The health-based layer ensures the system never operates beyond safe limits, regardless of user count. |
| **Better user experience** | Limits are only as tight as they need to be. During off-peak hours, users get the full `maxLimit` instead of an unnecessarily restrictive static cap. |
| **Operational transparency** | The current limit is always visible in Redis (`rate_limit:per_user`) and in Gateway logs. Operators can override it instantly via `redis-cli`. |
| **Zero-downtime reconfiguration** | All parameters (`safe-rps`, `min-limit`, `max-limit`, `active-user-window-seconds`) are externalised in `application.yml` and can be changed without recompiling. |

---

## 13. Possible Improvements

- **Priority-based limits (free vs. premium users).** The `KeyResolver` could return a key prefixed with the user's tier (e.g., `premium:user-42`), and `DynamicRateLimitUpdater` could maintain separate configs for each tier — premium users get a higher ceiling even under load.
- **Region-based limits.** In a multi-region deployment, the `safe_rps` denominator could be scoped per region, allowing each region's gateway to adapt independently to its local load.
- **Circuit breaker integration.** If a downstream service trips its circuit breaker, the gateway could automatically drop the per-user limit for routes pointing to that service to zero, short-circuiting upstream traffic faster than the health metrics window.
- **Graduated health response.** The current health decision tree has hard thresholds. A smoother curve (e.g., linearly scaling limit between 60 % and 85 % CPU) would reduce oscillation when CPU hovers near a threshold boundary.
- **Per-endpoint limits.** Some endpoints (e.g., analytics queries) are more expensive than others. `requestedTokens` can be set higher for expensive routes so they consume more tokens per call, naturally throttling them more aggressively.
- **Stricter emergency floor.** Currently, health-based emergencies return a hardcoded limit of 1 RPS which is then floored back up to `minLimit` (5 RPS) by the clamp. Wiring the emergency path to `minLimit` directly (instead of a hardcoded `1`) would make the floor fully configurable.


Viewed RateLimitConfig.java:1-66
Viewed SystemMetricsHolder.java:1-87
Viewed DynamicRateLimitUpdater.java:1-352
Searched for "ActiveUserTrackingFilter"
Viewed ActiveUserTrackingFilter.java:1-81

Here is the detailed code-level breakdown, including exactly how things are tracked, followed by an industry standards review (where I found a few **critical issues** that you need to fix).

### 1. Code-Level Implementation Details (Step-by-Step)

The code is divided into three main components: The Tracker, The Metrics Holder, and The Updater.

#### A. The Tracker (`ActiveUserTrackingFilter.java`)
This is a `GlobalFilter` meaning it intercepts every single request that hits the Gateway.
*   **Where:** Runs on the Netty Event Loop.
*   **What it does:** 
    1. Grabs the user's ID or IP.
    2. Pushes the user to Redis into a Sorted Set (`ZSET`) called `active_users` using the current time as the "score".
    3. It does this using `.subscribe()` which is "fire-and-forget". It doesn't wait for Redis to reply, meaning the request continues instantly.
    4. Using the `.doFinally()` reactive hook, it waits for the backend service to finish, calculates how long it took (latency), checks the HTTP status code, and sends this to the Metrics Holder.

#### B. The Metrics Holder (`SystemMetricsHolder.java`)
*   **Where:** In-memory, accessed by both the Netty event loop and the background scheduler.
*   **How it's written:** It uses `AtomicLong` for counting requests, errors, and latency.
*   **Why this is great:** `AtomicLong` uses CPU-level CAS (Compare-And-Swap) operations instead of `synchronized` locks. This means thousands of concurrent requests can update the metrics simultaneously without ever blocking each other. Every time the background job runs, it calls `.snapshotAndReset()` to grab the numbers and reset them to 0 instantly.

#### C. The Background Brain (`DynamicRateLimitUpdater.java`)
*   **Where:** Runs on a Spring `@Scheduled` background thread (`ThreadPoolTaskScheduler`).
*   **What it does:** 
    1. Calls `removeRangeByScore` on Redis to delete users who haven't made a request in the last 60 seconds.
    2. Calls `count` to get the number of remaining active users.
    3. Grabs the snapshot from `SystemMetricsHolder`.
    4. Grabs CPU usage from Micrometer.
    5. Calculates the new limits and updates the Spring `RedisRateLimiter.Config` map in-memory for all routes.

---

### 2. How are CPU, Latency, and Errors Tracked?

*   **Latency:** In `ActiveUserTrackingFilter`, a stopwatch starts before the request goes to the backend (`System.currentTimeMillis()`). When the response comes back, it calculates `Current Time - Start Time`. This is added to the `AtomicLong` total latency counter. The updater later divides this by total requests to get the average.
*   **Errors:** In `ActiveUserTrackingFilter`, it checks the response HTTP status code. Currently, it counts **both 4xx (Client Errors like 404 Not Found or 400 Bad Request) and 5xx (Server Errors)** as "errors" in the system metrics.
*   **CPU:** In `DynamicRateLimitUpdater`, it queries Spring Boot's built-in Micrometer metrics registry (`meterRegistry.find("process.cpu.usage").gauge()`). If the metric is missing (sometimes happens in Docker before the JVM warms up), it safely defaults to 50% CPU so it doesn't accidentally trigger an emergency.

---

### 3. Industry Standards Review (The Good, The Bad, & What Needs Updating)

Overall, the architecture is **highly professional**. Using atomic counters, separating the heavy math to a scheduler thread, and using non-blocking Redis calls are all top-tier enterprise patterns. 

However, **I found 3 issues in your code** that you need to update:

#### 🚨 1. CRITICAL BUG: The Scheduler Timing is Wrong
*   **The Issue:** Your documentation and architecture are designed around a 10-second window. `SystemMetricsHolder` expects to be reset every 10 seconds. However, in `DynamicRateLimitUpdater.java`, the code is written as:
    ```java
    @Scheduled(fixedRate = 60_000)
    ```
    `60_000` milliseconds is **60 seconds (1 minute)**! 
*   **Why it's bad:** If your server CPU spikes to 100%, it will take up to a full minute for the rate limiter to react and apply the emergency brake. By then, the server will have already crashed. 
*   **The Fix:** Change it to `@Scheduled(fixedRate = 10_000)`.

#### 🚨 2. SECURITY FLAW: 4xx Errors trigger System Emergency
*   **The Issue:** In `ActiveUserTrackingFilter.java`, an error is defined as:
    ```java
    boolean isError = status != null && (status.is4xxClientError() || status.is5xxServerError());
    ```
*   **Why it's bad:** 4xx errors are *client* mistakes (wrong password, missing page, bad input). 5xx errors are *system* health failures. If a malicious attacker intentionally sends thousands of requests to a fake URL (getting `404 Not Found`), your error rate will spike above 3%. Your system will think it is failing and will drop the rate limit to 1 RPS for **all legitimate users**. This is a classic Denial-of-Service (DoS) vulnerability.
*   **The Fix:** Only track 5xx errors for system health limit calculations. 
    ```java
    boolean isError = status != null && status.is5xxServerError();
    ```

#### ⚠️ 3. MAINTAINABILITY: Hardcoded Route List
*   **The Issue:** In `DynamicRateLimitUpdater.java`, you have a hardcoded list of routes (`"auth-service"`, `"user-service"`, etc.). 
*   **Why it's bad:** If another developer adds a new microservice (e.g., `"payment-service"`) to `application.yaml`, they will likely forget to add it to this Java list. The new service will skip startup initialization and will be unmanaged for the first 10 seconds.
*   **The Fix:** Ideally, you should inject the `RouteLocator` bean and dynamically fetch the route IDs at startup, rather than hardcoding them.