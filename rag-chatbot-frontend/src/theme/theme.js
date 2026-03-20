import { createTheme } from "@mui/material/styles";

/**
 * CP KKU University Theme
 * Primary : Navy (#1a237e)
 * Secondary : Gold (#c8a415)
 */
export const getAppTheme = (mode) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#1a237e" : "#5c6bc0", 
        light: "#534bae",
        dark: "#000051",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#c8a415",
        light: "#fcd54f",
        dark: "#937600",
        contrastText: "#000000",
      },
      background: {
        default: mode === "light" ? "#f0f2f5" : "#050505", 
        paper: mode === "light" ? "#ffffff" : "#121212", 
      },
      text: {
        primary: mode === "light" ? "#1a1a2e" : "#ffffff", 
        secondary: mode === "light" ? "#555770" : "#b0b0b0",
      },
    },
    typography: {
      fontFamily: "'Kanit', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      body1: {
        fontWeight: 400,
      },
      body2: {
        fontWeight: 300,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 10,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  });
};
