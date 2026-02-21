package com.artha.apigateway.config;

import com.artha.apigateway.security.JwtUtil;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;

@Configuration
public class RateLimitConfig {

    private final JwtUtil jwtUtil;

    public RateLimitConfig(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Bean(name = "userKeyResolver")
    public KeyResolver userKeyResolver() {
        return this::resolveKey;
    }

    private Mono<String> resolveKey(ServerWebExchange exchange) {
        String userIdHeader = exchange.getRequest().getHeaders().getFirst("X-User-Id");
        if (StringUtils.hasText(userIdHeader)) {
            return Mono.just("user-id:" + userIdHeader);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.validateToken(token)) {
                String userId = jwtUtil.getUserIdFromToken(token);
                if (StringUtils.hasText(userId)) {
                    return Mono.just("user-id:" + userId);
                }

                String email = jwtUtil.getEmailFromToken(token);
                if (StringUtils.hasText(email)) {
                    return Mono.just("email:" + email);
                }
            }
        }

        InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
        if (remoteAddress != null && remoteAddress.getAddress() != null) {
            return Mono.just("ip:" + remoteAddress.getAddress().getHostAddress());
        }

        return Mono.just("anonymous");
    }
}
