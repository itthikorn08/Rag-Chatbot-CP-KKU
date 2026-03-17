import React, { useState, useRef, useEffect } from "react";
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
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import ChatBubble from "./ChatBubble";
import { askQuestion } from "../api/chatApi";
import { useThemeContext } from "../theme/ThemeContext";

/**
 * ChatPage – Full chat interface with header, message area, and input bar.
 */
const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
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

    // Add user message
    const userMsg = { text: question, sender: "user", timestamp: getTimestamp() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askQuestion(question);
      const botMsg = { text: answer, sender: "bot", timestamp: getTimestamp() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errMsg = {
        text: "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
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

  // Suggested questions for empty state
  const suggestions = [
    "เกณฑ์การรับสมัครมีอะไรบ้าง?",
    "ต้องใช้เอกสารอะไรในการสมัคร?",
    "กำหนดการรับสมัครเป็นอย่างไร?",
  ];

  const { mode, toggleTheme } = useThemeContext();

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* ─── Header ─────────────────────────────────────── */}
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
          <SchoolRoundedIcon sx={{ fontSize: 32, color: "secondary.main" }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2, letterSpacing: 0.5 }}>
              CP KKU Admission Chatbot
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 300 }}>
              วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
              label="RAG-Powered"
              size="small"
              sx={{
                display: { xs: "none", sm: "flex" },
                bgcolor: "rgba(200, 164, 21, 0.2)",
                color: "secondary.main",
                fontWeight: 500,
                border: "1px solid rgba(200, 164, 21, 0.4)",
                "& .MuiChip-icon": { color: "secondary.main" },
              }}
            />
            <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: 1 }}>
              {mode === "light" && <LightModeRoundedIcon />}
              {mode === "dark" && <DarkModeRoundedIcon />}
              {mode === "system" && <SettingsBrightnessRoundedIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
          {/* Empty state */}
          {messages.length === 0 && (
            <Fade in timeout={600}>
              <Box
                sx={{
                  textAlign: "center",
                  mt: 8,
                  mb: 4,
                }}
              >
                <SchoolRoundedIcon
                  sx={{
                    fontSize: 64,
                    color: "primary.main",
                    opacity: 0.3,
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  สวัสดีครับ! 👋
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 4, opacity: 0.7 }}
                >
                  ถามข้อมูลเกี่ยวกับการรับสมัครเข้าศึกษา CP KKU ได้เลยครับ
                </Typography>

                {/* Suggestion chips */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
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
                        fontWeight: 400,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "primary.main",
                          color: "#fff",
                          borderColor: "primary.main",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(26,35,126,0.25)",
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Fade>
          )}

          {/* Message list */}
          {messages.map((msg, idx) => (
            <Fade in key={idx} timeout={300}>
              <Box>
                <ChatBubble
                  text={msg.text}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                />
              </Box>
            </Fade>
          ))}

          {/* Typing indicator */}
          {loading && (
            <Fade in timeout={200}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1,
                  mb: 2,
                }}
              >
                <CircularProgress size={20} sx={{ color: "primary.main" }} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    animation: "pulse 1.5s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 0.5 },
                      "50%": { opacity: 1 },
                    },
                  }}
                >
                  กำลังค้นหาคำตอบ...
                </Typography>
              </Box>
            </Fade>
          )}

          <div ref={messagesEndRef} />
        </Container>
      </Box>

      {/* ─── Input Bar ──────────────────────────────────── */}
      <Paper
        elevation={8}
        sx={{
          borderRadius: 0,
          borderTop: "1px solid rgba(0,0,0,0.08)",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 2,
              px: { xs: 1, md: 0 },
            }}
          >
            <TextField
              id="chat-input"
              fullWidth
              multiline
              maxRows={4}
              placeholder="พิมพ์คำถามของคุณที่นี่..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "background.default",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: mode === "light" ? "#e8eaf6" : "rgba(255, 255, 255, 0.05)",
                  },
                  "&.Mui-focused": {
                    bgcolor: "background.paper",
                    boxShadow: mode === "light" 
                      ? "0 0 0 3px rgba(26,35,126,0.12)" 
                      : "0 0 0 3px rgba(92, 107, 192, 0.2)",
                  },
                },
              }}
            />
            <IconButton
              id="send-button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              sx={{
                bgcolor: "primary.main",
                color: "#fff",
                width: 48,
                height: 48,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "primary.dark",
                  transform: "scale(1.05)",
                  boxShadow: "0 4px 14px rgba(26,35,126,0.4)",
                },
                "&.Mui-disabled": {
                  bgcolor: "grey.300",
                  color: "grey.500",
                },
              }}
            >
              <SendRoundedIcon />
            </IconButton>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default ChatPage;
