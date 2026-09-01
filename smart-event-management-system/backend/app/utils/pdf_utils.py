"""
Generates clean, professional PDFs for registration tickets and certificates.
"""
import io
import os
from reportlab.lib.pagesizes import A5, A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor


def generate_registration_slip_pdf(
    student_name: str,
    registration_number: str,
    event_title: str,
    venue: str,
    event_date: str,
    event_time: str,
    ticket_code: str,
    qr_code_path: str = None,
) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A5)
    width, height = A5

    c.setFillColor(HexColor("#4f46e5"))
    c.rect(0, height - 30 * mm, width, 30 * mm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(15 * mm, height - 18 * mm, "Event Registration Slip")

    c.setFillColorRGB(0, 0, 0)
    y = height - 45 * mm
    line_height = 7.5 * mm

    fields = [
        ("Event", event_title),
        ("Student Name", student_name),
        ("Registration No.", registration_number or "N/A"),
        ("Venue", venue),
        ("Date", event_date),
        ("Time", event_time),
        ("Ticket Code", ticket_code),
    ]

    for label, value in fields:
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(15 * mm, y, f"{label}:")
        c.setFont("Helvetica", 10.5)
        c.drawString(55 * mm, y, str(value))
        y -= line_height

    # Draw QR Code
    qr_drawn = False
    if qr_code_path and os.path.exists(qr_code_path):
        try:
            c.drawImage(qr_code_path, width - 55 * mm, 15 * mm, width=40 * mm, height=40 * mm)
            qr_drawn = True
        except Exception:
            pass

    if not qr_drawn and ticket_code:
        try:
            from reportlab.lib.utils import ImageReader
            import qrcode
            qr_img = qrcode.make(f"TICKET:{ticket_code}")
            qr_buf = io.BytesIO()
            qr_img.save(qr_buf, format="PNG")
            qr_buf.seek(0)
            c.drawImage(ImageReader(qr_buf), width - 55 * mm, 15 * mm, width=40 * mm, height=40 * mm)
        except Exception:
            pass

    c.setFont("Helvetica-Oblique", 8)
    c.drawString(15 * mm, 10 * mm, "Please present this slip and QR code at the venue entrance.")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def generate_certificate_pdf(
    student_name: str,
    registration_number: str,
    event_title: str,
    event_date: str,
    certificate_id: int = 1,
    position: str = "Certificate of Participation",
    department: str = "",
    semester: str = "",
    issuer_name: str = "Faculty Coordinator",
    college_name: str = "EventSphere",
) -> bytes:
    """
    Generates a high-resolution, certificate in Landscape A4 format.
    Supports Winners, Runners-up, Merit Awards, and Participation.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    is_winner = any(w in (position or "").lower() for w in ["winner", "1st", "first", "champion"])
    is_runner = any(w in (position or "").lower() for w in ["runner", "2nd", "3rd", "second", "third", "consolation", "special"])

    primary_color = HexColor("#f59e0b") if is_winner else HexColor("#6366f1") if is_runner else HexColor("#4f46e5")
    border_sub_color = HexColor("#fde68a") if is_winner else HexColor("#c7d2fe")

    # Background frame
    c.setFillColor(HexColor("#f8fafc"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Double Border
    c.setStrokeColor(primary_color)
    c.setLineWidth(4)
    c.rect(10 * mm, 10 * mm, width - 20 * mm, height - 20 * mm)
    c.setStrokeColor(border_sub_color)
    c.setLineWidth(1.5)
    c.rect(13 * mm, 13 * mm, width - 26 * mm, height - 26 * mm)

    # Header / Branding
    c.setFillColor(primary_color)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2.0, height - 26 * mm, college_name.upper())

    # Title
    main_title = (
        "CERTIFICATE OF ACHIEVEMENT"
        if is_winner
        else "CERTIFICATE OF MERIT"
        if is_runner
        else "CERTIFICATE OF PARTICIPATION"
    )
    c.setFillColor(HexColor("#1e1b4b"))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2.0, height - 38 * mm, main_title)

    c.setFillColor(HexColor("#64748b"))
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2.0, height - 48 * mm, "This is proudly presented to")

    # Student Name
    c.setFillColor(HexColor("#312e81"))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2.0, height - 60 * mm, student_name)

    # Student metadata details (Reg No, Branch, Class)
    sub_details = []
    if registration_number:
        sub_details.append(f"Reg No: {registration_number}")
    if department:
        sub_details.append(f"Branch: {department}")
    if semester:
        sub_details.append(f"Class/Sem: {semester}")

    if sub_details:
        c.setFillColor(HexColor("#64748b"))
        c.setFont("Helvetica", 10.5)
        c.drawCentredString(width / 2.0, height - 68 * mm, " · ".join(sub_details))

    # Achievement / Position badge text
    if position and position.lower() != "certificate of participation":
        c.setFillColor(primary_color)
        c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(
            width / 2.0,
            height - 78 * mm,
            f"— for securing {position.upper()} —",
        )
        c.setFillColor(HexColor("#334155"))
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2.0, height - 88 * mm, f'in the event "{event_title}"')
    else:
        c.setFillColor(HexColor("#334155"))
        c.setFont("Helvetica", 12)
        c.drawCentredString(
            width / 2.0,
            height - 80 * mm,
            f'for active participation and successful completion of "{event_title}"',
        )

    c.setFillColor(HexColor("#64748b"))
    c.setFont("Helvetica", 10.5)
    c.drawCentredString(width / 2.0, height - 98 * mm, f"Conducted on {event_date or 'Campus'}")

    # Signatures & Verification section
    # Left: Date & ID
    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 9.5)
    cert_num = certificate_id if certificate_id else 1
    c.drawString(25 * mm, 32 * mm, f"Certificate ID: ESP-{cert_num:06d}")
    c.setFont("Helvetica", 8.5)
    c.drawString(25 * mm, 26 * mm, "EventSphere Verified Credential")

    # Center: Verification QR Code
    try:
        from reportlab.lib.utils import ImageReader
        import qrcode
        qr_img = qrcode.make(
            f"CERTIFICATE:ESP-{cert_num:06d}|STUDENT:{student_name}|REG:{registration_number}|EVENT:{event_title}|POSITION:{position}"
        )
        qr_buf = io.BytesIO()
        qr_img.save(qr_buf, format="PNG")
        qr_buf.seek(0)
        c.drawImage(ImageReader(qr_buf), width / 2.0 - 14 * mm, 18 * mm, width=28 * mm, height=28 * mm)
    except Exception:
        pass

    # Right: Signature line
    c.setStrokeColor(HexColor("#94a3b8"))
    c.setLineWidth(1)
    c.line(width - 75 * mm, 34 * mm, width - 25 * mm, 34 * mm)
    c.setFillColor(HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 10.5)
    c.drawCentredString(width - 50 * mm, 28 * mm, issuer_name)
    c.setFillColor(HexColor("#64748b"))
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(width - 50 * mm, 23 * mm, "Authorized Signatory")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()

