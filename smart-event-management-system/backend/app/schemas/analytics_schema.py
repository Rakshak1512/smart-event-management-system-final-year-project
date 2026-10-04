from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MonthlyCount(BaseModel):
    month: str
    count: int


class StudentTimelineItem(BaseModel):
    id: int
    title: str
    category: str
    date: str
    status: str
    has_certificate: bool = False



class StudentAnalytics(BaseModel):
    total_registrations: int
    completed_events: int
    upcoming_events: int
    attended_events: int
    total_certificates: int
    teams_joined: int
    attendance_rate: float
    monthly_registrations: List[MonthlyCount]
    category_breakdown: Dict[str, int]
    timeline: List[Dict[str, Any]] = []
    achievements: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []


class FacultyEventPerformance(BaseModel):
    event_id: int
    title: str
    category: str
    event_date: str
    total_seats: int
    registrations: int
    attended: int
    attendance_pct: float
    score: float


class FacultyAnalytics(BaseModel):
    total_events_created: int
    total_registrations_received: int
    total_attendance: int
    total_certificates_issued: int
    average_attendance_rate: float
    average_rating: float
    monthly_event_creation: List[MonthlyCount]
    top_events_by_registration: List[Dict[str, Any]] = []
    event_performance: List[Dict[str, Any]] = []
    department_participation: Dict[str, int] = {}
    attendance_funnel: Dict[str, int] = {}
    feedback_insights: Dict[str, Any] = {}
    faculty_activity: List[Dict[str, Any]] = []
