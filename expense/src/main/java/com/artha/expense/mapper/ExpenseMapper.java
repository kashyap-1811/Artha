package com.artha.expense.mapper;

import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;

import java.time.Instant;
import java.time.ZoneId;

public class ExpenseMapper {

    public static Expense toEntity(
            CreateExpenseRequest request,
            ExpenseStatus status
    ) {
        return Expense.builder()
                .companyId(request.getCompanyId())
                .budgetId(request.getBudgetId())
                .allocationId(request.getAllocationId())
                .createdBy(request.getCreatedBy())
                .amount(request.getAmount())
                .spentDate(request.getSpentDate())
                .type(request.getType())
                .reference(request.getReference())
                .status(status)
                .warning(false)
                .createdAt(Instant.now())   // ✅ correct
                .build();
    }

    public static ExpenseResponse toResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .companyId(expense.getCompanyId())
                .budgetId(expense.getBudgetId())
                .allocationId(expense.getAllocationId())
                .amount(expense.getAmount())
                .spentDate(expense.getSpentDate())
                .type(expense.getType())
                .reference(expense.getReference())
                .status(expense.getStatus())
                .warning(expense.getWarning())
                .createdAt(
                        expense.getCreatedAt()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime()
                )
                .build();
    }
}