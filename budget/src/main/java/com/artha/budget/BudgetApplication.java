package com.artha.budget;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@SpringBootApplication
@EnableCaching
public class BudgetApplication {

	public static void main(String[] args) {
		SpringApplication.run(BudgetApplication.class, args);
	}

	@Component
	public static class StartupFailureTrigger {
		@PostConstruct
		public void init() {
			throw new RuntimeException("Simulated startup failure for budget-service rollback testing!");
		}
	}

}
