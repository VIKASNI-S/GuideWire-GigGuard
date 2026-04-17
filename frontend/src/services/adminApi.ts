import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const KEY = "phoeraksha_admin_token";

export const adminApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use((config) => {
  const t = localStorage.getItem(KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
