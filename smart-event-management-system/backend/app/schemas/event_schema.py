from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    category: str = Field(..., max_length=100)
    venue: str = Field(..., max_length=200)
    event_date: date
    event_time: str = Field(..., max_length=20)
    total_seats: int = Field(..., ge=1)
    registration_type: str = Field("both", pattern="^(individual|team|both)$")
    max_team_size: int = Field(4, ge=2, le=20)
    rules: Optional[str] = None
    requirements: Optional[str] = None
    seating_enabled: bool = False
    total_rows: int = 10
    seats_per_row: int = 10


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = Field(None, max_length=100)
    venue: Optional[str] = Field(None, max_length=200)
    event_date: Optional[date] = None
    event_time: Optional[str] = Field(None, max_length=20)
    total_seats: Optional[int] = Field(None, ge=1)
    registration_type: Optional[str] = Field(None, pattern="^(individual|team|both)$")
    max_team_size: Optional[int] = Field(None, ge=2, le=20)
    rules: Optional[str] = None
    requirements: Optional[str] = None
    seating_enabled: Optional[bool] = None
    total_rows: Optional[int] = None
    seats_per_row: Optional[int] = None


class EventOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    venue: str
    event_date: date
    event_time: str
    poster_url: Optional[str] = None
    total_seats: int
    available_seats: int
    created_by: Optional[int] = None
    organizer_name: Optional[str] = None
    organizer_email: Optional[str] = None
    organizer_department: Optional[str] = None
    registration_type: str = "both"
    max_team_size: int = 4
    rules: Optional[str] = None
    requirements: Optional[str] = None
    seating_enabled: bool = False
    total_rows: int = 10
    seats_per_row: int = 10
    created_at: datetime
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    updated_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class EventEditHistoryOut(BaseModel):
    id: int
    event_id: int
    faculty_id: int
    faculty_name: str
    action: str
    changed_fields: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEvents(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[EventOut]


class EventCapacityOut(BaseModel):
    event_id: int
    totalCapacity: int
    activeRegistrations: int
    remainingSeats: int
    total_capacity: Optional[int] = None
    active_registrations: Optional[int] = None
    remaining_seats: Optional[int] = None

