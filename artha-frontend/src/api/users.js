import apiClient from "./client";

const USERS_BASE_PATH = "/users/api/users";

export async function getUserById(userId) {
  const response = await apiClient.get(`${USERS_BASE_PATH}/${userId}`);
  return response.data;
}

export async function updateUser(userId, data) {
  const response = await apiClient.put(`${USERS_BASE_PATH}/${userId}`, data);
  return response.data;
}

export async function getUserByEmail(email) {
  const response = await apiClient.get(`${USERS_BASE_PATH}/by-email`, {
    params: { email }
  });
  return response.data;
}
