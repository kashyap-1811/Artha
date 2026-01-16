import axios from "axios";

const httpClient = axios.create({
  baseURL: "http://localhost:8080", // API Gateway or Auth service
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default httpClient;