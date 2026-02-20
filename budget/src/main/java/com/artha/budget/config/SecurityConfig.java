package com.artha.budget.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Budget Service Security Config.
 *
 * JWT validation is done by the API Gateway.
 * The Budget Service trusts incoming requests from the Gateway
 * and relies on the X-User-Id header for identity.
 *
 * All endpoints are permitted here — the role check is enforced
 * inside BudgetServiceImpl via AuthorizationService.
 */

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth ->
                        // All requests are allowed — trust that Gateway validated the JWT.
                        // Role-based access is enforced in the service layer.
                        auth.anyRequest().permitAll()
                );

        return http.build();
    }
}
