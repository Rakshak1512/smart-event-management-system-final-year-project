from datetime import datetime, timezone
from typing import Optional


class Feedback:
    def __init__(
        self,
        id: Optional[int],
        event_id: int,
        student_id: int,
        student_name: str,
        student_reg_no: Optional[str] = None,
        rating: int = 5,
        comment: str = "",
        created_at: Optional[datetime] = None,
    ):
        self.id = int(id) if id is not None else None
        self.event_id = int(event_id)
        self.student_id = int(student_id)
        self.student_name = student_name or ""
        self.student_reg_no = student_reg_no
        self.rating = max(1, min(5, int(rating)))
        self.comment = comment or ""
        self.created_at = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "student_reg_no": self.student_reg_no,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Feedback":
        if not data:
            return None
        c_at = data.get("created_at")
        if isinstance(c_at, str):
            try:
                c_at = datetime.fromisoformat(c_at.replace("Z", "+00:00"))
            except Exception:
                c_at = datetime.now(timezone.utc)
        return cls(
            id=data.get("id"),
            event_id=data.get("event_id"),
            student_id=data.get("student_id"),
            student_name=data.get("student_name", ""),
            student_reg_no=data.get("student_reg_no"),
            rating=data.get("rating", 5),
            comment=data.get("comment", ""),
            created_at=c_at,
        )
