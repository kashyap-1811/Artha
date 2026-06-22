import apiClient from "./client";

const AUTH_PREFIXES = ["/auth"];

async function postAuth(endpoint, payload) {
  let lastError = new Error("Authentication request failed");

  for (const prefix of AUTH_PREFIXES) {
    try {
      const response = await apiClient.post(`${prefix}/${endpoint}`, payload);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export function signup(payload) {
  return postAuth("signup", payload);
}

export function login(payload) {
  return postAuth("login", payload);
}
