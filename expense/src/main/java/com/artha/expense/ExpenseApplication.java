package com.artha.expense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
@EnableCaching
@EnableFeignClients
public class ExpenseApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExpenseApplication.class, args);
	}

	@Component
	public static class StartupFailureTrigger {
		@PostConstruct
		public void init() {
			throw new RuntimeException("Simulated startup failure for budget-service rollback testing!");
		}
	}
}
