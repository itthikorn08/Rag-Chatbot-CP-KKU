import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  IconButton,
  InputAdornment,
  Breadcrumbs,
  Link,
  Container,
  Avatar,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import WcRoundedIcon from "@mui/icons-material/WcRounded";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../theme/ThemeContext";

const ProfilePage = ({ onBack, initialView = "details" }) => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile } = useAuth();
  const { mode, toggleTheme } = useThemeContext();

  const [activeView] = useState(initialView); // "details" or "password"

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (!user?.dateOfBirth) return "";
    return new Date(user.dateOfBirth).toISOString().split("T")[0];
  });
  const [gender, setGender] = useState(user?.gender || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const isPasswordView = activeView === "password";

    if (!isPasswordView) {
      if (!displayName.trim()) {
        setError(t("login.error_display_name") || "กรุณากรอกชื่อที่ต้องการแสดง");
        return;
      }
    } else {
      if (!newPassword) {
        setError("กรุณากรอกรหัสผ่านใหม่");
        return;
      }
      if (newPassword.length < 6) {
        setError(t("profile.error_password_length") || "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("profile.error_password_match") || "รหัสผ่านใหม่ไม่ตรงกัน");
        return;
      }
    }

    setLoading(true);
    try {
      await updateProfile(
        displayName.trim(),
        isPasswordView ? newPassword : undefined,
        firstName.trim(),
        lastName.trim(),
        dateOfBirth || "",
        gender
      );
      setSuccess(t("profile.success_profile_update") || "อัปเดตข้อมูลสำเร็จ");
      
      if (isPasswordView) {
        setNewPassword("");
        setConfirmPassword("");
      }

      // Navigate back after a successful save
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || t("profile.error_profile_update") || "อัปเดตข้อมูลล้มเหลว";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <Box
      sx={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      {/* Floating Theme and Language Selectors */}
      <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 1, zIndex: 10 }}>
        <IconButton onClick={toggleTheme} color="primary" sx={{ bgcolor: "background.paper", boxShadow: 1 }}>
          {mode === "light" && <LightModeRoundedIcon />}
          {mode === "dark" && <DarkModeRoundedIcon />}
          {mode === "system" && <SettingsBrightnessRoundedIcon />}
        </IconButton>
        <Button
          startIcon={<LanguageRoundedIcon />}
          onClick={() => i18n.changeLanguage(i18n.language === "th" ? "en" : "th")}
          variant="contained"
          color="inherit"
          sx={{
            minWidth: 80,
            fontWeight: 700,
            textTransform: "none",
            bgcolor: "background.paper",
            color: "text.primary",
            boxShadow: 1,
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          {i18n.language === "th" ? "EN" : "TH"}
        </Button>
      </Box>

      {/* Main Container */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Navigation & Breadcrumbs */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={onBack} color="primary" sx={{ mr: 1, border: "1px solid", borderColor: "divider" }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Breadcrumbs separator={<NavigateNextRoundedIcon fontSize="small" />} aria-label="breadcrumb">
            <Link
              underline="hover"
              color="inherit"
              onClick={onBack}
              sx={{ cursor: "pointer", display: "flex", alignItems: "center", fontWeight: 500 }}
            >
              {t("admin.back_chat") || "กลับหน้าแชท"}
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 600 }}>
              {t("profile.profile_title")?.replace(" ⚙️", "") || "ตั้งค่าข้อมูลส่วนตัว"}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Profile Card Form */}
        <Box sx={{ display: "flex", justifyContent: "center", flex: 1, alignItems: "center" }}>
          <Fade in timeout={500}>
            <Card
              elevation={8}
              sx={{
                width: "100%",
                maxWidth: 550,
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              {/* Header Gradient */}
              <Box
                sx={{
                  background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                  p: 4,
                  color: "#white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    fontSize: "2.2rem",
                    fontWeight: 700,
                    mb: 2,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    border: "3px solid #fff",
                  }}
                >
                  {getInitials(displayName)}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}>
                  {activeView === "password" 
                    ? (t("profile.tab_password") || "เปลี่ยนรหัสผ่าน") 
                    : (t("profile.tab_details") || "จัดการข้อมูลส่วนตัว")}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                  {activeView === "password" 
                    ? (t("profile.profile_subtitle_password") || "กรุณากรอกรหัสผ่านใหม่เพื่อเปลี่ยนรหัสผ่านของคุณค่ะ") 
                    : (t("profile.profile_subtitle_details") || "คุณสามารถแก้ไขชื่อที่แสดงหรือข้อมูลส่วนตัวของคุณได้ที่นี่ค่ะ")}
                </Typography>
              </Box>

              <CardContent sx={{ p: 4 }}>
                {/* Status Messages */}
                {error && (
                  <Fade in>
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>
                      {error}
                    </Alert>
                  </Fade>
                )}

                {success && (
                  <Fade in>
                    <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                      {success}
                    </Alert>
                  </Fade>
                )}

                {/* Form Inputs */}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

                  {/* Details View */}
                  {activeView === "details" && (
                    <Fade in timeout={300}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {/* Email (Read-only) */}
                        <TextField
                          fullWidth
                          label={t("profile.field_email") || "อีเมล (ไม่สามารถเปลี่ยนได้)"}
                          value={user?.email || ""}
                          disabled
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailRoundedIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        {/* Display Name */}
                        <TextField
                          fullWidth
                          required
                          label={t("profile.field_display_name") || "ชื่อที่แสดง"}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonRoundedIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        {/* First Name & Last Name (Side by Side) */}
                        <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                          <TextField
                            fullWidth
                            label={t("profile.field_first_name") || "ชื่อจริง"}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={loading}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonRoundedIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            fullWidth
                            label={t("profile.field_last_name") || "นามสกุล"}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={loading}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonRoundedIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Box>

                        {/* Date of Birth */}
                        <TextField
                          fullWidth
                          label={t("profile.field_dob") || "วันเดือนปีเกิด"}
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          disabled={loading}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarTodayRoundedIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        {/* Gender */}
                        <FormControl fullWidth disabled={loading}>
                          <InputLabel id="gender-label">
                            {t("profile.field_gender") || "เพศ"}
                          </InputLabel>
                          <Select
                            labelId="gender-label"
                            id="gender-select"
                            value={gender}
                            label={t("profile.field_gender") || "เพศ"}
                            onChange={(e) => setGender(e.target.value)}
                            startAdornment={
                              <InputAdornment position="start">
                                <WcRoundedIcon color="action" />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="">
                              <em>{t("profile.gender_not_specified") || "ไม่ระบุ"}</em>
                            </MenuItem>
                            <MenuItem value="male">{t("profile.gender_male") || "ชาย"}</MenuItem>
                            <MenuItem value="female">{t("profile.gender_female") || "หญิง"}</MenuItem>
                            <MenuItem value="other">{t("profile.gender_other") || "อื่นๆ"}</MenuItem>
                            <MenuItem value="prefer_not_to_say">{t("profile.gender_prefer_not") || "ไม่ต้องการระบุ"}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Fade>
                  )}

                  {/* Password View */}
                  {activeView === "password" && (
                    <Fade in timeout={300}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {/* New Password */}
                        <TextField
                          fullWidth
                          required
                          label={t("profile.field_new_password")?.replace(" (ปล่อยว่างหากไม่เปลี่ยน)", "")?.replace(" (Leave blank to keep current)", "") || "รหัสผ่านใหม่"}
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockRoundedIcon color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  edge="end"
                                  size="small"
                                  disabled={loading}
                                >
                                  {showNewPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        {/* Confirm Password */}
                        <TextField
                          fullWidth
                          required
                          label={t("profile.field_confirm_password") || "ยืนยันรหัสผ่านใหม่"}
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockRoundedIcon color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                  size="small"
                                  disabled={loading}
                                >
                                  {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={onBack}
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      {t("chat.cancel") || "ยกเลิก"}
                    </Button>
                    
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: "none",
                        fontWeight: 600,
                        background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                        boxShadow: "0 4px 14px rgba(26, 35, 126, 0.3)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #0d1642 0%, #1a237e 100%)",
                          boxShadow: "0 6px 20px rgba(26, 35, 126, 0.4)",
                        },
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: "primary.contrastText" }} />
                      ) : (
                        t("profile.btn_save") || "บันทึกการเปลี่ยนแปลง"
                      )}
                    </Button>
                  </Box>

                </Box>
              </CardContent>
            </Card>
          </Fade>
        </Box>

      </Container>
    </Box>
  );
};

export default ProfilePage;
