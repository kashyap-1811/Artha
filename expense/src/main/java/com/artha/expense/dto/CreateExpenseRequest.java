package com.artha.expense.dto;

import com.artha.expense.entity.ExpenseType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateExpenseRequest {

    private String companyId;

    private UUID budgetId;

    private UUID allocationId;

    private BigDecimal amount;

    private String reference;

    private LocalDate spentDate;

    private ExpenseType type;  // PERSONAL / BUSINESS

    private String createdBy;

    private String role; // OWNER / MEMBER

    private BigDecimal allocatedAmount; // For overspend logic
}