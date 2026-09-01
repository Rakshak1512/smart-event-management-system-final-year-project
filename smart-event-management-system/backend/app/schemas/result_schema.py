from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ResultCreate(BaseModel):
    event_id: int
    registration_number: str = Field(..., min_length=1, max_length=50)
    position: str = Field(..., min_length=1, max_length=100)  # e.g., "Winner", "Runner-up", "Second Runner-up"
    score_or_remarks: Optional[str] = None
    certificate_id: Optional[int] = None


class ResultUpdate(BaseModel):
    position: Optional[str] = Field(None, min_length=1, max_length=100)
    score_or_remarks: Optional[str] = None
    certificate_id: Optional[int] = None


class ResultOut(BaseModel):
    id: int
    event_id: int
    event_title: str
    student_id: int
    student_name: str
    registration_number: str
    student_email: Optional[str] = None
    student_department: Optional[str] = None
    position: str
    score_or_remarks: Optional[str] = None
    certificate_id: Optional[int] = None
    certificate_title: Optional[str] = None
    certificate_file_path: Optional[str] = None
    declared_by: int
    declared_by_name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
