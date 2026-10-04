import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCalendar, FiUsers, FiAward, FiPlusSquare, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { analyticsService, eventService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { addListener } = useRealtime();
  const [analytics, setAnalytics] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      analyticsService.faculty().then(({ data }) => data).catch(() => null),
      eventService.list({ page: 1, page_size: 5, sort_by: "created_at", sort_order: "desc" }).then(({ data }) => data.items || []).catch(() => []),
    ]).then(([a, ev]) => {
      setAnalytics(a);
      setRecentEvents(ev);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization for faculty dashboard counters
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_CREATED" ||
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "ATTENDANCE_CHECKED_IN" ||
        msg.type === "REGISTRATION_CANCELLED" ||
        msg.type === "EVENT_UPDATED"
      ) {
        loadData();
      }
    });
    return () => remove();
  }, [addListener]);

  return (
    <PageTransition>
      {/* Welcome Banner */}
      <div
        className="glass-card welcome-banner"
        style={{
          background: "var(--gradient-soft)",
          boxShadow: "0 10px 30px rgba(139, 92, 246, 0.08)",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#8b5cf6",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            <FiCheckCircle size={14} /> Faculty & Organizer Portal
          </span>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", marginBottom: 6 }}>
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14.5 }}>{user?.department || "Department Administrator"}</p>
        </div>
        <div className="btn-group" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/faculty/events" className="btn btn-primary btn-sm">
            <FiPlusSquare /> Manage Events
          </Link>
          <Link to="/faculty/certificates" className="btn btn-outline btn-sm">
            Issue Certificates
          </Link>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="grid-cards-4" style={{ marginBottom: 28 }}>
          <StatCard icon={<FiCalendar />} label="Events Created" value={analytics?.total_events_created ?? 0} accent="#6366f1" />
          <StatCard icon={<FiUsers />} label="Total Registrations" value={analytics?.total_registrations_received ?? 0} accent="#0ea5e9" />
          <StatCard icon={<FiAward />} label="Certificates Issued" value={analytics?.total_certificates_issued ?? 0} accent="#d946ef" />
          <StatCard
            icon={<FiArrowRight />}
            label="Avg. Registrations / Event"
            value={
              analytics?.total_events_created
                ? Math.round((analytics.total_registrations_received / analytics.total_events_created) * 10) / 10
                : 0
            }
            accent="#22c55e"
          />
        </div>
      )}

      {/* Recently Created Events Table */}
      <div className="section-head">
        <h2 style={{ fontSize: 19 }}>Recently Created Events</h2>
        <Link to="/faculty/events" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
          Manage all events
        </Link>
      </div>

      <div className="glass-card table-wrap" style={{ borderRadius: "18px" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Event Date</th>
              <th>Venue</th>
              <th>Registrations</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 36, color: "var(--text-secondary)" }}>
                  No events created yet. Click "Manage Events" above to create your first event.
                </td>
              </tr>
            ) : (
              recentEvents.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{ev.title}</td>
                  <td>
                    <span className="badge badge-info">{ev.category || "General"}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(ev.event_date)}</td>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{ev.venue}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: ev.available_seats <= 0 ? "var(--danger)" : "var(--success)" }}>
                      {ev.total_seats - ev.available_seats} / {ev.total_seats}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .welcome-banner .btn-group {
            width: 100%;
          }
          .welcome-banner .btn-group a {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
            justify-content: center;
          }
        }
        @media (max-width: 420px) {
          .welcome-banner .btn-group a {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </PageTransition>
  );
}
