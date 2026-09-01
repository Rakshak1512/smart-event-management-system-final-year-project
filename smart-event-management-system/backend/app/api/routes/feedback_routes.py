import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import firestore_service as db_service
from app.dependencies import require_role, get_current_user
from app.models.user import RoleEnum, User
from app.schemas.feedback_schema import (
    FeedbackCreate,
    FeedbackOut,
    EventFeedbackSummary,
)

logger = logging.getLogger("app.feedback")
router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(require_role(RoleEnum.student)),
):
    """
    Submit feedback for an event by a registered student.
    Validates registration and prevents duplicate feedback.
    """
    ok, msg, feedback = db_service.create_feedback(
        event_id=payload.event_id,
        student_id=current_user.id,
        student_name=current_user.name,
        student_reg_no=current_user.registration_number,
        rating=payload.rating,
        comment=payload.comment,
    )
    if not ok:
        if "not found" in msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return feedback


@router.get("/event/{event_id}", response_model=EventFeedbackSummary)
def get_event_feedback(
    event_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated feedback stats, star distribution, and recent reviews for an event.
    """
    event = db_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    summary = db_service.get_event_feedback_summary(event_id)
    return summary


@router.get("/faculty", response_model=dict)
def get_faculty_feedbacks(
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Get aggregated feedback and sentiment metrics across all events organized by the faculty.
    """
    return db_service.get_faculty_feedback_summary(current_user.id)


@router.get("/my", response_model=List[FeedbackOut])
def get_my_feedbacks(
    current_user: User = Depends(require_role(RoleEnum.student)),
):
    """
    Get all feedbacks submitted by the logged-in student.
    """
    return db_service.get_student_feedbacks(current_user.id)
