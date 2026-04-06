package com.artha.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetExpenseSummaryResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID budgetId;

    private BigDecimal totalApproved;

    private BigDecimal totalPending;

    private BigDecimal totalRejected;
}