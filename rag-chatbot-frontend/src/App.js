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
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem("guestMode") === "true");
  const [showAdmin, setShowAdmin] = useState(() => localStorage.getItem("currentView") === "admin");
  const [profileView, setProfileView] = useState(() => localStorage.getItem("profileView") || null); // null, 'details', or 'password'

  const handleSetGuestMode = (val) => {
    setGuestMode(val);
    if (val) {
      localStorage.setItem("guestMode", "true");
    } else {
      localStorage.removeItem("guestMode");
    }
  };

  const handleSetShowAdmin = (val) => {
    setShowAdmin(val);
    if (val) {
      localStorage.setItem("currentView", "admin");
    } else {
      localStorage.removeItem("currentView");
    }
  };

  const handleSetProfileView = (view) => {
    setProfileView(view);
    if (view) {
      localStorage.setItem("profileView", view);
    } else {
      localStorage.removeItem("profileView");
    }
  };

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
        <AdminPage onBack={() => handleSetShowAdmin(false)} />
      </MuiThemeProvider>
    );
  }

  if (user && profileView) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <ProfilePage initialView={profileView} onBack={() => handleSetProfileView(null)} />
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {user || guestMode ? (
        <ChatPage 
          onExitGuest={() => handleSetGuestMode(false)} 
          isGuest={!user && guestMode} 
          isAdmin={isAdmin}
          onGoAdmin={() => handleSetShowAdmin(true)}
          onGoProfile={(view) => handleSetProfileView(view)}
        />
      ) : (
        <LoginPage onGuestMode={() => handleSetGuestMode(true)} />
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
