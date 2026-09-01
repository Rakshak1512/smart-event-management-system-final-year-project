import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./format.js";
import { slugifyFilename } from "./exportUtils.js";

// Helper to format safe filenames
const getPdfFilename = (eventTitle, reportType) => {
  const cleanTitle = (eventTitle || "Event").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
  return `EventSphere_${cleanTitle}_${reportType}.pdf`;
};

// Common header drawer for PDF documents
const drawHeader = (doc, title, subtitle, event) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner background
  doc.setFillColor(79, 70, 229); // Primary Indigo #4f46e5
  doc.rect(0, 0, pageWidth, 28, "F");

  // Secondary accent line
  doc.setFillColor(168, 85, 247); // Purple accent #a855f7
  doc.rect(0, 28, pageWidth, 2, "F");

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EventSphere", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("EventSphere", 14, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), pageWidth - 14, 18, { align: "right" });

  // Event Details Box
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  let y = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.text("Event:", 18, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(String(event?.title || "Event"), 32, y + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Category:", 18, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(String(event?.category || "General"), 35, y + 15);

  const col2X = pageWidth / 2 - 20;
  doc.setFont("helvetica", "bold");
  doc.text("Date & Time:", col2X, y + 7);
  doc.setFont("helvetica", "normal");
  const timeStr = event?.event_time ? ` at ${event.event_time}` : "";
  doc.text(`${formatDate(event?.event_date)}${timeStr}`, col2X + 22, y + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Venue:", col2X, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(String(event?.venue || "Venue"), col2X + 14, y + 15);

  const col3X = (pageWidth * 3) / 4 - 10;
  doc.setFont("helvetica", "bold");
  doc.text("Generated:", col3X, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), col3X + 20, y + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Status:", col3X, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text("Official Report", col3X + 14, y + 15);

  return y + 28;
};

// Add page numbering footer
const addPageNumbers = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("EventSphere · Confidential & Official Roster", 14, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  }
};

/**
 * 1. REGISTRATION REPORT PDF (ONLY APPROVED STUDENTS)
 */
export const generateRegistrationReportPDF = ({ event, registrations }) => {
  // Filter strictly APPROVED registrations
  const approvedOnly = (registrations || []).filter(
    (r) =>
      r.status === "approved" ||
      r.status === "attended" ||
      r.status === "completed" ||
      Boolean(r.checked_in_at)
  );

  const attendedCount = approvedOnly.filter(
    (r) => r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)
  ).length;
  const notAttendedCount = Math.max(0, approvedOnly.length - attendedCount);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const startY = drawHeader(doc, "Registration Report", "Official Approved Students Roster", event);

  // Summary Metrics Bar
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(243, 232, 255); // Light purple
  doc.setDrawColor(192, 132, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 33, 168);
  doc.text(`Approved Registrations: ${approvedOnly.length}`, 20, startY + 8);
  doc.setTextColor(22, 101, 52); // Green
  doc.text(`Attended: ${attendedCount}`, pageWidth / 2 - 30, startY + 8);
  doc.setTextColor(154, 52, 18); // Amber
  doc.text(`Not Attended: ${notAttendedCount}`, (pageWidth * 3) / 4 - 30, startY + 8);

  // Table Data
  const tableHeaders = [
    [
      "S.No",
      "Student Name",
      "Register No",
      "Email Address",
      "Branch / Dept",
      "Class / Sem",
      "Registration Date",
      "Ticket Code",
      "Attendance",
    ],
  ];

  const tableBody = approvedOnly.map((r, index) => {
    const isAttended =
      r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at);

    return [
      index + 1,
      r.student?.name || `Student #${r.student_id}`,
      r.student?.registration_number || "N/A",
      r.student?.email || "N/A",
      r.student?.department || "General",
      r.student?.semester ? `Sem ${r.student.semester}` : "N/A",
      formatDate(r.registered_at),
      r.ticket_code || "N/A",
      isAttended ? "Attended" : "Not Attended",
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableBody,
    startY: startY + 16,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 48 },
      4: { cellWidth: 32 },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 28, halign: "center" },
      7: { cellWidth: 28, halign: "center" },
      8: { cellWidth: 24, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 8) {
        if (data.cell.raw === "Attended") {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [156, 163, 175];
        }
      }
    },
  });

  addPageNumbers(doc);
  doc.save(getPdfFilename(event?.title, "Registration_Report"));
};

