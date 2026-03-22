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
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import ChatBubble from "./ChatBubble";
import { askQuestion, getChatHistory, getChatSessions, deleteChatSession, syncKnowledge } from "../api/chatApi";
import { useThemeContext } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";

const DRAWER_WIDTH = 280;

const ChatPage = ({ onExitGuest, isGuest }) => {
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
  const [syncing, setSyncing] = useState(false);

  const messagesEndRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();

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

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
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

  const handleSyncKnowledge = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncKnowledge();
      console.log("Sync result:", result);
      alert(t("chat.sync_success") || "ฐานข้อมูลความรู้ถูกจัดระเบียบใหม่เรียบร้อยแล้ว!");
    } catch (err) {
      console.error("Failed to sync knowledge:", err);
      alert(t("chat.sync_error") || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล กรุณาลองใหม่");
    } finally {
      setSyncing(false);
    }
  };

  const displayName = user ? user.displayName : t("chat.guest_name");

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      {/* ─── Sidebar (Drawer) ─────────────────────────── */}
      {!isGuest && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              bgcolor: "background.paper",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AddRoundedIcon />}
              onClick={startNewChat}
              sx={{
                mb: 2,
                py: 1.2,
                borderRadius: 2,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              {t("chat.new_chat")}
            </Button>

            {!isGuest && (
              <Button
                variant="text"
                fullWidth
                startIcon={syncing ? <CircularProgress size={18} /> : <SyncRoundedIcon />}
                onClick={handleSyncKnowledge}
                disabled={syncing}
                sx={{
                  mb: 2,
                  py: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  border: "1px dashed",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover", borderColor: "primary.main", color: "primary.main" },
                }}
              >
                {syncing ? "Syncing..." : "Sync Knowledge Base"}
              </Button>
            )}

            <Typography variant="overline" color="text.secondary" sx={{ ml: 1, mb: 1 }}>
              {t("chat.history")}
            </Typography>

            <List sx={{ flex: 1, overflowY: "auto", px: 0 }}>
              {sessions.map((session) => (
                <ListItem
                  key={session._id}
                  disablePadding
                  sx={{
                    mb: 0.5,
                    "&:hover .delete-session-btn": {
                      opacity: 1
                    }
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => {
                        console.log("Delete clicked for session:", session._id);
                        handleDeleteSession(e, session._id);
                      }}
                      sx={{
                        opacity: 0.4,
                        transition: "all 0.2s",
                        color: mode === "dark" ? "#ff8a80" : "error.main",
                        zIndex: 2,
                        "&:hover": {
                          opacity: 1,
                          bgcolor: "error.light",
                          color: "#fff"
                        }
                      }}
                      className="delete-session-btn"
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    selected={currentSessionId === session._id}
                    onClick={() => switchSession(session._id)}
                    sx={{
                      borderRadius: 2,
                      mx: 0.5,
                      pr: 7,
                      "&.Mui-selected": {
                        bgcolor: "primary.light",
                        color: "primary.contrastText",
                        "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                        "&:hover": { bgcolor: "primary.main" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ChatBubbleOutlineRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={session.title}
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
                <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", mt: 4 }}>
                  {t("chat.no_history")}
                </Typography>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PersonRoundedIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("common.logged_in")}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title={isGuest ? t("chat.exit_guest") : t("chat.logout")}>
                <IconButton onClick={handleLogout} color="error" size="small">
                  <LogoutRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
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
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 0.5 }}>
                <MenuRoundedIcon />
              </IconButton>
            )}
            <SchoolRoundedIcon sx={{ fontSize: 32, color: "secondary.main" }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.2, letterSpacing: 0.5 }}>
                {t("chat.app_title")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 300 }}>
                {t("chat.app_subtitle")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<PersonRoundedIcon sx={{ fontSize: 16 }} />}
                label={displayName}
                size="small"
                sx={{
                  display: { xs: "none", md: "flex" },
                  bgcolor: "rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontWeight: 500,
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />

              <IconButton onClick={toggleTheme} color="inherit">
                {mode === "light" && <LightModeRoundedIcon />}
                {mode === "dark" && <DarkModeRoundedIcon />}
                {mode === "system" && <SettingsBrightnessRoundedIcon />}
              </IconButton>

              <Button
                color="inherit"
                startIcon={<LanguageRoundedIcon fontSize="small" />}
                onClick={() => i18n.changeLanguage(i18n.language === "th" ? "en" : "th")}
                sx={{ minWidth: 40, fontWeight: 700, borderRadius: 2, textTransform: "none" }}
              >
                {i18n.language === "th" ? "EN" : "TH"}
              </Button>

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
    </Box>
  );
};

export default ChatPage;
