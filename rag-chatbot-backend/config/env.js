require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  JWT_SECRET: process.env.JWT_SECRET || "cp-kku-chatbot-secret-2024",
  JWT_EXPIRY: "7d",
  SMTP_SERVICE: process.env.SMTP_SERVICE || "gmail",
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
};
