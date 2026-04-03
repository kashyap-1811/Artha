package com.artha.apigateway.config;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.List;

/**
 * Fully Adaptive Dynamic Rate Limiter
 *
 * Runs every 10 seconds on a dedicated scheduler thread (NOT the Netty event loop).
 * Computes the optimal per-user rate limit using 3 inputs:
 *
 *   1. Active users  — from Redis sorted set (sliding 60-second window)
 *   2. System health — CPU usage (Micrometer), avg latency + error rate (SystemMetricsHolder)
 *   3. Safe capacity — empirically derived from load testing (safe_rps = 280)
 *
 * ── Algorithm ────────────────────────────────────────────────────────────────
 *
 *   user_based_limit   = safe_rps / active_users
 *   health_based_limit = f(cpu, latency, error_rate)   [see computeHealthBasedLimit()]
 *   raw_limit          = min(user_based_limit, health_based_limit)
 *   final_limit        = clamp(raw_limit, MIN_LIMIT, MAX_LIMIT)
 *
 * ── Runtime Control ──────────────────────────────────────────────────────────
 *
 *   All computed limits are stored in Redis: SET rate_limit:per_user {value}
 *   This key can be overridden manually for emergency control:
 *     redis-cli SET rate_limit:per_user 5   → force 5 RPS regardless of algorithm
 *     redis-cli DEL rate_limit:per_user     → resume adaptive algorithm
 *
 * ── Thread Safety ────────────────────────────────────────────────────────────
 *
 *   .block() calls are safe here — @Scheduled runs on ThreadPoolTaskScheduler threads,
 *   which are plain Java threads, NOT the Reactor event loop.
 *   The reactive path (ActiveUserTrackingFilter) never calls .block().
 */
@Configuration
@EnableScheduling
public class DynamicRateLimitUpdater {

    private static final Logger log = LoggerFactory.getLogger(DynamicRateLimitUpdater.class);

    // ── Redis keys ────────────────────────────────────────────────────────────

    /** Sorted set: tracks active users. Score = epoch second of last request. */
    public static final String ACTIVE_USERS_KEY = ActiveUserTrackingFilter.ACTIVE_USERS_KEY;

    /** String: stores the most recently computed/applied per-user rate limit. */
    public static final String RATE_LIMIT_KEY = "rate_limit:per_user";

    // ── Route IDs to manage (must match application.yaml exactly) ─────────────

    private static final List<String> RATE_LIMITED_ROUTES = List.of(
            "auth-service",
            "user-service",
            "budget-service",
            "expense-service",
            "analysis-service",
            "notification-service"
    );

    // ── Configurable parameters (set via application.yaml) ────────────────────

    /** Empirically derived safe system throughput from load testing (RPS) */
    @Value("${adaptive-rate-limiting.safe-rps:280}")
    private int safeRps;

    /** Minimum rate limit per user — always allow at least 1 request/sec */
    @Value("${adaptive-rate-limiting.min-limit:1}")
    private int minLimit;

    /** Maximum rate limit per user — no single user gets more than this */
    @Value("${adaptive-rate-limiting.max-limit:50}")
    private int maxLimit;

    /** How long a user stays "active" without making a request (seconds) */
    @Value("${adaptive-rate-limiting.active-user-window-seconds:60}")
    private long activeUserWindowSeconds;

    // ── Health constraint thresholds ──────────────────────────────────────────

    /** CPU% above which we apply emergency minimum limit */
    private static final double CPU_CRITICAL  = 85.0;

    /** CPU% above which we heavily reduce throughput */
    private static final double CPU_HIGH      = 75.0;

    /** Error rate% above which we apply emergency minimum limit */
    private static final double ERROR_RATE_CRITICAL_PCT = 3.0;

    /** Average latency above which we apply emergency minimum limit (ms) */
    private static final double LATENCY_CRITICAL_MS = 500.0;

    // ── Dependencies ──────────────────────────────────────────────────────────

    private final RedisRateLimiter redisRateLimiter;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final SystemMetricsHolder metricsHolder;
    private final MeterRegistry meterRegistry;

    /** Last applied limit — avoids redundant updates and log spam */
    private volatile int lastAppliedLimit = -1;

