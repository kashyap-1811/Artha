import apiClient from "./client";

const COMPANIES_BASE_PATH = "/users/api/companies";

export async function getMyCompanies() {
  const response = await apiClient.get(`${COMPANIES_BASE_PATH}/my`);
  return response.data;
}

export async function createCompany(name) {
  const response = await apiClient.post(COMPANIES_BASE_PATH, { name: name.trim() });
  return response.data;
}

export async function getCompanyMembers(companyId) {
  const response = await apiClient.get(`${COMPANIES_BASE_PATH}/${companyId}/members`);
  return response.data;
}

export async function addCompanyMember(companyId, data) {
  const response = await apiClient.post(`${COMPANIES_BASE_PATH}/${companyId}/members`, data);
  return response.data;
}

export async function removeCompanyMember(companyId, userId) {
  const response = await apiClient.delete(`${COMPANIES_BASE_PATH}/${companyId}/members/${userId}`);
  return response.data;
}

export async function changeMemberRole(companyId, userId, role) {
  const response = await apiClient.put(
    `${COMPANIES_BASE_PATH}/${companyId}/members/${userId}/role`,
    null,
    { params: { role } }
  );
  return response.data;
}

export async function getMyPersonalCompany() {
  const response = await apiClient.get(`${COMPANIES_BASE_PATH}/my/personal`);
  return response.data;
}
