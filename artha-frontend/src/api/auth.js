function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const AUTH_PREFIXES = ["/auth"];

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


async function postAuth(endpoint, payload) {
  let lastMessage = "Authentication request failed";

  for (const prefix of AUTH_PREFIXES) {
    const response = await fetch(`${API_BASE_URL}${prefix}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 404) {
      continue;
    }

    lastMessage = await parseErrorMessage(response);
    throw new Error(lastMessage);
  }

  throw new Error(lastMessage);
}

export function signup(payload) {
  return postAuth("signup", payload);
}

export function login(payload) {
  return postAuth("login", payload);
}
