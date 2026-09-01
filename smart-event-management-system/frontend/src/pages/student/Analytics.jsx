import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiClipboard,
  FiCheckCircle,
  FiCalendar,
  FiAward,
  FiUsers,
  FiStar,
  FiCompass,
  FiTrendingUp,
  FiMapPin,
  FiArrowRight,
  FiTarget,
} from "react-icons/fi";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { MonthlyLineChart, CategoryDoughnutChart } from "../../components/charts/ChartWidgets.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import { analyticsService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService
      .student()
      .then(({ data }) => setData(data))
      .catch(() => toast.error("Could not load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonGrid count={4} />;
  if (!data) return <p style={{ color: "var(--text-secondary)" }}>No analytics available yet.</p>;

  const months = (data.monthly_registrations || []).map((m) => m.month);
  const counts = (data.monthly_registrations || []).map((m) => m.count);
  const categoryLabels = Object.keys(data.category_breakdown || {});
  const categoryValues = Object.values(data.category_breakdown || {});
  const timeline = data.timeline || [];
  const achievements = data.achievements || [];
  const recommendations = data.recommendations || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* HERO SECTION */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <span
            className="badge badge-primary"
            style={{ marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FiTarget /> My Participation
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 8px" }}>
            Campus Journey & Analytics
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 580, margin: 0 }}>
            {data.total_registrations > 0
              ? `You're actively participating across ${categoryLabels.length || 1} event categories with a ${data.attendance_rate}% event commitment rate this semester.`
              : "Start participating in technical, cultural, and sports competitions to build your campus portfolio!"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/events" className="btn btn-primary btn-sm">
            Explore Events <FiArrowRight />
          </Link>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid-cards-4">
        <StatCard
          icon={<FiClipboard />}
          label="Total Registrations"
          value={data.total_registrations}
          accent="#6366f1"
        />
        <StatCard
          icon={<FiCalendar />}
          label="Upcoming Events"
          value={data.upcoming_events}
          accent="#0ea5e9"
        />
        <StatCard
          icon={<FiCheckCircle />}
          label="Events Attended"
          value={data.attended_events}
          accent="#22c55e"
        />
        <StatCard
          icon={<FiAward />}
          label="Certificates Earned"
          value={data.total_certificates}
          accent="#d946ef"
        />
      </div>

      {/* ATTENDANCE INSIGHT & CATEGORY BREAKDOWN */}
      <div className="grid-cards-2">
        {/* Attendance Insight Card */}
        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <FiTrendingUp style={{ color: "#22c55e" }} /> Attendance Insight
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", margin: "16px 0" }}>
            {/* Circular Progress Display */}
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: `conic-gradient(#22c55e ${data.attendance_rate * 3.6}deg, rgba(100, 116, 139, 0.2) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(34, 197, 94, 0.25)",
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: "50%",
                  background: "var(--bg-card)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>
                  {data.attendance_rate}%
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Rate
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Events Attended</span>
                <strong style={{ color: "#22c55e" }}>{data.attended_events}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Completed Events</span>
                <strong>{data.completed_events}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Upcoming Registered</span>
                <strong style={{ color: "#0ea5e9" }}>{data.upcoming_events}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Teams Joined</span>
                <strong style={{ color: "#a855f7" }}>{data.teams_joined || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Category Interests</h3>
          {categoryLabels.length > 0 ? (
            <CategoryDoughnutChart labels={categoryLabels} data={categoryValues} />
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5, padding: "40px 0", textAlign: "center" }}>
              No category participation data recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* PARTICIPATION TIMELINE & MONTHLY REGISTRATIONS */}
      <div className="grid-cards-2">
        {/* Participation Timeline */}
        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Participation Timeline</h3>

          {timeline.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>No past event activity recorded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {timeline.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    position: "relative",
                    paddingLeft: 4,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: item.status === "cancelled" ? "#ef4444" : "#8b5cf6",
                      marginTop: 6,
                      flexShrink: 0,
                      boxShadow: "0 0 8px rgba(139, 92, 246, 0.6)",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{item.title}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(item.date)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", fontSize: 11 }}>
                      <span className="badge badge-info">{item.category}</span>
                      <span
                        className="badge"
                        style={{
                          background: item.status === "cancelled" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                          color: item.status === "cancelled" ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                      {item.team_name && (
                        <span className="badge" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
                          Team: {item.team_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Activity */}
        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Registration Activity Trend</h3>
          {counts.some((c) => c > 0) ? (
            <MonthlyLineChart labels={months} data={counts} />
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5, padding: "40px 0", textAlign: "center" }}>
              Monthly trend data will appear as you register for events.
            </p>
          )}
        </div>
      </div>

      {/* ACHIEVEMENTS SECTION */}
      <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <FiStar style={{ color: "#eab308" }} /> Earned Achievements
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          Milestones unlocked from your active participation and event completions.
        </p>

        {achievements.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Participate in events to unlock your first achievement badge!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {achievements.map((ach) => (
              <div
                key={ach.key}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "var(--bg-base)",
                  border: "1px solid rgba(234, 179, 8, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #eab308, #ca8a04)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    boxShadow: "0 4px 12px rgba(234, 179, 8, 0.35)",
                    flexShrink: 0,
                  }}
                >
                  <FiAward />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{ach.title}</h4>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECOMMENDATIONS SECTION */}
      {recommendations.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Recommended for You</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Curated events matching your past category interests and departments.
              </p>
            </div>
            <Link to="/events" style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 600 }}>
              View All Events &rarr;
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {recommendations.map((ev) => (
              <div
                key={ev.id}
                className="glass-card"
                style={{
                  padding: 20,
                  borderRadius: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <span className="badge badge-info">{ev.category}</span>
                    <span className="badge badge-primary">{ev.registration_type}</span>
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{ev.title}</h4>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
                    <FiCalendar style={{ verticalAlign: "middle" }} /> {formatDate(ev.event_date)} · <FiMapPin style={{ verticalAlign: "middle" }} /> {ev.venue}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {ev.available_seats} seats left
                  </span>
                  <Link to={`/events/${ev.id}`} className="btn btn-primary btn-sm">
                    View Event
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
