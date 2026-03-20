const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
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
  sessionId: {
    type: String,
    required: true,
  },
  sessionTitle: {
    type: String,
    default: "New Chat",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

chatSchema.index({ userId: 1, sessionId: 1, timestamp: -1 });

chatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("Chat", chatSchema);
