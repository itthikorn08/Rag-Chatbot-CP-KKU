const express = require("express");
const router = express.Router();
const { protect, requireAuth, isAdmin } = require("../middleware/authMiddleware");
const { submitFeedback, getFeedbacks, getFeedbackStats, deleteFeedback } = require("../controllers/feedbackController");

// User (including Guest) can submit feedback
router.post("/", protect, submitFeedback);

// Admin only
router.get("/", requireAuth, isAdmin, getFeedbacks);
router.get("/stats", requireAuth, isAdmin, getFeedbackStats);
router.delete("/:id", requireAuth, isAdmin, deleteFeedback);

module.exports = router;
