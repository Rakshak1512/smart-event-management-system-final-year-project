import enum
from datetime import datetime
from typing import List, Optional


class TeamStatus(str, enum.Enum):
    registered = "registered"
    approved = "approved"
    cancelled = "cancelled"


class TeamMember:
    def __init__(
        self,
        student_id: int,
        registration_number: str,
        name: str,
        role: str = "member",  # "leader" or "member"
        department: Optional[str] = None,
        email: Optional[str] = None,
    ):
        self.student_id = int(student_id)
        self.registration_number = str(registration_number).strip()
        self.name = str(name).strip()
        self.role = role
        self.department = department
        self.email = email

    def to_dict(self) -> dict:
        return {
            "student_id": self.student_id,
            "registration_number": self.registration_number,
            "name": self.name,
            "role": self.role,
            "department": self.department,
            "email": self.email,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TeamMember":
        if not data:
            return None
        return cls(
            student_id=data.get("student_id", 0),
            registration_number=data.get("registration_number", ""),
            name=data.get("name", ""),
            role=data.get("role", "member"),
            department=data.get("department"),
            email=data.get("email"),
        )


class Team:
    def __init__(
        self,
        id: Optional[int],
        event_id: int,
        name: str,
        leader_id: int,
        leader_name: str,
        leader_reg_no: str,
        members: Optional[List[TeamMember]] = None,
        status: TeamStatus = TeamStatus.registered,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        event_title: Optional[str] = None,
    ):
        self.id = int(id) if id is not None else None
        self.event_id = int(event_id)
        self.name = str(name).strip()
        self.leader_id = int(leader_id)
        self.leader_name = str(leader_name).strip()
        self.leader_reg_no = str(leader_reg_no).strip()
        self.members = members or []
        self.status = TeamStatus(status) if isinstance(status, str) else status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.event_title = event_title

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "name": self.name,
            "leader_id": self.leader_id,
            "leader_name": self.leader_name,
            "leader_reg_no": self.leader_reg_no,
            "members": [m.to_dict() if hasattr(m, "to_dict") else m for m in self.members],
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "event_title": self.event_title,
        }

    @classmethod
    def from_dict(cls, data: dict, event_title: Optional[str] = None) -> "Team":
        if not data:
            return None
        raw_members = data.get("members", [])
        members = [TeamMember.from_dict(m) if isinstance(m, dict) else m for m in raw_members]
        return cls(
            id=data.get("id"),
            event_id=data.get("event_id"),
            name=data.get("name", ""),
            leader_id=data.get("leader_id"),
            leader_name=data.get("leader_name", ""),
            leader_reg_no=data.get("leader_reg_no", ""),
            members=members,
            status=data.get("status", TeamStatus.registered),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            event_title=event_title or data.get("event_title"),
        )
