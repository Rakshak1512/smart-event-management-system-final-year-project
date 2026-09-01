from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.assignment import TaskPriority, TaskStatus


class AssignmentCreate(BaseModel):
    faculty_id: int
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=2)
    event_id: Optional[int] = None
    priority: TaskPriority = TaskPriority.medium
    deadline: Optional[str] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, min_length=2)
    event_id: Optional[int] = None
    priority: Optional[TaskPriority] = None
    deadline: Optional[str] = None
    status: Optional[TaskStatus] = None


class AssignmentStatusUpdate(BaseModel):
    status: TaskStatus


class AssignmentOut(BaseModel):
    id: int
    faculty_id: int
    faculty_name: str
    faculty_email: str
    faculty_department: Optional[str] = None
    title: str
    description: str
    event_id: Optional[int] = None
    event_title: Optional[str] = None
    priority: TaskPriority
    deadline: Optional[str] = None
    status: TaskStatus
    assigned_by: int
    assigned_by_name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
