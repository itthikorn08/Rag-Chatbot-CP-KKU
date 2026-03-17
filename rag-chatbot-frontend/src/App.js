import React, { useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { ThemeProvider, useThemeContext } from "./theme/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getAppTheme } from "./theme/theme";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import { CircularProgress, Box } from "@mui/material";

const ThemedApp = () => {
  const { actualMode } = useThemeContext();
  const { user, loading } = useAuth();
  const [guestMode, setGuestMode] = useState(false);

  const theme = useMemo(() => getAppTheme(actualMode), [actualMode]);

  if (loading) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
          }}
        >
          <CircularProgress />
        </Box>
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {user || guestMode ? (
        <ChatPage onExitGuest={() => setGuestMode(false)} isGuest={!user && guestMode} />
      ) : (
        <LoginPage onGuestMode={() => setGuestMode(true)} />
      )}
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
