function normalizeBaseUrl(url) {
    if (!url) return "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const ANALYSIS_BASE_PATH = "/analysis";

function getAuthHeaders() {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    if (userId) headers["X-User-Id"] = userId;

    return headers;
}

import { formatFriendlyError } from "../lib/errorParser";

async function parseErrorMessage(response) {
  try {
    const body = await response.json();
    const rawError = body?.message || body?.error || body?.detail || `Request failed with status ${response.status}`;
    return formatFriendlyError(rawError);
  } catch {
    return formatFriendlyError(`Request failed with status ${response.status}`);
  }
}

export async function getCompanyHealth(companyId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/company/${companyId}/health`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}

export async function getCompanyActiveBudgetAnalysis(companyId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/company/${companyId}/active-budget`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}

export async function getCompanyCategoryBreakdown(companyId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/company/${companyId}/category-breakdown`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}

export async function getCompanySpendingTrend(companyId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/company/${companyId}/spending-trend`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}

export async function getBudgetAnalysis(budgetId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/budget/${budgetId}/analysis`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}

export async function getBudgetTopSpenders(budgetId) {
    const response = await fetch(`${API_BASE_URL}${ANALYSIS_BASE_PATH}/budget/${budgetId}/top-spenders`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(await parseErrorMessage(response));
    return response.json();
}
