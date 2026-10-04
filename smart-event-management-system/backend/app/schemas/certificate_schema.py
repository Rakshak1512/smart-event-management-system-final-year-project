from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CertificateUploadMeta(BaseModel):
    registration_number: str = Field(..., max_length=50)
    title: str = Field(..., max_length=200)
    event_id: Optional[int] = None
    award_standing: Optional[str] = None
    achievement_wording: Optional[str] = None
    score_or_remarks: Optional[str] = None


class CertificateGenerateRequest(BaseModel):
    registration_number: str = Field(..., max_length=50)
    student_name: Optional[str] = None
    event_id: Optional[int] = None
    event_title: Optional[str] = None
    position: Optional[str] = Field(default="1st Place")
    award_standing: Optional[str] = None
    achievement_wording: Optional[str] = None
    score_or_remarks: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None


class CertificateAutoGenerateRequest(BaseModel):
    registration_number: str = Field(..., max_length=50)
    event_id: Optional[int] = None
    event_title: Optional[str] = None
    position: Optional[str] = Field(default="1st Place")
    award_standing: Optional[str] = None
    achievement_wording: Optional[str] = None
    score_or_remarks: Optional[str] = None
    title: Optional[str] = None
    result_id: Optional[int] = None
    department: Optional[str] = None
    semester: Optional[str] = None


class CertificateOut(BaseModel):
    id: int
    registration_number: str
    event_id: Optional[int] = None
    title: str
    file_path: str
    uploaded_by: Optional[int] = None
    uploaded_at: datetime
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    event_title: Optional[str] = None
    award_standing: Optional[str] = None
    achievement_wording: Optional[str] = None
    score_or_remarks: Optional[str] = None
    certificate_issuance_mode: Optional[str] = None
    email_notification_status: Optional[str] = None
    student_email: Optional[str] = None

    model_config = {"from_attributes": True}

