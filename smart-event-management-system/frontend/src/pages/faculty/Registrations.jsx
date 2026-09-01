import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiX,
  FiUserCheck,
  FiRefreshCw,
  FiUsers,
  FiUser,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiArrowLeft,
  FiSearch,
  FiFilter,
  FiAlertCircle,
  FiTag,
  FiEye,
  FiAlertTriangle,
  FiFileText,
  FiInfo,
  FiChevronDown,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid, SkeletonRow } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { eventService, registrationService } from "../../api/services.js";
import { formatDate, statusBadgeClass } from "../../utils/format.js";
import { exportToCSV, slugifyFilename } from "../../utils/exportUtils.js";

const SEAT_OCCUPYING_STATUSES = new Set([
  "registered",
  "approved",
  "attended",
  "completed",
  "confirmed",
]);

export default function FacultyRegistrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [eventSearch, setEventSearch] = useState("");

  // Selected event ID
  const [selectedEventId, setSelectedEventId] = useState(
    searchParams.get("eventId") || (location.state?.eventId ? String(location.state.eventId) : "")
  );

  // Event Registrations State
  const [regs, setRegs] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "pending" | "approved" | "cancelled"
  const [studentSearch, setStudentSearch] = useState("");

  // Action Modals State
  const [approveTarget, setApproveTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load All Events Catalog
  const loadEventsCatalog = useCallback(async (showToast = false) => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const { data } = await eventService.list({
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
      const items = data.items || [];
      setEvents(items);
      if (showToast) toast.success(`Loaded ${items.length} events`);
    } catch (err) {
      console.error("Events load error:", err);
      const detail = err.response?.data?.detail || "Unable to load events. Please retry.";
      setEventsError(detail);
      if (showToast) toast.error(detail);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEventsCatalog(false);
  }, [loadEventsCatalog]);

  // Periodic Auto-Sync for Events Catalog (every 4 seconds when on Level 1)
  useEffect(() => {
    if (selectedEventId) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        eventService
          .list({ page: 1, page_size: 100, sort_by: "created_at", sort_order: "desc" })
          .then(({ data }) => setEvents(data.items || []))
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedEventId]);

  // Sync selectedEventId with URL search params
  useEffect(() => {
    if (selectedEventId) {
      setSearchParams({ eventId: selectedEventId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedEventId, setSearchParams]);

  // Load Registrations for Selected Event
  const loadEventRegistrations = useCallback(
    async (showLoading = true) => {
      if (!selectedEventId) return;
      if (showLoading) setLoadingRegs(true);
      try {
        const [regsRes, capRes, evRes] = await Promise.allSettled([
          registrationService.forEvent(selectedEventId),
          registrationService.getCapacity(selectedEventId),
          eventService.get(selectedEventId),
        ]);

        if (regsRes.status === "fulfilled") {
          setRegs(regsRes.value.data || []);
        }
        if (capRes.status === "fulfilled") {
          setCapacity(capRes.value.data);
        }
        if (evRes.status === "fulfilled" && evRes.value.data) {
          const freshEv = evRes.value.data;
          setEvents((prev) =>
            prev.map((e) => (String(e.id) === String(selectedEventId) ? { ...e, ...freshEv } : e))
          );
        }
      } catch (err) {
        console.error("Registrations load error:", err);
      } finally {
        if (showLoading) setLoadingRegs(false);
      }
    },
    [selectedEventId]
  );

  useEffect(() => {
    if (selectedEventId) {
      loadEventRegistrations(true);
    }
  }, [selectedEventId, loadEventRegistrations]);

  // Real-time synchronization polling (every 3 seconds) for registrations
  useEffect(() => {
    if (!selectedEventId) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadEventRegistrations(false);
      }
    }, 3000);

    const handleFocus = () => {
      loadEventRegistrations(false);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedEventId, loadEventRegistrations]);

  // Approve Handler
  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await registrationService.updateStatus(approveTarget.id, "approved");
      toast.success(
        `Registration approved for ${approveTarget.student?.name || "student"}. In-app notification & confirmation email sent!`
      );
      setApproveTarget(null);
      await loadEventRegistrations(false);
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(err.response?.data?.detail || "Could not approve registration");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Handler
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await registrationService.updateStatus(cancelTarget.id, "cancelled");
      toast.success(
        `Registration cancelled for ${cancelTarget.student?.name || "student"}. Audit status updated to CANCELLED & student notified.`
      );
      setCancelTarget(null);
      await loadEventRegistrations(false);
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(err.response?.data?.detail || "Could not cancel registration");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  // Compute breakdown counts
  const pendingCount = regs.filter(
    (r) => r.status === "pending" || r.status === "registered"
  ).length;
  const approvedCount = regs.filter((r) => r.status === "approved").length;
  const cancelledCount = regs.filter((r) => r.status === "cancelled").length;
  const attendedCount = regs.filter(
    (r) => r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)
  ).length;

  // Filtered registrations list
  const filteredRegs = regs.filter((r) => {
    const st = String(r.status || "").toLowerCase();
    if (activeFilter === "pending" && st !== "pending" && st !== "registered") return false;
    if (activeFilter === "approved" && st !== "approved") return false;
    if (activeFilter === "cancelled" && st !== "cancelled") return false;

    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      r.student?.name?.toLowerCase().includes(q) ||
      r.student?.registration_number?.toLowerCase().includes(q) ||
      r.student?.email?.toLowerCase().includes(q) ||
      r.student?.department?.toLowerCase().includes(q) ||
      r.ticket_code?.toLowerCase().includes(q)
    );
  });

  // CSV Export helper
  const handleExport = (type = "all") => {
    if (!selectedEvent) return;
    let targetList = regs;
    let suffix = "all-registrations";

    if (type === "approved") {
      targetList = regs.filter((r) => r.status === "approved");
      suffix = "approved-registrations";
    } else if (type === "pending") {
      targetList = regs.filter((r) => r.status === "pending" || r.status === "registered");
      suffix = "pending-registrations";
    } else if (type === "cancelled") {
      targetList = regs.filter((r) => r.status === "cancelled");
      suffix = "cancelled-registrations";
    }

    const filename = slugifyFilename(selectedEvent.title, suffix);
    const headers = [
      "Student Name",
      "Registration Number",
      "Email Address",
      "Branch / Department",
      "Class / Semester",
      "Event Title",
      "Ticket Code",
      "Registration Date & Time",
      "Registration Status",
      "Approved At",
      "Approved By",
      "Cancelled At",
      "Cancelled By",
    ];

    const rows = targetList.map((r) => [
      r.student?.name || `Student #${r.student_id}`,
      r.student?.registration_number || "N/A",
      r.student?.email || "N/A",
      r.student?.department || "N/A",
      r.student?.semester ? `Semester ${r.student.semester}` : "N/A",
      selectedEvent.title,
      r.ticket_code || "N/A",
      formatDate(r.registered_at),
      (r.status || "registered").toUpperCase(),
      r.approved_at ? formatDate(r.approved_at) : "N/A",
      r.approved_by_name || r.approved_by || "N/A",
      r.cancelled_at ? formatDate(r.cancelled_at) : "N/A",
      r.cancelled_by_name || r.cancelled_by || "N/A",
    ]);

    exportToCSV(filename, headers, rows);
    toast.success(`Exported ${rows.length} records to ${filename}.csv`);
  };

  // Filtered Events Catalog for Selection View
  const filteredEvents = events.filter((ev) => {
    if (!eventSearch.trim()) return true;
    const q = eventSearch.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.category?.toLowerCase().includes(q) ||
      ev.venue?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q)
    );
  });

  return (
    <PageTransition>
      {/* ========================================================================= */}
      {/* LEVEL 1: EVENT SELECTION CARDS VIEW                                       */}
      {/* ========================================================================= */}
      {!selectedEventId ? (
        <div>
          <div className="section-head" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Student Registrations Management</h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                Review individual student applications, approve eligible candidates, cancel registrations, and track registration status.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="icon-btn"
                onClick={() => loadEventsCatalog(true)}
                disabled={eventsLoading}
                title="Refresh events list"
              >
                <FiRefreshCw className={eventsLoading ? "spin" : ""} size={16} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: 420, marginBottom: 24 }}>
            <input
              className="form-input"
              style={{ padding: "10px 14px 10px 38px", fontSize: 13.5 }}
              placeholder="Search events by title, category, venue..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
            <FiSearch
              size={15}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          </div>

          {/* Error State */}
          {eventsError && (
            <div
              className="glass-card"
              style={{
                padding: "24px",
                borderRadius: "18px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1.5px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FiAlertCircle size={24} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>Unable to Load Events</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{eventsError}</p>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => loadEventsCatalog(true)}>
                <FiRefreshCw size={13} /> Retry Loading
              </button>
            </div>
          )}

          {/* Events Grid */}
          {eventsLoading ? (
            <SkeletonGrid count={6} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<FiCalendar />}
              title="No events available"
              message="No campus events have been created yet. Create a new event from Manage Events to start accepting registrations."
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={<FiSearch />}
              title="No matching events"
              message={`No events matched "${eventSearch}". Try clearing your search query.`}
              action={
                <button className="btn btn-outline btn-sm" onClick={() => setEventSearch("")}>
                  Clear Search
                </button>
              }
            />
          ) : (
            <div className="grid-cards">
              {filteredEvents.map((ev, i) => {
                const totalRegs = ev.total_seats - ev.available_seats;
                const isPast = new Date(ev.event_date) < new Date();

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card glass-card-interactive float-card"
                    style={{
                      padding: "24px",
                      borderRadius: "22px",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      border: "1.5px solid rgba(139, 92, 246, 0.25)",
                    }}
                    onClick={() => setSelectedEventId(String(ev.id))}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span className="badge badge-info">{ev.category || "Campus Event"}</span>
                      <span className={isPast ? "badge" : "badge badge-success"} style={{ fontSize: 11.5 }}>
                        {isPast ? "Past Event" : "Active"}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                      {ev.title}
                    </h2>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        marginBottom: 16,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      {ev.description || "Manage student registrations and verify approvals."}
                    </p>

                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiCalendar size={13} color="#8b5cf6" />
                        <span>{formatDate(ev.event_date)} {ev.event_time ? `at ${ev.event_time}` : ""}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiMapPin size={13} color="#0ea5e9" />
                        <span>{ev.venue || "Campus Venue"}</span>
                      </div>
                    </div>

                    {/* Breakdown Pill */}
                    <div
                      style={{
                        background: "var(--bg-glass)",
                        padding: "10px 14px",
                        borderRadius: 12,
                        fontSize: 12.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid var(--border-color)",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Registrations</span>
                        <strong style={{ color: "#8b5cf6", fontSize: 15 }}>{totalRegs} Total</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Capacity</span>
                        <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>{ev.total_seats} Seats</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ width: "100%", justifyContent: "center", gap: 8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventId(String(ev.id));
                      }}
                    >
                      <FiUserCheck size={14} /> Manage Registrations
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* LEVEL 2: SELECTED EVENT STUDENT REGISTRATIONS WORKSPACE                   */
        /* ========================================================================= */
        <div>
          {/* Top Back Navigation & Event Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedEventId("")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiArrowLeft size={14} /> Back to All Events
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Switch Event:</label>
              <select
                className="form-select"
                style={{ minWidth: 240, maxWidth: 360, fontSize: 13 }}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>
                    {ev.title} ({ev.category || "Event"})
                  </option>
                ))}
              </select>
              <button
                className="icon-btn"
                onClick={() => loadEventRegistrations(true)}
                disabled={loadingRegs}
                title="Refresh registrations"
              >
                <FiRefreshCw className={loadingRegs ? "spin" : ""} size={16} />
              </button>
            </div>
          </div>

          {/* Selected Event Details Header Card */}
          {selectedEvent && (
            <div
              className="glass-card float-card"
              style={{
                padding: "24px 28px",
                marginBottom: 24,
                borderRadius: "22px",
                background: "var(--bg-elevated)",
                border: "1.5px solid rgba(139, 92, 246, 0.3)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 18,
                }}
              >
                <div style={{ maxWidth: 640 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-info">{selectedEvent.category || "Campus Event"}</span>
                    <span className="badge badge-primary">{selectedEvent.registration_type || "Standard"}</span>
                  </div>
                  <h1 style={{ fontSize: "clamp(20px, 3vw, 25px)", fontWeight: 700, margin: "4px 0 8px" }}>
                    {selectedEvent.title}
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {selectedEvent.description || "Review and manage individual student registration statuses."}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>📍 {selectedEvent.venue || "Campus Venue"}</span>
                    <span>📅 {formatDate(selectedEvent.event_date)} {selectedEvent.event_time ? `at ${selectedEvent.event_time}` : ""}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Total
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>{regs.length}</div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Pending
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{pendingCount}</div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Approved
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--success)" }}>{approvedCount}</div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Cancelled
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)" }}>{cancelledCount}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleExport("all")}
                      title="Download all registrations CSV"
                    >
                      <FiDownload size={13} /> Export All CSV
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExport("approved")}
                      title="Download approved registrations CSV"
                    >
                      <FiDownload size={13} /> Approved CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs & Search Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-elevated)",
                padding: 4,
                borderRadius: 14,
                border: "1.5px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeFilter === "all" ? "var(--gradient-primary)" : "transparent",
                  color: activeFilter === "all" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                All ({regs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeFilter === "pending" ? "var(--gradient-primary)" : "transparent",
                  color: activeFilter === "pending" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("approved")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeFilter === "approved" ? "var(--gradient-primary)" : "transparent",
                  color: activeFilter === "approved" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                Approved ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("cancelled")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeFilter === "cancelled" ? "var(--gradient-primary)" : "transparent",
                  color: activeFilter === "cancelled" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                Cancelled ({cancelledCount})
              </button>
            </div>

            <div style={{ position: "relative", minWidth: 280 }}>
              <input
                className="form-input"
                style={{ padding: "8px 14px 8px 34px", fontSize: 13 }}
                placeholder="Search student, reg no, branch, ticket..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <FiSearch
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Student Registrations Table */}
          <div className="glass-card table-wrap" style={{ borderRadius: "20px", overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register Number</th>
                  <th>Branch / Department</th>
                  <th>Class / Sem</th>
                  <th>Registration Date</th>
                  <th>Ticket / Pass</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRegs ? (
                  <SkeletonRow />
                ) : filteredRegs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <EmptyState
                        icon={<FiUsers />}
                        title="No registrations found"
                        message={
                          studentSearch || activeFilter !== "all"
                            ? "No student applications match your current search/filter."
                            : "No students have registered for this event yet."
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRegs.map((r) => {
                    const st = String(r.status || "registered").toLowerCase();
                    const isPending = st === "pending" || st === "registered";
                    const isApproved = st === "approved";
                    const isCancelled = st === "cancelled";

                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {r.student?.name || `Student #${r.student_id}`}
                            </span>
                            {r.student?.email && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.student.email}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
                            {r.student?.registration_number || "—"}
                          </span>
                        </td>
                        <td>{r.student?.department || "General"}</td>
                        <td>{r.student?.semester ? `Sem ${r.student.semester}` : "—"}</td>
                        <td>
                          <span style={{ fontSize: 12.5 }}>{formatDate(r.registered_at)}</span>
                        </td>
                        <td>
                          <code
                            style={{
                              background: "var(--bg-glass)",
                              padding: "3px 7px",
                              borderRadius: 6,
                              fontSize: 12,
                              color: "#a5b4fc",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            {r.ticket_code || "—"}
                          </code>
                        </td>
                        <td>
                          {isPending && (
                            <span
                              className="badge"
                              style={{
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FiClock size={11} /> PENDING
                            </span>
                          )}
                          {isApproved && (
                            <span
                              className="badge badge-success"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <FiCheckCircle size={11} /> APPROVED
                            </span>
                          )}
                          {isCancelled && (
                            <span
                              className="badge badge-danger"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <FiX size={11} /> CANCELLED
                            </span>
                          )}
                          {!isPending && !isApproved && !isCancelled && (
                            <span className="badge">{st.toUpperCase()}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: "4px 10px", fontSize: 12, background: "var(--success)", borderColor: "var(--success)" }}
                                  onClick={() => setApproveTarget(r)}
                                  title="Approve student registration"
                                >
                                  <FiCheck size={13} /> Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "rgba(239, 68, 68, 0.12)", color: "var(--danger)" }}
                                  onClick={() => setCancelTarget(r)}
                                  title="Cancel registration"
                                >
                                  <FiX size={13} /> Cancel
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: "4px 10px", fontSize: 12 }}
                                  onClick={() => setDetailsTarget(r)}
                                >
                                  <FiEye size={12} /> Details
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "rgba(239, 68, 68, 0.12)", color: "var(--danger)" }}
                                  onClick={() => setCancelTarget(r)}
                                  title="Cancel approved registration"
                                >
                                  <FiX size={13} /> Cancel
                                </button>
                              </>
                            )}

                            {isCancelled && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ padding: "4px 10px", fontSize: 12 }}
                                onClick={() => setDetailsTarget(r)}
                              >
                                <FiEye size={12} /> Details
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPROVE REGISTRATION CONFIRMATION                                 */}
      {/* ========================================================================= */}
      <Modal
        open={!!approveTarget}
        onClose={() => !actionLoading && setApproveTarget(null)}
        title="Approve Registration"
        width={460}
      >
        <div>
          <div
            style={{
              background: "rgba(34, 197, 94, 0.1)",
              padding: "16px",
              borderRadius: "14px",
              marginBottom: 16,
              border: "1px solid rgba(34, 197, 94, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FiCheckCircle size={24} color="var(--success)" />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Confirm Registration Approval
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
                This will grant the student official access to attend this event.
              </p>
            </div>
          </div>

          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.6 }}>
            <div><strong>Student:</strong> {approveTarget?.student?.name || "Student"} ({approveTarget?.student?.registration_number})</div>
            <div><strong>Event:</strong> {selectedEvent?.title}</div>
            <div><strong>Email:</strong> {approveTarget?.student?.email}</div>
          </div>

          <div
            style={{
              background: "var(--bg-glass)",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12,
              color: "#a5b4fc",
              marginBottom: 18,
              border: "1px solid var(--border-color)",
            }}
          >
            📧 The student will receive an in-app notification and an official confirmation email.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setApproveTarget(null)}
              disabled={actionLoading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, background: "var(--success)", borderColor: "var(--success)" }}
              onClick={handleConfirmApprove}
              disabled={actionLoading}
            >
              {actionLoading ? "Approving..." : "Confirm Approval"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CANCEL REGISTRATION CONFIRMATION                                  */}
      {/* ========================================================================= */}
      <Modal
        open={!!cancelTarget}
        onClose={() => !actionLoading && setCancelTarget(null)}
        title="Cancel Registration"
        width={460}
      >
        <div>
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              padding: "16px",
              borderRadius: "14px",
              marginBottom: 16,
              border: "1px solid rgba(239, 68, 68, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FiAlertTriangle size={24} color="var(--danger)" />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Cancel Student Registration?
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
                Are you sure you want to cancel this student's registration?
              </p>
            </div>
          </div>

          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.6 }}>
            <div><strong>Student:</strong> {cancelTarget?.student?.name || "Student"} ({cancelTarget?.student?.registration_number})</div>
            <div><strong>Event:</strong> {selectedEvent?.title}</div>
            <div><strong>Email:</strong> {cancelTarget?.student?.email}</div>
          </div>

          <div
            style={{
              background: "var(--bg-glass)",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 18,
              border: "1px solid var(--border-color)",
            }}
          >
            ℹ️ The record will remain saved in database with status <strong>CANCELLED</strong> for audit trail. The student will receive a cancellation email and notification.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setCancelTarget(null)}
              disabled={actionLoading}
            >
              Keep Registration
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleConfirmCancel}
              disabled={actionLoading}
            >
              {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: STUDENT REGISTRATION DETAILS VIEW                                  */}
      {/* ========================================================================= */}
      <Modal
        open={!!detailsTarget}
        onClose={() => setDetailsTarget(null)}
        title="Student Registration Details"
        width={540}
      >
        {detailsTarget && (
          <div>
            <div
              style={{
                background: "var(--bg-glass)",
                padding: "16px 20px",
                borderRadius: "16px",
                marginBottom: 18,
                border: "1px solid var(--border-color)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Student Name</span>
                <strong style={{ fontSize: 15 }}>{detailsTarget.student?.name || "Student"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Register Number</span>
                <strong style={{ fontFamily: "monospace", color: "#a5b4fc", fontSize: 14 }}>
                  {detailsTarget.student?.registration_number || "—"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Email</span>
                <span>{detailsTarget.student?.email || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Branch / Class</span>
                <span>
                  {detailsTarget.student?.department || "General"} · {detailsTarget.student?.semester ? `Sem ${detailsTarget.student.semester}` : "—"}
                </span>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-glass)",
                padding: "16px 20px",
                borderRadius: "16px",
                marginBottom: 18,
                border: "1px solid var(--border-color)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Event Title</span>
                <strong>{selectedEvent?.title}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Registration Status</span>
                <span
                  className={
                    detailsTarget.status === "approved"
                      ? "badge badge-success"
                      : detailsTarget.status === "cancelled"
                      ? "badge badge-danger"
                      : "badge badge-warning"
                  }
                  style={{ textTransform: "uppercase", fontSize: 12 }}
                >
                  {detailsTarget.status || "PENDING"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Registered Date</span>
                <span>{formatDate(detailsTarget.registered_at)}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Ticket Code</span>
                <code style={{ color: "#a5b4fc", fontFamily: "monospace" }}>{detailsTarget.ticket_code || "—"}</code>
              </div>

              {detailsTarget.approved_at && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Approved On</span>
                  <span>{formatDate(detailsTarget.approved_at)}</span>
                </div>
              )}
              {detailsTarget.approved_by_name && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Approved By</span>
                  <span>{detailsTarget.approved_by_name}</span>
                </div>
              )}
              {detailsTarget.cancelled_at && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Cancelled On</span>
                  <span>{formatDate(detailsTarget.cancelled_at)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDetailsTarget(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