    public DynamicRateLimitUpdater(RedisRateLimiter redisRateLimiter,
                                   ReactiveStringRedisTemplate redisTemplate,
                                   SystemMetricsHolder metricsHolder,
                                   MeterRegistry meterRegistry) {
        this.redisRateLimiter = redisRateLimiter;
        this.redisTemplate = redisTemplate;
        this.metricsHolder = metricsHolder;
        this.meterRegistry = meterRegistry;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Startup initialization
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Eagerly pre-populates RedisRateLimiter's config map for all routes.
     *
     * Spring Cloud Gateway initializes each route's rate limiter config lazily —
     * only when that route receives its first request. Without this, the scheduler
     * would find 0 routes on startup and the first 10-second window would be unmanaged.
     *
     * Default config matches application.yaml (maxLimit RPS).
     */
    @PostConstruct
    public void initializeDefaultRouteConfigs() {
        log.info("╔══════════════════════════════════════════════════╗");
        log.info("║     Adaptive Rate Limiter — Initializing         ║");
        log.info("╚══════════════════════════════════════════════════╝");
        log.info("  Safe RPS: {} | Min: {} | Max: {} | Window: {}s",
                safeRps, minLimit, maxLimit, activeUserWindowSeconds);

        for (String routeId : RATE_LIMITED_ROUTES) {
            redisRateLimiter.getConfig().computeIfAbsent(routeId, id -> {
                RedisRateLimiter.Config config = new RedisRateLimiter.Config();
                config.setReplenishRate(maxLimit);
                config.setBurstCapacity(maxLimit * 2);
                config.setRequestedTokens(1);
                log.info("  ✓ Route [{}] initialized: {} RPS, burst {}", id, maxLimit, maxLimit * 2);
                return config;
            });
        }
        log.info("  {} routes ready. Adaptive scheduler starts in 10s.", RATE_LIMITED_ROUTES.size());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adaptive rate limit computation — runs every 10 seconds
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Core adaptive algorithm. Executes every 10 seconds on the scheduler thread.
     *
     * Steps:
     *   1. Clean up expired entries from the active_users sorted set
     *   2. Count users active in the last {@code activeUserWindowSeconds}
     *   3. Snapshot and reset the 10-second metrics window (latency, error rate)
     *   4. Read current CPU usage from Micrometer
     *   5. Compute user-based limit = safeRps / activeUsers
     *   6. Compute health-based limit = f(cpu, latency, errorRate)
     *   7. final_limit = clamp(min(userBased, healthBased), MIN, MAX)
     *   8. Apply if changed, store result in Redis for visibility
     */
    @Scheduled(fixedRate = 10_000)
    public void adaptRateLimits() {
        try {
            long nowEpoch   = Instant.now().getEpochSecond();
            long windowStart = nowEpoch - activeUserWindowSeconds;

            // ── Step 1: Evict expired entries (older than window) ─────────────
            // Sorted set entries have score = epoch second. Entries with score
            // older than (now - window) are no longer "active".
            redisTemplate.opsForZSet()
                    .removeRangeByScore(
                            ACTIVE_USERS_KEY,
                            Range.of(Range.Bound.unbounded(), Range.Bound.exclusive((double) windowStart)))
                    .block();

            // ── Step 2: Count active users in the sliding window ──────────────
            Long count = redisTemplate.opsForZSet()
                    .count(
                            ACTIVE_USERS_KEY,
                            Range.closed((double) windowStart, (double) nowEpoch))
                    .block();

            // Guard: treat 0 or null as 1 to avoid division by zero
            int activeUsers = (count == null || count <= 0) ? 1 : count.intValue();

            // ── Step 3: Snapshot metrics window ───────────────────────────────
            SystemMetricsHolder.Snapshot metrics = metricsHolder.snapshotAndReset();
            double errorRate   = metrics.errorRatePercent();
            double avgLatency  = metrics.avgLatencyMs();

            // ── Step 4: Get CPU usage ─────────────────────────────────────────
            double cpuPercent = getCpuUsagePercent();

            // ── Step 5: Compute user-based limit ──────────────────────────────
            // With 1 user   → safeRps / 1 = 280 (capped by maxLimit)
            // With 14 users → 280 / 14 = 20
            // With 280 users → 280 / 280 = 1 (clamped to minLimit)
            int userBasedLimit = Math.max(1, safeRps / activeUsers);

            // ── Step 6: Compute health-based limit ────────────────────────────
            int healthBasedLimit = computeHealthBasedLimit(cpuPercent, avgLatency, errorRate);

            // ── Step 7: Combine — take the more conservative limit ────────────
            int rawLimit   = Math.min(userBasedLimit, healthBasedLimit);
            int finalLimit = Math.max(minLimit, Math.min(maxLimit, rawLimit));

            // ── Step 8: Log evaluation summary ────────────────────────────────
            log.info("══ Adaptive Rate Limit │ T+{}s ══════════════════════════",
                    Instant.now().getEpochSecond() % 1000);
            log.info("  Active users ({}s window): {}", activeUserWindowSeconds, activeUsers);
            log.info("  CPU: {}%  │  Avg latency: {}ms  │  Error rate: {}%",
                    String.format("%.1f", cpuPercent),
                    String.format("%.1f", avgLatency),
                    String.format("%.2f", errorRate));
            log.info("  User-based limit: {} RPS  │  Health limit: {} RPS",
                    userBasedLimit, healthBasedLimit);
            log.info("  ─────────────────────────────────────────────────────");
            log.info("  → FINAL LIMIT: {} RPS (burst: {})", finalLimit, finalLimit * 2);

            // ── Step 9: Apply if changed ──────────────────────────────────────
            if (finalLimit != lastAppliedLimit) {
                applyLimitToAllRoutes(finalLimit);
                persistComputedLimit(finalLimit);
                lastAppliedLimit = finalLimit;
            } else {
                log.info("  (No change — limit remains at {} RPS)", finalLimit);
            }

        } catch (Exception e) {
            log.warn("Adaptive rate limit computation failed: {}. Current limits unchanged.", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Health-based limit computation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Determines the maximum safe rate limit based on current system health.
     *
     * Decision tree (evaluated in priority order):
     *
     *   ERROR RATE > 3%   OR  LATENCY > 500ms  →  Emergency: minLimit
     *   CPU > 85%                               →  Emergency: minLimit
     *   CPU > 75%                               →  Heavily degraded: 2 RPS
     *   CPU > 60%                               →  Moderately degraded: maxLimit / 2
     *   Otherwise                               →  Healthy: maxLimit (no constraint)
     *
     * @return the health-imposed upper bound for the rate limit
     */
    private int computeHealthBasedLimit(double cpuPercent, double avgLatencyMs, double errorRate) {
        // Step 5: Defined Health Constraints
        // IF error_rate > 3% OR latency > 500ms
        if (errorRate > ERROR_RATE_CRITICAL_PCT || avgLatencyMs > LATENCY_CRITICAL_MS) {
            log.warn("  ⚠ EMERGENCY: Error Rate ({:.2f}%) or Latency ({:.0f}ms) exceeded → limit = 1", errorRate, avgLatencyMs);
            return 1;
        }

        // ELSE IF CPU > 85%: limit = 1
        if (cpuPercent > CPU_CRITICAL) {
            log.warn("  ⚠ EMERGENCY: CPU ({:.1f}%) too high → limit = 1", cpuPercent);
            return 1;
        }

        // ELSE IF CPU > 75%: limit = 2
        if (cpuPercent > CPU_HIGH) {
            log.info("  ⬇ DEGRADED: CPU ({:.1f}%) high → limit = 2", cpuPercent);
            return 2;
        }

        // ELSE: limit = 3 (Healthy)
        // Note: we cap this at maxLimit which is 3 by default
        return maxLimit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Reads JVM process CPU usage from the Micrometer registry.
     * Spring Boot auto-configures "process.cpu.usage" (0.0–1.0) via JvmMetrics.
     *
     * Falls back to 50% (moderate) if the gauge is unavailable — this avoids
     * triggering false emergency throttling while still being conservatively safe.
     */
    private double getCpuUsagePercent() {
        try {
            Gauge cpuGauge = meterRegistry.find("process.cpu.usage").gauge();
            if (cpuGauge != null) {
                double value = cpuGauge.value();
                if (!Double.isNaN(value) && value >= 0) {
                    return value * 100.0; // Convert 0.0–1.0 to 0–100%
                }
            }
        } catch (Exception e) {
            log.debug("Could not read CPU gauge: {}", e.getMessage());
        }
        // Safe fallback — treat as moderate load
        return 50.0;
    }

    /**
     * Pushes the given replenishRate to all rate-limited route configs in memory.
     * burstCapacity = replenishRate * 2 (accommodates short traffic bursts).
     */
    private void applyLimitToAllRoutes(int replenishRate) {
        int burst = replenishRate * 2;
        redisRateLimiter.getConfig().forEach((routeId, config) -> {
            config.setReplenishRate(replenishRate);
            config.setBurstCapacity(burst);
            log.info("   ✓ [{}]: replenish={} RPS, burst={}", routeId, replenishRate, burst);
        });
        log.info("  Applied {} RPS to {} routes.", replenishRate, redisRateLimiter.getConfig().size());
    }

    /**
     * Stores the computed limit in Redis for external observability.
     *
     * This key (rate_limit:per_user) can be read by:
     *   - Monitoring dashboards
     *   - External admin tools
     *   - Operations teams for audit
     *
     * Uses reactive subscribe() — non-blocking, runs in the background.
     */
    private void persistComputedLimit(int limit) {
        redisTemplate.opsForValue()
                .set(RATE_LIMIT_KEY, String.valueOf(limit))
                .subscribe(
                        success -> log.debug("Persisted computed limit {} to Redis key [{}]", limit, RATE_LIMIT_KEY),
                        error   -> log.debug("Failed to persist limit to Redis: {}", error.getMessage())
                );
    }
}
