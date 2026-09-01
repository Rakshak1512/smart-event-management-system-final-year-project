from datetime import datetime
from typing import Optional


class EventResult:
    def __init__(
        self,
        id: Optional[int] = 0,
        event_id: int = 0,
        event_title: str = "",
        student_id: int = 0,
        student_name: str = "",
        registration_number: str = "",
        student_email: Optional[str] = None,
        student_department: Optional[str] = None,
        position: str = "Winner",  # e.g., "Winner", "Runner-up", "Second Runner-up", "Special Mention", etc.
        score_or_remarks: Optional[str] = None,
        certificate_id: Optional[int] = None,
        certificate_title: Optional[str] = None,
        certificate_file_path: Optional[str] = None,
        declared_by: int = 0,
        declared_by_name: str = "Faculty Coordinator",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        try:
            self.id = int(id) if id is not None else 0
        except (ValueError, TypeError):
            self.id = id

        self.event_id = int(event_id) if event_id else 0
        self.event_title = event_title or ""
        self.student_id = int(student_id) if student_id else 0
        self.student_name = student_name or ""
        self.registration_number = registration_number or ""
        self.student_email = student_email
        self.student_department = student_department
        self.position = position or "Winner"
        self.score_or_remarks = score_or_remarks
        self.certificate_id = int(certificate_id) if certificate_id else None
        self.certificate_title = certificate_title
        self.certificate_file_path = certificate_file_path
        self.declared_by = int(declared_by) if declared_by else 0
        self.declared_by_name = declared_by_name or "Faculty Coordinator"
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "event_title": self.event_title,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "registration_number": self.registration_number,
            "student_email": self.student_email,
            "student_department": self.student_department,
            "position": self.position,
            "score_or_remarks": self.score_or_remarks,
            "certificate_id": self.certificate_id,
            "certificate_title": self.certificate_title,
            "certificate_file_path": self.certificate_file_path,
            "declared_by": self.declared_by,
            "declared_by_name": self.declared_by_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "EventResult":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            event_id=data.get("event_id", 0),
            event_title=data.get("event_title", ""),
            student_id=data.get("student_id", 0),
            student_name=data.get("student_name", ""),
            registration_number=data.get("registration_number", ""),
            student_email=data.get("student_email"),
            student_department=data.get("student_department"),
            position=data.get("position", "Winner"),
            score_or_remarks=data.get("score_or_remarks"),
            certificate_id=data.get("certificate_id"),
            certificate_title=data.get("certificate_title"),
            certificate_file_path=data.get("certificate_file_path"),
            declared_by=data.get("declared_by", 0),
            declared_by_name=data.get("declared_by_name", "Faculty Coordinator"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
