import React, { useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { ThemeProvider, useThemeContext } from "./theme/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getAppTheme } from "./theme/theme";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import AdminPage from "./components/AdminPage";
import ProfilePage from "./components/ProfilePage";
import { CircularProgress, Box } from "@mui/material";

const ThemedApp = () => {
  const { actualMode } = useThemeContext();
  const { user, loading, isAdmin } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [profileView, setProfileView] = useState(null); // null, 'details', or 'password'

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

  if (user && isAdmin && showAdmin) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <AdminPage onBack={() => setShowAdmin(false)} />
      </MuiThemeProvider>
    );
  }

  if (user && profileView) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <ProfilePage initialView={profileView} onBack={() => setProfileView(null)} />
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {user || guestMode ? (
        <ChatPage 
          onExitGuest={() => setGuestMode(false)} 
          isGuest={!user && guestMode} 
          isAdmin={isAdmin}
          onGoAdmin={() => setShowAdmin(true)}
          onGoProfile={(view) => setProfileView(view)}
        />
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
