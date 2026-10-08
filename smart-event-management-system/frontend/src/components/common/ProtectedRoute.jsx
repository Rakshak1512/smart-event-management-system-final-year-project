import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || "").toLowerCase();
  const approvalStatus = (user.approval_status || "APPROVED").toUpperCase();

  // Admin accounts are always approved and bypass institutional approval
  if (userRole !== "admin") {
    if (approvalStatus !== "APPROVED" && approvalStatus !== "ACTIVE") {
      return <Navigate to="/awaiting-approval" replace />;
    }
  }

  const normalizedAllowed = allowedRoles?.map((r) => r.toLowerCase());

  if (normalizedAllowed && !normalizedAllowed.includes(userRole)) {
    const destination =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : "/student/dashboard";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
