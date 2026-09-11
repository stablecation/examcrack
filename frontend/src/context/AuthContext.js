import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out, obj = logged in

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("sl_token");
    if (!token) {
      setUser(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("sl_token");
      setUser(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("sl_token", data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      localStorage.setItem("sl_token", data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.removeItem("sl_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
