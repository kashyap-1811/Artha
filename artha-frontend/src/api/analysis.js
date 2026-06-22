import apiClient from "./client";

const ANALYSIS_BASE_PATH = "/analysis";

export async function getCompanyHealth(companyId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/company/${companyId}/health`);
  return response.data;
}

export async function getCompanyActiveBudgetAnalysis(companyId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/company/${companyId}/active-budget`);
  return response.data;
}

export async function getCompanyCategoryBreakdown(companyId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/company/${companyId}/category-breakdown`);
  return response.data;
}

export async function getCompanySpendingTrend(companyId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/company/${companyId}/spending-trend`);
  return response.data;
}

export async function getBudgetAnalysis(budgetId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/budget/${budgetId}/analysis`);
  return response.data;
}

export async function getBudgetTopSpenders(budgetId) {
  const response = await apiClient.get(`${ANALYSIS_BASE_PATH}/budget/${budgetId}/top-spenders`);
  return response.data;
}
