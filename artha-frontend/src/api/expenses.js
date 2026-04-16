function normalizeBaseUrl(url) {
    if (!url) return "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const EXPENSES_BASE_PATH = "/expense/api/expenses";

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
    const rawError = body?.message || body?.error || `Request failed with status ${response.status}`;
    return formatFriendlyError(rawError);
  } catch {
    return formatFriendlyError(`Request failed with status ${response.status}`);
  }
}

export async function createExpense(data) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getExpensesByBudget(budgetId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/budget/${budgetId}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getExpensesByAllocation(allocationId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/allocation/${allocationId}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getCompanyExpenses(companyId) {
    const query = new URLSearchParams({ companyId });
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}?${query.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function approveExpense(expenseId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/${expenseId}/approve`, {
        method: "POST",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function rejectExpense(expenseId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/${expenseId}/reject`, {
        method: "POST",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getExpense(expenseId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/${expenseId}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getBudgetSummary(budgetId) {
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/budget/${budgetId}/summary`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getExpenseChart(companyId, days = 30) {
    const query = new URLSearchParams({ companyId, days });
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/chart?${query.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}

export async function getDailyExpenseTrend(companyId) {
    const query = new URLSearchParams({ companyId });
    const response = await fetch(`${API_BASE_URL}${EXPENSES_BASE_PATH}/daily-trend?${query.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    return response.json();
}
