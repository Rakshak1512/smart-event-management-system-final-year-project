from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class TicketVerifyRequest(BaseModel):
    ticket_code: Optional[str] = None
    qr_payload: Optional[str] = None
    event_id: Optional[int] = None


class AttendeeVerificationOut(BaseModel):
    registration_id: int
    student_id: int
    student_name: str
    registration_number: Optional[str] = None
    department: Optional[str] = None
    event_id: int
    event_title: str
    event_date: str
    event_time: str
    venue: str
    registration_type: str
    ticket_code: str
    status: str
    team_name: Optional[str] = None
    already_attended: bool
    checked_in_at: Optional[str] = None
    checked_in_by: Optional[str] = None


class AttendanceConfirmRequest(BaseModel):
    registration_id: int
    event_id: Optional[int] = None


class AttendanceConfirmResponse(BaseModel):
    message: str
    registration_id: int
    student_name: str
    registration_number: Optional[str] = None
    event_title: str
    status: str
    checked_in_by: str
    checked_in_at: str


class VolunteerScanRecordOut(BaseModel):
    registration_id: int
    student_name: str
    registration_number: Optional[str] = None
    event_id: int
    event_title: str
    status: str
    scanned_at: str
    actioned_by: str


class VolunteerDashboardStats(BaseModel):
    volunteer_name: str
    volunteer_id: int
    assigned_events: List[Dict[str, Any]] = []
    today_events: List[Dict[str, Any]] = []
    total_scanned: int = 0
    today_scanned: int = 0
    recent_scans: List[VolunteerScanRecordOut] = []
