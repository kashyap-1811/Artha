package com.artha.apigateway.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Instant;

/**
 * Non-blocking GlobalFilter that tracks active users and records request metrics.
 */
@Component
public class ActiveUserTrackingFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(ActiveUserTrackingFilter.class);

    public static final String ACTIVE_USERS_KEY = "active_users";

    private final ReactiveStringRedisTemplate redisTemplate;
    private final SystemMetricsHolder metricsHolder;

    public ActiveUserTrackingFilter(ReactiveStringRedisTemplate redisTemplate,
                                    SystemMetricsHolder metricsHolder) {
        this.redisTemplate = redisTemplate;
        this.metricsHolder = metricsHolder;
    }

    @Override
    public int getOrder() {
        return -2;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long startTime = System.currentTimeMillis();

        // Step 1: Track Active Users (Redis Sorted Set for sliding window)
        String userId = resolveUserId(exchange);
        double score = (double) Instant.now().getEpochSecond();

        // Non-blocking fire-and-forget record to Redis
        redisTemplate.opsForZSet()
                .add(ACTIVE_USERS_KEY, userId, score)
                .subscribe(
                        success -> {},
                        error -> log.debug("Active user tracking failed: {}", error.getMessage())
                );

        // Step 2 & 5: Record metrics on completion
        return chain.filter(exchange)
                .doFinally(signalType -> {
                    long latencyMs = System.currentTimeMillis() - startTime;
                    HttpStatusCode status = exchange.getResponse().getStatusCode();
                    boolean isError = status != null && (status.is4xxClientError() || status.is5xxServerError());
                    metricsHolder.recordRequest(latencyMs, isError);
                });
    }

    private String resolveUserId(ServerWebExchange exchange) {
        String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
        if (userId != null && !userId.isBlank()) {
            return "user:" + userId;
        }

        InetSocketAddress remoteAddr = exchange.getRequest().getRemoteAddress();
        if (remoteAddr != null && remoteAddr.getAddress() != null) {
            return "ip:" + remoteAddr.getAddress().getHostAddress();
        }

        return "anonymous";
    }
}
