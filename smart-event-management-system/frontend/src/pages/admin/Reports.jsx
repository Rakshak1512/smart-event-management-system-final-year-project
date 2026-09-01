import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiCheckSquare,
  FiAward,
  FiCheckCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import PageTransition from "../../components/common/PageTransition.jsx";
import {
  adminService,
  eventService,
  registrationService,
  resultService,
} from "../../api/services.js";
import { formatDate } from "../../utils/format.js";
import { exportToCSV } from "../../utils/exportUtils.js";

export default function AdminReports() {
  const [downloading, setDownloading] = useState({});

  const triggerDownload = async (key, fetchAndExportFn) => {
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      await fetchAndExportFn();
      toast.success("Report downloaded successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate report.");
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // 1. Faculty Directory Export
  const exportFaculty = async () => {
    const { data } = await adminService.facultyList();
    const headers = [
      "Faculty ID",
      "Full Name",
      "Email Address",
      "Phone",
      "Department",
      "Active Tasks",
      "Completed Tasks",
      "Total Assigned Tasks",
      "Events Organized",
      "Email Verified",
      "Joined Date",
    ];
    const rows = (data || []).map((f) => [
      f.registration_number || `FAC-${f.id}`,
      f.name,
      f.email,
      f.phone || "N/A",
      f.department || "General",
      f.active_tasks_count || 0,
      f.completed_tasks_count || 0,
      f.total_assigned_tasks || 0,
      f.events_organized_count || 0,
      f.is_email_verified ? "Yes" : "No",
      formatDate(f.created_at),
    ]);
    exportToCSV("faculty-directory.csv", headers, rows);
  };

  // 2. Faculty Assignments Export
  const exportAssignments = async () => {
    const { data } = await adminService.assignments();
    const headers = [
      "Task ID",
      "Task Title",
      "Assigned Faculty",
      "Faculty Email",
      "Department",
      "Priority",
      "Status",
      "Deadline",
      "Associated Event",
      "Assigned By",
      "Created Date",
    ];
    const rows = (data || []).map((t) => [
      `TASK-${t.id}`,
      t.title,
      t.faculty_name,
      t.faculty_email,
      t.faculty_department || "General",
      t.priority?.toUpperCase() || "MEDIUM",
      t.status?.toUpperCase() || "PENDING",
      t.deadline || "None",
      t.event_title || "N/A",
      t.assigned_by_name || "Admin",
      formatDate(t.created_at),
    ]);
    exportToCSV("faculty-assignments.csv", headers, rows);
  };

  // 3. Master Events Export
  const exportEvents = async () => {
    const { data } = await eventService.list({ page: 1, page_size: 500 });
    const items = data.items || [];
    const headers = [
      "Event ID",
      "Title",
      "Category",
      "Organizer",
      "Date",
      "Time",
      "Venue",
      "Total Seats",
      "Available Seats",
      "Registrations Received",
      "Registration Type",
      "Created Date",
    ];
    const rows = items.map((e) => [
      `EVT-${e.id}`,
      e.title,
      e.category || "General",
      e.organizer_name || "Faculty Coordinator",
      e.event_date,
      e.event_time || "TBA",
      e.venue || "Campus Venue",
      e.total_seats,
      e.available_seats,
      e.total_seats - e.available_seats,
      e.registration_type || "Both",
      formatDate(e.created_at),
    ]);
    exportToCSV("master-events-report.csv", headers, rows);
  };

  // 4. Registrations Export (all events)
  const exportRegistrations = async () => {
    const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
    const events = evData.items || [];
    const allRows = [];

    for (const ev of events) {
      try {
        const { data: regs } = await registrationService.forEvent(ev.id);
        for (const r of regs || []) {
          allRows.push([
            r.student?.name || `Student #${r.student_id}`,
            r.student?.registration_number || "N/A",
            r.student?.email || "N/A",
            r.student?.department || "N/A",
            ev.title,
            r.ticket_code || "N/A",
            r.status,
            r.status === "attended" || r.checked_in_at ? "Present" : "Pending",
            formatDate(r.registered_at),
          ]);
        }
      } catch (e) {}
    }

    const headers = [
      "Student Name",
      "Registration Number",
      "Email",
      "Department",
      "Event Title",
      "Ticket Code",
      "Registration Status",
      "Attendance Status",
      "Registration Date",
    ];
    exportToCSV("all-registrations-report.csv", headers, allRows);
  };

  // 5. Master Attendance Export
  const exportAttendance = async () => {
    const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
    const events = evData.items || [];
    const allRows = [];

    for (const ev of events) {
      try {
        const { data: regs } = await registrationService.forEvent(ev.id);
        const attended = (regs || []).filter(
          (r) => r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)
        );
        for (const r of attended) {
          allRows.push([
            r.student?.name || `Student #${r.student_id}`,
            r.student?.registration_number || "N/A",
            r.student?.email || "N/A",
            r.student?.department || "N/A",
            ev.title,
            "Present",
            r.checked_in_at ? formatDate(r.checked_in_at) : "Confirmed",
            r.checked_in_by || "Volunteer Desk",
            r.ticket_code || "N/A",
          ]);
        }
      } catch (e) {}
    }

    const headers = [
      "Student Name",
      "Registration Number",
      "Email",
      "Department",
      "Event Title",
      "Attendance Status",
      "Check-in Timestamp",
      "Verified By",
      "Ticket Code",
    ];
    exportToCSV("all-attendance-report.csv", headers, allRows);
  };

  // 6. Master Results Export
  const exportResults = async () => {
    const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
    const events = evData.items || [];
    const allRows = [];

    for (const ev of events) {
      try {
        const { data: resList } = await resultService.forEvent(ev.id);
        for (const res of resList || []) {
          allRows.push([
            ev.title,
            res.position || "Winner",
            res.student_name || "Student",
            res.registration_number || "N/A",
            res.student_department || "N/A",
            res.score_or_remarks || "N/A",
            res.certificate_id ? `Yes (ID: ESP-${res.certificate_id})` : "No",
            res.declared_by_name || "Faculty Coordinator",
            formatDate(res.created_at),
          ]);
        }
      } catch (e) {}
    }

    const headers = [
      "Event Title",
      "Award Position",
      "Student Name",
      "Registration Number",
      "Department",
      "Remarks / Score",
      "Certificate Issued",
      "Declared By",
      "Declared Date",
    ];
    exportToCSV("all-event-results-report.csv", headers, allRows);
  };

  const reportCards = [
    {
      key: "faculty",
      title: "Faculty Directory & Allocation Report",
      desc: "Complete faculty roster, departments, assigned administrative duties, and contact directory.",
      icon: FiUsers,
      color: "#8b5cf6",
      filename: "faculty-directory.csv",
      fn: exportFaculty,
    },
    {
      key: "assignments",
      title: "Faculty Work Assignments Report",
      desc: "All administrative task allocations, priority ratings, status updates, and deadline milestones.",
      icon: FiCheckSquare,
      color: "#f59e0b",
      filename: "faculty-assignments.csv",
      fn: exportAssignments,
    },
    {
      key: "events",
      title: "Master Events Catalog",
      desc: "All events, capacities, date & venues, organizers, and registration fill rates.",
      icon: FiCalendar,
      color: "#0ea5e9",
      filename: "master-events-report.csv",
      fn: exportEvents,
    },
    {
      key: "registrations",
      title: "Student Registrations Master Report",
      desc: "Comprehensive database of student event registrations, team formations, and ticket codes.",
      icon: FiFileText,
      color: "#d946ef",
      filename: "all-registrations-report.csv",
      fn: exportRegistrations,
    },
    {
      key: "attendance",
      title: "Campus Attendance Logs Report",
      desc: "Verified attendee check-in logs, check-in timestamps, and volunteer verifier records.",
      icon: FiCheckCircle,
      color: "#22c55e",
      filename: "all-attendance-report.csv",
      fn: exportAttendance,
    },
    {
      key: "results",
      title: "Event Results & Winners Summary",
      desc: "Institutional standings, awarded winner positions, certificate links, and faculty remarks.",
      icon: FiAward,
      color: "#ec4899",
      filename: "all-event-results-report.csv",
      fn: exportResults,
    },
  ];

  return (
    <PageTransition>
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Institutional Reports & Data Exports</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Generate and download standard CSV reports for accreditation, institutional analysis, and audit trails.
          </p>
        </div>
      </div>

      <div className="grid-cards">
        {reportCards.map((rc, i) => (
          <motion.div
            key={rc.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card float-card"
            style={{
              padding: "24px",
              borderRadius: "22px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `rgba(${rc.color === "#8b5cf6" ? "139, 92, 246" : rc.color === "#f59e0b" ? "245, 158, 11" : rc.color === "#0ea5e9" ? "14, 165, 233" : rc.color === "#22c55e" ? "34, 197, 94" : rc.color === "#ec4899" ? "236, 72, 153" : "217, 70, 239"}, 0.15)`,
                  color: rc.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <rc.icon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>{rc.title}</h3>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {rc.filename}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              {rc.desc}
            </p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ width: "100%", justifyContent: "center", gap: 8 }}
              disabled={downloading[rc.key]}
              onClick={() => triggerDownload(rc.key, rc.fn)}
            >
              <FiDownload size={14} />
              {downloading[rc.key] ? "Generating CSV..." : "Download Report (CSV)"}
            </button>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}
