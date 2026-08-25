import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, loginUser, registerUser, updateProfile as apiUpdateProfile } from "../api/authApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState(() => {
    return JSON.parse(localStorage.getItem("savedAccounts") || "[]");
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [token]);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMe();
        setUser(data);
      } catch {
        const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
        const updated = accounts.filter(a => a.token !== token);
        localStorage.setItem("savedAccounts", JSON.stringify(updated));
        setSavedAccounts(updated);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  // Sync active user to savedAccounts
  useEffect(() => {
    if (user && token) {
      setSavedAccounts((prev) => {
        const index = prev.findIndex((a) => a.email === user.email);
        let updated;
        if (index === -1) {
          updated = [...prev, { email: user.email, displayName: user.displayName, token, role: user.role }];
        } else {
          updated = [...prev];
          updated[index] = { ...updated[index], displayName: user.displayName, token, role: user.role };
        }
        localStorage.setItem("savedAccounts", JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, token]);

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password });
    localStorage.setItem("authToken", data.token); 
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    const data = await registerUser({ email, password });
    localStorage.setItem("authToken", data.token); 
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const updateProfile = useCallback(async (displayName, password, firstName, lastName, dateOfBirth, gender) => {
    const data = await apiUpdateProfile({ displayName, password, firstName, lastName, dateOfBirth, gender });
    localStorage.setItem("authToken", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const switchAccount = useCallback((targetToken) => {
    localStorage.setItem("authToken", targetToken);
    setToken(targetToken);
  }, []);

  const prepareAddAccount = useCallback(() => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    const currentEmail = user?.email;
    let nextToken = null;
    let updatedAccounts = [];

    if (currentEmail) {
      const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
      updatedAccounts = accounts.filter(a => a.email !== currentEmail);
      localStorage.setItem("savedAccounts", JSON.stringify(updatedAccounts));
      setSavedAccounts(updatedAccounts);
      if (updatedAccounts.length > 0) {
        nextToken = updatedAccounts[0].token;
      }
    }

    if (nextToken) {
      localStorage.setItem("authToken", nextToken);
      setToken(nextToken);
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentView");
      localStorage.removeItem("profileView");
      setToken(null);
      setUser(null);
    }
  }, [user]);

  const logoutAll = useCallback(() => {
    localStorage.removeItem("savedAccounts");
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentView");
    localStorage.removeItem("profileView");
    setToken(null);
    setUser(null);
    setSavedAccounts([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        savedAccounts,
        login,
        register,
        logout,
        logoutAll,
        updateProfile,
        switchAccount,
        prepareAddAccount,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
