import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const askQuestion = async (question, sessionId) => {
  const { data } = await apiClient.post("/chat/ask", { question, sessionId });
  return data.answer;
};

export const getChatSessions = async () => {
  const { data } = await apiClient.get("/chat/sessions");
  return data.sessions;
};

export const getChatHistory = async (sessionId) => {
  const { data } = await apiClient.get(`/chat/history/${sessionId}`);
  return data.history;
};

export const deleteChatSession = async (sessionId) => {
  const { data } = await apiClient.delete(`/chat/history/${sessionId}`);
  return data;
};

export const syncKnowledge = async () => {
  const { data } = await apiClient.post("/admin/sync");
  return data;
};

export const listAdminFiles = async () => {
  const { data } = await apiClient.get("/admin/files");
  return data.files;
};

export const uploadAdminJson = async (formData) => {
  const { data } = await apiClient.post("/admin/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const deleteAdminFile = async (filename) => {
  const { data } = await apiClient.delete(`/admin/files/${filename}`);
  return data;
};

export default apiClient;
