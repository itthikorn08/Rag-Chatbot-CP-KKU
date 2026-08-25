const { PORT } = require("./config/env");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "Admission RAG Chatbot API is running", status: "healthy" });
});

// ─── 404 Not Found Handler ───────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});

// ─── Global Centralized Error Handler ────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: err.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start Server ────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();

