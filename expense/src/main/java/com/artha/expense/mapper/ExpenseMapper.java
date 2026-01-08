package com.artha.expense.mapper;

import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;

import java.time.LocalDateTime;

public class ExpenseMapper {

    public static Expense toEntity(
            CreateExpenseRequest request,
            ExpenseStatus status
    ) {
        return Expense.builder()
                .companyId(request.getCompanyId())
                .createdBy(request.getCreatedBy())
                .amount(request.getAmount())
                .spentDate(request.getSpentDate())
                .type(request.getType())
                .reference(request.getReference())
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }

    public static ExpenseResponse toResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .spentDate(expense.getSpentDate())
                .type(expense.getType())
                .reference(expense.getReference())
                .status(expense.getStatus())
                .createdAt(expense.getCreatedAt())
                .build();
    }
}