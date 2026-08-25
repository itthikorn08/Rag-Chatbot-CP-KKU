import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Tooltip,
  Fade,
  Grid,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  InputAdornment,
  LinearProgress,
  Grow,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Card,
  CardContent,
  Pagination,
} from "@mui/material";
import {
  CloudUploadRounded as CloudUploadIcon,
  SyncRounded as SyncIcon,
  DeleteRounded as DeleteIcon,
  InsertDriveFileRounded as FileIcon,
  ArrowBackRounded as ArrowBackIcon,
  RefreshRounded as RefreshIcon,
  LanguageRounded as LanguageIcon,
  MoreVertRounded as MoreVertIcon,
  FolderRounded as FolderIcon,
  StorageRounded as StorageIcon,
  AccessTimeRounded as AccessTimeIcon,
  CheckCircleRounded as CheckCircleIcon,
  SearchRounded as SearchIcon,
  DashboardRounded as DashboardIcon,
  SchoolRounded as SchoolIcon,
  CloudDoneRounded as CloudDoneIcon,
  ThumbUpRounded as ThumbUpIcon,
  ThumbDownRounded as ThumbDownIcon,
  RateReviewRounded as FeedbackIcon,
  PersonRounded as PersonIcon,
  ChatBubbleOutlineRounded as ChatBubbleIcon,
  SentimentSatisfiedAltRounded as HappyIcon,
  SentimentVeryDissatisfiedRounded as SadIcon,
} from "@mui/icons-material";
import {
  listAdminFiles,
  uploadAdminJson,
  deleteAdminFile,
  syncKnowledge,
  convertAdminPdf,
  saveAdminJson,
  getFeedbacks,
  getFeedbackStats,
  deleteFeedbackById,
} from "../api/chatApi";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

// ─── Stat Card Component ────────────────────────────────────────
const StatCard = ({ icon, label, value, color, delay, subtitle }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Grow in timeout={600 + delay} style={{ height: "100%", width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          height: "100%",
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.04)",
          transition: "all 0.25s ease-in-out",
          cursor: "default",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: isDark ? "0 8px 25px rgba(0,0,0,0.5)" : "0 6px 20px rgba(0,0,0,0.08)",
            borderColor: alpha(color, 0.4),
          },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "4px",
            bgcolor: color,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%", pl: 0.5 }}>
          <Box sx={{ flex: 1, pr: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontSize: "0.7rem",
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mt: 0.5,
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: subtitle ? "text.secondary" : "transparent",
                fontWeight: 500,
                mt: 0.5,
                display: "block",
                minHeight: "1.2em",
              }}
            >
              {subtitle || "\u00A0"}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(color, isDark ? 0.15 : 0.08),
              color: color,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </Paper>
    </Grow>
  );
};

// ─── File Format Badge ──────────────────────────────────────────
const FormatBadge = ({ label, color }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      fontWeight: 600,
      fontSize: "0.65rem",
      height: 22,
      borderRadius: 1.5,
      bgcolor: alpha(color, 0.1),
      color: color,
      border: "1px solid",
      borderColor: alpha(color, 0.2),
    }}
  />
);

