import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import firestore_service as db_service
from app.dependencies import require_role
from app.models.notification import NotificationType
from app.models.user import RoleEnum, User
from app.schemas.result_schema import ResultCreate, ResultOut, ResultUpdate

logger = logging.getLogger("app.results")
router = APIRouter(prefix="/api/results", tags=["Event Results & Winners"])


@router.get("/event/{event_id}", response_model=List[ResultOut])
def get_event_results(
    event_id: int,
    current_user: User = Depends(require_role(RoleEnum.student, RoleEnum.faculty, RoleEnum.volunteer, RoleEnum.admin)),
):
    """
    Get all published results and winners for a specific event.
    """
    event = db_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return db_service.get_event_results(event_id)


@router.post("", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
def create_event_winner_result(
    payload: ResultCreate,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Declare a winner/result position for an event.
    Optionally associates with a certificate.
    Generates a student in-app notification.
    """
    ok, msg, result = db_service.create_event_result(
        event_id=payload.event_id,
        registration_number=payload.registration_number,
        position=payload.position,
        declared_by=current_user.id,
        declared_by_name=current_user.name or "Faculty Coordinator",
        score_or_remarks=payload.score_or_remarks,
        certificate_id=payload.certificate_id,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # In-app notification for the winning student
    if result and result.student_id:
        db_service.create_notification(
            user_id=result.student_id,
            title="Congratulations! Event Result Declared",
            message=f"You have been awarded '{result.position}' in {result.event_title}!",
            type=NotificationType.general,
        )

    return result


@router.put("/{result_id}", response_model=ResultOut)
def update_event_winner_result(
    result_id: int,
    payload: ResultUpdate,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Update result information, position, score, or link/replace certificate.
    """
    updated = db_service.update_event_result(result_id, payload.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result record not found")
    return updated


@router.delete("/{result_id}")
def delete_event_winner_result(
    result_id: int,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Delete an event result entry.
    """
    success = db_service.delete_event_result(result_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result record not found")
    return {"message": "Result entry deleted successfully"}
