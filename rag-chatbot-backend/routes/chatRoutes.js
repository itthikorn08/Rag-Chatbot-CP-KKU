const express = require("express");
const router = express.Router();
const { askQuestion, getChatHistory, getChatSessions, deleteChatSession } = require("../controllers/chatController");
const { protect, requireAuth } = require("../middleware/authMiddleware");

router.post("/ask", protect, askQuestion);

router.get("/sessions", requireAuth, getChatSessions);

router.get("/history/:sessionId", requireAuth, getChatHistory);

router.delete("/history/:sessionId", requireAuth, deleteChatSession);

module.exports = router;
