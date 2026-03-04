function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const USERS_BASE_PATH = "/users/api/users";

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

export async function getUserById(userId) {
  const response = await fetch(`${API_BASE_URL}${USERS_BASE_PATH}/${userId}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function updateUser(userId, data) {
  const response = await fetch(`${API_BASE_URL}${USERS_BASE_PATH}/${userId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function getUserByEmail(email) {
  const query = new URLSearchParams({ email }).toString();
  const response = await fetch(`${API_BASE_URL}${USERS_BASE_PATH}/by-email?${query}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}
