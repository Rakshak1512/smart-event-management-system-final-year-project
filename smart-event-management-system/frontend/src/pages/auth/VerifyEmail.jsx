import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiCalendar } from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import OTPInput from "../../components/common/OTPInput.jsx";
import { authService } from "../../api/services.js";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleVerify = async (e, codeToVerify = null) => {
    if (e) e.preventDefault();
    const finalOtp = codeToVerify || otp;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (finalOtp.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    setSubmitting(true);
    setHasError(false);
    setErrorMessage("");

    try {
      await authService.verifyEmail({ email: email.trim().toLowerCase(), otp_code: finalOtp.trim() });
      toast.success("Email verified successfully! You can now login.");
      setTimeout(() => {
        navigate("/login");
      }, 500);
    } catch (err) {
      setHasError(true);
      const detail = err.response?.data?.detail || err.response?.data?.message;
      let msg = "Invalid or expired OTP";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d) => (typeof d === "string" ? d : d.message || d.msg || JSON.stringify(d))).join(", ");
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpComplete = (completedOtp) => {
    setOtp(completedOtp);
    // Automatically trigger verification when all 6 digits are entered
    handleVerify(null, completedOtp);
  };

  const handleResend = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address first");
    setResending(true);
    setHasError(false);
    setErrorMessage("");
    try {
      await authService.resendOtp({ email: email.trim().toLowerCase() });
      toast.success("A fresh 6-digit OTP has been sent to your email");
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      let msg = "Could not resend OTP. Please try registering again.";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d) => (typeof d === "string" ? d : d.message || d.msg || JSON.stringify(d))).join(", ");
      }
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-shell">
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <ThemeToggle />
      </div>
      <div className="glass-card auth-card" style={{ maxWidth: 480 }}>
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
              }}
            >
              <FiCalendar />
            </span>
            Event<span className="text-gradient">Sphere</span>
          </Link>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--gradient-soft)",
              color: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <FiMail size={24} />
          </div>
          <h1 style={{ fontSize: 22 }}>Verify your email</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
            Enter the 6-digit OTP code sent to your email
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Verification Code (6 Digits)</label>
            <OTPInput
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (hasError) setHasError(false);
              }}
              onComplete={handleOtpComplete}
              error={hasError}
              errorMessage={errorMessage}
              disabled={submitting}
              onResend={handleResend}
              resending={resending}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting || otp.length !== 6}
          >
            {submitting ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-secondary)", marginTop: 22 }}>
          <Link to="/login" style={{ color: "#8b5cf6", fontWeight: 600 }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
