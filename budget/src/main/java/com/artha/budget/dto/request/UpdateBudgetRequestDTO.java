package com.artha.budget.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateBudgetRequestDTO {
    private String name;
    private BigDecimal totalAmount;
    private LocalDate endDate;
}