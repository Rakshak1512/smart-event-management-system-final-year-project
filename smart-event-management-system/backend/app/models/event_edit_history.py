from datetime import datetime
from typing import Optional


class EventEditHistory:
    def __init__(
        self,
        id: Optional[int],
        event_id: int,
        faculty_id: int,
        faculty_name: str,
        action: str,
        changed_fields: Optional[dict] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = int(id) if id is not None else None
        self.event_id = int(event_id)
        self.faculty_id = int(faculty_id)
        self.faculty_name = str(faculty_name).strip()
        self.action = action
        self.changed_fields = changed_fields or {}
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty_name,
            "action": self.action,
            "changed_fields": self.changed_fields,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "EventEditHistory":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            event_id=data.get("event_id"),
            faculty_id=data.get("faculty_id"),
            faculty_name=data.get("faculty_name", "Faculty Member"),
            action=data.get("action", "update"),
            changed_fields=data.get("changed_fields", {}),
            created_at=data.get("created_at"),
        )
