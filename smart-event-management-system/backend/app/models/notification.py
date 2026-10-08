import enum
from datetime import datetime
from typing import Optional


class NotificationType(str, enum.Enum):
    upcoming_event = "upcoming_event"
    certificate_uploaded = "certificate_uploaded"
    registration_approved = "registration_approved"
    registration_cancelled = "registration_cancelled"
    deadline_reminder = "deadline_reminder"
    general = "general"


class Notification:
    def __init__(
        self,
        id: int,
        user_id: int,
        title: str,
        message: str,
        type: NotificationType = NotificationType.general,
        is_read: bool = False,
        created_at: Optional[datetime] = None,
    ):
        self.id = int(id) if str(id).isdigit() else id
        self.user_id = int(user_id) if str(user_id).isdigit() else user_id
        self.title = title
        self.message = message
        self.type = NotificationType(type) if isinstance(type, str) else type
        self.is_read = is_read
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type.value if hasattr(self.type, "value") else str(self.type),
            "is_read": self.is_read,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Notification":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            user_id=data.get("user_id"),
            title=data.get("title", ""),
            message=data.get("message", ""),
            type=data.get("type", NotificationType.general),
            is_read=data.get("is_read", False),
            created_at=data.get("created_at"),
        )
