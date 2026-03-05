function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const BUDGETS_BASE_PATH = "/budget/api/budgets";

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

async function parseErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function getAllBudgets(companyId) {
  const query = new URLSearchParams({ companyId });
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/all?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function getBudgetDetails(budgetId) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}/details`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function createBudget(data) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function createAllocation(budgetId, data) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}/allocations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function getActiveBudget(companyId) {
  const query = new URLSearchParams({ companyId });
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/active?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function closeBudget(budgetId) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}/close`, {
    method: "POST",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function removeAllocation(budgetId, allocationId) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}/allocations/${allocationId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function updateAllocation(budgetId, allocationId, data) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}/allocations/${allocationId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function updateBudget(budgetId, data) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function removeBudget(budgetId) {
  const response = await fetch(`${API_BASE_URL}${BUDGETS_BASE_PATH}/${budgetId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
}
