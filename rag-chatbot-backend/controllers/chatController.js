const mongoose = require("mongoose");
const { getAnswer } = require("../services/ragHelper");
const Chat = require("../models/Chat");

const askQuestion = async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "กรุณาระบุคำถาม (question)" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "กรุณาระบุ sessionId" });
    }

    const userId = req.user ? req.user.id : null;

    const query = { sessionId };
    if (userId) query.userId = userId;

    const recentChats = await Chat.find(query).sort({ timestamp: -1 }).limit(5);
    recentChats.reverse();

    const chatHistory = [];
    for (const chat of recentChats) {
      chatHistory.push({ role: "user", content: chat.question });
      chatHistory.push({ role: "assistant", content: chat.answer });
    }

    const answer = await getAnswer(question, chatHistory);

    if (userId) {
      try {
        let sessionTitle = "New Chat";
        if (recentChats.length === 0) {
          sessionTitle = question.length > 30 ? question.substring(0, 30) + "..." : question;
        } else {
          const firstInSession = await Chat.findOne({ sessionId, userId }).sort({ timestamp: 1 });
          if (firstInSession) sessionTitle = firstInSession.sessionTitle;
        }

        await Chat.create({ userId, sessionId, sessionTitle, question, answer });
      } catch (saveError) {
        console.error("Failed to save chat history:", saveError.message);
      }
    }

    return res.json({ answer });
  } catch (error) {
    console.error("Error in askQuestion:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ error: "กรุณาระบุ sessionId" });
    }

    const chats = await Chat.find({ userId, sessionId })
      .sort({ timestamp: 1 })
      .select("question answer timestamp");

    return res.json({ history: chats });
  } catch (error) {
    console.error("Error in getChatHistory:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงประวัติการสนทนา" });
  }
};

const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Chat.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$sessionId",
          title: { $first: "$sessionTitle" },
          lastMessageAt: { $first: "$timestamp" },
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    return res.json({ sessions });
  } catch (error) {
    console.error("Error in getChatSessions:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรายการห้องสนทนา" });
  }
};

const deleteChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ error: "กรุณาระบุ sessionId" });
    }

    await Chat.deleteMany({ userId, sessionId });

    return res.json({ message: "ลบประวัติการสนทนาเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error in deleteChatSession:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบประวัติการสนทนา" });
  }
};

module.exports = { askQuestion, getChatHistory, getChatSessions, deleteChatSession };
