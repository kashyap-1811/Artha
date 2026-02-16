package com.artha.expense.dto;

import com.artha.expense.entity.ExpenseStatus;
import com.artha.expense.entity.ExpenseType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {

    private UUID id;

    private String companyId;

    private UUID budgetId;

    private UUID allocationId;

    private BigDecimal amount;

    private LocalDate spentDate;

    private ExpenseType type;

    private String reference;

    private ExpenseStatus status;

    private Boolean warning;

    private LocalDateTime createdAt;
}