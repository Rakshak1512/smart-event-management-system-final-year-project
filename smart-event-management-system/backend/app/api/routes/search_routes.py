"""
Global Search Route for EventSphere
Provides fast, role-aware query responses across:
- Direct Navigation Links
- Events
- Certificates
- Registrations & Tickets
- Results & Winners
- Assigned Work & Faculty Tasks
- Faculty Directory
- System Notifications
"""
import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.user import User
from app.db import firestore_service as db_service

logger = logging.getLogger("app.search")

router = APIRouter(prefix="/api/search", tags=["Search"])


class SearchResultItem(BaseModel):
    id: str
    title: str
    category: str
    subtitle: Optional[str] = None
    link: str
    badge: Optional[str] = None


class GlobalSearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]


@router.get("/global", response_model=GlobalSearchResponse)
def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query string"),
    current_user: User = Depends(get_current_user),
):
    query_str = q.strip().lower()
    if not query_str:
        return GlobalSearchResponse(query=q, total=0, results=[])

    role = (current_user.role or "student").lower()
    base_path = f"/{role}" if role in ("student", "faculty", "admin", "volunteer") else "/student"
    results: List[SearchResultItem] = []

    try:
        # 1. Navigation & Quick Links Matching
        nav_items = [
            ("events", "Browse Events", "Explore upcoming campus fests, workshops, and hackathons", f"{base_path}/events"),
            ("certificates", "My Certificates" if role == "student" else "Manage Certificates", "View and download verified digital certificates", f"{base_path}/certificates"),
            ("registrations", "My Registrations" if role == "student" else "Event Registrations", "Track ticket QR passes and registration approvals", f"{base_path}/my-registrations" if role == "student" else f"{base_path}/registrations"),
            ("reports", "Registration Reports", "Review student rosters and download PDF reports", f"{base_path}/registration-reports" if role == "faculty" else f"{base_path}/reports"),
            ("results", "Results & Winners", "View declared standings, winners, and merit certificates", f"{base_path}/results" if role == "faculty" else f"{base_path}/certificates"),
            ("attendance", "Attendance & QR", "Real-time attendee check-ins and QR verification", f"{base_path}/registration-reports" if role == "faculty" else f"{base_path}/dashboard"),
            ("tasks", "Assigned Work", "Review administrative directives and event responsibilities", f"{base_path}/tasks" if role == "faculty" else f"{base_path}/assignments"),
            ("notifications", "Notifications", "Live system announcements and check-in alerts", f"{base_path}/notifications"),
            ("profile", "Profile Settings", "Manage account information and security", f"{base_path}/profile"),
        ]
        for key, title, desc, link in nav_items:
            if query_str in key or query_str in title.lower() or key in query_str:
                results.append(SearchResultItem(
                    id=f"nav-{key}",
                    title=title,
                    category="Navigation",
                    subtitle=desc,
                    link=link,
                    badge="Page",
                ))

        # 2. Events Search (Available to all roles)
        all_events = []
        try:
            all_events = db_service.get_all_events()
            for ev in all_events:
                ev_title = (ev.title or "").lower()
                ev_cat = (ev.category or "").lower()
                ev_venue = (ev.venue or "").lower()
                ev_desc = (ev.description or "").lower()
                if (
                    query_str in ev_title
                    or query_str in ev_cat
                    or query_str in ev_venue
                    or query_str in ev_desc
                    or str(ev.id) == query_str
                ):
                    results.append(SearchResultItem(
                        id=f"event-{ev.id}",
                        title=ev.title,
                        category="Events",
                        subtitle=f"{ev.category} · {ev.venue or 'Campus'} · {ev.event_date} ({ev.available_seats}/{ev.total_seats} seats left)",
                        link=f"{base_path}/events/{ev.id}" if role == "student" else f"{base_path}/events",
                        badge=ev.category,
                    ))
        except Exception as ev_err:
            logger.debug(f"Search events query error: {ev_err}")

        # 3. Certificates Search
        try:
            if role == "student":
                student_certs = db_service.get_certificates_by_registration_number(current_user.registration_number or "")
                for c in student_certs:
                    c_title = (c.title or "").lower()
                    c_id_str = f"esp-{c.id:06d}".lower()
                    if query_str in c_title or query_str in c_id_str or str(c.id) == query_str or "cert" in query_str:
                        results.append(SearchResultItem(
                            id=f"cert-{c.id}",
                            title=c.title,
                            category="Certificates",
                            subtitle=f"Certificate ID: ESP-{c.id:06d} · Issued: {c.issue_date or 'Recent'}",
                            link=f"{base_path}/certificates",
                            badge="Certificate",
                        ))
            elif role in ("faculty", "admin"):
                all_uploaded = db_service.get_faculty_uploaded_certificates(current_user.id) if role == "faculty" else []
                for c in all_uploaded:
                    c_title = (c.title or "").lower()
                    c_reg = (c.registration_number or "").lower()
                    c_name = (c.student_name or "").lower()
                    if query_str in c_title or query_str in c_reg or query_str in c_name or "cert" in query_str:
                        results.append(SearchResultItem(
                            id=f"cert-{c.id}",
                            title=c.title,
                            category="Certificates",
                            subtitle=f"Student: {c.student_name} ({c.registration_number}) · ESP-{c.id:06d}",
                            link=f"{base_path}/certificates",
                            badge="Certificate",
                        ))
        except Exception as cert_err:
            logger.debug(f"Search certificates query error: {cert_err}")

        # 4. Registrations & Tickets Search
        try:
            if role == "student":
                my_regs = db_service.get_my_registrations(current_user.id)
                for r in my_regs:
                    r_title = (r.event.title if r.event else "").lower()
                    r_code = (r.ticket_code or "").lower()
                    r_status = str(r.status.value if hasattr(r.status, "value") else r.status).lower()
                    if query_str in r_title or query_str in r_code or query_str in r_status or "regist" in query_str:
                        results.append(SearchResultItem(
                            id=f"reg-{r.id}",
                            title=r.event.title if r.event else f"Registration #{r.id}",
                            category="My Registrations",
                            subtitle=f"Ticket: {r.ticket_code} · Status: {r_status.upper()}",
                            link=f"{base_path}/my-registrations",
                            badge=r_status.capitalize(),
                        ))
            elif role in ("faculty", "admin"):
                my_events = db_service.get_events_by_organizer(current_user.id) if role == "faculty" else all_events[:10]
                for ev in my_events[:10]:
                    ev_regs = db_service.get_event_registrations(ev.id)
                    for r in ev_regs:
                        s_name = (r.student.name if r.student else r.student_name or "").lower()
                        s_reg = (r.student.registration_number if r.student else r.registration_number or "").lower()
                        t_code = (r.ticket_code or "").lower()
                        if query_str in s_name or query_str in s_reg or query_str in t_code:
                            results.append(SearchResultItem(
                                id=f"reg-{r.id}",
                                title=f"{r.student.name if r.student else r.student_name} ({r.student.registration_number if r.student else r.registration_number})",
                                category="Student Registrations",
                                subtitle=f"Event: {ev.title} · Ticket: {r.ticket_code} · Status: {str(r.status).upper()}",
                                link=f"{base_path}/registrations?eventId={ev.id}",
                                badge=str(r.status).capitalize(),
                            ))
        except Exception as reg_err:
            logger.debug(f"Search registrations query error: {reg_err}")

        # 5. Results & Winners Search
        try:
            if role in ("faculty", "admin"):
                for ev in all_events[:10]:
                    results_list = db_service.get_event_results(ev.id)
                    for res in results_list:
                        res_name = (res.student_name or "").lower()
                        res_reg = (res.registration_number or "").lower()
                        res_pos = (res.position or "").lower()
                        if query_str in res_name or query_str in res_reg or query_str in res_pos or "winner" in query_str or "result" in query_str:
                            results.append(SearchResultItem(
                                id=f"result-{res.id}",
                                title=f"{res.student_name} — {res.position}",
                                category="Results & Winners",
                                subtitle=f"Event: {res.event_title or ev.title} · Reg No: {res.registration_number}",
                                link=f"{base_path}/results?eventId={ev.id}",
                                badge=res.position,
                            ))
        except Exception as res_err:
            logger.debug(f"Search results query error: {res_err}")

        # 6. Assigned Work & Tasks Search
        try:
            if role == "faculty":
                my_tasks = db_service.get_faculty_assignments(current_user.id)
                for t in my_tasks:
                    t_title = (t.title or "").lower()
                    t_desc = (t.description or "").lower()
                    if query_str in t_title or query_str in t_desc or "task" in query_str or "work" in query_str:
                        results.append(SearchResultItem(
                            id=f"task-{t.id}",
                            title=t.title,
                            category="Assigned Work",
                            subtitle=f"Priority: {t.priority.upper()} · Status: {t.status} · Deadline: {t.deadline or 'N/A'}",
                            link=f"{base_path}/tasks",
                            badge=t.priority.capitalize(),
                        ))
            elif role == "admin":
                all_tasks = db_service.get_all_assignments()
                for t in all_tasks:
                    t_title = (t.title or "").lower()
                    t_fac = (t.faculty_name or "").lower()
                    if query_str in t_title or query_str in t_fac or "task" in query_str or "work" in query_str:
                        results.append(SearchResultItem(
                            id=f"task-{t.id}",
                            title=t.title,
                            category="Assigned Work",
                            subtitle=f"Assigned to: Prof. {t.faculty_name} · Priority: {t.priority.upper()}",
                            link=f"{base_path}/assignments",
                            badge=t.status.capitalize(),
                        ))

                # Faculty Directory Search for Admin
                fac_list = db_service.get_all_faculty_with_stats()
                for f in fac_list:
                    f_name = (f.get("name") or "").lower()
                    f_dept = (f.get("department") or "").lower()
                    f_email = (f.get("email") or "").lower()
                    if query_str in f_name or query_str in f_dept or query_str in f_email or "faculty" in query_str:
                        results.append(SearchResultItem(
                            id=f"fac-{f.get('id')}",
                            title=f.get("name"),
                            category="Faculty Directory",
                            subtitle=f"{f.get('department')} · {f.get('email')} · {f.get('assigned_tasks_count', 0)} tasks",
                            link=f"{base_path}/faculty",
                            badge=f.get("department"),
                        ))
        except Exception as task_err:
            logger.debug(f"Search tasks query error: {task_err}")

        # 7. Notifications Search
        try:
            my_notifs = db_service.list_notifications(user_id=current_user.id, limit=20)
            for n in my_notifs:
                n_title = (n.title or "").lower()
                n_msg = (n.message or "").lower()
                if query_str in n_title or query_str in n_msg or "notif" in query_str:
                    results.append(SearchResultItem(
                        id=f"notif-{n.id}",
                        title=n.title,
                        category="Notifications",
                        subtitle=n.message[:90] + ("..." if len(n.message) > 90 else ""),
                        link=f"{base_path}/notifications",
                        badge="Alert",
                    ))
        except Exception as notif_err:
            logger.debug(f"Search notifs query error: {notif_err}")

        # Deduplicate and limit to top 15 most relevant results
        seen_keys = set()
        deduped = []
        for r in results:
            key = (r.category, r.title, r.link)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(r)

        return GlobalSearchResponse(query=q, total=len(deduped), results=deduped[:15])

    except Exception as e:
        logger.exception(f"Global search error for query '{q}': {e}")
        return GlobalSearchResponse(query=q, total=0, results=[])
