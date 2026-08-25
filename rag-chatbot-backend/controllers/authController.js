const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendOtpEmail } = require("../services/emailService");
const { JWT_SECRET, JWT_EXPIRY } = require("../config/env");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, displayName: user.displayName, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน (email, password)" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // Auto-generate displayName from email prefix
    const displayName = email.split("@")[0];

    const user = await User.create({
      email,
      password,
      displayName,
    });
    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอก email และ password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }
    return res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { displayName, password, firstName, lastName, dateOfBirth, gender } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    if (displayName) {
      user.displayName = displayName.trim();
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
      }
      user.password = password;
    }

    if (firstName !== undefined) {
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      user.lastName = lastName.trim();
    }

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    if (gender !== undefined) {
      user.gender = gender;
    }

    await user.save();
    const token = generateToken(user);

    return res.json({
      message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์" });
  }
};

// ─── Forgot Password ─────────────────────────────────────────

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "กรุณากรอกอีเมล" });
    }

    // Always respond with success to prevent email enumeration
    const successMsg = "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว";

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ message: successMsg });
    }

    // Rate limit: if OTP was sent less than 60 seconds ago, reject
    if (user.resetOtpExpires && user.resetOtp) {
      const timeSinceCreated = Date.now() - (user.resetOtpExpires.getTime() - 10 * 60 * 1000);
      if (timeSinceCreated < 60 * 1000) {
        return res.status(429).json({ error: "กรุณารอสักครู่ก่อนขอ OTP ใหม่" });
      }
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.resetOtp = hashedOtp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetOtpAttempts = 0;
    await user.save({ validateModifiedOnly: true });

    // Send OTP email
    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailError) {
      console.error("Email send error:", emailError.message);
      // Clear OTP if email fails
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save({ validateModifiedOnly: true });
      return res.status(500).json({ error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง" });
    }

    return res.json({ message: successMsg });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัส OTP" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ error: "ไม่พบคำขอรีเซ็ตรหัสผ่าน กรุณาขอ OTP ใหม่" });
    }

    // Check if OTP expired
    if (user.resetOtpExpires < new Date()) {
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save({ validateModifiedOnly: true });
      return res.status(400).json({ error: "รหัส OTP หมดอายุแล้ว กรุณาขอ OTP ใหม่" });
    }

    // Check max attempts (brute force protection)
    if (user.resetOtpAttempts >= 5) {
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save({ validateModifiedOnly: true });
      return res.status(429).json({ error: "กรอก OTP ผิดเกินจำนวนครั้งที่กำหนด กรุณาขอ OTP ใหม่" });
    }

    // Verify OTP
    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) {
      user.resetOtpAttempts += 1;
      await user.save({ validateModifiedOnly: true });
      const remaining = 5 - user.resetOtpAttempts;
      return res.status(400).json({
        error: `รหัส OTP ไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`,
      });
    }

    // OTP is valid — clear OTP fields and generate reset token
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    await user.save({ validateModifiedOnly: true });

    // Generate short-lived reset token (15 minutes)
    const resetToken = jwt.sign(
      { id: user._id, purpose: "password-reset" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ resetToken });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (tokenError) {
      return res.status(400).json({ error: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุ กรุณาเริ่มใหม่" });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ error: "Token ไม่ถูกต้อง" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
};

module.exports = { register, login, getMe, updateProfile, forgotPassword, verifyOtp, resetPassword };

