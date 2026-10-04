import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiBell, FiCheck, FiCheckCircle, FiSearch, FiX } from "react-icons/fi";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import { notificationService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

const typeLabels = {
  general: "General",
  event_reminder: "Event Reminder",
  certificate_uploaded: "Certificate",
  registration_approved: "Registration",
  deadline_reminder: "Deadline",
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = () => {
    setLoading(true);
    notificationService
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error("Could not load notifications"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error("Could not update notification");
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark all as read");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || (n.title || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q);
      const matchesType = !filterType || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, search, filterType]);

  return (
    <div>
      <div className="section-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Stay on top of deadlines, approvals and certificate updates.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>
          <FiCheckCircle /> Mark all as read
        </button>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--input-bg)", border: "1.5px solid var(--border-color)", borderRadius: 999, padding: "9px 16px", flex: "1 1 220px", position: "relative" }}>
          <FiSearch color="var(--text-muted)" />
          <input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", color: "var(--text-primary)", width: "100%", fontSize: 14 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
        <select className="form-select" style={{ width: 200 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(typeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FiBell />} title="No notifications" message="You're all caught up." />
      ) : (
        <div className="glass-card" style={{ padding: 4 }}>
          {filtered.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                gap: 14,
                padding: "16px 18px",
                borderBottom: "1px solid var(--border-color)",
                background: n.is_read ? "transparent" : "rgba(139,92,246,0.06)",
              }}
            >
              <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%", background: "var(--gradient-soft)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiBell size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <h4 style={{ fontSize: 14 }}>{n.title}</h4>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(n.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{n.message}</p>
                <span className="badge badge-info" style={{ marginTop: 8 }}>{typeLabels[n.type] || n.type}</span>
              </div>
              {!n.is_read && (
                <button onClick={() => markRead(n.id)} className="icon-btn" title="Mark as read" style={{ height: 34, width: 34 }}>
                  <FiCheck size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
