import React, { useState } from "react";
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
} from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { useAuth } from "../context/AuthContext";

const LoginPage = ({ onGuestMode }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          setError(t("login.error_display_name") || "กรุณากรอกชื่อที่ต้องการแสดง");
          setLoading(false);
          return;
        }
        await register(email, password, displayName);
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
          {/* Language Switcher */}
          <Box sx={{ position: "absolute", top: 16, right: 16 }}>
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
            {isRegister && (
              <TextField
                fullWidth
                label={t("login.display_name")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRoundedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

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
              sx={{ mb: 3 }}
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
    </Box>
  );
};

export default LoginPage;