// ─── Main AdminPage Component ───────────────────────────────────
const AdminPage = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [needsSync, setNeedsSync] = useState(() => localStorage.getItem("adminNeedsSync") === "true");

  const updateNeedsSync = (val) => {
    setNeedsSync(val);
    if (val) {
      localStorage.setItem("adminNeedsSync", "true");
    } else {
      localStorage.removeItem("adminNeedsSync");
    }
  };

  const [isConverting, setIsConverting] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [jsonString, setJsonString] = useState("");
  const [outputFilename, setOutputFilename] = useState("");

  // ─── Admin Tabs & Feedback States ────────────────────────────
  const [adminTab, setAdminTab] = useState(0); // 0 = knowledge, 1 = feedback
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ totalUp: 0, totalDown: 0, total: 0, satisfactionRate: 0 });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackVoteFilter, setFeedbackVoteFilter] = useState("all");
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackToDelete, setFeedbackToDelete] = useState(null);
  const [deleteFeedbackDialogOpen, setDeleteFeedbackDialogOpen] = useState(false);

  // ─── Computed Stats ─────────────────────────────────────────
  const totalSize = useMemo(() => {
    const bytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return files.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  // ─── Data Loading ───────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminFiles();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError(t("admin.error_load_files"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const loadFeedbackStats = useCallback(async () => {
    try {
      const stats = await getFeedbackStats();
      setFeedbackStats(stats);
    } catch (err) {
      console.error("Failed to load feedback stats:", err);
    }
  }, []);

  const loadFeedbacksList = useCallback(async (page = 1, vote = "all") => {
    setFeedbackLoading(true);
    try {
      const params = { page, limit: 10 };
      if (vote !== "all") params.vote = vote;
      const data = await getFeedbacks(params);
      setFeedbacks(data.feedbacks || []);
      setFeedbackTotal(data.total || 0);
      setFeedbackTotalPages(data.totalPages || 1);
      setFeedbackPage(data.page || 1);
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbackStats();
  }, [loadFeedbackStats]);

  useEffect(() => {
    if (adminTab === 1) {
      loadFeedbacksList(feedbackPage, feedbackVoteFilter);
    }
  }, [adminTab, feedbackPage, feedbackVoteFilter, loadFeedbacksList]);

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    try {
      await deleteFeedbackById(feedbackToDelete._id);
      setDeleteFeedbackDialogOpen(false);
      setFeedbackToDelete(null);
      setSuccess("ลบ feedback เรียบร้อยแล้ว");
      loadFeedbackStats();
      loadFeedbacksList(feedbackPage, feedbackVoteFilter);
    } catch (err) {
      setError("ไม่สามารถลบ feedback ได้");
    }
  };

  // ─── File Upload Handler ────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;

    const convertibleExtensions = [".pdf", ".txt", ".md", ".docx", ".xlsx", ".xls", ".csv"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isPdfOrDoc = convertibleExtensions.includes(fileExtension);
    const isJson = file.name.toLowerCase().endsWith(".json");

    if (!isJson && !isPdfOrDoc) {
      setError(t("admin.error_invalid_type") || "รองรับเฉพาะไฟล์ .json, .pdf, .docx, .xlsx, .csv, .txt, .md เท่านั้น");
      return;
    }

    setSuccess(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    // 1. If it's a JSON file -> Upload directly into data/
    if (isJson) {
      setUploading(true);
      try {
        const textContent = await file.text();
        // Validate JSON syntax
        try {
          JSON.parse(textContent);
        } catch (parseErr) {
          setError("ไฟล์ JSON ไม่ถูกต้องตามรูปแบบไวยากรณ์: " + parseErr.message);
          setUploading(false);
          return;
        }

        await uploadAdminJson(formData);
        setSuccess(t("admin.success_upload") || "อัปโหลดไฟล์เรียบร้อยแล้ว");
        updateNeedsSync(true);
        loadFiles();
      } catch (err) {
        const errMsg = err?.response?.data?.error || err?.message || "";
        setError((t("admin.error_upload") || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์") + (errMsg ? `: ${errMsg}` : ""));
      } finally {
        setUploading(false);
      }
      return;
    }

    // 2. For PDF, Word, Excel, CSV, TXT, MD -> Send to AI Converter
    setIsConverting(true);
    setShowConverter(true);

    const baseName = file.name.substring(0, file.name.lastIndexOf("."));
    const cleanName = baseName.replace(/[^a-zA-Z0-9_\u0e00-\u0e7f-]/g, "_").toLowerCase() + ".json";
    setOutputFilename(cleanName);
    setJsonString("");

    try {
      const res = await convertAdminPdf(formData);
      setJsonString(JSON.stringify(res.data, null, 2));
      setSuccess(t("admin.success_convert") || "แปลงไฟล์เป็น JSON สำเร็จ");
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || "";
      setError((t("admin.error_convert") || "เกิดข้อผิดพลาดในการแปลงไฟล์") + (errMsg ? `: ${errMsg}` : ""));
      setShowConverter(false);
      setIsConverting(false);
    } finally {
      setIsConverting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, loadFiles]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
    event.target.value = null;
  };

  // ─── Drag & Drop Handlers ──────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  // ─── Save Converted JSON ───────────────────────────────────
  const handleSaveConverted = async () => {
    if (!outputFilename.toLowerCase().endsWith(".json")) {
      setError("ชื่อไฟล์ต้องลงท้ายด้วย .json เท่านั้น");
      return;
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(jsonString);
      if (!Array.isArray(parsedContent)) {
        throw new Error("ข้อมูลต้องอยู่ในรูปแบบ Array [ ... ]");
      }
    } catch (err) {
      setError("รูปแบบ JSON ไม่ถูกต้อง: " + err.message);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await saveAdminJson(outputFilename, parsedContent);
      setSuccess(t("admin.success_save_json"));
      updateNeedsSync(true);
      setShowConverter(false);
      setJsonString("");
      loadFiles();
    } catch (err) {
      setError(t("admin.error_upload"));
    } finally {
      setUploading(false);
    }
  };

  const handleCancelConverter = () => {
    setShowConverter(false);
    setJsonString("");
    setError(null);
    setSuccess(null);
  };

  // ─── Delete File with SweetAlert2 ──────────────────────────
  const handleDeleteFile = async (filename) => {
    const isDarkMode = theme.palette.mode === "dark";

    const result = await Swal.fire({
      title: i18n.language === "th" ? "ยืนยันการลบไฟล์?" : "Delete File?",
      html: `
        <div style="font-size: 0.95rem; line-height: 1.6; margin-top: 6px;">
          ${i18n.language === "th" 
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <b style="color: #ef4444; word-break: break-all;">${filename}</b>?<br/><span style="font-size: 0.82rem; color: ${isDarkMode ? '#aaa' : '#666'};">ไฟล์จะถูกลบออกจากระบบ (หากต้องการให้ AI อัปเดตข้อมูล สามารถกดปุ่ม Sync Knowledge ด้วยตนเองภายหลังได้)</span>`
            : `Are you sure you want to delete <b style="color: #ef4444; word-break: break-all;">${filename}</b>?<br/><span style="font-size: 0.82rem; color: ${isDarkMode ? '#aaa' : '#666'};">This file will be deleted. You can manually click "Sync Knowledge" when ready.</span>`
          }
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: isDarkMode ? "#374151" : "#9ca3af",
      confirmButtonText: i18n.language === "th" ? "ลบไฟล์" : "Yes, delete",
      cancelButtonText: i18n.language === "th" ? "ยกเลิก" : "Cancel",
      reverseButtons: true,
      focusCancel: true,
      background: isDarkMode ? "#1e1e2d" : "#ffffff",
      color: isDarkMode ? "#f3f4f6" : "#1f2937",
      customClass: {
        popup: "swal-rounded-modal",
        confirmButton: "swal-confirm-btn",
        cancelButton: "swal-cancel-btn",
      },
    });

    if (!result.isConfirmed) return;

    try {
      await deleteAdminFile(filename);
      setSuccess(t("admin.success_delete"));
      updateNeedsSync(true);
      setFiles((prev) => prev.filter((f) => f.name !== filename));

      Swal.fire({
        title: i18n.language === "th" ? "ลบไฟล์สำเร็จ!" : "Deleted!",
        text: i18n.language === "th" ? `ลบไฟล์ ${filename} เรียบร้อยแล้ว` : `File ${filename} has been deleted.`,
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: isDarkMode ? "#1e1e2d" : "#ffffff",
        color: isDarkMode ? "#f3f4f6" : "#1f2937",
      });
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || "";
      setError((t("admin.error_delete")) + (errMsg ? `: ${errMsg}` : ""));

      Swal.fire({
        title: i18n.language === "th" ? "เกิดข้อผิดพลาด!" : "Error!",
        text: errMsg || t("admin.error_delete"),
        icon: "error",
        background: isDarkMode ? "#1e1e2d" : "#ffffff",
        color: isDarkMode ? "#f3f4f6" : "#1f2937",
      });
    }
  };

  // ─── Sync Knowledge Base ────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSuccess(null);
    setError(null);
    try {
      await syncKnowledge();
      setSuccess(t("admin.success_sync"));
      setLastSyncTime(new Date());
      updateNeedsSync(false);
    } catch (err) {
      setError(t("admin.error_sync"));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Language Toggle ────────────────────────────────────────
  const handleLanguageToggle = () => {
    const nextLang = i18n.language === "th" ? "en" : "th";
    i18n.changeLanguage(nextLang);
  };

  // ─── Context Menu Handlers ──────────────────────────────────
  const handleMenuOpen = (event, filename) => {
    setMenuAnchor(event.currentTarget);
    setActiveFile(filename);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setActiveFile(null);
  };

  const handleMenuDelete = () => {
    const filename = activeFile;
    handleMenuClose();
    handleDeleteFile(filename);
  };

  // ─── Sync time display ─────────────────────────────────────
  const syncTimeDisplay = useMemo(() => {
    if (!lastSyncTime) return t("admin.stat_never_synced");
    const diff = Math.floor((new Date() - lastSyncTime) / 1000);
    if (diff < 60) return t("admin.stat_just_now");
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastSyncTime.toLocaleTimeString();
  }, [lastSyncTime, t]);

  // ─── Color palette ─────────────────────────────────────────
  const colors = {
    navy: theme.palette.primary.main,
    gold: theme.palette.secondary.main,
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    pink: "#ec4899",
    orange: "#f59e0b",
    red: "#ef4444",
  };

  return (
    <Box
      sx={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        bgcolor: "background.default",
        pb: 6,
      }}
    >
      {/* ─── Syncing Progress Bar ───────────────────────────── */}
      <Fade in={syncing}>
        <LinearProgress
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            height: 3,
            "& .MuiLinearProgress-bar": {
              bgcolor: colors.gold,
            },
          }}
        />
      </Fade>

      {/* ─── Hero Header ────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: isDark ? "#0d1117" : colors.navy,
          color: "#fff",
          pt: 3,
          pb: 5,
        }}
      >
        <Container maxWidth="lg">
          {/* Breadcrumb */}
          <Breadcrumbs
            sx={{
              mb: 2,
              "& .MuiBreadcrumbs-separator": { color: alpha("#fff", 0.4) },
            }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={onBack}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: alpha("#fff", 0.7),
                textDecoration: "none",
                transition: "color 0.2s",
                "&:hover": { color: "#fff" },
              }}
            >
              <ArrowBackIcon fontSize="inherit" />
              {t("admin.back_chat")}
            </Link>
            <Typography
              variant="body2"
              sx={{ color: alpha("#fff", 0.9), display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <DashboardIcon fontSize="inherit" />
              {t("admin.dashboard_title")}
            </Typography>
          </Breadcrumbs>

          {/* Header Content */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <SchoolIcon sx={{ fontSize: 32, color: colors.gold }} />
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ color: "#ffffff" }}
                >
                  {t("admin.portal_title")}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.7), ml: 0.5 }}>
                {t("admin.dashboard_desc")}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Tooltip title={needsSync ? (i18n.language === "th" ? "ไฟล์มีการเปลี่ยนแปลง กรุณาซิงค์ข้อมูล" : "Files changed, please sync") : t("admin.sync_tooltip")}>
                <Button
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
                  onClick={handleSync}
                  disabled={syncing}
                  sx={{
                    bgcolor: needsSync ? colors.gold : alpha("#fff", 0.15),
                    color: needsSync ? "#000" : "#fff",
                    backdropFilter: "blur(10px)",
                    borderRadius: 3,
                    px: 2.5,
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: needsSync ? alpha(colors.gold, 0.6) : alpha("#fff", 0.2),
                    boxShadow: needsSync ? "0 0 16px rgba(251, 191, 36, 0.4)" : "none",
                    "&:hover": {
                      bgcolor: needsSync ? "#eab308" : alpha("#fff", 0.25),
                      borderColor: needsSync ? colors.gold : alpha("#fff", 0.35),
                    },
                    "&.Mui-disabled": {
                      color: alpha("#fff", 0.5),
                    },
                  }}
                >
                  {syncing 
                    ? t("admin.syncing") 
                    : needsSync 
                    ? (i18n.language === "th" ? "⚡ ซิงค์ข้อมูล (รอซิงค์)" : "⚡ Sync Knowledge (Pending)")
                    : t("admin.sync_button")}
                </Button>
              </Tooltip>

              <Tooltip title={t("admin.language_tooltip")}>
                <Button
                  variant="outlined"
                  startIcon={<LanguageIcon />}
                  onClick={handleLanguageToggle}
                  sx={{
                    color: "#fff",
                    borderColor: alpha("#fff", 0.3),
                    borderRadius: 3,
                    px: 2,
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: alpha("#fff", 0.6),
                      bgcolor: alpha("#fff", 0.08),
                    },
                  }}
                >
                  {t("admin.switch_language")}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* ─── Admin Tabs Navigation ─────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
            px: 2,
            py: 0.5,
          }}
        >
          <Tabs
            value={adminTab}
            onChange={(e, val) => setAdminTab(val)}
            indicatorColor="secondary"
            textColor="inherit"
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "0.95rem",
                textTransform: "none",
                minHeight: 48,
                borderRadius: 2,
                my: 0.5,
                transition: "all 0.2s",
                "&.Mui-selected": {
                  color: colors.navy,
                  bgcolor: alpha(colors.navy, isDark ? 0.2 : 0.06),
                },
              },
            }}
          >
            <Tab
              icon={<FolderIcon fontSize="small" />}
              iconPosition="start"
              label={t("admin.tab_knowledge")}
            />
            <Tab
              icon={<FeedbackIcon fontSize="small" />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>{t("admin.tab_feedback")}</span>
                  {feedbackStats.total > 0 && (
                    <Chip
                      label={feedbackStats.total}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: alpha(colors.purple, 0.15),
                        color: colors.purple,
                      }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Paper>

        {/* ─── Alert Messages ───────────────────────────────── */}
        {error && (
          <Fade in>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: alpha(colors.red, 0.2),
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Fade>
        )}
        {success && (
          <Fade in>
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: alpha(colors.green, 0.2),
              }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          </Fade>
        )}

        {/* ─── KNOWLEDGE BASE VIEW (adminTab === 0) ─────────── */}
        {adminTab === 0 && (
          <Fade in timeout={400}>
            <Box>
              {/* ─── Unsynced Changes Alert Banner ─────────────────── */}
              {needsSync && (
                <Grow in timeout={400}>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: 3,
                      p: 2,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: alpha(colors.gold, 0.4),
                      bgcolor: alpha(colors.gold, isDark ? 0.12 : 0.08),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                      boxShadow: "0 4px 15px rgba(251, 191, 36, 0.12)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(colors.gold, 0.2),
                          color: colors.gold,
                          fontSize: "1.4rem",
                          flexShrink: 0,
                        }}
                      >
                        ⚠️
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: isDark ? "#fef08a" : "#854d0e" }}>
                          {i18n.language === "th" ? "ไฟล์ข้อมูลมีการเปลี่ยนแปลง และยังไม่ได้ซิงค์เข้าฐานข้อมูล AI" : "Files modified — Sync Required!"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isDark ? "#fef9c3" : "#713f12" }}>
                          {i18n.language === "th"
                            ? "มีการเพิ่ม, แก้ไข หรือลบไฟล์ในคลังข้อมูล กรุณากดปุ่ม 'Sync Knowledge' เพื่อให้แชทบอทอัปเดตข้อมูลล่าสุด"
                            : "Files were added, modified or deleted. Click 'Sync Knowledge' so the chatbot can learn the latest data."}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                      onClick={handleSync}
                      disabled={syncing}
                      sx={{
                        bgcolor: colors.gold,
                        color: "#000",
                        fontWeight: 700,
                        borderRadius: 2.5,
                        px: 2.5,
                        py: 0.8,
                        boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
                        "&:hover": {
                          bgcolor: "#eab308",
                        },
                      }}
                    >
                      {syncing ? (i18n.language === "th" ? "กำลังซิงค์..." : "Syncing...") : (i18n.language === "th" ? "ซิงค์ข้อมูลตอนนี้" : "Sync Now")}
                    </Button>
                  </Paper>
                </Grow>
              )}

              {/* ─── Stats Cards ──────────────────────────────────── */}
              <Grid container spacing={2.5} sx={{ mb: 4 }} alignItems="stretch">
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<FolderIcon />}
                    label={t("admin.stat_total_files")}
                    value={files.length}
                    color={colors.blue}
                    delay={0}
                    subtitle={t("admin.file_count_label", { count: files.length })}
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<StorageIcon />}
                    label={t("admin.stat_total_size")}
                    value={totalSize}
                    color={colors.purple}
                    delay={100}
                    subtitle="RAG Database"
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<AccessTimeIcon />}
                    label={t("admin.stat_last_sync")}
                    value={syncTimeDisplay}
                    color={colors.gold}
                    delay={200}
                    subtitle="Vector Index"
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={needsSync ? <SyncIcon /> : <CheckCircleIcon />}
                    label={t("admin.stat_system_status")}
                    value={needsSync ? (i18n.language === "th" ? "รอซิงค์ข้อมูล" : "Pending Sync") : t("admin.stat_online")}
                    color={needsSync ? colors.gold : colors.green}
                    delay={300}
                    subtitle={needsSync ? (i18n.language === "th" ? "มีไฟล์รออัปเดต" : "Changes detected") : "Chatbot Active"}
                  />
                </Grid>
              </Grid>

              {/* ─── Main Content Grid ────────────────────────────── */}
              <Grid container spacing={3}>
          {/* ─── Upload Zone ────────────────────────────────── */}
          <Grid item xs={12} md={5}>
            <Fade in timeout={500}>
              <Paper
                elevation={0}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  p: 4,
                  height: "100%",
                  borderRadius: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed",
                  borderColor: isDragOver
                    ? "primary.main"
                    : isDark
                    ? alpha("#fff", 0.12)
                    : alpha(colors.navy, 0.15),
                  bgcolor: isDragOver
                    ? alpha(colors.navy, isDark ? 0.15 : 0.04)
                    : isDark
                    ? alpha("#fff", 0.02)
                    : alpha(colors.navy, 0.01),
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: isDark ? alpha(colors.navy, 0.08) : alpha(colors.navy, 0.03),
                    transform: "scale(1.01)",
                  },
                  minHeight: 360,
                }}
              >
                {/* Upload Icon with animated ring */}
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: isDark ? alpha(colors.navy, 0.25) : alpha(colors.navy, 0.08),
                    mb: 2.5,
                    position: "relative",
                    transition: "transform 0.3s",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: "2px dashed",
                      borderColor: alpha(colors.navy, isDark ? 0.3 : 0.15),
                      animation: isDragOver ? "spin 4s linear infinite" : "none",
                    },
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                >
                  <CloudUploadIcon
                    sx={{
                      fontSize: 38,
                      color: isDragOver ? "primary.main" : isDark ? alpha("#fff", 0.5) : alpha(colors.navy, 0.5),
                      transition: "all 0.3s",
                      transform: isDragOver ? "translateY(-4px)" : "none",
                    }}
                  />
                </Box>

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ textAlign: "center" }}>
                  {isDragOver ? t("admin.drag_drop_active") : t("admin.upload_title")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ mb: 2.5, maxWidth: 280, lineHeight: 1.6 }}
                >
                  {t("admin.drag_drop_text")}
                </Typography>

                {/* Upload Button */}
                <input
                  accept=".json,.pdf,.txt,.md,.docx,.xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  id="upload-button"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading || isConverting}
                />
                <label htmlFor="upload-button">
                  <Button
                    variant="contained"
                    component="span"
                    disabled={uploading || isConverting}
                    startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.2,
                      fontWeight: 600,
                      bgcolor: colors.navy,
                      "&:hover": {
                        bgcolor: "#000051",
                      },
                    }}
                  >
                    {uploading ? t("admin.uploading") : t("admin.select_file_all")}
                  </Button>
                </label>

                {/* Supported Formats */}
                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.disabled",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: "0.6rem",
                      mb: 1,
                      display: "block",
                    }}
                  >
                    {t("admin.supported_formats")}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                    <FormatBadge label="JSON" color={colors.green} />
                    <FormatBadge label="PDF" color={colors.red} />
                    <FormatBadge label="DOCX" color={colors.blue} />
                    <FormatBadge label="XLSX" color={colors.green} />
                    <FormatBadge label="CSV" color={colors.orange} />
                    <FormatBadge label="TXT" color={colors.purple} />
                    <FormatBadge label="MD" color={colors.pink} />
                  </Box>
                </Box>
              </Paper>
            </Fade>
          </Grid>

          {/* ─── File Manager ──────────────────────────────── */}
          <Grid item xs={12} md={7}>
            <Fade in timeout={700}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  overflow: "hidden",
                  height: "100%",
                  border: "1px solid",
                  borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* File Manager Header */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    bgcolor: isDark ? alpha(colors.navy, 0.4) : colors.navy,
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <FolderIcon sx={{ fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      {t("admin.files_title")}
                    </Typography>
                    <Chip
                      label={files.length}
                      size="small"
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha("#fff", 0.2),
                        color: "#fff",
                        borderRadius: 1.5,
                      }}
                    />
                  </Box>
                  <Tooltip title="Refresh">
                    <IconButton
                      size="small"
                      onClick={loadFiles}
                      sx={{
                        color: alpha("#fff", 0.7),
                        "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Search Bar */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t("admin.search_files")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 20, color: "text.disabled" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.5,
                        bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                        "& fieldset": {
                          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                        },
                        "&:hover fieldset": {
                          borderColor: "primary.main",
                        },
                      },
                    }}
                  />
                </Box>

                {/* File List */}
                <List sx={{ p: 0, flexGrow: 1, maxHeight: 380, overflowY: "auto" }}>
                  {loading ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                      <CircularProgress size={32} thickness={4} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading files...
                      </Typography>
                    </Box>
                  ) : filteredFiles.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                      <CloudDoneIcon
                        sx={{ fontSize: 48, color: "text.disabled", mb: 1.5, opacity: 0.5 }}
                      />
                      <Typography color="text.disabled" fontWeight={500}>
                        {searchQuery ? "No files match your search" : t("admin.no_files")}
                      </Typography>
                    </Box>
                  ) : (
                    filteredFiles.map((file, index) => (
                      <React.Fragment key={file.name}>
                        <ListItem
                          sx={{
                            py: 1.5,
                            px: 2.5,
                            transition: "all 0.2s",
                            "&:hover": {
                              bgcolor: isDark ? alpha("#fff", 0.03) : alpha(colors.navy, 0.02),
                            },
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={(e) => handleMenuOpen(e, file.name)}
                              sx={{
                                color: "text.secondary",
                                "&:hover": { color: "error.main" },
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 42 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: alpha(colors.blue, 0.08),
                                color: colors.blue,
                              }}
                            >
                              <FileIcon sx={{ fontSize: 18 }} />
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={file.name}
                            secondary={`${(file.size / 1024).toFixed(2)} KB • ${new Date(file.mtime).toLocaleDateString()}`}
                            primaryTypographyProps={{
                              variant: "body2",
                              fontWeight: 600,
                              sx: {
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              },
                            }}
                            secondaryTypographyProps={{
                              variant: "caption",
                              sx: { color: "text.disabled" },
                            }}
                          />
                        </ListItem>
                        {index < filteredFiles.length - 1 && (
                          <Divider sx={{ mx: 2, opacity: 0.5 }} />
                        )}
                      </React.Fragment>
                    ))
                  )}
                </List>

                {/* Context Menu */}
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                  PaperProps={{
                    sx: {
                      mt: 0.5,
                      borderRadius: 3,
                      minWidth: 140,
                      boxShadow: "0px 8px 30px rgba(0,0,0,0.12)",
                      border: "1px solid",
                      borderColor: "divider",
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleMenuDelete}
                    sx={{
                      color: "error.main",
                      gap: 1.5,
                      py: 1.2,
                      borderRadius: 1.5,
                      mx: 0.5,
                      "&:hover": {
                        bgcolor: alpha(colors.red, 0.08),
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      {t("admin.delete_button")}
                    </Typography>
                  </MenuItem>
                </Menu>
              </Paper>
            </Fade>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  )}

        {/* ─── FEEDBACK VIEW (adminTab === 1) ────────────────── */}
        {adminTab === 1 && (
          <Fade in timeout={400}>
            <Box>
              {/* Feedback Stats */}
              <Grid container spacing={2.5} sx={{ mb: 4 }} alignItems="stretch">
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<FeedbackIcon />}
                    label={t("feedback.total")}
                    value={feedbackStats.total}
                    color={colors.purple}
                    delay={0}
                    subtitle="User Responses"
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<ThumbUpIcon />}
                    label={t("feedback.helpful")}
                    value={feedbackStats.totalUp}
                    color={colors.green}
                    delay={100}
                    subtitle="Thumbs Up 👍"
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<ThumbDownIcon />}
                    label={t("feedback.not_helpful")}
                    value={feedbackStats.totalDown}
                    color={colors.red}
                    delay={200}
                    subtitle="Thumbs Down 👎"
                  />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: "flex" }}>
                  <StatCard
                    icon={<HappyIcon />}
                    label={t("feedback.satisfaction_rate")}
                    value={`${feedbackStats.satisfactionRate}%`}
                    color={feedbackStats.satisfactionRate >= 70 ? colors.green : colors.orange}
                    delay={300}
                    subtitle="Positive Rating"
                  />
                </Grid>
              </Grid>

              {/* Feedback List Paper */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                  bgcolor: "background.paper",
                }}
              >
                {/* Header & Filter Bar */}
                <Box
                  sx={{
                    p: 2.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <FeedbackIcon sx={{ color: colors.navy }} />
                    <Typography variant="h6" fontWeight={700}>
                      {t("feedback.recent_title")}
                    </Typography>
                    <Chip
                      label={feedbackTotal}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(colors.navy, 0.1),
                        color: colors.navy,
                      }}
                    />
                  </Box>

                  {/* Filter Chips */}
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip
                      label={t("feedback.filter_all")}
                      variant={feedbackVoteFilter === "all" ? "filled" : "outlined"}
                      color={feedbackVoteFilter === "all" ? "primary" : "default"}
                      onClick={() => {
                        setFeedbackVoteFilter("all");
                        setFeedbackPage(1);
                      }}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      icon={<ThumbUpIcon fontSize="small" />}
                      label={`👍 ${feedbackStats.totalUp}`}
                      variant={feedbackVoteFilter === "up" ? "filled" : "outlined"}
                      color={feedbackVoteFilter === "up" ? "success" : "default"}
                      onClick={() => {
                        setFeedbackVoteFilter("up");
                        setFeedbackPage(1);
                      }}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      icon={<ThumbDownIcon fontSize="small" />}
                      label={`👎 ${feedbackStats.totalDown}`}
                      variant={feedbackVoteFilter === "down" ? "filled" : "outlined"}
                      color={feedbackVoteFilter === "down" ? "error" : "default"}
                      onClick={() => {
                        setFeedbackVoteFilter("down");
                        setFeedbackPage(1);
                      }}
                      sx={{ fontWeight: 600 }}
                    />
                    <IconButton size="small" onClick={() => loadFeedbacksList(feedbackPage, feedbackVoteFilter)}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Feedbacks Cards List */}
                <Box sx={{ p: 2.5 }}>
                  {feedbackLoading ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                      <CircularProgress size={32} thickness={4} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading feedback...
                      </Typography>
                    </Box>
                  ) : feedbacks.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                      <CheckCircleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5, opacity: 0.5 }} />
                      <Typography color="text.disabled" fontWeight={500}>
                        {t("feedback.no_data")}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {feedbacks.map((fb) => (
                        <Card
                          key={fb._id}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                            transition: "all 0.2s",
                            "&:hover": {
                              borderColor: fb.vote === "up" ? alpha(colors.green, 0.4) : alpha(colors.red, 0.4),
                              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Chip
                                  icon={fb.vote === "up" ? <ThumbUpIcon fontSize="small" /> : <ThumbDownIcon fontSize="small" />}
                                  label={fb.vote === "up" ? "Helpful" : "Needs Improvement"}
                                  size="small"
                                  color={fb.vote === "up" ? "success" : "error"}
                                  sx={{ fontWeight: 700 }}
                                />
                                <Chip
                                  icon={<PersonIcon fontSize="small" />}
                                  label={fb.userId?.displayName || fb.userId?.email || t("feedback.guest")}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(fb.createdAt).toLocaleString("th-TH")}
                                </Typography>
                              </Box>

                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setFeedbackToDelete(fb);
                                  setDeleteFeedbackDialogOpen(true);
                                }}
                                sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* Question */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", textTransform: "uppercase", fontSize: "0.7rem" }}>
                                {t("feedback.question")}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mt: 0.2 }}>
                                {fb.question}
                              </Typography>
                            </Box>

                            {/* Answer */}
                            <Box sx={{ mb: fb.comment ? 1.5 : 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem" }}>
                                {t("feedback.answer")}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.2,
                                  maxHeight: 120,
                                  overflowY: "auto",
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                                  fontSize: "0.85rem",
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {fb.answer}
                              </Typography>
                            </Box>

                            {/* Comment */}
                            {fb.comment && (
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: isDark ? alpha(colors.red, 0.1) : alpha(colors.red, 0.05),
                                  borderLeft: "4px solid",
                                  borderLeftColor: colors.red,
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main", display: "block" }}>
                                  💬 {t("feedback.comment")}:
                                </Typography>
                                <Typography variant="body2" sx={{ color: "text.primary", mt: 0.2 }}>
                                  {fb.comment}
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}

                  {/* Pagination */}
                  {feedbackTotalPages > 1 && (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 3, mb: 1 }}>
                      <Pagination
                        count={feedbackTotalPages}
                        page={feedbackPage}
                        onChange={(e, val) => setFeedbackPage(val)}
                        color="primary"
                        shape="rounded"
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          </Fade>
        )}
      </Container>

      {/* ─── Delete Feedback Confirmation Dialog ─────────────── */}
      <Dialog
        open={deleteFeedbackDialogOpen}
        onClose={() => setDeleteFeedbackDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("feedback.delete_confirm")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {feedbackToDelete ? `"${feedbackToDelete.question}"` : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteFeedbackDialogOpen(false)} color="inherit" sx={{ borderRadius: 2 }}>
            {t("admin.cancel")}
          </Button>
          <Button onClick={handleDeleteFeedback} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            {t("admin.delete_button")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── PDF to JSON Converter Dialog ──────────────────── */}
      <Dialog
        open={showConverter}
        onClose={isConverting ? undefined : handleCancelConverter}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${alpha(colors.navy, 0.1)}, ${alpha(colors.blue, 0.08)})`,
                color: colors.navy,
              }}
            >
              <FileIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="primary">
                {t("admin.converter_title")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("admin.converter_subtitle")}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {isConverting ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 8,
                gap: 2,
              }}
            >
              <CircularProgress size={50} thickness={4} />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                {t("admin.converting_pdf")}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label={t("admin.output_filename")}
                variant="outlined"
                fullWidth
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                size="small"
                required
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2.5 },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, fontWeight: 600 }}
              >
                JSON Content Preview & Edit:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={15}
                value={jsonString}
                onChange={(e) => setJsonString(e.target.value)}
                variant="outlined"
                placeholder="[ ... ]"
                sx={{
                  fontFamily: "monospace",
                  "& .MuiInputBase-input": {
                    fontFamily: "Courier New, monospace",
                    fontSize: "0.85rem",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCancelConverter}
            color="inherit"
            disabled={uploading || isConverting}
            sx={{ borderRadius: 2.5, px: 3 }}
          >
            {t("admin.cancel")}
          </Button>
          <Button
            onClick={handleSaveConverted}
            variant="contained"
            color="primary"
            disabled={uploading || isConverting || !jsonString || !outputFilename}
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudDoneIcon />}
            sx={{
              borderRadius: 2.5,
              px: 3,
              fontWeight: 600,
              bgcolor: colors.navy,
              "&:hover": {
                bgcolor: "#000051",
              },
            }}
          >
            {t("admin.save_and_sync")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
