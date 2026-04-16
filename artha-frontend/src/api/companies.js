function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const COMPANIES_BASE_PATH = "/users/api/companies";

function getAuthHeaders() {
  const token = localStorage.getItem("artha_jwt");
  const userId = localStorage.getItem("artha_user_id");

  const headers = {
    "Content-Type": "application/json"
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (userId) headers["X-USER-ID"] = userId;

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


export async function getMyCompanies() {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/my`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function createCompany(name) {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: name.trim() })
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function getCompanyMembers(companyId) {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/${companyId}/members`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function addCompanyMember(companyId, data) {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/${companyId}/members`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function removeCompanyMember(companyId, userId) {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/${companyId}/members/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function changeMemberRole(companyId, userId, role) {
  const query = new URLSearchParams({ role }).toString();
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/${companyId}/members/${userId}/role?${query}`, {
    method: "PUT",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function getMyPersonalCompany() {
  const response = await fetch(`${API_BASE_URL}${COMPANIES_BASE_PATH}/my/personal`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}
