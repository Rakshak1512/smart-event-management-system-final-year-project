import enum
from datetime import datetime
from typing import Optional


class RoleEnum(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    volunteer = "volunteer"
    admin = "admin"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.lower().strip():
                    return member
        return None


class User:
    def __init__(
        self,
        id: Optional[int] = 0,
        name: str = "",
        email: str = "",
        hashed_password: str = "",
        role: RoleEnum = RoleEnum.student,
        registration_number: Optional[str] = None,
        admin_id: Optional[str] = None,
        phone: Optional[str] = None,
        department: Optional[str] = None,
        semester: Optional[str] = None,
        profile_picture: Optional[str] = None,
        is_email_verified: bool = False,
        is_active: bool = True,
        approval_status: str = "ACTIVE",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        try:
            self.id = int(id) if id is not None else 0
        except (ValueError, TypeError):
            self.id = id

        self.name = name or ""
        self.email = email or ""
        self.phone = phone or None
        self.hashed_password = hashed_password or ""

        if isinstance(role, str):
            try:
                self.role = RoleEnum(role.lower().strip())
            except ValueError:
                self.role = RoleEnum.student
        elif isinstance(role, RoleEnum):
            self.role = role
        else:
            self.role = RoleEnum.student

        self.registration_number = registration_number or (admin_id if self.role == RoleEnum.admin else None)
        self.admin_id = admin_id or (registration_number if self.role == RoleEnum.admin else None)
        self.department = department
        self.semester = semester
        self.profile_picture = profile_picture
        self.is_email_verified = bool(is_email_verified)
        self.is_active = bool(is_active)
        self.approval_status = str(approval_status or "ACTIVE").upper().strip()
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "registration_number": self.registration_number,
            "admin_id": self.admin_id,
            "phone": self.phone,
            "department": self.department,
            "semester": self.semester,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "role": self.role.value if hasattr(self.role, "value") else str(self.role),
            "profile_picture": self.profile_picture,
            "is_email_verified": self.is_email_verified,
            "is_active": self.is_active,
            "approval_status": self.approval_status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        if not data:
            return None
        # Default legacy or active users without explicit approval_status to ACTIVE
        st = data.get("approval_status")
        if not st:
            st = "ACTIVE" if data.get("is_active", True) else "PENDING_FACULTY_APPROVAL"
        return cls(
            id=data.get("id"),
            name=data.get("name", ""),
            email=data.get("email", ""),
            phone=data.get("phone"),
            hashed_password=data.get("hashed_password", ""),
            role=data.get("role", RoleEnum.student),
            registration_number=data.get("registration_number"),
            admin_id=data.get("admin_id") or (data.get("registration_number") if str(data.get("role", "")).lower() == "admin" else None),
            department=data.get("department"),
            semester=data.get("semester"),
            profile_picture=data.get("profile_picture"),
            is_email_verified=data.get("is_email_verified", False),
            is_active=data.get("is_active", True),
            approval_status=st,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
