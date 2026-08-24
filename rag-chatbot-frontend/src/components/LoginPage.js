import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  Divider,
  IconButton,
  InputAdornment,
  Dialog,
  DialogContent,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../theme/ThemeContext";
import apiClient from "../api/chatApi";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes

// ─── OTP Input Component ──────────────────────────────────────
const OtpInput = ({ value, onChange, disabled }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newOtp = value.split("");
    newOtp[index] = val.slice(-1);
    const otpStr = newOtp.join("");
    onChange(otpStr);

    if (val && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(pasted.padEnd(OTP_LENGTH, ""));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", my: 3 }}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <TextField
          key={i}
          inputRef={(el) => (inputRefs.current[i] = el)}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          inputProps={{
            maxLength: 1,
            style: {
              textAlign: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              fontFamily: "'Courier New', monospace",
              padding: "12px 0",
              width: "40px",
            },
            inputMode: "numeric",
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
                borderWidth: 2,
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

// ─── Countdown Timer Component ────────────────────────────────
const CountdownTimer = ({ expiresAt, onExpired }) => {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0 && onExpired) onExpired();
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 60;

  return (
    <Typography
      variant="body2"
      sx={{
        color: isUrgent ? "error.main" : "text.secondary",
        fontWeight: isUrgent ? 600 : 400,
        textAlign: "center",
        mt: 1,
      }}
    >
      {t("login.otp_expires_in")}: {minutes}:{seconds.toString().padStart(2, "0")} {t("login.minutes")}
    </Typography>
  );
};

// ─── Login Page ───────────────────────────────────────────────
const LoginPage = ({ onGuestMode }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmRegPassword, setConfirmRegPassword] = useState("");
  const [showConfirmRegPassword, setShowConfirmRegPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(0); // 0=email, 1=otp, 2=reset, 3=success
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);

  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();
  const { mode, toggleTheme } = useThemeContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmRegPassword) {
          setError(t("login.password_mismatch") || "รหัสผ่านไม่ตรงกัน");
          setLoading(false);
          return;
        }
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      const msg = err.response?.data?.error || t("chat.error_connection");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
  };

  // ─── Forgot Password Handlers ──────────────────────────────

  const resetForgotState = useCallback(() => {
    setForgotStep(0);
    setForgotEmail("");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setForgotLoading(false);
    setForgotError("");
    setForgotSuccess("");
    setOtpExpiresAt(null);
  }, []);

  const handleOpenForgot = () => {
    resetForgotState();
    setForgotOpen(true);
  };

  const handleCloseForgot = () => {
    setForgotOpen(false);
    setTimeout(resetForgotState, 300);
  };

  const handleSendOtp = async () => {
    if (!forgotEmail.trim()) {
      setForgotError(t("login.enter_email_placeholder"));
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email: forgotEmail.trim() });
      setForgotStep(1);
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      setForgotSuccess("");
    } catch (err) {
      setForgotError(err.response?.data?.error || t("chat.error_connection"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    setOtp("");
    try {
      await apiClient.post("/auth/forgot-password", { email: forgotEmail.trim() });
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      setForgotSuccess(t("login.otp_sent_to") + " " + forgotEmail);
    } catch (err) {
      setForgotError(err.response?.data?.error || t("chat.error_connection"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.replace(/ /g, "").length < OTP_LENGTH) {
      setForgotError(t("login.enter_otp_title"));
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const { data } = await apiClient.post("/auth/verify-otp", {
        email: forgotEmail.trim(),
        otp: otp.replace(/ /g, ""),
      });
      setResetToken(data.resetToken);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.error || t("chat.error_connection"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setForgotError(t("login.error_password_length"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError(t("login.error_password_match"));
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.response?.data?.error || t("chat.error_connection"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpExpired = useCallback(() => {
    // Timer expired — user can still resend
  }, []);

  const forgotSteps = [t("login.step_email"), t("login.step_otp"), t("login.step_reset")];

  // ─── Render ─────────────────────────────────────────────────

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0d1642 0%, #1a237e 40%, #283593 70%, #1a237e 100%)",
        p: 2,
      }}
    >
      <Fade in timeout={600}>
        <Paper
          elevation={24}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: 4,
            pt: 6,
            borderRadius: 4,
            border: "1px solid rgba(200, 164, 21, 0.2)",
            bgcolor: "background.paper",
            position: "relative"
          }}
        >
          {/* Top-Right Actions (Theme and Language) */}
          <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton onClick={toggleTheme} color="primary" size="small" sx={{ p: 0.75 }}>
              {mode === "light" && <LightModeRoundedIcon sx={{ fontSize: 20 }} />}
              {mode === "dark" && <DarkModeRoundedIcon sx={{ fontSize: 20 }} />}
              {mode === "system" && <SettingsBrightnessRoundedIcon sx={{ fontSize: 20 }} />}
            </IconButton>
            <Button
              size="small"
              startIcon={<LanguageRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => i18n.changeLanguage(i18n.language === "th" ? "en" : "th")}
              sx={{ minWidth: 40, fontWeight: 700, textTransform: "none" }}
            >
              {i18n.language === "th" ? "EN" : "TH"}
            </Button>
          </Box>
          {/* Logo Section */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1a237e, #283593)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                boxShadow: "0 4px 20px rgba(26, 35, 126, 0.3)",
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: 36, color: "#c8a415" }} />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}
            >
              CP KKU Chatbot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegister ? t("login.register_title") : t("login.title")}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>


            <TextField
              fullWidth
              label={t("login.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label={t("login.password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password (Register only) */}
            {isRegister && (
              <TextField
                fullWidth
                label={t("login.confirm_password") || "ยืนยันรหัสผ่าน"}
                type={showConfirmRegPassword ? "text" : "password"}
                value={confirmRegPassword}
                onChange={(e) => setConfirmRegPassword(e.target.value)}
                required
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmRegPassword(!showConfirmRegPassword)}
                        edge="end"
                        size="small"
                      >
                        {showConfirmRegPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Forgot Password Link */}
            {!isRegister && (
              <Box sx={{ textAlign: "right", mb: 2 }}>
                <Button
                  size="small"
                  onClick={handleOpenForgot}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.8rem",
                    color: "text.secondary",
                    "&:hover": {
                      color: "primary.main",
                      bgcolor: "transparent",
                    },
                  }}
                >
                  {t("login.forgot_password")}
                </Button>
              </Box>
            )}

            {isRegister && <Box sx={{ mb: 2 }} />}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: 600,
                fontSize: "1rem",
                borderRadius: 2.5,
                background: "linear-gradient(135deg, #1a237e, #283593)",
                boxShadow: "0 4px 14px rgba(26, 35, 126, 0.4)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0d1642, #1a237e)",
                  boxShadow: "0 6px 20px rgba(26, 35, 126, 0.5)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : isRegister ? (
                t("login.register_submit")
              ) : (
                t("login.submit")
              )}
            </Button>
          </Box>

          {/* Divider */}
          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t("common.or")}
            </Typography>
          </Divider>

          {/* Guest Mode Button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={onGuestMode}
            sx={{
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 500,
              borderColor: "secondary.main",
              color: "secondary.dark",
              "&:hover": {
                borderColor: "secondary.dark",
                bgcolor: "rgba(200, 164, 21, 0.08)",
              },
            }}
          >
            {t("login.guest_mode")}
          </Button>

          {/* Toggle Login / Register */}
          <Box sx={{ textAlign: "center", mt: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
            {isRegister ? t("login.switch_to_login_q") : t("login.switch_to_register_q")}
              <Button
                size="small"
                onClick={toggleMode}
                sx={{
                  ml: 0.5,
                  textTransform: "none",
                  fontWeight: 600,
                  color: "primary.main",
                }}
              >
                {isRegister ? t("login.title") : t("login.register_submit")}
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Fade>

      {/* ─── Forgot Password Dialog ──────────────────────────── */}
      <Dialog
        open={forgotOpen}
        onClose={handleCloseForgot}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 0,
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #0d1642 0%, #1a237e 40%, #283593 100%)",
            p: 3,
            pb: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {forgotStep > 0 && forgotStep < 3 && (
            <IconButton
              onClick={() => {
                setForgotError("");
                setForgotSuccess("");
                if (forgotStep === 1) setForgotStep(0);
                if (forgotStep === 2) setForgotStep(1);
              }}
              sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff" } }}
              size="small"
            >
              <ArrowBackRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <LockResetRoundedIcon sx={{ color: "#c8a415", fontSize: 28 }} />
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
                {t("login.forgot_password_title")}
              </Typography>
            </Box>
            {forgotStep < 3 && (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", ml: 0.5 }}>
                {forgotStep === 0 && t("login.forgot_password_subtitle")}
                {forgotStep === 1 && t("login.enter_otp_title")}
                {forgotStep === 2 && t("login.new_password_subtitle")}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stepper */}
        {forgotStep < 3 && (
          <Box sx={{ px: 3, pt: 2.5 }}>
            <Stepper activeStep={forgotStep} alternativeLabel>
              {forgotSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        <DialogContent sx={{ p: 3, pt: 2.5 }}>
          {/* Error/Success Alerts */}
          {forgotError && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setForgotError("")}>
                {forgotError}
              </Alert>
            </Fade>
          )}
          {forgotSuccess && (
            <Fade in>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {forgotSuccess}
              </Alert>
            </Fade>
          )}

          {/* Step 0: Enter Email */}
          {forgotStep === 0 && (
            <Fade in>
              <Box>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #e8eaf6, #c5cae9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2.5,
                  }}
                >
                  <EmailRoundedIcon sx={{ fontSize: 32, color: "#1a237e" }} />
                </Box>
                <TextField
                  fullWidth
                  label={t("login.email")}
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t("login.enter_email_placeholder")}
                  disabled={forgotLoading}
                  sx={{ mb: 3 }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSendOtp}
                  disabled={forgotLoading || !forgotEmail.trim()}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2.5,
                    background: "linear-gradient(135deg, #1a237e, #283593)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0d1642, #1a237e)",
                    },
                  }}
                >
                  {forgotLoading ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    t("login.send_otp")
                  )}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 1: Enter OTP */}
          {forgotStep === 1 && (
            <Fade in>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 1 }}>
                  {t("login.otp_sent_to")}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, textAlign: "center", color: "primary.main", mb: 1 }}
                >
                  {forgotEmail}
                </Typography>

                {otpExpiresAt && (
                  <CountdownTimer expiresAt={otpExpiresAt} onExpired={handleOtpExpired} />
                )}

                <OtpInput value={otp} onChange={setOtp} disabled={forgotLoading} />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={forgotLoading || otp.replace(/ /g, "").length < OTP_LENGTH}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2.5,
                    background: "linear-gradient(135deg, #1a237e, #283593)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0d1642, #1a237e)",
                    },
                    mb: 2,
                  }}
                >
                  {forgotLoading ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    t("login.verify_otp")
                  )}
                </Button>

                <Box sx={{ textAlign: "center" }}>
                  <Button
                    size="small"
                    onClick={handleResendOtp}
                    disabled={forgotLoading}
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                      color: "text.secondary",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {t("login.resend_otp")}
                  </Button>
                </Box>
              </Box>
            </Fade>
          )}

          {/* Step 2: Set New Password */}
          {forgotStep === 2 && (
            <Fade in>
              <Box>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #e8eaf6, #c5cae9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2.5,
                  }}
                >
                  <LockResetRoundedIcon sx={{ fontSize: 32, color: "#1a237e" }} />
                </Box>

                <TextField
                  fullWidth
                  label={t("login.new_password")}
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={forgotLoading}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                          size="small"
                        >
                          {showNewPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label={t("login.confirm_new_password")}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={forgotLoading}
                  sx={{ mb: 3 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleResetPassword}
                  disabled={forgotLoading || !newPassword || !confirmPassword}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2.5,
                    background: "linear-gradient(135deg, #1a237e, #283593)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0d1642, #1a237e)",
                    },
                  }}
                >
                  {forgotLoading ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    t("login.reset_password")
                  )}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 3: Success */}
          {forgotStep === 3 && (
            <Fade in>
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 48, color: "#2e7d32" }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main", mb: 1 }}>
                  {t("login.password_reset_success")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t("login.password_reset_success_desc")}
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleCloseForgot}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2.5,
                    background: "linear-gradient(135deg, #1a237e, #283593)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0d1642, #1a237e)",
                    },
                  }}
                >
                  {t("login.back_to_login")}
                </Button>
              </Box>
            </Fade>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
