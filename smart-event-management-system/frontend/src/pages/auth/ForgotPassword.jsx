import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiLock,
  FiArrowLeft,
  FiCalendar,
  FiKey,
  FiMail,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiX,
} from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import OTPInput from "../../components/common/OTPInput.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { authService } from "../../api/services.js";

const STEPS = { EMAIL: "EMAIL", OTP: "OTP", RESET: "RESET", SUCCESS: "SUCCESS" };

function maskEmail(emailStr) {
  if (!emailStr || !emailStr.includes("@")) return emailStr || "";
  const [local, domain] = emailStr.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const visible = local.slice(0, 1);
  const masked = "*".repeat(Math.max(local.length - 2, 4));
  const end = local.slice(-1);
  return `${visible}${masked}${end}@${domain}`;
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [passwords, setPasswords] = useState({ new_password: "", confirm_new_password: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Countdown timer for OTP (10 minutes = 600s)
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    let timer;
    if (step === STEPS.OTP && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Real-time password criteria
  const pwd = passwords.new_password || "";
  const criteria = {
    length: pwd.length >= 8,
  };

  // Step 1: Send OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await authService.forgotPassword({ email: cleanEmail });
      toast.success("A 6-digit verification OTP has been sent to your email.");
      setTimeLeft(600);
      setStep(STEPS.OTP);
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Unable to send OTP. Please check your email and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return toast.error("Enter a valid email address first");
    }
    setResending(true);
    setHasError(false);
    setErrorMessage("");
    try {
      await authService.forgotPassword({ email: cleanEmail });
      toast.success("A fresh 6-digit verification code has been sent to your email.");
      setTimeLeft(600);
    } catch (err) {
      console.error("Resend OTP error:", err);
      toast.error("Could not resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP
  const verifyOtp = async (e, codeToVerify = null) => {
    if (e) e.preventDefault();
    const finalOtp = (codeToVerify || otp).trim();
    if (finalOtp.length !== 6) return toast.error("Please enter the 6-digit OTP code");

    setSubmitting(true);
    setHasError(false);
    setErrorMessage("");

    try {
      await authService.verifyResetOtp({
        email: email.trim().toLowerCase(),
        otp_code: finalOtp,
      });
      toast.success("OTP verified successfully! Please set your new password.");
      setStep(STEPS.RESET);
    } catch (err) {
      console.error("Verify OTP error:", err);
      setHasError(true);
      const detail = err.response?.data?.detail || "Invalid or expired OTP code";
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Change / Update Password
  const resetPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return toast.error("Email is required.");
    }

    if (!passwords.new_password) {
      return toast.error("Please enter a new password.");
    }

    if (!passwords.confirm_new_password) {
      return toast.error("Please confirm your password.");
    }

    if (passwords.new_password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    if (passwords.new_password !== passwords.confirm_new_password) {
      return toast.error("Passwords do not match.");
    }

    setSubmitting(true);
    try {
      await authService.resetPassword({
        email: cleanEmail,
        otp_code: otp.trim(),
        new_password: passwords.new_password,
        confirm_new_password: passwords.confirm_new_password,
      });
      toast.success("Password changed successfully.");
      setStep(STEPS.SUCCESS);
    } catch (err) {
      console.error("Change password error:", err);
      const detail = err.response?.data?.detail || "Could not change password. Please try again.";
      if (
        detail.toLowerCase().includes("expired") ||
        detail.toLowerCase().includes("invalid") ||
        detail.toLowerCase().includes("not found")
      ) {
        toast.error("OTP verification is invalid or has expired. Please request a new OTP.");
      } else {
        toast.error(detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div
        className="auth-shell"
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflow: "hidden",
        }}
      >
        {/* Ambient Lighting Orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -120,
            left: -100,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            opacity: 0.16,
            filter: "blur(90px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -100,
            right: -80,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "rgba(14, 165, 233, 0.14)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <ThemeToggle />
        </div>

        {/* Floating Glass Card */}
        <div
          className="glass-card auth-card float-card"
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "36px 32px",
            borderRadius: "26px",
            background: "var(--bg-elevated)",
            border: "1.5px solid rgba(139, 92, 246, 0.3)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4), 0 0 35px rgba(139, 92, 246, 0.18)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(139, 92, 246, 0.4)",
                }}
              >
                <FiCalendar size={18} />
              </span>
              <span>
                Event<span className="text-gradient">Sphere</span>
              </span>
            </Link>

            {/* Icon Header */}
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: "var(--gradient-soft)",
                color: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                boxShadow: "0 6px 20px rgba(139, 92, 246, 0.2)",
              }}
            >
              {step === STEPS.EMAIL && <FiMail size={24} />}
              {step === STEPS.OTP && <FiKey size={24} />}
              {step === STEPS.RESET && <FiLock size={24} />}
              {step === STEPS.SUCCESS && <FiCheckCircle size={26} color="var(--success)" />}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {step === STEPS.EMAIL && "Forgot Password"}
              {step === STEPS.OTP && "Verify Your Email"}
              {step === STEPS.RESET && "Create New Password"}
              {step === STEPS.SUCCESS && "Password Changed Successfully"}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0 }}>
              {step === STEPS.EMAIL && "Enter your registered email address to receive a 6-digit OTP code."}
              {step === STEPS.OTP && (
                <>
                  OTP sent to: <strong style={{ color: "var(--text-primary)" }}>{maskEmail(email)}</strong>
                </>
              )}
              {step === STEPS.RESET && "Choose a secure new password for your account."}
              {step === STEPS.SUCCESS && "Your password has been updated. You can now login."}
            </p>
          </div>

          {/* STEP 1: Enter Email -> Send OTP */}
          {step === STEPS.EMAIL && (
            <form onSubmit={sendOtp}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={submitting}
              >
                {submitting ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2: 6-Box OTP Verification with Timer */}
          {step === STEPS.OTP && (
            <form onSubmit={verifyOtp}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <OTPInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (hasError) setHasError(false);
                  }}
                  onComplete={(code) => {
                    setOtp(code);
                    verifyOtp(null, code);
                  }}
                  error={hasError}
                  errorMessage={errorMessage}
                  disabled={submitting}
                  onResend={handleResend}
                  resending={resending}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                  color: "var(--text-secondary)",
                  marginBottom: 16,
                  padding: "0 4px",
                }}
              >
                <span>
                  Expires in:{" "}
                  <strong style={{ color: timeLeft < 60 ? "var(--danger)" : "var(--text-primary)" }}>
                    {formatTimer(timeLeft)}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8b5cf6",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "12.5px",
                  }}
                >
                  {resending ? "Resending..." : "Resend OTP"}
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? "Verifying OTP..." : "Verify OTP"}
              </button>
            </form>
          )}

          {/* STEP 3: Create New Password Form (Renders directly on Step 3) */}
          {step === STEPS.RESET && (
            <form onSubmit={resetPassword}>
              {/* Verified Account Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(139, 92, 246, 0.08)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: "12px",
                  marginBottom: "18px",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Account: <strong style={{ color: "var(--text-primary)" }}>{maskEmail(email)}</strong>
                </span>
                <span className="badge badge-success" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <FiCheck size={12} /> Verified
                </span>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type={showNewPassword ? "text" : "password"}
                    value={passwords.new_password}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, new_password: e.target.value }))
                    }
                    placeholder="Enter new password"
                    required
                    autoFocus
                    style={{ paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 4,
                    }}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwords.confirm_new_password}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, confirm_new_password: e.target.value }))
                    }
                    placeholder="Confirm new password"
                    required
                    style={{ paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 4,
                    }}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.4)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                  fontSize: "12px",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Password requirements:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: criteria.length ? "var(--success)" : "var(--text-secondary)",
                    }}
                  >
                    {criteria.length ? <FiCheck size={14} /> : <FiX size={14} />}
                    <span>At least 8 characters</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 4 }}
                disabled={submitting}
              >
                {submitting ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          )}

          {/* STEP 4: Success State */}
          {step === STEPS.SUCCESS && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--success)",
                  fontWeight: 600,
                  fontSize: "15px",
                  marginBottom: "8px",
                }}
              >
                <FiCheckCircle size={20} /> Password changed successfully.
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "22px" }}>
                Your password has been updated.
              </p>
              <Link to="/login" className="btn btn-primary" style={{ width: "100%" }}>
                Go to Login
              </Link>
            </div>
          )}

          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-secondary)", marginTop: 24 }}>
            <Link
              to="/login"
              style={{
                color: "#8b5cf6",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiArrowLeft /> Back to Login
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
