import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import firestore_service as db_service
from app.dependencies import get_current_user, require_role
from app.models.notification import NotificationType
from app.models.user import RoleEnum, User
from app.schemas.assignment_schema import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentStatusUpdate,
    AssignmentUpdate,
)
from app.schemas.user_schema import UserOut
from app.services.email_service import (
    send_faculty_approved_email,
    send_faculty_rejected_email,
    send_faculty_work_assigned_email,
    send_student_approved_email,
    send_student_rejected_email,
)

logger = logging.getLogger("app.admin")

router = APIRouter(prefix="/api/admin", tags=["Admin"])
faculty_task_router = APIRouter(prefix="/api/faculty/tasks", tags=["Faculty Tasks"])
faculty_approval_router = APIRouter(prefix="/api/faculty", tags=["Faculty Approvals"])


class RejectionPayload(BaseModel):
    reason: Optional[str] = None


# ============================================================
# FACULTY DIRECTORY & MONITORING (ADMIN ONLY)
# ============================================================

@router.get("/faculty", response_model=List[dict])
def get_faculty_directory(
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """
    Real-time list of all active faculty members enriched with active task counts
    and events created count.
    """
    return db_service.get_all_faculty_with_stats()


# ============================================================
# WORK ASSIGNMENTS (ADMIN ONLY CRUD)
# ============================================================

@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def assign_work_to_faculty(
    payload: AssignmentCreate,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """
    Admin assigns work/tasks to a faculty member.
    1. Stores in Firestore assignments collection.
    2. Generates an in-app notification for the faculty member.
    3. Sends an email alert to the faculty member (with graceful fallback).
    """
    faculty = db_service.get_user_by_id(payload.faculty_id)
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target faculty member not found.",
        )

    assignment = db_service.create_assignment(
        faculty_id=payload.faculty_id,
        title=payload.title,
        description=payload.description,
        assigned_by=current_user.id,
        assigned_by_name=current_user.name or "Administrator",
        event_id=payload.event_id,
        priority=payload.priority,
        deadline=payload.deadline,
    )

    # 1. In-app notification for faculty
    event_info = f" for event '{assignment.event_title}'" if assignment.event_title else ""
    db_service.create_notification(
        user_id=faculty.id,
        title="New Work Assignment",
        message=f"Administrator {current_user.name} assigned you a new task: '{assignment.title}'{event_info} (Priority: {assignment.priority.upper()}).",
        type=NotificationType.general,
    )

    # 2. Email alert to faculty
    if faculty.email:
        try:
            send_faculty_work_assigned_email(
                to_email=faculty.email,
                faculty_name=faculty.name,
                task_title=assignment.title,
                description=assignment.description,
                priority=assignment.priority.value if hasattr(assignment.priority, "value") else str(assignment.priority),
                deadline=assignment.deadline,
                event_title=assignment.event_title,
                assigned_by_name=current_user.name,
            )
        except Exception as e:
            logger.error("[EMAIL ERROR] Could not dispatch task assignment email to %s: %s", faculty.email, e)

    return assignment


@router.get("/assignments", response_model=List[AssignmentOut])
def get_all_assignments(
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """List all work assignments across faculty."""
    return db_service.get_all_assignments()


@router.get("/assignments/faculty/{faculty_id}", response_model=List[AssignmentOut])
def get_assignments_for_faculty(
    faculty_id: int,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Get all assignments for a specific faculty member."""
    return db_service.get_faculty_assignments(faculty_id)


@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Edit or update an existing faculty assignment."""
    updated = db_service.update_assignment(assignment_id, payload.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )
    return updated


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Delete an assignment."""
    success = db_service.delete_assignment(assignment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )
    return {"message": "Assignment deleted successfully"}


# ============================================================
# FACULTY-FACING TASK ENDPOINTS
# ============================================================

@faculty_task_router.get("", response_model=List[AssignmentOut])
def get_my_assigned_tasks(
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """Faculty retrieves their own assigned tasks."""
    return db_service.get_faculty_assignments(current_user.id)


@faculty_task_router.put("/{assignment_id}/status", response_model=AssignmentOut)
def update_my_task_status(
    assignment_id: int,
    payload: AssignmentStatusUpdate,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """Faculty updates the status of their assigned task (Pending, In Progress, Completed)."""
    task = db_service.get_assignment_by_id(assignment_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )
    if current_user.role == RoleEnum.faculty and task.faculty_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own assigned tasks.",
        )

    updated = db_service.update_assignment(assignment_id, {"status": payload.status})
    return updated


# ============================================================
# ADMINISTRATIVE REPORTS SUMMARY
# ============================================================

@router.get("/reports/summary")
def get_admin_reports_summary(
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """
    Returns aggregate counts for system reports.
    """
    all_users = db_service.get_all_users()
    all_events = db_service.get_all_events()
    all_assignments = db_service.get_all_assignments()

    students = [u for u in all_users if u.role == RoleEnum.student]
    faculties = [u for u in all_users if u.role == RoleEnum.faculty]
    volunteers = [u for u in all_users if u.role == RoleEnum.volunteer]

    total_seats = sum(e.total_seats for e in all_events)
    total_reg = sum(e.total_seats - e.available_seats for e in all_events)

    return {
        "total_users": len(all_users),
        "total_students": len(students),
        "total_faculty": len(faculties),
        "total_volunteers": len(volunteers),
        "total_events": len(all_events),
        "total_seat_capacity": total_seats,
        "total_registrations": total_reg,
        "total_assignments": len(all_assignments),
        "active_assignments": sum(1 for a in all_assignments if a.status in ("pending", "in_progress")),
        "completed_assignments": sum(1 for a in all_assignments if a.status == "completed"),
    }


# ============================================================
# FACULTY ACCOUNT APPROVAL WORKFLOW (ADMIN ONLY)
# ============================================================

@router.get("/pending-faculty", response_model=List[UserOut])
def get_pending_faculty_accounts(
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Admin retrieves all faculty registrations awaiting institutional verification."""
    return db_service.get_pending_faculty()


@router.post("/faculty/{faculty_id}/approve", response_model=UserOut)
def approve_faculty_account(
    faculty_id: int,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Admin approves a faculty account, activating dashboard and event management privileges."""
    fac = db_service.get_user_by_id(faculty_id)
    if not fac or fac.role != RoleEnum.faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty account not found.")

    updated = db_service.approve_user(faculty_id)

    # In-app notification
    db_service.create_notification(
        user_id=faculty_id,
        title="Account Approved",
        message=f"Administrator {current_user.name} has approved your faculty credentials. Welcome to EventSphere!",
        type=NotificationType.general,
    )

    # Email notification
    if fac.email:
        try:
            send_faculty_approved_email(fac.email, fac.name)
        except Exception as e:
            logger.error("[EMAIL ERROR] Could not send faculty approval email to %s: %s", fac.email, e)

    return updated


@router.post("/faculty/{faculty_id}/reject", response_model=UserOut)
def reject_faculty_account(
    faculty_id: int,
    payload: Optional[RejectionPayload] = None,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    """Admin rejects an unverified faculty registration."""
    fac = db_service.get_user_by_id(faculty_id)
    if not fac or fac.role != RoleEnum.faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty account not found.")

    reason = payload.reason if payload else None
    updated = db_service.reject_user(faculty_id, reason)

    if fac.email:
        try:
            send_faculty_rejected_email(fac.email, fac.name, reason)
        except Exception as e:
            logger.error("[EMAIL ERROR] Could not send faculty rejection email to %s: %s", fac.email, e)

    return updated


# ============================================================
# STUDENT ACCOUNT APPROVAL WORKFLOW (FACULTY ONLY)
# ============================================================

@faculty_approval_router.get("/pending-students", response_model=List[UserOut])
def get_pending_student_accounts(
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """Faculty retrieves all student registrations awaiting departmental approval."""
    return db_service.get_pending_students()


@faculty_approval_router.post("/students/{student_id}/approve", response_model=UserOut)
def approve_student_account(
    student_id: int,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """Faculty approves a student registration, unlocking the student dashboard and ticket registration."""
    student = db_service.get_user_by_id(student_id)
    if not student or student.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student account not found.")

    updated = db_service.approve_user(student_id)

    # In-app notification
    db_service.create_notification(
        user_id=student_id,
        title="Student Portal Unlocked",
        message=f"Faculty coordinator {current_user.name} has approved your account. You can now register for campus events!",
        type=NotificationType.general,
    )

    # Email notification
    if student.email:
        try:
            send_student_approved_email(student.email, student.name)
        except Exception as e:
            logger.error("[EMAIL ERROR] Could not send student approval email to %s: %s", student.email, e)

    return updated


@faculty_approval_router.post("/students/{student_id}/reject", response_model=UserOut)
def reject_student_account(
    student_id: int,
    payload: Optional[RejectionPayload] = None,
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    """Faculty rejects a student registration."""
    student = db_service.get_user_by_id(student_id)
    if not student or student.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student account not found.")

    reason = payload.reason if payload else None
    updated = db_service.reject_user(student_id, reason)

    if student.email:
        try:
            send_student_rejected_email(student.email, student.name, reason)
        except Exception as e:
            logger.error("[EMAIL ERROR] Could not send student rejection email to %s: %s", student.email, e)

    return updated

