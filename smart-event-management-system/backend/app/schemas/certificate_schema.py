from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CertificateUploadMeta(BaseModel):
    registration_number: str = Field(..., max_length=50)
    title: str = Field(..., max_length=200)
    event_id: Optional[int] = None


class CertificateGenerateRequest(BaseModel):
    registration_number: str = Field(..., max_length=50)
    student_name: Optional[str] = None
    event_id: int
    position: str = Field(default="Winner (1st Place)")
    department: Optional[str] = None
    semester: Optional[str] = None


class CertificateAutoGenerateRequest(BaseModel):
    registration_number: str = Field(..., max_length=50)
    event_id: int
    position: str = Field(default="Winner (1st Place)")
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

    model_config = {"from_attributes": True}

