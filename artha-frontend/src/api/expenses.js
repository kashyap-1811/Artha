import apiClient from "./client";

const EXPENSES_BASE_PATH = "/expense/api/expenses";

export async function createExpense(data) {
  const response = await apiClient.post(EXPENSES_BASE_PATH, data);
  return response.data;
}

export async function getExpensesByBudget(budgetId) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/budget/${budgetId}`);
  return response.data;
}

export async function getExpensesByAllocation(allocationId) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/allocation/${allocationId}`);
  return response.data;
}

export async function getCompanyExpenses(companyId) {
  const response = await apiClient.get(EXPENSES_BASE_PATH, {
    params: { companyId }
  });
  return response.data;
}

export async function approveExpense(expenseId) {
  const response = await apiClient.post(`${EXPENSES_BASE_PATH}/${expenseId}/approve`);
  return response.data;
}

export async function rejectExpense(expenseId) {
  const response = await apiClient.post(`${EXPENSES_BASE_PATH}/${expenseId}/reject`);
  return response.data;
}

export async function getExpense(expenseId) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/${expenseId}`);
  return response.data;
}

export async function getBudgetSummary(budgetId) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/budget/${budgetId}/summary`);
  return response.data;
}

export async function getExpenseChart(companyId, days = 30) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/chart`, {
    params: { companyId, days }
  });
  return response.data;
}

export async function getDailyExpenseTrend(companyId) {
  const response = await apiClient.get(`${EXPENSES_BASE_PATH}/daily-trend`, {
    params: { companyId }
  });
  return response.data;
}
