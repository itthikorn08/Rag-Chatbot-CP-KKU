const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, forgotPassword, verifyOtp, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/register", register);

router.post("/login", login);

router.get("/me", requireAuth, getMe);

router.put("/profile", requireAuth, updateProfile);

// ─── Forgot Password ─────────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;

