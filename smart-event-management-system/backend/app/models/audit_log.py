from datetime import datetime
from typing import Optional


class AuditLog:
    def __init__(
        self,
        id: int,
        action: str,
        user_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = int(id)
        self.action = action
        self.user_id = int(user_id) if user_id is not None else None
        self.entity_type = entity_type
        self.entity_id = int(entity_id) if entity_id is not None else None
        self.ip_address = ip_address
        self.details = details
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "ip_address": self.ip_address,
            "details": self.details,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AuditLog":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            user_id=data.get("user_id"),
            action=data.get("action", ""),
            entity_type=data.get("entity_type"),
            entity_id=data.get("entity_id"),
            ip_address=data.get("ip_address"),
            details=data.get("details"),
            created_at=data.get("created_at"),
        )
