package com.artha.expense.service;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;

import java.util.List;
import java.util.UUID;

public interface ExpenseService {

    ExpenseResponse createExpense(String userId, CreateExpenseRequest request);

    ExpenseResponse getExpense(String userId, UUID expenseId);

    List<ExpenseResponse> getCompanyExpenses(String userId, String companyId);

    List<ExpenseResponse> getExpensesByBudgetId(String userId, UUID budgetId);

    List<ExpenseResponse> getExpensesByAllocationId(String userId, UUID allocationId);

    ExpenseResponse approveExpense(String userId, UUID expenseId);

    ExpenseResponse rejectExpense(String userId, UUID expenseId);

    BudgetExpenseSummaryResponse getBudgetSummary(String userId, UUID budgetId);
}