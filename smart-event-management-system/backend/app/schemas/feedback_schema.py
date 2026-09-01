from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    event_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field("", max_length=1000)


class FeedbackOut(BaseModel):
    id: int
    event_id: int
    student_id: int
    student_name: str
    student_reg_no: Optional[str] = None
    rating: int
    comment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EventFeedbackSummary(BaseModel):
    event_id: int
    event_title: str
    average_rating: float
    total_responses: int
    rating_distribution: Dict[str, int]
    recent_feedback: List[FeedbackOut] = []
