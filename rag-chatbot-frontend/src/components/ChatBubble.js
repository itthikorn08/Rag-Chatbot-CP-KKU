import React, { useState } from "react";
import { Box, Typography, Avatar, IconButton, TextField, Tooltip, Fade } from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";

/**
 * ChatBubble – renders a single chat message bubble.
 *
 * @param {{ text: string, sender: "user" | "bot", timestamp?: string, feedbackState?: "up"|"down"|null, onFeedback?: (vote: "up"|"down", comment?: string) => void }} props
 */
const ChatBubble = ({ text, sender, timestamp, feedbackState, onFeedback }) => {
  const isUser = sender === "user";
  const { t } = useTranslation();
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");

  const handleVote = (vote) => {
    if (!onFeedback) return;

    if (vote === "down" && feedbackState !== "down") {
      setShowCommentBox(true);
    } else {
      setShowCommentBox(false);
      setComment("");
    }

    // If clicking same vote again, toggle off is not needed (upsert handles it)
    onFeedback(vote);
  };

  const handleSendComment = () => {
    if (onFeedback && comment.trim()) {
      onFeedback("down", comment.trim());
    }
    setShowCommentBox(false);
    setComment("");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        mb: 2,
        gap: 1,
        px: 1,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: isUser ? "primary.main" : "secondary.main",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {isUser ? (
          <PersonRoundedIcon fontSize="small" />
        ) : (
          <SmartToyRoundedIcon fontSize="small" />
        )}
      </Avatar>

      {/* Bubble + Feedback */}
      <Box sx={{ maxWidth: "75%" }}>
        {/* Bubble */}
        <Box
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: isUser
              ? "18px 18px 4px 18px"
              : "18px 18px 18px 4px",
            bgcolor: isUser ? (isUser && "primary.light" ? "rgba(26, 35, 126, 0.08)" : "#f0f2f5") : "background.paper",
            color: "text.primary",
            border: isUser ? "1px solid rgba(26, 35, 126, 0.12)" : "1px solid rgba(0, 0, 0, 0.05)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
            position: "relative",
            transition: "transform 0.15s ease",
            "&:hover": {
              transform: "translateY(-1px)",
            },
          }}
        >
          <Box
            sx={{
              "& p": { m: 0, mb: 1.5, lineHeight: 1.6 },
              "& p:last-child": { mb: 0 },
              "& strong": { color: "inherit", fontWeight: 700 },
              "& ul, & ol": { mt: 1, mb: 1.5, pl: 2.5 },
              "& li": { mb: 0.5 },
              fontSize: "0.95rem",
              wordBreak: "break-word",
              "& *::selection": {
                backgroundColor: isUser ? "secondary.main" : "primary.main",
                color: isUser ? "#000" : "#fff",
              },
            }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, children, ...props }) => (
                  <a 
                    {...props} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}
                  >
                    {children}
                  </a>
                )
              }}
            >
              {text}
            </ReactMarkdown>
          </Box>
          {timestamp && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                opacity: 0.6,
                textAlign: isUser ? "right" : "left",
                fontSize: "0.7rem",
              }}
            >
              {timestamp}
            </Typography>
          )}
        </Box>

        {/* Feedback Buttons (bot messages only) */}
        {!isUser && onFeedback && (
          <Fade in timeout={400}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, ml: 0.5 }}>
              <Tooltip title={t("feedback.helpful")} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={() => handleVote("up")}
                  sx={{
                    color: feedbackState === "up" ? "success.main" : "text.disabled",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "success.main",
                      bgcolor: "rgba(76, 175, 80, 0.08)",
                      transform: "scale(1.15)",
                    },
                  }}
                >
                  {feedbackState === "up" ? (
                    <ThumbUpRoundedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <ThumbUpOutlinedIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title={t("feedback.not_helpful")} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={() => handleVote("down")}
                  sx={{
                    color: feedbackState === "down" ? "error.main" : "text.disabled",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "error.main",
                      bgcolor: "rgba(244, 67, 54, 0.08)",
                      transform: "scale(1.15)",
                    },
                  }}
                >
                  {feedbackState === "down" ? (
                    <ThumbDownRoundedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <ThumbDownOutlinedIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>

              {feedbackState && (
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    color: "text.disabled",
                    fontSize: "0.7rem",
                    animation: "fadeIn 0.3s ease",
                    "@keyframes fadeIn": {
                      from: { opacity: 0 },
                      to: { opacity: 1 },
                    },
                  }}
                >
                  {t("feedback.thanks")}
                </Typography>
              )}
            </Box>
          </Fade>
        )}

        {/* Comment box for thumbs down */}
        {showCommentBox && feedbackState === "down" && (
          <Fade in timeout={300}>
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                mt: 0.5,
                ml: 0.5,
                alignItems: "flex-end",
              }}
            >
              <TextField
                size="small"
                multiline
                maxRows={3}
                placeholder={t("feedback.comment_placeholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontSize: "0.85rem",
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleSendComment}
                disabled={!comment.trim()}
                sx={{
                  color: "primary.main",
                  "&:disabled": { color: "text.disabled" },
                }}
              >
                <SendRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export default ChatBubble;
