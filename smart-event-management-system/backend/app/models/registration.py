import enum
from datetime import datetime
from typing import Optional


class RegistrationStatus(str, enum.Enum):
    registered = "registered"
    pending = "pending"
    approved = "approved"
    cancelled = "cancelled"
    attended = "attended"
    completed = "completed"


ACTIVE_REGISTRATION_STATUSES = {
    RegistrationStatus.registered.value,
    RegistrationStatus.pending.value,
    RegistrationStatus.approved.value,
    RegistrationStatus.attended.value,
    RegistrationStatus.completed.value,
    "confirmed",
}

INACTIVE_REGISTRATION_STATUSES = {
    RegistrationStatus.cancelled.value,
    "rejected",
    "waitlisted",
}

# Backward compatibility aliases
SEAT_OCCUPYING_STATUSES = ACTIVE_REGISTRATION_STATUSES
NON_SEAT_OCCUPYING_STATUSES = INACTIVE_REGISTRATION_STATUSES


class Registration:
    def __init__(
        self,
        id: Optional[int],
        event_id: Optional[int],
        student_id: Optional[int],
        ticket_code: str,
        status: RegistrationStatus = RegistrationStatus.registered,
        qr_code_path: Optional[str] = None,
        registered_at: Optional[datetime] = None,
        event: Optional[object] = None,
        student: Optional[object] = None,
        team_id: Optional[int] = None,
        team_name: Optional[str] = None,
        team_role: Optional[str] = None,
        checked_in_at: Optional[datetime] = None,
        checked_in_by: Optional[str] = None,
        checked_in_by_id: Optional[int] = None,
        **kwargs,
    ):
        self.id = int(id) if id is not None else None
        self.event_id = int(event_id) if event_id is not None else None
        self.student_id = int(student_id) if student_id is not None else None
        self.ticket_code = ticket_code
        self.status = RegistrationStatus(status) if isinstance(status, str) else status
        self.qr_code_path = qr_code_path
        self.registered_at = registered_at or datetime.utcnow()
        self.event = event
        self.student = student
        self.team_id = int(team_id) if team_id is not None else None
        self.team_name = team_name
        self.team_role = team_role
        self.checked_in_at = checked_in_at
        self.checked_in_by = checked_in_by
        self.checked_in_by_id = int(checked_in_by_id) if checked_in_by_id is not None else None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "student_id": self.student_id,
            "ticket_code": self.ticket_code,
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "qr_code_path": self.qr_code_path,
            "registered_at": self.registered_at,
            "team_id": self.team_id,
            "team_name": self.team_name,
            "team_role": self.team_role,
            "checked_in_at": self.checked_in_at,
            "checked_in_by": self.checked_in_by,
            "checked_in_by_id": self.checked_in_by_id,
        }

    @classmethod
    def from_dict(cls, data: dict, event=None, student=None) -> Optional["Registration"]:
        if not data:
            return None
        reg_at = data.get("registered_at")
        if isinstance(reg_at, str):
            try:
                reg_at = datetime.fromisoformat(reg_at.replace("Z", "+00:00"))
            except Exception:
                reg_at = datetime.utcnow()

        chk_at = data.get("checked_in_at")
        if isinstance(chk_at, str):
            try:
                chk_at = datetime.fromisoformat(chk_at.replace("Z", "+00:00"))
            except Exception:
                chk_at = None

        return cls(
            id=data.get("id"),
            event_id=data.get("event_id"),
            student_id=data.get("student_id"),
            ticket_code=data.get("ticket_code", ""),
            status=data.get("status", RegistrationStatus.registered),
            qr_code_path=data.get("qr_code_path"),
            registered_at=reg_at,
            event=event,
            student=student,
            team_id=data.get("team_id"),
            team_name=data.get("team_name"),
            team_role=data.get("team_role"),
            checked_in_at=chk_at,
            checked_in_by=data.get("checked_in_by"),
            checked_in_by_id=data.get("checked_in_by_id"),
        )

