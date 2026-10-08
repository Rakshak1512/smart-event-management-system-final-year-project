import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("sems-user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // If both token and user profile are already cached in localStorage, start with loading=false
  // so protected routes render instantly (0ms) without waiting for network roundtrips.
  const [loading, setLoading] = useState(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("sems-access-token") : null;
    const stored = typeof window !== "undefined" ? localStorage.getItem("sems-user") : null;
    return Boolean(token && !stored);
  });

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      const token = localStorage.getItem("sems-access-token");
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (isMounted) {
          setUser(data);
          localStorage.setItem("sems-user", JSON.stringify(data));
        }
      } catch (err) {
        // If 401 Unauthorized, token is expired/invalid
        if (err.response?.status === 401 && isMounted) {
          localStorage.removeItem("sems-access-token");
          localStorage.removeItem("sems-refresh-token");
          localStorage.removeItem("sems-user");
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async ({ email, password, role, remember_me }) => {
    const { data } = await api.post("/auth/login", { email, password, role, remember_me });
    localStorage.setItem("sems-access-token", data.access_token);
    localStorage.setItem("sems-refresh-token", data.refresh_token);
    localStorage.setItem("sems-user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const loginWithEmailOtp = async ({ email, otp_code, role, remember_me }) => {
    const { data } = await api.post("/auth/email/verify-login-otp", { email, otp_code, role, remember_me });
    localStorage.setItem("sems-access-token", data.access_token);
    localStorage.setItem("sems-refresh-token", data.refresh_token);
    localStorage.setItem("sems-user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("sems-access-token");
    localStorage.removeItem("sems-refresh-token");
    localStorage.removeItem("sems-user");
    setUser(null);
  };

  const deleteAccount = async () => {
    await api.delete("/users/me");
    logout();
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem("sems-user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithEmailOtp,
        register,
        logout,
        deleteAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
