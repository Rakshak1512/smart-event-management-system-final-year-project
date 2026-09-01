import logging
from typing import List, Optional
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
from app.services.email_service import send_faculty_work_assigned_email

logger = logging.getLogger("app.admin")

router = APIRouter(prefix="/api/admin", tags=["Admin"])
faculty_task_router = APIRouter(prefix="/api/faculty/tasks", tags=["Faculty Tasks"])


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
