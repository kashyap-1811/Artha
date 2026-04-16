package com.artha.expense.service;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;

import java.util.List;
import java.util.UUID;
import com.artha.expense.dto.CategoryExpenseDTO;

public interface ExpenseService {

    ExpenseResponse createExpense(String userId, CreateExpenseRequest request);

    ExpenseResponse getExpense(String userId, UUID expenseId);

    List<ExpenseResponse> getCompanyExpenses(String userId, String companyId);

    List<ExpenseResponse> getExpensesByBudgetId(String userId, UUID budgetId);

    List<ExpenseResponse> getExpensesByAllocationId(String userId, UUID allocationId);

    ExpenseResponse approveExpense(String userId, UUID expenseId);

    ExpenseResponse rejectExpense(String userId, UUID expenseId);

    BudgetExpenseSummaryResponse getBudgetSummary(String userId, UUID budgetId);

    List<CategoryExpenseDTO> getExpenseChart(String userId, String companyId, int days);

    ExpenseResponse updateExpense(String userId, UUID expenseId, CreateExpenseRequest request);

    void deleteExpense(String userId, UUID expenseId);

    List<com.artha.expense.dto.DailyExpenseDTO> getDailyExpenseTrend(String userId, String companyId);
}