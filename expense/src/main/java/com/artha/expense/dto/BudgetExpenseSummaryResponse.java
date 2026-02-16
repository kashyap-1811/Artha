package com.artha.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetExpenseSummaryResponse {

    private UUID budgetId;

    private BigDecimal totalApproved;

    private BigDecimal totalPending;

    private BigDecimal totalRejected;
}