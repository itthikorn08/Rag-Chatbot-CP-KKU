import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  AppBar,
  Toolbar,
  Container,
  Fade,
  Chip,
  Tooltip,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Avatar,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import MoreVertIcon from "@mui/icons-material/MoreVertRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SyncIcon from "@mui/icons-material/SyncRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import ChatBubble from "./ChatBubble";
import { askQuestion, getChatHistory, getChatSessions, deleteChatSession } from "../api/chatApi";
import { useThemeContext } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";


const ChatPage = ({ onExitGuest, isGuest, isAdmin, onGoAdmin, onGoProfile }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(
    () => localStorage.getItem("currentSessionId") || uuidv4()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionMenuAnchor, setSessionMenuAnchor] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("sidebarExpanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const handleProfileMenuOpen = (event) => {
    event.stopPropagation();
    setProfileMenuAnchor(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };
  // const [syncing, setSyncing] = useState(false); // Moved to AdminPage

  const messagesEndRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { user, logout, savedAccounts, switchAccount, prepareAddAccount, logoutAll } = useAuth();
  const { mode, toggleTheme } = useThemeContext();


  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, [user]);

  const startNewChat = () => {
    console.log("Starting new chat...");
    const newId = uuidv4();
    setCurrentSessionId(newId);
    setMessages([]);
    localStorage.setItem("currentSessionId", newId);
    if (!isGuest) loadSessions();
    setDrawerOpen(false);
  };

  const switchSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem("currentSessionId", sessionId);
    setLoading(true);
    setMessages([]);
    try {
      const history = await getChatHistory(sessionId);
      const loaded = [];
      history.forEach((chat) => {
        const ts = new Date(chat.timestamp).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        loaded.push({ text: chat.question, sender: "user", timestamp: ts });
        loaded.push({ text: chat.answer, sender: "bot", timestamp: ts });
      });
      setMessages(loaded);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
      setDrawerOpen(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("currentSessionId", currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    if (user) {
      loadSessions();
      const initLoad = async () => {
        setLoading(true);
        try {
          const history = await getChatHistory(currentSessionId);
          if (history && history.length > 0) {
            const loaded = [];
            history.forEach((chat) => {
              const ts = new Date(chat.timestamp).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              });
              loaded.push({ text: chat.question, sender: "user", timestamp: ts });
              loaded.push({ text: chat.answer, sender: "bot", timestamp: ts });
            });
            setMessages(loaded);
          }
        } catch (e) { } finally { setLoading(false); }
      }
      initLoad();
    }
  }, [user, currentSessionId, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getTimestamp = () =>
    new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg = { text: question, sender: "user", timestamp: getTimestamp() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askQuestion(question, currentSessionId);
      const botMsg = { text: answer, sender: "bot", timestamp: getTimestamp() };
      setMessages((prev) => [...prev, botMsg]);
      if (!isGuest) loadSessions();
    } catch (error) {
      const errMsg = {
        text: t("chat.error_connection"),
        sender: "bot",
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = () => {
    if (isGuest) {
      onExitGuest();
    } else {
      logout();
    }
    setMessages([]);
    localStorage.removeItem("currentSessionId");
  };

  const suggestions = [
    t("suggestions.criteria"),
    t("suggestions.documents"),
    t("suggestions.schedule"),
  ];

  const handleSessionMenuOpen = (event, sessionId) => {
    event.stopPropagation();
    setSessionMenuAnchor(event.currentTarget);
    setActiveSessionId(sessionId);
  };

  const handleSessionMenuClose = () => {
    setSessionMenuAnchor(null);
    setActiveSessionId(null);
  };

  const handleSessionMenuDelete = () => {
    const sessionId = activeSessionId;
    handleSessionMenuClose();
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    console.log("Confirming delete for session:", sessionToDelete);
    try {
      await deleteChatSession(sessionToDelete);
      if (sessionToDelete === currentSessionId) {
        startNewChat();
      } else {
        loadSessions();
      }
      setDrawerOpen(false);
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert(t("chat.error_delete") || "ไม่สามารถลบเซสชันได้ กรุณาลองใหม่");
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  /* Sync logic moved to AdminPage */

  // Speech Recognition logic
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(t("chat.voice_unsupported"));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = i18n.language === "th" ? "th-TH" : "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          alert(i18n.language === "th" 
            ? "กรุณาอนุญาตสิทธิ์การเข้าถึงไมโครโฟนบนเบราว์เซอร์ของคุณเพื่อใช้งานพิมพ์ด้วยเสียงนะคะ 😊" 
            : "Please allow microphone access in your browser to use voice typing. 😊"
          );
        } else if (event.error === "network") {
          alert(i18n.language === "th"
            ? "การเชื่อมต่อเครือข่ายขัดข้อง ไม่สามารถใช้ระบบพิมพ์ด้วยเสียงได้ชั่วคราวค่ะ"
            : "Network error. Speech recognition is temporarily unavailable."
          );
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          alert(i18n.language === "th"
            ? `เกิดข้อผิดพลาด: ${event.error}`
            : `Error occurred: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const displayName = user ? user.displayName : t("chat.guest_name");

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1 && parts[0] && parts[1]) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.trim().charAt(0).toUpperCase();
  };


  const renderSidebarContent = (isMini) => {
    if (isMini) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "100%",
            py: 2,
            px: 1,
            justifyContent: "space-between",
            bgcolor: "#0e0e11",
            color: "#fff",
          }}
        >
          {/* Top section */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: "100%" }}>
            {/* School Logo */}
            <Tooltip title={t("chat.app_title") || "CP KKU Admission Chatbot"} placement="right">
              <IconButton
                onClick={() => setSidebarExpanded(true)}
                sx={{
                  width: 44,
                  height: 44,
                  color: "secondary.main",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)" },
                }}
              >
                <SchoolRoundedIcon sx={{ fontSize: 26 }} />
              </IconButton>
            </Tooltip>

            {/* New Chat circular button */}
            <Tooltip title={t("chat.new_chat")} placement="right">
              <IconButton
                onClick={startNewChat}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                }}
              >
                <AddRoundedIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Tooltip>

            {/* Grid/History Toggle Icon */}
            <Tooltip title={t("chat.history")} placement="right">
              <IconButton
                onClick={() => setSidebarExpanded(true)}
                sx={{
                  width: 44,
                  height: 44,
                  color: "rgba(255, 255, 255, 0.7)",
                  "&:hover": { color: "#fff", bgcolor: "rgba(255, 255, 255, 0.08)" },
                }}
              >
                <GridViewRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Bottom section */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5, width: "100%" }}>

            {/* User Avatar */}
            <Tooltip title={displayName} placement="right">
              <Box onClick={handleProfileMenuOpen} sx={{ cursor: "pointer" }}>
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    border: "2px solid rgba(255, 255, 255, 0.15)",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "scale(1.05)",
                      borderColor: "primary.light",
                    },
                  }}
                >
                  {getInitials(displayName)}
                </Avatar>
              </Box>
            </Tooltip>
          </Box>
        </Box>
      );
    }

    // Expanded view
    return (
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: "#0e0e11",
          color: "#fff",
        }}
      >
        {/* Header containing school logo and hamburger collapse button */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <SchoolRoundedIcon sx={{ fontSize: 28, color: "secondary.main" }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#fff", lineHeight: 1.1 }}>
                CP KKU
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem", display: "block" }}>
                Admission Chatbot
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setSidebarExpanded(false)}
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              "&:hover": { color: "#fff", bgcolor: "rgba(255, 255, 255, 0.08)" },
              display: { xs: "none", md: "inline-flex" }, // only show toggle on desktop
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>

        {/* New Chat Button (Pill layout) */}
        <Button
          variant="outlined"
          fullWidth
          startIcon={<AddRoundedIcon />}
          onClick={startNewChat}
          sx={{
            mb: 2,
            py: 1.2,
            borderRadius: 6,
            textTransform: "none",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#fff",
            borderColor: "rgba(255, 255, 255, 0.2)",
            bgcolor: "rgba(255, 255, 255, 0.03)",
            "&:hover": {
              borderColor: "#fff",
              bgcolor: "rgba(255, 255, 255, 0.08)",
            },
          }}
        >
          {t("chat.new_chat")}
        </Button>

        {/* Admin Dashboard Go Button if Admin */}
        {isAdmin && (
          <Button
            variant="text"
            fullWidth
            startIcon={<SyncIcon />}
            onClick={onGoAdmin}
            sx={{
              mb: 2,
              py: 1,
              borderRadius: 6,
              textTransform: "none",
              fontSize: "0.875rem",
              color: "primary.light",
              border: "1px solid rgba(66, 133, 244, 0.3)",
              bgcolor: "rgba(66, 133, 244, 0.08)",
              "&:hover": { bgcolor: "primary.main", color: "white" },
            }}
          >
            {t("admin.go_dashboard")}
          </Button>
        )}



        <Typography variant="overline" color="text.secondary" sx={{ ml: 1, mb: 1, color: "rgba(255, 255, 255, 0.4)" }}>
          {t("chat.history")}
        </Typography>

        {/* Sessions list */}
        <List
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 0,
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
            },
          }}
        >
          {sessions.map((session) => (
            <ListItem
              key={session._id}
              disablePadding
              sx={{ mb: 0.5 }}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => handleSessionMenuOpen(e, session._id)}
                  sx={{ color: "rgba(255, 255, 255, 0.4)", "&:hover": { color: "#fff" } }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={currentSessionId === session._id}
                onClick={() => switchSession(session._id)}
                sx={{
                  borderRadius: 3,
                  mx: 0.5,
                  pr: 7,
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-selected": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    "& .MuiListItemIcon-root": { color: "#fff" },
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
                  },
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    color: "#fff",
                    "& .MuiListItemIcon-root": { color: "#fff" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                  <ChatBubbleOutlineRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={session.title === "New Chat" ? t("chat.new_chat") : session.title}
                  primaryTypographyProps={{
                    variant: "body2",
                    noWrap: true,
                    fontWeight: currentSessionId === session._id ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {sessions.length === 0 && (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", textAlign: "center", mt: 4 }}>
              {t("chat.no_history")}
            </Typography>
          )}
        </List>

        <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }} />

        {/* Profile and Settings card at the bottom */}
        <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
          <Tooltip title={!isGuest ? t("profile.edit_profile") || "แก้ไขโปรไฟล์" : ""}>
            <Box
              onClick={!isGuest && user ? handleProfileMenuOpen : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: !isGuest ? "pointer" : "default",
                p: 1,
                borderRadius: 3,
                transition: "background-color 0.2s",
                minWidth: 0,
                flex: 1,
                color: "#fff",
                "&:hover": {
                  bgcolor: !isGuest ? "rgba(255, 255, 255, 0.08)" : "transparent",
                },
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {getInitials(displayName)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "rgba(255, 255, 255, 0.5)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {isGuest ? t("chat.guest_name") : user?.role === "admin" ? "Admin" : "User"}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.5)",
                  ml: "auto",
                  pr: 0.5,
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                }}
              >
                &gt;
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      {/* ─── Persistent Desktop Sidebar ───────────────── */}
      {!isGuest && (
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            width: sidebarExpanded ? 280 : 68,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            flexDirection: "column",
            height: "100%",
            bgcolor: "#0e0e11",
            borderRight: "1px solid",
            borderColor: "rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {renderSidebarContent(!sidebarExpanded)}
        </Box>
      )}

      {/* ─── Mobile Drawer Sidebar ────────────────────── */}
      {!isGuest && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: 280,
              bgcolor: "#0e0e11",
              borderRight: "1px solid",
              borderColor: "rgba(255, 255, 255, 0.1)",
              boxSizing: "border-box",
            },
          }}
        >
          {renderSidebarContent(false)}
        </Drawer>
      )}

      {/* ─── Main Content ─────────────────────────────── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #0d1642 100%)",
            borderBottom: "3px solid",
            borderColor: "secondary.main",
          }}
        >
          <Toolbar sx={{ gap: 1.5, py: 1 }}>
            {!isGuest && (
              <IconButton
                color="inherit"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  mr: 0.5,
                  display: { xs: "inline-flex", md: "none" },
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
            )}
            <SchoolRoundedIcon
              sx={{
                fontSize: 32,
                color: "secondary.main",
                display: { xs: "inline-flex", md: "none" },
              }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.2, letterSpacing: 0.5 }}>
                {t("chat.app_title")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 300 }}>
                {t("chat.app_subtitle")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

              {/* Language Toggle - labeled button */}
              <Button
                color="inherit"
                onClick={() => i18n.changeLanguage(i18n.language === "th" ? "en" : "th")}
                startIcon={<LanguageRoundedIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 3,
                  px: 1.5,
                  py: 0.6,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                {i18n.language === "th" ? "ไทย / EN" : "TH / English"}
              </Button>

              {/* Guest Exit Button */}
              {isGuest && (
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  startIcon={<LogoutRoundedIcon />}
                  onClick={handleLogout}
                  sx={{ textTransform: "none", borderRadius: 3, borderColor: "rgba(255,255,255,0.4)" }}
                >
                  {t("login.title")}
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {isGuest && (
          <Box
            sx={{
              bgcolor: "rgba(200, 164, 21, 0.1)",
              borderBottom: "1px solid rgba(200, 164, 21, 0.3)",
              py: 0.8,
              px: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("chat.guest_warning")}
            </Typography>
            <Button size="small" variant="text" onClick={onExitGuest} sx={{ textTransform: "none", fontSize: "0.75rem" }}>
              {t("login.title")}
            </Button>
          </Box>
        )}

        {/* ─── Messages Area ──────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            py: 3,
            px: { xs: 1, md: 0 },
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: mode === "light" ? "rgba(26, 35, 126, 0.2)" : "rgba(255, 255, 255, 0.1)",
              borderRadius: 3,
            },
          }}
        >
          <Container maxWidth="md">
            {messages.length === 0 && (
              <Fade in timeout={600}>
                <Box sx={{ textAlign: "center", mt: 8, mb: 4 }}>
                  <SchoolRoundedIcon sx={{ fontSize: 64, color: "primary.main", opacity: 0.3, mb: 2 }} />
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                    {user ? `${t("common.hello")} ${user.displayName}!` : `${t("common.hello")}!`}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, opacity: 0.7 }}>
                    {t("chat.welcome")}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
                    {suggestions.map((text, idx) => (
                      <Chip
                        key={idx}
                        label={text}
                        variant="outlined"
                        clickable
                        onClick={() => setInput(text)}
                        sx={{
                          borderColor: "primary.light",
                          color: "primary.main",
                          "&:hover": { bgcolor: "primary.main", color: "#fff" },
                        }}
                      />
                    ))}
                  </Box>
                  {isGuest && (
                    <Button
                      startIcon={<AddRoundedIcon />}
                      onClick={() => setMessages([])}
                      sx={{ mt: 4, textTransform: "none" }}
                    >
                      {t("chat.new_topic")}
                    </Button>
                  )}
                </Box>
              </Fade>
            )}

            {messages.map((msg, idx) => (
              <Fade in key={idx} timeout={300}>
                <Box>
                  <ChatBubble text={msg.text} sender={msg.sender} timestamp={msg.timestamp} />
                </Box>
              </Fade>
            ))}

            {loading && (
              <Fade in timeout={200}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, mb: 2 }}>
                  <CircularProgress size={20} sx={{ color: "primary.main" }} />
                  <Typography variant="body2" color="text.secondary">{t("chat.searching")}</Typography>
                </Box>
              </Fade>
            )}
            <div ref={messagesEndRef} />
          </Container>
        </Box>

        {/* ─── Input Bar ──────────────────────────────────── */}
        <Paper elevation={8} sx={{ borderRadius: 0, borderTop: "1px solid rgba(0,0,0,0.08)", bgcolor: "background.paper" }}>
          <Container maxWidth="md">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={t("chat.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                variant="outlined"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              <Tooltip title={isListening ? t("chat.stop_listening") : t("chat.start_listening")}>
                <IconButton
                  onClick={toggleListening}
                  disabled={loading}
                  sx={{
                    bgcolor: isListening ? "error.main" : "action.hover",
                    color: isListening ? "#fff" : "text.secondary",
                    "&:hover": {
                      bgcolor: isListening ? "error.dark" : "action.selected",
                    },
                    animation: isListening ? "pulse 1.5s infinite" : "none",
                    "@keyframes pulse": {
                      "0%": {
                        boxShadow: "0 0 0 0 rgba(211, 47, 47, 0.5)",
                      },
                      "70%": {
                        boxShadow: "0 0 0 10px rgba(211, 47, 47, 0)",
                      },
                      "100%": {
                        boxShadow: "0 0 0 0 rgba(211, 47, 47, 0)",
                      },
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  <MicRoundedIcon />
                </IconButton>
              </Tooltip>
              <IconButton onClick={handleSend} disabled={!input.trim() || loading} sx={{ bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } }}>
                <SendRoundedIcon />
              </IconButton>
            </Box>
          </Container>
        </Paper>
      </Box>

      {/* ─── Delete Confirmation Dialog ───────────────── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 600 }}>
          {t("chat.delete_confirm_title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t("chat.delete_confirm_desc")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1, pb: 2, px: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="text"
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            {t("chat.cancel")}
          </Button>
          <Button
            onClick={confirmDeleteSession}
            variant="contained"
            color="error"
            autoFocus
            sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
          >
            {t("chat.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Session Context Menu ───────────────── */}
      <Menu
        anchorEl={sessionMenuAnchor}
        open={Boolean(sessionMenuAnchor)}
        onClose={handleSessionMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            borderRadius: 2,
            minWidth: 120,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.12)"
          }
        }}
      >
        <MenuItem 
          onClick={handleSessionMenuDelete}
          sx={{ color: "error.main", gap: 1.5, py: 1 }}
        >
          <DeleteIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            {t("admin.delete_button")}
          </Typography>
        </MenuItem>
      </Menu>

      {/* ─── User Profile Menu (Dropdown Switcher) ───────── */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        PaperProps={{
          sx: {
            mb: 1.5,
            borderRadius: 4,
            width: 320,
            boxShadow: "0px 8px 30px rgba(0,0,0,0.15)",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            p: 1
          }
        }}
      >
        <Box sx={{ position: "relative", px: 2, pt: 1, pb: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Close button */}
          <IconButton 
            size="small" 
            onClick={handleProfileMenuClose} 
            sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Active User Email */}
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 2 }}>
            {user?.email}
          </Typography>

          {/* Large Active Avatar with custom border */}
          <Box sx={{ position: "relative", mb: 2 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontSize: "1.8rem",
                fontWeight: 700,
                border: "3px solid",
                borderColor: "secondary.main",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
            >
              {getInitials(displayName)}
            </Avatar>
          </Box>

          {/* Greeting */}
          <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600, mb: 2, textAlign: "center" }}>
            {i18n.language === "th" ? `สวัสดี คุณ ${displayName}` : `Hello, ${displayName}`}
          </Typography>

          {/* Manage Account Button */}
          <Button
            variant="outlined"
            onClick={() => {
              handleProfileMenuClose();
              onGoProfile("details");
            }}
            sx={{
              borderRadius: 5,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 0.8,
              fontSize: "0.875rem",
              borderColor: "divider",
              color: "text.primary",
              "&:hover": {
                bgcolor: "action.hover",
                borderColor: "text.secondary"
              }
            }}
          >
            {t("profile.tab_details") || "จัดการข้อมูลส่วนตัว"}
          </Button>
        </Box>

        {/* Other Accounts Switching & Add Account Section */}
        {(() => {
          const otherAccounts = savedAccounts.filter(a => a.email !== user?.email);
          return (
            <Box sx={{ bgcolor: "action.hover", borderRadius: 3, mx: 1, mb: 1.5, p: 0.5, border: "1px solid", borderColor: "divider" }}>
              {otherAccounts.length > 0 && (
                <List sx={{ p: 0 }}>
                  {otherAccounts.map((account) => (
                    <ListItem key={account.email} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          handleProfileMenuClose();
                          switchAccount(account.token);
                        }}
                        sx={{ borderRadius: 2, py: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: "0.85rem", fontWeight: 600 }}>
                            {getInitials(account.displayName)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={account.displayName}
                          secondary={account.email}
                          primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                          secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                        />
                        {account.role === "admin" && (
                          <Chip label="Admin" size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem", color: "primary.main", borderColor: "primary.light" }} />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
              
              {/* Add Another Account Option */}
              <List sx={{ p: 0 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleProfileMenuClose();
                      prepareAddAccount();
                    }}
                    sx={{ borderRadius: 2, py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 44, justifyContent: "center" }}>
                      <AddRoundedIcon sx={{ color: "text.secondary" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={i18n.language === "th" ? "เพิ่มบัญชีอื่น" : "Add another account"}
                      primaryTypographyProps={{ variant: "body2", fontWeight: 500, color: "text.secondary" }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          );
        })()}

        <Box sx={{ px: 1, pb: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>

          {/* Theme Mode Toggle */}
          <MenuItem
            onClick={toggleTheme}
            sx={{ gap: 1.5, py: 1.2, borderRadius: 2 }}
          >
            {mode === "light" ? <DarkModeRoundedIcon fontSize="small" color="action" /> : mode === "dark" ? <SettingsBrightnessRoundedIcon fontSize="small" color="action" /> : <LightModeRoundedIcon fontSize="small" color="action" />}
            <Typography variant="body2" sx={{ flex: 1 }}>
              {mode === "light"
                ? (i18n.language === "th" ? "เปลี่ยนเป็นโหมดมืด" : "Switch to Dark Mode")
                : mode === "dark"
                ? (i18n.language === "th" ? "เปลี่ยนเป็นโหมดระบบ" : "Switch to System Mode")
                : (i18n.language === "th" ? "เปลี่ยนเป็นโหมดสว่าง" : "Switch to Light Mode")}
            </Typography>
            <Chip
              label={mode === "light" ? (i18n.language === "th" ? "สว่าง" : "Light") : mode === "dark" ? (i18n.language === "th" ? "มืด" : "Dark") : (i18n.language === "th" ? "ระบบ" : "System")}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.65rem", pointerEvents: "none" }}
            />
          </MenuItem>

          {/* Change Password link */}
          <MenuItem 
            onClick={() => {
              handleProfileMenuClose();
              onGoProfile("password");
            }}
            sx={{ gap: 1.5, py: 1.2, borderRadius: 2 }}
          >
            <LockRoundedIcon fontSize="small" color="action" />
            <Typography variant="body2">{t("profile.tab_password") || "เปลี่ยนรหัสผ่าน"}</Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          {/* Logout of all accounts button */}
          <MenuItem 
            onClick={() => {
              handleProfileMenuClose();
              logoutAll();
            }}
            sx={{ 
              color: "error.main", 
              gap: 1.5, 
              py: 1.2, 
              borderRadius: 2,
              justifyContent: "center",
              fontWeight: 600,
              bgcolor: "rgba(211, 47, 47, 0.04)",
              "&:hover": {
                bgcolor: "rgba(211, 47, 47, 0.08)",
              }
            }}
          >
            <LogoutRoundedIcon fontSize="small" color="inherit" />
            <Typography variant="body2" fontWeight={600}>
              {i18n.language === "th" ? "ออกจากระบบบัญชีทั้งหมด" : "Sign out of all accounts"}
            </Typography>
          </MenuItem>
        </Box>
      </Menu>

    </Box>
  );
};

export default ChatPage;
