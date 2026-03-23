import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * ChatBubble – renders a single chat message bubble.
 *
 * @param {{ text: string, sender: "user" | "bot", timestamp?: string }} props
 */
const ChatBubble = ({ text, sender, timestamp }) => {
  const isUser = sender === "user";

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

      {/* Bubble */}
      <Box
        sx={{
          maxWidth: "75%",
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
            // Custom selection colors for better visibility
            "& *::selection": {
              backgroundColor: isUser ? "secondary.main" : "primary.main",
              color: isUser ? "#000" : "#fff",
            },
          }}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a 
                  {...props} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}
                />
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
    </Box>
  );
};

export default ChatBubble;
