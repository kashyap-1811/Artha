package com.artha.expense.service;

import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;

import java.util.List;
import java.util.UUID;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    List<ExpenseResponse> getCompanyExpenses(String companyId);

    ExpenseResponse approveExpense(UUID expenseId);

    ExpenseResponse rejectExpense(UUID expenseId);
}