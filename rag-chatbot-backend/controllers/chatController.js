const { getAnswer } = require("../services/ragHelper");
const Chat = require("../models/Chat");

/**
 * Handle incoming chat question.
 * Delegates all RAG logic to the ragHelper service.
 */
const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "กรุณาระบุคำถาม (question)" });
    }

    // Fetch previous chat history for conversational memory
    const recentChats = await Chat.find().sort({ timestamp: -1 }).limit(5);
    recentChats.reverse(); // Chronological order
    
    const chatHistory = [];
    for (const chat of recentChats) {
      chatHistory.push({ role: "user", content: chat.question });
      chatHistory.push({ role: "assistant", content: chat.answer });
    }

    // Get answer from RAG helper, passing the history
    const answer = await getAnswer(question, chatHistory);

    // Save current chat round to MongoDB
    try {
      await Chat.create({ question, answer });
    } catch (saveError) {
      console.error("Failed to save chat history:", saveError.message);
      // We don't block the response even if history fails to save
    }

    return res.json({ answer });
  } catch (error) {
    console.error("Error in askQuestion:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

module.exports = { askQuestion };
