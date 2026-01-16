export const setToken = (token) => {
  localStorage.setItem("accessToken", token);
};

export const removeToken = () => {
  localStorage.removeItem("accessToken");
};

export const getToken = () => {
  return localStorage.getItem("accessToken");
};