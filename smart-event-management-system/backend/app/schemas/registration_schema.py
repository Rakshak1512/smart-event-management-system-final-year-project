from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.registration import RegistrationStatus
from app.schemas.event_schema import EventOut


class RegistrationCreate(BaseModel):
    event_id: int


class RegistrationStudentOut(BaseModel):
    id: int
    name: str
    email: str
    registration_number: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None

    model_config = {"from_attributes": True}


class RegistrationOut(BaseModel):
    id: int
    event_id: int
    student_id: int
    status: RegistrationStatus
    qr_code_path: Optional[str] = None
    ticket_code: str
    registered_at: datetime
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    team_role: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None
    checked_in_by_id: Optional[int] = None
    event: Optional[EventOut] = None
    student: Optional[RegistrationStudentOut] = None

    model_config = {"from_attributes": True}


class RegistrationStatusUpdate(BaseModel):
    status: RegistrationStatus


class StudentSearchOut(BaseModel):
    id: int
    name: str
    registration_number: str
    department: Optional[str] = None
    email: Optional[str] = None


class TeamMemberOut(BaseModel):
    student_id: int
    registration_number: str
    name: str
    role: str = "member"
    department: Optional[str] = None
    email: Optional[str] = None


class TeamCreate(BaseModel):
    event_id: int
    team_name: str
    member_registration_numbers: list[str] = []


class TeamOut(BaseModel):
    id: int
    event_id: int
    name: str
    leader_id: int
    leader_name: str
    leader_reg_no: str
    members: list[TeamMemberOut]
    status: str
    created_at: datetime
    event_title: Optional[str] = None

    model_config = {"from_attributes": True}
