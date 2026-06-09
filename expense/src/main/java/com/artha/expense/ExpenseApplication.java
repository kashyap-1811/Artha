package com.artha.expense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;

// Harmless comment to trigger CI/CD pipeline build/deploy test
@SpringBootApplication
@EnableCaching
@EnableFeignClients
public class ExpenseApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExpenseApplication.class, args);
	}

}
