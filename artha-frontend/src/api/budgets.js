import apiClient from "./client";

const BUDGETS_BASE_PATH = "/budget/api/budgets";

export async function getAllBudgets(companyId) {
  const response = await apiClient.get(`${BUDGETS_BASE_PATH}/all`, {
    params: { companyId }
  });
  return response.data;
}

export async function getBudgetDetails(budgetId) {
  const response = await apiClient.get(`${BUDGETS_BASE_PATH}/${budgetId}/details`);
  return response.data;
}

export async function createBudget(data) {
  const response = await apiClient.post(BUDGETS_BASE_PATH, data);
  return response.data;
}

export async function createAllocation(budgetId, data) {
  const response = await apiClient.post(`${BUDGETS_BASE_PATH}/${budgetId}/allocations`, data);
  return response.data;
}

export async function getActiveBudget(companyId) {
  const response = await apiClient.get(`${BUDGETS_BASE_PATH}/active`, {
    params: { companyId }
  });
  return response.data;
}

export async function closeBudget(budgetId) {
  const response = await apiClient.post(`${BUDGETS_BASE_PATH}/${budgetId}/close`);
  return response.status === 204 ? null : response.data;
}

export async function removeAllocation(budgetId, allocationId) {
  const response = await apiClient.delete(`${BUDGETS_BASE_PATH}/${budgetId}/allocations/${allocationId}`);
  return response.status === 204 ? null : response.data;
}

export async function updateAllocation(budgetId, allocationId, data) {
  const response = await apiClient.put(`${BUDGETS_BASE_PATH}/${budgetId}/allocations/${allocationId}`, data);
  return response.data;
}

export async function updateBudget(budgetId, data) {
  const response = await apiClient.put(`${BUDGETS_BASE_PATH}/${budgetId}`, data);
  return response.data;
}

export async function removeBudget(budgetId) {
  const response = await apiClient.delete(`${BUDGETS_BASE_PATH}/${budgetId}`);
  return response.status === 204 ? null : response.data;
}
