const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  vote: {
    type: String,
    enum: ["up", "down"],
    required: true,
  },
  comment: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

feedbackSchema.index({ sessionId: 1, question: 1 });
feedbackSchema.index({ vote: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