/**
 * 2. ATTENDANCE REPORT PDF (ONLY ATTENDED APPROVED STUDENTS)
 */
export const generateAttendanceReportPDF = ({ event, registrations }) => {
  // Only students confirmed present via volunteer QR scan
  const attendedOnly = (registrations || []).filter(
    (r) =>
      r.status === "attended" ||
      r.status === "completed" ||
      Boolean(r.checked_in_at)
  );

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const startY = drawHeader(doc, "Attendance Report", "Official Verified Attendees", event);

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(220, 252, 231); // Light green
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, "FD");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text(`Total Verified Attendees: ${attendedOnly.length} Students`, 20, startY + 8);
  doc.text(`Attendance Status: Confirmed Present`, pageWidth - 80, startY + 8);

  const tableHeaders = [
    [
      "S.No",
      "Student Name",
      "Register No",
      "Email Address",
      "Branch / Dept",
      "Class / Sem",
      "Attendance Timestamp",
      "Verified By",
      "Ticket Code",
      "Status",
    ],
  ];

  const tableBody = attendedOnly.map((r, index) => {
    return [
      index + 1,
      r.student?.name || `Student #${r.student_id}`,
      r.student?.registration_number || "N/A",
      r.student?.email || "N/A",
      r.student?.department || "General",
      r.student?.semester ? `Sem ${r.student.semester}` : "N/A",
      r.checked_in_at ? formatDate(r.checked_in_at) : "Confirmed",
      r.checked_in_by || "Volunteer Desk",
      r.ticket_code || "N/A",
      "Attended",
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableBody,
    startY: startY + 16,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: {
      fillColor: [16, 185, 129], // Emerald green #10b981
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 38 },
      2: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 44 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 32, halign: "center" },
      7: { cellWidth: 30 },
      8: { cellWidth: 24, halign: "center" },
      9: { cellWidth: 20, halign: "center", fontStyle: "bold", textColor: [22, 101, 52] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  addPageNumbers(doc);
  doc.save(getPdfFilename(event?.title, "Attendance_Report"));
};

/**
 * 3. RESULTS REPORT PDF (DECLARED STANDINGS)
 */
export const generateResultsReportPDF = ({ event, results }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = drawHeader(doc, "Results & Standings", "Official Event Standings", event);

  const tableHeaders = [
    [
      "S.No",
      "Award / Standing",
      "Student Name",
      "Register No",
      "Branch",
      "Class",
      "Score / Remarks",
      "Certificate",
    ],
  ];

  const tableBody = (results || []).map((res, index) => {
    return [
      index + 1,
      res.position || "Winner",
      res.student_name || "Student",
      res.registration_number || "N/A",
      res.student_department || "N/A",
      res.student_semester ? `Sem ${res.student_semester}` : "—",
      res.score_or_remarks || "—",
      res.certificate_id ? `Issued (ESP-${res.certificate_id})` : "Not Uploaded",
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableBody,
    startY: startY + 8,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: {
      fillColor: [139, 92, 246], // Purple
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 34, fontStyle: "bold" },
      2: { cellWidth: 32 },
      3: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 22 },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: 24 },
      7: { cellWidth: 22, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  addPageNumbers(doc);
  doc.save(getPdfFilename(event?.title, "Results"));
};

/**
 * 4. WINNERS REPORT PDF
 */
export const generateWinnersReportPDF = ({ event, results }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = drawHeader(doc, "Official Winners Roster", "Campus Award Winners", event);

  const tableHeaders = [
    [
      "Position",
      "Student Name",
      "Register No",
      "Department",
      "Event Title",
      "Certificate ID",
    ],
  ];

  const tableBody = (results || []).map((res) => {
    return [
      res.position || "Winner",
      res.student_name || "Student",
      res.registration_number || "N/A",
      res.student_department || "General",
      event?.title || "Event",
      res.certificate_id ? `ESP-${res.certificate_id}` : "Pending",
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableBody,
    startY: startY + 8,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: {
      fillColor: [245, 158, 11], // Amber gold
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold" },
      1: { cellWidth: 40 },
      2: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 30 },
      4: { cellWidth: 32 },
      5: { cellWidth: 24, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [254, 252, 232],
    },
  });

  addPageNumbers(doc);
  doc.save(getPdfFilename(event?.title, "Winners"));
};
