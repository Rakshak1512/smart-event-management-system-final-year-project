import enum
from datetime import datetime
from typing import Optional


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class FacultyAssignment:
    def __init__(
        self,
        id: Optional[int] = 0,
        faculty_id: int = 0,
        faculty_name: str = "",
        faculty_email: str = "",
        faculty_department: Optional[str] = None,
        title: str = "",
        description: str = "",
        event_id: Optional[int] = None,
        event_title: Optional[str] = None,
        priority: TaskPriority = TaskPriority.medium,
        deadline: Optional[str] = None,
        status: TaskStatus = TaskStatus.pending,
        assigned_by: int = 0,
        assigned_by_name: str = "Administrator",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        try:
            self.id = int(id) if id is not None else 0
        except (ValueError, TypeError):
            self.id = id

        self.faculty_id = int(faculty_id) if faculty_id else 0
        self.faculty_name = faculty_name or ""
        self.faculty_email = faculty_email or ""
        self.faculty_department = faculty_department
        self.title = title or ""
        self.description = description or ""
        self.event_id = int(event_id) if event_id else None
        self.event_title = event_title
        
        if isinstance(priority, str):
            try:
                self.priority = TaskPriority(priority.lower().strip())
            except ValueError:
                self.priority = TaskPriority.medium
        else:
            self.priority = priority or TaskPriority.medium

        self.deadline = deadline

        if isinstance(status, str):
            try:
                self.status = TaskStatus(status.lower().strip())
            except ValueError:
                self.status = TaskStatus.pending
        else:
            self.status = status or TaskStatus.pending

        self.assigned_by = int(assigned_by) if assigned_by else 0
        self.assigned_by_name = assigned_by_name or "Administrator"
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty_name,
            "faculty_email": self.faculty_email,
            "faculty_department": self.faculty_department,
            "title": self.title,
            "description": self.description,
            "event_id": self.event_id,
            "event_title": self.event_title,
            "priority": self.priority.value if hasattr(self.priority, "value") else str(self.priority),
            "deadline": self.deadline,
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "assigned_by": self.assigned_by,
            "assigned_by_name": self.assigned_by_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "FacultyAssignment":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            faculty_id=data.get("faculty_id", 0),
            faculty_name=data.get("faculty_name", ""),
            faculty_email=data.get("faculty_email", ""),
            faculty_department=data.get("faculty_department"),
            title=data.get("title", ""),
            description=data.get("description", ""),
            event_id=data.get("event_id"),
            event_title=data.get("event_title"),
            priority=data.get("priority", TaskPriority.medium),
            deadline=data.get("deadline"),
            status=data.get("status", TaskStatus.pending),
            assigned_by=data.get("assigned_by", 0),
            assigned_by_name=data.get("assigned_by_name", "Administrator"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
