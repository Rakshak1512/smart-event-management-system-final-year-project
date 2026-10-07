import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";
import {
  firebaseConfigured,
  firebaseAuth,
  registerFirebaseUser,
  signInFirebaseUser,
  getFirebaseIdToken,
  signOutFirebase,
} from "../lib/firebase.js";

const AuthContext = createContext(null);

function persistSession(data) {
  localStorage.setItem("sems-access-token", data.access_token);
  localStorage.setItem("sems-refresh-token", data.refresh_token);
  localStorage.setItem("sems-user", JSON.stringify(data.user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("sems-user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("sems-access-token");
      if (token) {
        try {
          const { data } = await api.get("/auth/me");
          setUser(data);
          localStorage.setItem("sems-user", JSON.stringify(data));
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem("sems-access-token");
          localStorage.removeItem("sems-refresh-token");
          localStorage.removeItem("sems-user");
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, []);

  const login = async ({ email, password, role, remember_me }) => {
    if (!firebaseConfigured) throw new Error("Firebase Authentication is not configured.");

    try {
      const firebaseUser = await signInFirebaseUser(email, password);

      if (!firebaseUser.emailVerified) {
        throw new Error("Please verify your email first. Check your inbox for the Firebase verification link.");
      }

      const idToken = await firebaseUser.getIdToken(true);
      const { data } = await api.post("/auth/firebase/session", {
        id_token: idToken,
        role,
        remember_me,
      });

      persistSession(data);
      setUser(data.user);
      return data.user;
    } catch (firebaseError) {
      // Existing EventSphere accounts may predate Firebase Authentication.
      // Fall back once to the legacy API; a successful legacy login automatically
      // provisions/synchronizes the Firebase account on the backend.
      const code = firebaseError?.code || "";
      const allowLegacyFallback = [
        "auth/user-not-found",
        "auth/invalid-credential",
        "auth/invalid-login-credentials",
        "auth/operation-not-allowed",
      ].includes(code);

      if (!allowLegacyFallback) throw firebaseError;

      const { data } = await api.post("/auth/login", {
        email,
        password,
        role,
        remember_me,
      });
      persistSession(data);
      setUser(data.user);
      return data.user;
    }
  };

  const register = async (payload) => {
    if (!firebaseConfigured) throw new Error("Firebase Authentication is not configured.");
    const firebaseUser = await registerFirebaseUser(payload.email, payload.password, payload.name);
    const idToken = await firebaseUser.getIdToken(true);

    const { data } = await api.post("/auth/firebase/register", {
      id_token: idToken,
      name: payload.name,
      registration_number: payload.registration_number,
      admin_id: payload.admin_id,
      department: payload.department,
      semester: payload.semester,
      role: payload.role,
    });

    return {
      ...data,
      emailVerificationRequired: !firebaseUser.emailVerified,
    };
  };

  const refreshFirebaseSession = async (role, remember_me = false) => {
    if (!firebaseAuth?.currentUser) throw new Error("No Firebase account is currently signed in.");
    await firebaseAuth.currentUser.reload();
    if (!firebaseAuth.currentUser.emailVerified) {
      throw new Error("Your email is not verified yet. Open the verification email and click the link, then return here.");
    }

    const idToken = await getFirebaseIdToken(true);
    const { data } = await api.post("/auth/firebase/session", {
      id_token: idToken,
      role,
      remember_me,
    });
    persistSession(data);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch {
      // Continue clearing the EventSphere session even if Firebase sign-out fails.
    }
    localStorage.removeItem("sems-access-token");
    localStorage.removeItem("sems-refresh-token");
    localStorage.removeItem("sems-user");
    setUser(null);
  };

  const deleteAccount = async () => {
    await api.delete("/users/me");
    await logout();
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
        firebaseConfigured,
        firebaseAuth,
        login,
        register,
        refreshFirebaseSession,
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
