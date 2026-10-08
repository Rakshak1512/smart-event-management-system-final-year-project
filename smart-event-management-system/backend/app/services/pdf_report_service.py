"""
Professional PDF Report Generation for EventSphere.
Generates institutional approval reports for students and faculty using ReportLab.
"""
from datetime import datetime, timezone
import io
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.user import User


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to calculate total page count and render professional footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        page_w, page_h = self._pagesize

        # Subtle top accent line
        self.setStrokeColor(HexColor("#6366f1"))
        self.setLineWidth(2)
        self.line(15 * mm, page_h - 10 * mm, page_w - 15 * mm, page_h - 10 * mm)

        # Footer divider
        self.setStrokeColor(HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(15 * mm, 14 * mm, page_w - 15 * mm, 14 * mm)

        # Footer text
        self.setFont("Helvetica", 8)
        self.setFillColor(HexColor("#64748b"))
        self.drawString(
            15 * mm,
            9 * mm,
            "EventSphere • Official Institutional Verification & Approval System • Confidential",
        )
        self.drawRightString(
            page_w - 15 * mm,
            9 * mm,
            f"Page {self._pageNumber} of {total_pages}",
        )
        self.restoreState()


def _get_report_styles():
    base_styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=base_styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=HexColor("#1e1b4b"),
        spaceAfter=2,
    )

    brand_style = ParagraphStyle(
        "BrandHeader",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=HexColor("#4f46e5"),
    )

    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=HexColor("#475569"),
    )

    meta_val = ParagraphStyle(
        "MetaVal",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=HexColor("#0f172a"),
    )

    th_style = ParagraphStyle(
        "TableHeader",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0,
    )

    cell_style = ParagraphStyle(
        "TableCell",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=HexColor("#1e293b"),
    )

    cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=HexColor("#0f172a"),
    )

    cell_muted = ParagraphStyle(
        "TableCellMuted",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=HexColor("#64748b"),
    )

    status_pending = ParagraphStyle(
        "StatusPending",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=HexColor("#b45309"),
    )

    status_approved = ParagraphStyle(
        "StatusApproved",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=HexColor("#047857"),
    )

    status_rejected = ParagraphStyle(
        "StatusRejected",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=HexColor("#b91c1c"),
    )

    return {
        "title": title_style,
        "brand": brand_style,
        "meta_label": meta_label,
        "meta_val": meta_val,
        "th": th_style,
        "cell": cell_style,
        "cell_bold": cell_bold,
        "cell_muted": cell_muted,
        "pending": status_pending,
        "approved": status_approved,
        "rejected": status_rejected,
    }


def _format_date(dt: Optional[datetime]) -> str:
    if not dt:
        return "N/A"
    try:
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(dt)[:10]


def _format_datetime(dt: Optional[datetime]) -> str:
    if not dt:
        dt = datetime.now(timezone.utc)
    try:
        return dt.strftime("%d/%m/%Y %H:%M:%S UTC")
    except Exception:
        return str(dt)


