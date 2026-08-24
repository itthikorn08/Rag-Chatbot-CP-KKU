const Feedback = require("../models/Feedback");

const submitFeedback = async (req, res) => {
  try {
    const { sessionId, question, answer, vote, comment } = req.body;

    if (!sessionId || !question || !answer || !vote) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    if (!["up", "down"].includes(vote)) {
      return res.status(400).json({ error: "vote ต้องเป็น 'up' หรือ 'down'" });
    }

    const userId = req.user ? req.user.id : null;

    // Upsert: one feedback per question per session
    const filter = { sessionId, question };
    const update = {
      sessionId,
      userId,
      question,
      answer,
      vote,
      comment: comment || "",
      createdAt: new Date(),
    };

    const feedback = await Feedback.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return res.json({ message: "บันทึก feedback เรียบร้อยแล้ว", feedback });
  } catch (error) {
    console.error("Submit feedback error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึก feedback" });
  }
};

const getFeedbacks = async (req, res) => {
  try {
    const { vote, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (vote && ["up", "down"].includes(vote)) {
      filter.vote = vote;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "email displayName")
      .lean();

    return res.json({
      feedbacks,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get feedbacks error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล feedback" });
  }
};

const getFeedbackStats = async (req, res) => {
  try {
    const [stats] = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalUp: { $sum: { $cond: [{ $eq: ["$vote", "up"] }, 1, 0] } },
          totalDown: { $sum: { $cond: [{ $eq: ["$vote", "down"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    if (!stats) {
      return res.json({ totalUp: 0, totalDown: 0, total: 0, satisfactionRate: 0 });
    }

    const satisfactionRate = stats.total > 0
      ? Math.round((stats.totalUp / stats.total) * 100)
      : 0;

    return res.json({
      totalUp: stats.totalUp,
      totalDown: stats.totalDown,
      total: stats.total,
      satisfactionRate,
    });
  } catch (error) {
    console.error("Get feedback stats error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงสถิติ feedback" });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) {
      return res.status(404).json({ error: "ไม่พบ feedback" });
    }
    return res.json({ message: "ลบ feedback เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Delete feedback error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบ feedback" });
  }
};

module.exports = { submitFeedback, getFeedbacks, getFeedbackStats, deleteFeedback };
