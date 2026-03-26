package com.artha.apigateway.config;

import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import reactor.core.publisher.Mono;

@Configuration
public class RequestTimingFilterConfig {

    @Bean
    @Order(-1)
    public GlobalFilter requestTimingFilter() {
        return (exchange, chain) -> {
            // Check if this is the add expense endpoint
            String path = exchange.getRequest().getURI().getPath();
            String method = exchange.getRequest().getMethod().name();
            
            // Allow all relevant service endpoints
            boolean isExpenseService = path.startsWith("/api/expenses");
            boolean isBudgetService = path.startsWith("/api/budgets");
            boolean isUserService = path.startsWith("/auth") || path.startsWith("/api/companies") || path.startsWith("/api/users");
            boolean isAnalysisService = path.startsWith("/api/analysis");

            long startTime = System.currentTimeMillis();

            return chain.filter(exchange).then(Mono.fromRunnable(() -> {
                if (isExpenseService || isBudgetService || isUserService || isAnalysisService) {
                    long duration = System.currentTimeMillis() - startTime;
                    System.out.println("====== API Gateway Processing Time [" + method + " " + path + "]: " + duration + "ms ======");
                }
            }));
        };
    }
}