def generate_student_approval_pdf(students: List[User], report_type_label: str) -> bytes:
    """
    Generate professional landscape A4 PDF report for Student Approvals.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
    )

    styles = _get_report_styles()
    story = []

    # 1. Header Banner Box
    header_data = [
        [
            Paragraph("EVENTSPHERE", styles["brand"]),
            Paragraph(f"<b>Report:</b> Student Approval Report", styles["meta_label"]),
        ],
        [
            Paragraph("<b>Smart Event Management System</b>", styles["title"]),
            Paragraph(f"<b>Report Type:</b> {report_type_label}", styles["meta_label"]),
        ],
        [
            Paragraph("Institutional Academic Administration Directorate", styles["cell_muted"]),
            Paragraph(f"<b>Generated Date:</b> {_format_datetime(datetime.now(timezone.utc))}", styles["meta_val"]),
        ],
    ]
    header_table = Table(header_data, colWidths=[170 * mm, 97 * mm])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # 2. Summary Badge Bar
    pending_count = sum(1 for s in students if (s.approval_status or "PENDING").upper() == "PENDING")
    approved_count = sum(1 for s in students if (s.approval_status or "PENDING").upper() == "APPROVED")
    rejected_count = sum(1 for s in students if (s.approval_status or "PENDING").upper() == "REJECTED")
    total_count = len(students)

    summary_data = [
        [
            Paragraph(f"<b>Total Records:</b> {total_count}", styles["cell_bold"]),
            Paragraph(f"<b>Pending:</b> {pending_count}", styles["pending"]),
            Paragraph(f"<b>Approved:</b> {approved_count}", styles["approved"]),
            Paragraph(f"<b>Rejected:</b> {rejected_count}", styles["rejected"]),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[65 * mm, 67 * mm, 67 * mm, 68 * mm])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 5 * mm))

    # 3. Main Data Table
    # Column Widths: 267 mm total
    col_widths = [10 * mm, 42 * mm, 28 * mm, 52 * mm, 25 * mm, 32 * mm, 22 * mm, 24 * mm, 32 * mm]
    table_rows = [
        [
            Paragraph("#", styles["th"]),
            Paragraph("Student Name", styles["th"]),
            Paragraph("UUCMS ID", styles["th"]),
            Paragraph("Email", styles["th"]),
            Paragraph("Course", styles["th"]),
            Paragraph("Department", styles["th"]),
            Paragraph("Year / Sem", styles["th"]),
            Paragraph("Reg. Date", styles["th"]),
            Paragraph("Status", styles["th"]),
        ]
    ]

    for idx, s in enumerate(students, 1):
        st = (s.approval_status or "PENDING").upper()
        if st == "APPROVED":
            st_style = styles["approved"]
            st_text = "APPROVED"
        elif st == "REJECTED":
            st_style = styles["rejected"]
            st_text = "REJECTED"
        else:
            st_style = styles["pending"]
            st_text = "PENDING"

        # Course and department handling
        course_val = getattr(s, "course", None) or (f"{s.department} UG" if s.department else "B.Tech / Degree")
        dept_val = s.department or "General"
        sem_val = f"Sem {s.semester}" if s.semester else "—"

        status_cells = [Paragraph(st_text, st_style)]
        if st == "REJECTED" and getattr(s, "rejection_reason", None):
            status_cells.append(Paragraph(f"<i>Reason: {s.rejection_reason[:50]}</i>", styles["cell_muted"]))

        table_rows.append([
            Paragraph(str(idx), styles["cell_muted"]),
            Paragraph(f"<b>{s.name or 'N/A'}</b>", styles["cell_bold"]),
            Paragraph(s.registration_number or "—", styles["cell_muted"]),
            Paragraph(s.email or "—", styles["cell"]),
            Paragraph(course_val, styles["cell"]),
            Paragraph(dept_val, styles["cell"]),
            Paragraph(sem_val, styles["cell"]),
            Paragraph(_format_date(s.created_at), styles["cell"]),
            status_cells if len(status_cells) > 1 else status_cells[0],
        ])

    if len(students) == 0:
        table_rows.append([
            Paragraph("—", styles["cell_muted"]),
            Paragraph(f"No student records found under '{report_type_label}'.", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
        ])

    data_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#4338ca")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
    ]

    # Alternating row background
    for i in range(1, len(table_rows)):
        if i % 2 == 0:
            t_style.append(("BACKGROUND", (0, i), (-1, i), HexColor("#f8fafc")))
        else:
            t_style.append(("BACKGROUND", (0, i), (-1, i), colors.white))

    data_table.setStyle(TableStyle(t_style))
    story.append(data_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.read()


def generate_faculty_approval_pdf(faculty_list: List[User], report_type_label: str) -> bytes:
    """
    Generate professional landscape A4 PDF report for Faculty Approvals.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
    )

    styles = _get_report_styles()
    story = []

    # 1. Header Banner Box
    header_data = [
        [
            Paragraph("EVENTSPHERE", styles["brand"]),
            Paragraph(f"<b>Report:</b> Faculty Approval Report", styles["meta_label"]),
        ],
        [
            Paragraph("<b>Smart Event Management System</b>", styles["title"]),
            Paragraph(f"<b>Report Type:</b> {report_type_label}", styles["meta_label"]),
        ],
        [
            Paragraph("Institutional Academic & Faculty Governance Directorate", styles["cell_muted"]),
            Paragraph(f"<b>Generated Date:</b> {_format_datetime(datetime.now(timezone.utc))}", styles["meta_val"]),
        ],
    ]
    header_table = Table(header_data, colWidths=[170 * mm, 97 * mm])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # 2. Summary Badge Bar
    pending_count = sum(1 for f in faculty_list if (f.approval_status or "PENDING").upper() == "PENDING")
    approved_count = sum(1 for f in faculty_list if (f.approval_status or "PENDING").upper() == "APPROVED")
    rejected_count = sum(1 for f in faculty_list if (f.approval_status or "PENDING").upper() == "REJECTED")
    total_count = len(faculty_list)

    summary_data = [
        [
            Paragraph(f"<b>Total Records:</b> {total_count}", styles["cell_bold"]),
            Paragraph(f"<b>Pending:</b> {pending_count}", styles["pending"]),
            Paragraph(f"<b>Approved:</b> {approved_count}", styles["approved"]),
            Paragraph(f"<b>Rejected:</b> {rejected_count}", styles["rejected"]),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[65 * mm, 67 * mm, 67 * mm, 68 * mm])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 5 * mm))

    # 3. Main Data Table
    # Column Widths: 267 mm total
    col_widths = [10 * mm, 45 * mm, 28 * mm, 52 * mm, 35 * mm, 35 * mm, 26 * mm, 36 * mm]
    table_rows = [
        [
            Paragraph("#", styles["th"]),
            Paragraph("Faculty Name", styles["th"]),
            Paragraph("Faculty ID", styles["th"]),
            Paragraph("Email", styles["th"]),
            Paragraph("Department", styles["th"]),
            Paragraph("Designation", styles["th"]),
            Paragraph("Reg. Date", styles["th"]),
            Paragraph("Status", styles["th"]),
        ]
    ]

    for idx, f in enumerate(faculty_list, 1):
        st = (f.approval_status or "PENDING").upper()
        if st == "APPROVED":
            st_style = styles["approved"]
            st_text = "APPROVED"
        elif st == "REJECTED":
            st_style = styles["rejected"]
            st_text = "REJECTED"
        else:
            st_style = styles["pending"]
            st_text = "PENDING"

        fac_id = f.admin_id or f.registration_number or f"FAC-{f.id}"
        designation = getattr(f, "designation", None) or "Faculty Coordinator"
        dept_val = f.department or "General"

        status_cells = [Paragraph(st_text, st_style)]
        if st == "REJECTED" and getattr(f, "rejection_reason", None):
            status_cells.append(Paragraph(f"<i>Reason: {f.rejection_reason[:50]}</i>", styles["cell_muted"]))

        table_rows.append([
            Paragraph(str(idx), styles["cell_muted"]),
            Paragraph(f"<b>{f.name or 'N/A'}</b>", styles["cell_bold"]),
            Paragraph(fac_id, styles["cell_muted"]),
            Paragraph(f.email or "—", styles["cell"]),
            Paragraph(dept_val, styles["cell"]),
            Paragraph(designation, styles["cell"]),
            Paragraph(_format_date(f.created_at), styles["cell"]),
            status_cells if len(status_cells) > 1 else status_cells[0],
        ])

    if len(faculty_list) == 0:
        table_rows.append([
            Paragraph("—", styles["cell_muted"]),
            Paragraph(f"No faculty records found under '{report_type_label}'.", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
        ])

    data_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#312e81")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
    ]

    for i in range(1, len(table_rows)):
        if i % 2 == 0:
            t_style.append(("BACKGROUND", (0, i), (-1, i), HexColor("#f8fafc")))
        else:
            t_style.append(("BACKGROUND", (0, i), (-1, i), colors.white))

    data_table.setStyle(TableStyle(t_style))
    story.append(data_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.read()


def generate_volunteer_approval_pdf(volunteers: List[User], report_type_label: str) -> bytes:
    """
    Generate professional landscape A4 PDF report for Volunteer Approvals.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
    )

    styles = _get_report_styles()
    story = []

    # 1. Header Banner Box
    header_data = [
        [
            Paragraph("EVENTSPHERE", styles["brand"]),
            Paragraph("<b>Official Institutional Report</b>", styles["meta_label"]),
        ],
        [
            Paragraph("<b>Volunteer Approval Report</b>", styles["title"]),
            Paragraph(f"<b>Report Type:</b> {report_type_label}", styles["meta_label"]),
        ],
        [
            Paragraph("Institutional Student & Volunteer Activities Board", styles["cell_muted"]),
            Paragraph(f"<b>Generated Date:</b> {_format_datetime(datetime.now(timezone.utc))}", styles["meta_val"]),
        ],
    ]
    header_table = Table(header_data, colWidths=[170 * mm, 97 * mm])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # 2. Summary Badge Bar
    pending_count = sum(1 for v in volunteers if (v.approval_status or "PENDING").upper() == "PENDING")
    approved_count = sum(1 for v in volunteers if (v.approval_status or "PENDING").upper() == "APPROVED")
    rejected_count = sum(1 for v in volunteers if (v.approval_status or "PENDING").upper() == "REJECTED")
    total_count = len(volunteers)

    summary_data = [
        [
            Paragraph(f"<b>Total Records:</b> {total_count}", styles["cell_bold"]),
            Paragraph(f"<b>Pending:</b> {pending_count}", styles["pending"]),
            Paragraph(f"<b>Approved:</b> {approved_count}", styles["approved"]),
            Paragraph(f"<b>Rejected:</b> {rejected_count}", styles["rejected"]),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[65 * mm, 67 * mm, 67 * mm, 68 * mm])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 5 * mm))

    # 3. Main Data Table
    # Column Widths: 267 mm total
    col_widths = [10 * mm, 42 * mm, 28 * mm, 52 * mm, 25 * mm, 32 * mm, 22 * mm, 24 * mm, 32 * mm]
    table_rows = [
        [
            Paragraph("#", styles["th"]),
            Paragraph("Volunteer Name", styles["th"]),
            Paragraph("Volunteer ID", styles["th"]),
            Paragraph("Email", styles["th"]),
            Paragraph("Department", styles["th"]),
            Paragraph("Course", styles["th"]),
            Paragraph("Year / Sem", styles["th"]),
            Paragraph("Reg. Date", styles["th"]),
            Paragraph("Status", styles["th"]),
        ]
    ]

    for idx, v in enumerate(volunteers, 1):
        st = (v.approval_status or "PENDING").upper()
        if st == "APPROVED":
            st_style = styles["approved"]
            st_text = "APPROVED"
        elif st == "REJECTED":
            st_style = styles["rejected"]
            st_text = "REJECTED"
        else:
            st_style = styles["pending"]
            st_text = "PENDING"

        vol_id = v.registration_number or v.admin_id or f"VOL-{v.id}"
        course_val = getattr(v, "course", None) or (f"{v.department} UG" if v.department else "B.Tech / Degree")
        dept_val = v.department or "General"
        sem_val = f"Sem {v.semester}" if v.semester else "—"

        status_cells = [Paragraph(st_text, st_style)]
        if st == "REJECTED" and getattr(v, "rejection_reason", None):
            status_cells.append(Paragraph(f"<i>Reason: {v.rejection_reason[:50]}</i>", styles["cell_muted"]))

        table_rows.append([
            Paragraph(str(idx), styles["cell_muted"]),
            Paragraph(f"<b>{v.name or 'N/A'}</b>", styles["cell_bold"]),
            Paragraph(vol_id, styles["cell_muted"]),
            Paragraph(v.email or "—", styles["cell"]),
            Paragraph(dept_val, styles["cell"]),
            Paragraph(course_val, styles["cell"]),
            Paragraph(sem_val, styles["cell"]),
            Paragraph(_format_date(v.created_at), styles["cell"]),
            status_cells if len(status_cells) > 1 else status_cells[0],
        ])

    if len(volunteers) == 0:
        table_rows.append([
            Paragraph("—", styles["cell_muted"]),
            Paragraph(f"<b>No records found for this report.</b><br/>Total Records: 0", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
            Paragraph("—", styles["cell_muted"]),
        ])

    data_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#0d9488")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
    ]

    for i in range(1, len(table_rows)):
        if i % 2 == 0:
            t_style.append(("BACKGROUND", (0, i), (-1, i), HexColor("#f8fafc")))
        else:
            t_style.append(("BACKGROUND", (0, i), (-1, i), colors.white))

    data_table.setStyle(TableStyle(t_style))
    story.append(data_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.read()
