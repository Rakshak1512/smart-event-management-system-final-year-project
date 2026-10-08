import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiAlertCircle, FiRefreshCw, FiLogOut, FiShield, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";
import toast from "react-hot-toast";

export default function AwaitingApproval() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const role = (user?.role || "student").toLowerCase();
  const approvalStatus = (user?.approval_status || "PENDING").toUpperCase();
  const isRejected = approvalStatus === "REJECTED";

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data } = await api.get("/auth/me");
      if (data) {
        setUser(data);
        localStorage.setItem("sems-user", JSON.stringify(data));
        const newStatus = (data.approval_status || "ACTIVE").toUpperCase();
        if (newStatus === "ACTIVE") {
          toast.success("Congratulations! Your account has been approved.");
          const dest =
            data.role === "admin"
              ? "/admin/dashboard"
              : data.role === "faculty"
              ? "/faculty/dashboard"
              : data.role === "volunteer"
              ? "/volunteer/dashboard"
              : "/student/dashboard";
          navigate(dest, { replace: true });
          return;
        } else if (newStatus === "REJECTED") {
          toast.error("Your application has been rejected by coordinators.");
        } else {
          toast("Your account is still pending verification.", { icon: "⏳" });
        }
      }
    } catch (err) {
      toast.error("Could not refresh account status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "var(--bg-main, #0f172a)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "var(--bg-card, #1e293b)",
          borderRadius: 20,
          border: "1px solid var(--border-color, #334155)",
          padding: "36px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
        }}
      >
        {/* Status Icon */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isRejected
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(245, 158, 11, 0.15)",
            border: isRejected
              ? "1px solid rgba(239, 68, 68, 0.3)"
              : "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          {isRejected ? (
            <FiAlertCircle size={38} color="#ef4444" />
          ) : (
            <FiClock size={38} color="#f59e0b" />
          )}
        </div>

        {/* Heading & Badge */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: isRejected ? "#ef444422" : "#f59e0b22",
              color: isRejected ? "#ef4444" : "#f59e0b",
              border: isRejected ? "1px solid #ef444444" : "1px solid #f59e0b44",
              marginBottom: 12,
            }}
          >
            {isRejected ? "Application Rejected" : "Awaiting Verification"}
          </span>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary, #ffffff)",
              margin: 0,
            }}
          >
            {isRejected
              ? "Account Not Approved"
              : role === "faculty"
              ? "Faculty Account Pending Admin Approval"
              : "Student Account Pending Faculty Approval"}
          </h2>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--text-secondary, #94a3b8)",
            margin: "0 0 24px",
          }}
        >
          {isRejected ? (
            <>
              Your application for an EventSphere <strong>{role}</strong> account
              was reviewed by the institutional coordinator and could not be approved at this time.
            </>
          ) : role === "faculty" ? (
            <>
              Your email has been verified! Your faculty registration credentials have been forwarded to the <strong>System Administrator</strong> for institutional approval.
            </>
          ) : (
            <>
              Your email has been verified! Your student registration details have been submitted and are currently awaiting review by your <strong>Department Faculty Coordinators</strong>.
            </>
          )}
        </p>

        {/* Account Details Box */}
        {user && (
          <div
            style={{
              background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 28,
              border: "1px solid var(--border-color, #334155)",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: 10,
                columnGap: 16,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Full Name</span>
                <strong style={{ color: "#f8fafc" }}>{user.name}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Email</span>
                <strong style={{ color: "#f8fafc" }}>{user.email}</strong>
              </div>
              {role === "student" && user.registration_number && (
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Register No</span>
                  <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>
                    {user.registration_number}
                  </strong>
                </div>
              )}
              {role === "faculty" && (user.admin_id || user.registration_number) && (
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Faculty ID</span>
                  <strong style={{ color: "#818cf8", fontFamily: "monospace" }}>
                    {user.admin_id || user.registration_number}
                  </strong>
                </div>
              )}
              {user.department && (
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Department</span>
                  <strong style={{ color: "#f8fafc" }}>{user.department}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {!isRejected && (
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: checking ? "not-allowed" : "pointer",
                opacity: checking ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              <FiRefreshCw className={checking ? "spin-icon" : ""} size={16} />
              {checking ? "Checking..." : "Check Status"}
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 10,
              background: "transparent",
              color: "#94a3b8",
              border: "1px solid #475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <FiLogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Security Assurance */}
        <p
          style={{
            marginTop: 24,
            marginBottom: 0,
            fontSize: 12,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <FiShield size={13} />
          Institutional verification protects student privacy and campus integrity.
        </p>
      </div>
    </div>
  );
}
