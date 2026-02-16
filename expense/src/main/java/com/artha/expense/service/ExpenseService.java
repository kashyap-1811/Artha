package com.artha.expense.service;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;

import java.util.List;
import java.util.UUID;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    ExpenseResponse getExpense(UUID expenseId);

    List<ExpenseResponse> getCompanyExpenses(String companyId);

    List<ExpenseResponse> getExpensesByBudgetId(UUID budgetId);

    List<ExpenseResponse> getExpensesByAllocationId(UUID allocationId);

    ExpenseResponse approveExpense(UUID expenseId);

    ExpenseResponse rejectExpense(UUID expenseId);

    BudgetExpenseSummaryResponse getBudgetSummary(UUID budgetId);
}