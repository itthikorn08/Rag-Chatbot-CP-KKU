const express = require("express");
const router = express.Router();
const { askQuestion } = require("../controllers/chatController");

/**
 * POST /api/chat/ask
 * Body: { "question": "..." }
 * Response: { "answer": "..." }
 */
router.post("/ask", askQuestion);

module.exports = router;
