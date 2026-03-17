import React, { useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline, createTheme } from "@mui/material";
import { ThemeProvider, useThemeContext } from "./theme/ThemeContext";
import { getAppTheme } from "./theme/theme";
import ChatPage from "./components/ChatPage";

const ThemedApp = () => {
  const { actualMode } = useThemeContext();
  
  const theme = useMemo(() => getAppTheme(actualMode), [actualMode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ChatPage />
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
