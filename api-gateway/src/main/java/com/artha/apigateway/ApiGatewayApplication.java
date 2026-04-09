package com.artha.apigateway;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.StringRedisTemplate;

@SpringBootApplication
public class ApiGatewayApplication {

	public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
	}

    @Bean
    public CommandLineRunner checkRedisConnection(StringRedisTemplate redisTemplate) {
        return args -> {
            try {
                String response = redisTemplate.getConnectionFactory().getConnection().ping();
                if ("PONG".equalsIgnoreCase(response)) {
                    System.out.println("\n\n" + "=".repeat(60));
                    System.out.println("===== REDIS CONNECTED SUCCESSFULLY TO UPSTASH CLOUD =====");
                    System.out.println("=".repeat(60) + "\n\n");
                }
            } catch (Exception e) {
                System.err.println("\n\n" + "!".repeat(60));
                System.err.println("!!!!! REDIS CONNECTION FAILED: " + e.getMessage());
                System.err.println("!".repeat(60) + "\n\n");
            }
        };
    }
}
