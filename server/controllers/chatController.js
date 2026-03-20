const { getAnswer } = require("../services/ragHelper");

const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "กรุณาระบุคำถาม (question)" });
    }

    const answer = await getAnswer(question);
    return res.json({ answer });
  } catch (error) {
    console.error("Error in askQuestion:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

module.exports = { askQuestion };
