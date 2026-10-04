from datetime import datetime
from typing import Optional


class Certificate:
    def __init__(
        self,
        id: int,
        registration_number: str,
        title: str,
        file_path: str,
        event_id: Optional[int] = None,
        uploaded_by: Optional[int] = None,
        uploaded_at: Optional[datetime] = None,
        pdf_base64: Optional[str] = None,
        student_id: Optional[int] = None,
        student_name: Optional[str] = None,
        department: Optional[str] = None,
        semester: Optional[str] = None,
        event_title: Optional[str] = None,
        award_standing: Optional[str] = None,
        achievement_wording: Optional[str] = None,
        score_or_remarks: Optional[str] = None,
        certificate_issuance_mode: Optional[str] = "upload",
        email_notification_status: Optional[str] = None,
    ):
        try:
            self.id = int(id)
        except (ValueError, TypeError):
            self.id = id
        self.registration_number = str(registration_number or "")
        self.title = title or ""
        self.file_path = file_path or ""
        self.event_id = int(event_id) if event_id is not None and str(event_id).isdigit() else event_id
        self.uploaded_by = int(uploaded_by) if uploaded_by is not None and str(uploaded_by).isdigit() else uploaded_by
        self.uploaded_at = uploaded_at or datetime.utcnow()
        self.pdf_base64 = pdf_base64

        self.student_id = int(student_id) if student_id is not None and str(student_id).isdigit() else student_id
        self.student_name = student_name or ""
        self.department = department or ""
        self.semester = str(semester) if semester is not None else ""
        self.event_title = event_title or ""
        self.award_standing = award_standing or ""
        self.achievement_wording = achievement_wording or ""
        self.score_or_remarks = score_or_remarks or ""
        self.certificate_issuance_mode = certificate_issuance_mode or "upload"
        self.email_notification_status = email_notification_status or "pending"

    def to_dict(self) -> dict:
        data = {
            "id": self.id,
            "registration_number": self.registration_number,
            "title": self.title,
            "file_path": self.file_path,
            "event_id": self.event_id,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "department": self.department,
            "semester": self.semester,
            "event_title": self.event_title,
            "award_standing": self.award_standing,
            "achievement_wording": self.achievement_wording,
            "score_or_remarks": self.score_or_remarks,
            "certificate_issuance_mode": self.certificate_issuance_mode,
            "email_notification_status": self.email_notification_status,
        }
        if self.pdf_base64:
            data["pdf_base64"] = self.pdf_base64
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Certificate":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            registration_number=data.get("registration_number", ""),
            title=data.get("title", ""),
            file_path=data.get("file_path", ""),
            event_id=data.get("event_id"),
            uploaded_by=data.get("uploaded_by"),
            uploaded_at=data.get("uploaded_at"),
            pdf_base64=data.get("pdf_base64"),
            student_id=data.get("student_id"),
            student_name=data.get("student_name"),
            department=data.get("department"),
            semester=data.get("semester"),
            event_title=data.get("event_title"),
            award_standing=data.get("award_standing"),
            achievement_wording=data.get("achievement_wording"),
            score_or_remarks=data.get("score_or_remarks"),
            certificate_issuance_mode=data.get("certificate_issuance_mode", "upload"),
            email_notification_status=data.get("email_notification_status"),
        )
