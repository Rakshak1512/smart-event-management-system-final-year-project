import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiLock, FiMail } from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { sendFirebasePasswordReset } from "../../lib/firebase.js";
import { authService } from "../../api/services.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await sendFirebasePasswordReset(cleanEmail);
      setSent(true);
      toast.success("Password reset link sent. Check your email.");
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/user-not-found") {
        // Migrate an existing EventSphere account into Firebase Auth, then retry.
        await authService.prepareFirebasePasswordReset({ email: cleanEmail });
        try {
          await sendFirebasePasswordReset(cleanEmail);
        } catch {
          // Keep the response generic for account privacy.
        }
        setSent(true);
        toast.success("If an account exists for that email, a reset link has been sent.");
      } else {
        toast.error(err?.message || "Could not send the password reset email.");
      }
    } finally {
      setSubmitting(false);
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
            style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <FiArrowLeft size={18} />
          </button>
        </div>

        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <ThemeToggle />
        </div>

        <div className="glass-card auth-card" style={{ width: "100%", maxWidth: 480, padding: "36px 32px", borderRadius: 26 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, marginBottom: 18 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiCalendar size={18} />
              </span>
              Event<span className="text-gradient">Sphere</span>
            </Link>

            <div style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--gradient-soft)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              {sent ? <FiCheckCircle size={26} /> : <FiLock size={24} />}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {sent ? "Check your email" : "Forgot Password"}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
              {sent
                ? "Firebase Authentication sent a password reset link. Open it and choose a new password."
                : "Enter your registered email address and Firebase Authentication will send a secure password reset link."}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={sendResetLink}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <FiMail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    required
                    autoFocus
                    style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
                {submitting ? "Sending..." : "Send Password Reset Link"}
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Back to Login
            </button>
          )}

          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-secondary)", marginTop: 22 }}>
            <Link to="/login" style={{ color: "#8b5cf6", fontWeight: 600 }}>
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
