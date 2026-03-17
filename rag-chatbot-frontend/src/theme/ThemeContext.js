import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useMediaQuery } from "@mui/material";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to 'system'
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("themeMode") || "system";
  });

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Actual theme mode to use
  const actualMode = useMemo(() => {
    if (mode === "system") {
      return prefersDarkMode ? "dark" : "light";
    }
    return mode;
  }, [mode, prefersDarkMode]);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  const value = useMemo(() => ({ mode, actualMode, toggleTheme, setMode }), [mode, actualMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};
