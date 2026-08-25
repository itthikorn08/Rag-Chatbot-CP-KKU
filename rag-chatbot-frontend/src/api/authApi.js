import apiClient from "./chatApi";

export const getMe = async () => {
  const { data } = await apiClient.get("/auth/me");
  return data;
};

export const loginUser = async ({ email, password }) => {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
};

export const registerUser = async ({ email, password }) => {
  const { data } = await apiClient.post("/auth/register", { email, password });
  return data;
};

export const updateProfile = async (profileData) => {
  const { data } = await apiClient.put("/auth/profile", profileData);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data;
};

export const verifyOtp = async ({ email, otp }) => {
  const { data } = await apiClient.post("/auth/verify-otp", { email, otp });
  return data;
};

export const resetPassword = async ({ resetToken, newPassword }) => {
  const { data } = await apiClient.post("/auth/reset-password", { resetToken, newPassword });
  return data;
};
