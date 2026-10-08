import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiMail, FiCalendar, FiCheckCircle } from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { reloadFirebaseUser, sendFirebaseVerificationEmail } from "../../lib/firebase.js";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshFirebaseSession } = useAuth();

  const [email] = useState(location.state?.email || "");
  const [role] = useState(location.state?.role || "student");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const firebaseUser = await reloadFirebaseUser();
      if (!firebaseUser) {
        toast.error("Your Firebase session is no longer available. Please login again.");
        navigate("/login");
        return;
      }

      if (!firebaseUser.emailVerified) {
        toast.error("Email is not verified yet. Open the Firebase verification email and click the link.");
        return;
      }

      await refreshFirebaseSession(role, true);
      toast.success("Email verified successfully! Welcome to EventSphere.");
      navigate(
        role === "admin"
          ? "/admin/dashboard"
          : role === "faculty"
          ? "/faculty/dashboard"
          : role === "volunteer"
          ? "/volunteer/dashboard"
          : "/student/dashboard",
        { replace: true }
      );
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Could not complete email verification.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendFirebaseVerificationEmail();
      toast.success("A new Firebase verification email has been sent.");
    } catch (err) {
      toast.error(err.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <PageTransition>
      <div className="auth-shell" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ position: "absolute", top: 24, left: 24, zIndex: 10 }}>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            aria-label="Go back"
            title="Go back"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-glass)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <FiArrowLeft size={18} />
          </button>
        </div>

        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <ThemeToggle />
        </div>

        <div className="glass-card auth-card" style={{ width: "100%", maxWidth: 480, padding: "36px 32px", borderRadius: 26, textAlign: "center" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, marginBottom: 22 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiCalendar size={18} />
            </span>
            Event<span className="text-gradient">Sphere</span>
          </Link>

          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--gradient-soft)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <FiMail size={28} />
          </div>

          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Verify your email</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            Firebase Authentication has sent a verification link to:
          </p>

          <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-glass)", border: "1px solid var(--border-color)", marginBottom: 20, fontWeight: 700, wordBreak: "break-word" }}>
            {email || "your email address"}
          </div>

          <div style={{ padding: 16, borderRadius: 14, background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", textAlign: "left", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-primary)", fontWeight: 700, marginBottom: 8 }}>
              <FiCheckCircle size={16} style={{ color: "#8b5cf6" }} />
              No 6-digit OTP is required
            </div>
            Open the Firebase email, click <strong>Verify your email</strong>, then return here and click <strong>I verified my email</strong>.
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: 10 }}
            onClick={handleCheckVerification}
            disabled={checking}
          >
            {checking ? "Checking verification..." : "I verified my email"}
          </button>

          <button
            type="button"
            className="btn"
            style={{ width: "100%", border: "1px solid var(--border-color)", marginBottom: 18 }}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>

          <Link to="/login" style={{ color: "#8b5cf6", fontWeight: 600, fontSize: 13.5 }}>
            Back to login
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
