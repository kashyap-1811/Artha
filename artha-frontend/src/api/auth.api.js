import httpClient from "./httpClient";

export const loginApi = (data) =>
  httpClient.post("/api/auth/login", data);

export const signupApi = (data) =>
  httpClient.post("/api/auth/signup", data);

export const getMeApi = () =>
  httpClient.get("/api/auth/me");