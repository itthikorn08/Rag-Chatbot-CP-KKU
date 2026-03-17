import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Send a question to the RAG backend and return the answer.
 * @param {string} question
 * @returns {Promise<string>}
 */
export const askQuestion = async (question) => {
  const { data } = await apiClient.post("/chat/ask", { question });
  return data.answer;
};

export default apiClient;
