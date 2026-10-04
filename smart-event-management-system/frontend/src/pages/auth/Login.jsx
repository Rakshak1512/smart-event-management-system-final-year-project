import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiEye, FiEyeOff, FiCalendar, FiCheckCircle } from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import OTPInput from "../../components/common/OTPInput.jsx";
import TestUsersModal from "../../components/auth/TestUsersModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../api/services.js";

export default function Login() {
  const { login, loginWithEmailOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("student");
  const [authMethod, setAuthMethod] = useState("password"); // "password", "email_otp"

  // Test users modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Password state
  const [form, setForm] = useState({ email: "", password: "", remember_me: false });
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSendingOtp, setEmailSendingOtp] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const getDashboardDestination = (userRole) => {
    const r = (userRole || "").toLowerCase();
    if (r === "admin") return "/admin/dashboard";
    if (r === "faculty") return "/faculty/dashboard";
    if (r === "volunteer") return "/volunteer/dashboard";
    return "/student/dashboard";
  };

  const handleUseAccount = (account) => {
    setRole(account.role);
    setForm((f) => ({ ...f, email: account.email, password: account.password }));
    setAuthMethod("password");
    setIsTestModalOpen(false);
    toast.success(`${account.label} demo account loaded`);
  };

  const handleLoginNow = async (account) => {
    setRole(account.role);
    setForm((f) => ({ ...f, email: account.email, password: account.password }));
    setAuthMethod("password");
    setSubmitting(true);
    try {
      const user = await login({
        email: account.email,
        password: account.password,
        role: account.role,
        remember_me: form.remember_me,
      });
      setIsTestModalOpen(false);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      const dest = location.state?.from || getDashboardDestination(user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      if (!err.response) {
        toast.error("Unable to connect to the server. Please try again.");
        return;
      }
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const validatePasswordForm = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    setSubmitting(true);
    try {
      const user = await login({ ...form, role });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      const dest = location.state?.from || getDashboardDestination(user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      if (!err.response) {
        toast.error("Unable to connect to the server. Please try again.");
        return;
      }
      const detail = err.response?.data?.detail;
      if (detail === "Please verify your email first") {
        toast.error("Please verify your email first");
        navigate("/verify-email", { state: { email: form.email } });
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    const clean = otpEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setEmailSendingOtp(true);
    try {
      await authService.sendEmailLoginOtp({ email: clean, role });
      setEmailOtpSent(true);
      toast.success(`Login OTP sent to ${clean}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send OTP to this email.");
    } finally {
      setEmailSendingOtp(false);
    }
  };

  // Verify Email OTP & Login
  const handleVerifyEmailOtp = async (e, codeToVerify = null) => {
    if (e) e.preventDefault();
    const finalOtp = codeToVerify || emailOtp;
    if (finalOtp.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    setEmailSubmitting(true);
    try {
      const user = await loginWithEmailOtp({
        email: otpEmail.trim().toLowerCase(),
        otp_code: finalOtp.trim(),
        role,
        remember_me: form.remember_me,
      });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      const dest =
        location.state?.from ||
        (user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "faculty"
          ? "/faculty/dashboard"
          : user.role === "volunteer"
          ? "/volunteer/dashboard"
          : "/student/dashboard");
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired OTP code.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const inputIconStyle = {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    pointerEvents: "none",
    fontSize: 16,
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
        {/* Ambient Blurred Background Lights */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -100,
            left: "20%",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.16)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -80,
            right: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.14)",
            filter: "blur(90px)",
            pointerEvents: "none",
          }}
        />

        {/* Floating Theme Switcher */}
        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <ThemeToggle />
        </div>

        {/* Login Island Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="glass-card auth-card float-card"
          style={{
            width: "100%",
            maxWidth: 460,
            padding: "36px 32px",
            borderRadius: "26px",
            background: "var(--bg-elevated)",
            border: "1.5px solid rgba(139, 92, 246, 0.3)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4), 0 0 35px rgba(139, 92, 246, 0.18)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              <motion.span
                whileHover={{ scale: 1.08, rotate: 6 }}
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
              </motion.span>
              <span>
                Event<span className="text-gradient">Sphere</span>
              </span>
            </Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome back</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0 }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Role Pill Switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-base)",
              borderRadius: 999,
              padding: 4,
              marginBottom: 16,
              border: "1px solid var(--border-color)",
            }}
          >
            {[
              { id: "student", label: "Student" },
              { id: "faculty", label: "Faculty" },
              { id: "volunteer", label: "Volunteer" },
              { id: "admin", label: "Admin" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  background: role === r.id ? "var(--gradient-primary)" : "transparent",
                  color: role === r.id ? "#fff" : "var(--text-secondary)",
                  borderRadius: 999,
                  transition: "all 0.2s ease",
                  fontWeight: role === r.id ? 600 : 500,
                  fontSize: 12,
                  padding: "6px 4px",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Auth Method Tabs: Password vs Email OTP */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 6,
              background: "var(--bg-glass)",
              padding: 4,
              borderRadius: 12,
              marginBottom: 20,
              border: "1px solid var(--border-color)",
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMethod("password")}
              style={{
                background: authMethod === "password" ? "var(--bg-elevated)" : "transparent",
                color: authMethod === "password" ? "#8b5cf6" : "var(--text-secondary)",
                border: authMethod === "password" ? "1px solid rgba(139, 92, 246, 0.4)" : "none",
                borderRadius: 8,
                padding: "8px 4px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s ease",
              }}
            >
              <FiLock size={14} /> Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("email_otp")}
              style={{
                background: authMethod === "email_otp" ? "var(--bg-elevated)" : "transparent",
                color: authMethod === "email_otp" ? "#8b5cf6" : "var(--text-secondary)",
                border: authMethod === "email_otp" ? "1px solid rgba(139, 92, 246, 0.4)" : "none",
                borderRadius: 8,
                padding: "8px 4px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s ease",
              }}
            >
              <FiMail size={14} /> Email OTP
            </button>
          </div>

          {/* METHOD 1: PASSWORD LOGIN */}
          {authMethod === "password" && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <FiMail style={inputIconStyle} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="you@college.edu"
                    required
                  />
                </div>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: "relative" }}>
                  <FiLock style={inputIconStyle} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{
                      ...inputIconStyle,
                      left: "auto",
                      right: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.remember_me} onChange={update("remember_me")} />
                  Remember me
                </label>
                <Link to="/forgot-password" style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <button className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? "Logging in..." : "Login with Password"}
              </button>
            </form>
          )}

          {/* METHOD 2: EMAIL OTP LOGIN */}
          {authMethod === "email_otp" && (
            <div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <FiMail style={inputIconStyle} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    type="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="you@college.edu"
                    disabled={emailOtpSent}
                  />
                </div>
              </div>

              {!emailOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={emailSendingOtp || !otpEmail.trim()}
                >
                  {emailSendingOtp ? "Sending OTP..." : "Send Email OTP"}
                </button>
              ) : (
                <form onSubmit={handleVerifyEmailOtp}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Enter 6-Digit OTP</label>
                      <button
                        type="button"
                        onClick={() => setEmailOtpSent(false)}
                        style={{ background: "none", border: "none", color: "#8b5cf6", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                      >
                        Change Email
                      </button>
                    </div>
                    <OTPInput
                      value={emailOtp}
                      onChange={setEmailOtp}
                      onComplete={(code) => handleVerifyEmailOtp(null, code)}
                      onResend={handleSendEmailOtp}
                      resending={emailSendingOtp}
                      disabled={emailSubmitting}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: 12 }}
                    disabled={emailSubmitting || emailOtp.length !== 6}
                  >
                    {emailSubmitting ? "Verifying..." : "Verify & Login"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer link to Register */}
          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#8b5cf6", fontWeight: 600 }}>
              Register here
            </Link>
          </div>

          {/* Secondary Test Users Section */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px dashed var(--border-color)",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              style={{
                background: "var(--bg-glass)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "var(--text-primary)",
                borderRadius: 12,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#8b5cf6";
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
                e.currentTarget.style.background = "var(--bg-glass)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <span>🧪</span>
              <span>Test Users</span>
            </button>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              Quick access to demo accounts
            </p>
          </div>
        </motion.div>

        {/* Interactive Glassmorphism Test Users Modal */}
        <TestUsersModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          onUseAccount={handleUseAccount}
          onLoginNow={handleLoginNow}
          isLoggingIn={submitting}
        />
      </div>
    </PageTransition>
  );
}
