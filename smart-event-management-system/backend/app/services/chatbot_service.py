import logging
import re
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional

from app.db import firestore_service as db_service
from app.models.user import User

logger = logging.getLogger("app.chatbot")


def _find_event_in_text(text: str, all_events: list) -> Optional[Any]:
    """Find an event mentioned in the text by title or ID."""
    if not text:
        return None
    clean = text.lower()

    # Direct ID matches: "event #1", "event 2", "id 1"
    id_match = re.search(r"\b(?:event|id)\s*#?\s*(\d+)\b", clean)
    if id_match:
        try:
            target_id = int(id_match.group(1))
            for ev in all_events:
                if ev.id == target_id:
                    return ev
        except Exception:
            pass

    # Exact or substring match by title
    # Sort events by length descending to match longer specific titles first
    sorted_events = sorted(all_events, key=lambda e: len(e.title or ""), reverse=True)
    for ev in sorted_events:
        if ev.title and len(ev.title.strip()) > 1:
            title_lower = ev.title.strip().lower()
            # Whole word or boundary match
            if re.search(rf"\b{re.escape(title_lower)}\b", clean) or title_lower in clean:
                return ev

    return None


def _resolve_contextual_event(message: str, history: Optional[List[Dict[str, str]]], all_events: list) -> Optional[Any]:
    """
    Resolves the active event from current user query first,
    or falls back to previous conversation history turns.
    """
    # 1. Search current prompt
    ev = _find_event_in_text(message, all_events)
    if ev:
        return ev

    # 2. Search previous conversation history (last 4 messages)
    if history:
        for turn in reversed(history[-4:]):
            content = turn.get("content", "")
            ev = _find_event_in_text(content, all_events)
            if ev:
                return ev

    # 3. If there is only exactly 1 active event in system, use it as default context
    if len(all_events) == 1:
        return all_events[0]

    return None


def get_chatbot_response(user: User, message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Role-aware, database-grounded EventSphere AI Assistant.
    Retrieves authoritative real-time Firestore records and enforces strict role permissions.
    """
    try:
        clean_msg = (message or "").strip().lower()
        role = user.role.value if hasattr(user.role, "value") else str(user.role).lower()

        all_events = db_service.get_all_events()
        ctx_event = _resolve_contextual_event(message, history, all_events)

        # Token / Intent Helper Sets
        has_any = lambda words: any(w in clean_msg for w in words)

        # Security Guardrail: Prompt Injection & Sensitive Data Protection
        sensitive_patterns = [
            "ignore previous instructions", "system prompt", "api key", "resend_api_key",
            "firebase_private_key", "jwt_secret", "database credentials", "password hash",
            "admin password", "other student", "another student", "all students passwords",
            "sql injection", "drop table", "reveal secrets", "bypass authentication"
        ]
        if any(p in clean_msg for p in sensitive_patterns):
            return {
                "reply": "🔒 **Security Notice:** I cannot disclose system credentials, private keys, API configurations, or another user's personal records. My assistance is strictly confined to verified EventSphere campus activities and your own authorized profile.",
                "suggestions": ["What events are available?", "What events am I registered for?", "How does account approval work?"],
            }

        # Cross-Role Workflow Inquiries
        if has_any(["how does approval work", "approval process", "account approval", "pending approval", "faculty approval", "admin approval"]):
            appr_status = getattr(user, "approval_status", "ACTIVE") or "ACTIVE"
            if role == "student":
                st_desc = "Your student account is currently **ACTIVE** and fully approved." if appr_status == "ACTIVE" else "Your account is **Awaiting Faculty Approval**."
                return {
                    "reply": f"📋 **EventSphere Account Approval Workflow:**\n\n1. **Student Registration:** Students sign up and verify their email via a 6-digit OTP.\n2. **Faculty Verification:** Department faculty review student credentials.\n3. **Active Status:** Once approved by faculty, the student dashboard and event registration unlock.\n\n• **Your Status:** {st_desc}",
                    "suggestions": ["What events are available?", "How do I register?", "Where is my QR code?"],
                }
            elif role == "faculty":
                st_desc = "Your faculty account is currently **ACTIVE**." if appr_status == "ACTIVE" else "Your faculty account is **Awaiting Admin Approval**."
                return {
                    "reply": f"📋 **Faculty Approval Workflow:**\n\n1. **Faculty Registration:** Faculty sign up and verify email.\n2. **Admin Review:** System Administrator reviews faculty department and credentials.\n3. **Approval:** Once approved by Admin, faculty can create events, approve student accounts, and view analytics.\n\n• **Your Status:** {st_desc}\n\n👉 *You can review and approve pending students from the Faculty Portal.*",
                    "suggestions": ["Show pending students", "How many events are active?", "What work is assigned?"],
                }
            elif role == "admin":
                return {
                    "reply": "📋 **Administrative Approvals:**\n\nAs an Administrator, you have full authority to approve or reject pending faculty registrations under **Faculty Directory & Approvals**.",
                    "suggestions": ["Show pending faculty", "How many events are active?", "Show reports"],
                }

        if has_any(["how to get certificate", "certificate process", "how do i get my certificate", "when do i get certificate"]):
            return {
                "reply": "🎓 **Certificate Issuance Process:**\n\n1. **Register:** Register for a campus event via EventSphere.\n2. **Attend:** Have your ticket QR code verified by event volunteers at the venue entrance.\n3. **Issuance:** After the event concludes, faculty coordinators issue participation and merit certificates.\n4. **Download:** Digital certificates appear in your **Certificates** tab as verifiable high-resolution PDFs.",
                "suggestions": ["Show my certificates", "What events am I registered for?", "What events are available?"],
            }

        if has_any(["qr ticket", "qr pass", "how does qr work", "how do i scan qr", "scanner work"]):
            if role == "student":
                return {
                    "reply": "🎟️ **Digital QR Tickets:**\n\nWhen you register for an approved event, a personalized digital QR pass is generated under **My Registrations**. Simply display the QR pass on your phone screen at the venue entrance for the volunteer scanner team.",
                    "suggestions": ["What events am I registered for?", "Where is my QR code?", "What events are available?"],
                }
            elif role in ("volunteer", "faculty"):
                return {
                    "reply": "📷 **Volunteer QR Check-in System:**\n\n1. Open the **QR Scanner** on your Volunteer or Faculty Dashboard.\n2. Allow camera permissions (supports Front and Back cameras with standard lens filtering).\n3. Point at the attendee's ticket or upload a saved ticket image.\n4. Click **Confirm Attendance** once attendee details appear. Duplicate check-ins are automatically blocked.",
                    "suggestions": ["Show my assigned events", "How many attendees scanned?"],
                }

        is_reg_query = has_any(["register", "registration", "registered", "enrolled", "sign up", "entry"])
        is_att_query = has_any(["attend", "attended", "attendance", "checked in", "check-in", "present", "came", "roster"])
        is_cert_query = has_any(["cert", "certificate", "certificates", "diploma", "credential", "award letter"])
        is_result_query = has_any(["result", "results", "winner", "winners", "win", "won", "standing", "standings", "1st", "2nd", "3rd", "first place", "place"])
        is_seat_query = has_any(["seat", "seats", "capacity", "available", "left", "remaining", "full"])
        is_task_query = has_any(["task", "tasks", "work", "assigned", "assignment", "assignments", "duty"])
        is_venue_query = has_any(["where", "venue", "location", "place", "auditorium", "hall", "lab"])
        is_time_query = has_any(["when", "time", "date", "schedule", "timing", "start", "starts", "happening"])
        is_how_reg = has_any(["how do i register", "how to register", "can i register", "how can i register", "steps to register"])
        is_how_cancel = has_any(["cancel registration", "how to cancel", "can i cancel", "cancel my", "how can i cancel"])
        is_notif_query = has_any(["notification", "notifications", "alert", "alerts", "message", "messages"])
        is_fac_query = has_any(["faculty", "prof", "professor", "teacher", "coordinator", "teachers"])

        # =========================================================================
        # 1. STUDENT INTENTS
        # =========================================================================
        if role == "student":
            my_regs = db_service.get_my_registrations(user.id)
            user_reg_no = (user.registration_number or "").strip()

            # A. How to Register / How to Cancel
            if is_how_reg:
                return {
                    "reply": "📝 **How to Register for an Event on EventSphere:**\n\n1. Go to the **Events** tab in the sidebar.\n2. Browse active events and click on any event card to view venue and rules.\n3. Click the **'Register Now'** button.\n4. Your personalized digital QR ticket will be generated instantly under **My Registrations**!",
                    "suggestions": ["What events are available?", "What events am I registered for?", "Where is my QR code?"],
                }

            if is_how_cancel:
                return {
                    "reply": "❌ **How to Cancel a Registration:**\n\n1. Open **My Registrations** from the sidebar.\n2. Find your event card.\n3. Click the **'Cancel Registration'** button.\n4. Confirm the cancellation.\n\n*Note: Cancelling immediately releases your seat for other students. If your registration was already approved or cancelled, the audit trail is safely retained.*",
                    "suggestions": ["What events am I registered for?", "What events are available?", "Show my certificates"],
                }

            # B. Certificates Query ("Download my certificates", "Show my certificates", "Do I have a certificate?")
            if is_cert_query:
                certs = db_service.get_certificates_by_registration_number(user_reg_no) if user_reg_no else []
                if not certs:
                    return {
                        "reply": f"📄 You don't have any uploaded certificates yet for register number **{user_reg_no or 'N/A'}**.\n\nOnce event coordinators declare winners or issue certificates for events you attended, they will appear automatically under the **Certificates** tab.",
                        "suggestions": ["What events am I registered for?", "Did I attend the event?", "What events are available?"],
                    }
                lines = [f"• **{c.title}** (Certificate ID: `ESP-{c.id:06d}`) — Conducted on {c.issue_date or 'Recent'}" for c in certs]
                return {
                    "reply": f"🎓 **Your Available Certificates ({len(certs)} total):**\n\n" + "\n".join(lines) + "\n\n👉 Open the **Certificates** tab in your sidebar to preview and download your high-resolution vector PDF certificates.",
                    "suggestions": ["What events am I registered for?", "Which events did I win?", "Did I attend the event?"],
                }

            # C. Winners / Did I win?
            if is_result_query and not is_seat_query:
                # Query user results
                db = db_service.get_firestore_db()
                results_docs = list(db.collection("event_results").where("registration_number", "==", user_reg_no).stream()) if user_reg_no else []
                if not results_docs:
                    return {
                        "reply": f"🏆 No award or winner positions have been recorded for register number **{user_reg_no or 'N/A'}** yet.\n\nBe sure to check back once faculty coordinators finalize event results in the **Results** section.",
                        "suggestions": ["Show my certificates", "What events am I registered for?", "What events are available?"],
                    }
                lines = []
                for d in results_docs:
                    r_data = d.to_dict() or {}
                    ev_title = r_data.get("event_title") or (ctx_event.title if ctx_event else "Campus Event")
                    pos = r_data.get("position", "Winner")
                    cert_id = r_data.get("certificate_id")
                    cert_tag = f" | Certificate: `ESP-{cert_id:06d}`" if cert_id else ""
                    lines.append(f"• **{ev_title}**: `{pos}`{cert_tag}")
                return {
                    "reply": f"🎉 **Congratulations! Here are your recorded award standings:**\n\n" + "\n".join(lines) + "\n\nYou can download the certificate under **Certificates**.",
                    "suggestions": ["Show my certificates", "What events am I registered for?", "What events are available?"],
                }

            # D. Student's Registered Events / Status ("What events am I registered for?", "Is my registration approved?")
            if (is_reg_query or has_any(["what events am i", "my events", "events i registered", "am i registered", "approved"])) and not is_how_reg:
                if not my_regs:
                    return {
                        "reply": "You are not currently registered for any events. Browse upcoming competitions and workshops under the **Events** tab to grab your seat!",
                        "suggestions": ["What events are available?", "How do I register?"],
                    }

                # If specific event mentioned
                if ctx_event:
                    matching = [r for r in my_regs if r.event_id == ctx_event.id]
                    if matching:
                        reg = matching[0]
                        st = str(reg.status.value if hasattr(reg.status, "value") else reg.status).upper()
                        is_att = "✅ Attended (Confirmed Present)" if (reg.status in ("attended", "completed") or reg.checked_in_at) else "⏳ Not Attended Yet"
                        return {
                            "reply": f"📋 **Registration Details for {ctx_event.title}:**\n\n• **Status:** `{st}`\n• **Ticket Code:** `{reg.ticket_code}`\n• **Date:** {ctx_event.event_date}\n• **Venue:** {ctx_event.venue}\n• **Attendance:** {is_att}\n\nOpen **My Registrations** to view your QR ticket.",
                            "suggestions": ["Where is my QR code?", "How many seats are left?", "Show my certificates"],
                        }
                    else:
                        return {
                            "reply": f"You are not registered for **{ctx_event.title}**. There are currently **{ctx_event.available_seats} seats remaining** if you would like to register in the **Events** tab.",
                            "suggestions": ["How do I register?", "What events am I registered for?", "What events are available?"],
                        }

                lines = []
                for r in my_regs:
                    title = r.event.title if r.event else f"Event #{r.event_id}"
                    st = str(r.status.value if hasattr(r.status, "value") else r.status).upper()
                    lines.append(f"• **{title}** — Status: `{st}` | Ticket: `{r.ticket_code}`")
                return {
                    "reply": f"📋 **You are registered for {len(my_regs)} event(s):**\n\n" + "\n".join(lines) + "\n\nAccess your QR pass from **My Registrations**.",
                    "suggestions": ["Where is my QR code?", "Did I attend the event?", "Show my certificates"],
                }

            # E. Attendance Query ("Which events have I attended?", "Did I attend?")
            if is_att_query:
                attended = [r for r in my_regs if r.status in ("attended", "completed") or r.checked_in_at]
                if not attended:
                    return {
                        "reply": "You have not attended any events yet. When you arrive at the venue, present your digital QR pass from **My Registrations** to the volunteer desk.",
                        "suggestions": ["What events am I registered for?", "Where is my QR code?", "What events are available?"],
                    }
                lines = []
                for r in attended:
                    title = r.event.title if r.event else "Campus Event"
                    chk_str = r.checked_in_at.strftime("%d %b %Y, %I:%M %p") if isinstance(r.checked_in_at, datetime) else "Confirmed"
                    lines.append(f"• **{title}** — Verified Present at `{chk_str}`")
                return {
                    "reply": f"✅ **Confirmed Attendance ({len(attended)} event(s)):**\n\n" + "\n".join(lines),
                    "suggestions": ["Show my certificates", "Which events did I win?", "What events are available?"],
                }

            # F. Seats Left Query
            if is_seat_query:
                if ctx_event:
                    cap = db_service.get_event_capacity(ctx_event.id)
                    return {
                        "reply": f"🪑 **Seat Capacity for {ctx_event.title}:**\n\n• **Total Capacity:** {cap['totalCapacity']} Seats\n• **Approved Registered:** {cap['approved_count']}\n• **Seats Left:** {cap['remainingSeats']} Seats",
                        "suggestions": ["Where is the event?", "When is the event?", "How do I register?"],
                    }
                lines = [f"• **{e.title}**: {e.available_seats}/{e.total_seats} seats remaining" for e in all_events[:6]]
                return {
                    "reply": "🪑 **Available Seats Across Events:**\n\n" + "\n".join(lines),
                    "suggestions": ["What events are available?", "How do I register?"],
                }

            # G. Venue & Timing Query
            if (is_venue_query or is_time_query) and ctx_event:
                time_str = f" at {ctx_event.event_time}" if ctx_event.event_time else ""
                return {
                    "reply": f"📍 **Schedule & Location for {ctx_event.title}:**\n\n• **Date & Time:** {ctx_event.event_date}{time_str}\n• **Venue:** {ctx_event.venue or 'Campus Venue'}\n• **Category:** {ctx_event.category or 'General'}\n• **Seats Left:** {ctx_event.available_seats} of {ctx_event.total_seats}",
                    "suggestions": ["How do I register?", "How many seats are left?", "What events are available?"],
                }

            # H. Available / Upcoming Events
            if has_any(["available", "upcoming", "what events", "all events", "browse"]):
                open_events = [e for e in all_events if e.available_seats > 0]
                if not open_events:
                    return {
                        "reply": "There are currently no events with open seats. Please check back shortly!",
                        "suggestions": ["What events am I registered for?", "Show my certificates"],
                    }
                lines = [f"• **{e.title}** ({e.category}) — Date: {e.event_date}, Venue: {e.venue}, **{e.available_seats} seats left**" for e in open_events[:6]]
                return {
                    "reply": f"🎉 **Available Events ({len(open_events)} open):**\n\n" + "\n".join(lines) + "\n\nRegister under the **Events** tab.",
                    "suggestions": ["How do I register?", "What events am I registered for?", "Show my certificates"],
                }

            # Greetings vs Unknown Queries
            if has_any(["hi", "hello", "hey", "who are you", "help", "good morning", "good evening"]):
                return {
                    "reply": f"Hello {user.name}! I am **EventSphere AI**. You can ask me about available events, your registered events, attendance check-ins, seats remaining, or downloading certificates.",
                    "suggestions": ["What events am I registered for?", "Show my certificates", "What events are available?", "Did I attend the event?"],
                }

            # Out of Domain / Unknown Query Refusal
            return {
                "reply": "I don't have enough information to answer that accurately. I can assist with EventSphere event registrations, schedules, QR attendance, account approvals, and certificates.",
                "suggestions": ["What events are available?", "What events am I registered for?", "How does approval work?"],
            }

        # =========================================================================
        # 2. FACULTY INTENTS
        # =========================================================================
        elif role == "faculty":
            # A. Assigned Work / Tasks
            if is_task_query:
                tasks = db_service.get_faculty_assignments(user.id)
                if not tasks:
                    return {
                        "reply": "You currently have no pending tasks assigned by the administration. All your academic event coordination is up to date!",
                        "suggestions": ["How many students registered?", "Who attended?", "Who won?"],
                    }
                lines = []
                for t in tasks:
                    dl = f" | Due: {t.deadline}" if t.deadline else ""
                    lines.append(f"• **{t.title}** [{t.priority.upper()}] — Status: `{t.status}`{dl}\n  *{t.description}*")
                return {
                    "reply": f"📋 **Your Assigned Work ({len(tasks)} tasks):**\n\n" + "\n\n".join(lines) + "\n\nUpdate task status under **Assigned Work**.",
                    "suggestions": ["How many students registered?", "Who attended?", "Show my notifications"],
                }

            # B. Notifications Query
            if is_notif_query:
                notifs = db_service.list_notifications(user_id=user.id, limit=5)
                if not notifs:
                    return {
                        "reply": "You have no new notifications.",
                        "suggestions": ["How many students registered?", "What work is assigned to me?"],
                    }
                lines = [f"• **{n.title}**: {n.message}" for n in notifs]
                return {
                    "reply": "🔔 **Your Recent Notifications:**\n\n" + "\n".join(lines),
                    "suggestions": ["What work is assigned to me?", "How many students registered?"],
                }

            # C. Results & Winners Query ("Who won SPORTS?", "Show results", "Who are the winners?")
            if is_result_query and not is_seat_query:
                target = ctx_event or (all_events[0] if all_events else None)
                if not target:
                    return {
                        "reply": "No events available to display results.",
                        "suggestions": ["How many students registered?", "What work is assigned to me?"],
                    }
                results = db_service.get_event_results(target.id)
                if not results:
                    return {
                        "reply": f"🏆 No winners or standings have been declared for **{target.title}** yet.\n\nOpen **Results** in your sidebar to award 1st, 2nd, or 3rd place to verified attendees.",
                        "suggestions": [f"Who attended {target.title}?", f"How many registered for {target.title}?", "What work is assigned to me?"],
                    }
                lines = []
                for r in results:
                    cert_tag = f" (Certificate: ESP-{r.certificate_id})" if r.certificate_id else " (Cert Pending)"
                    lines.append(f"• **{r.position}**: {r.student_name} ({r.registration_number}) — {r.student_department}{cert_tag}")
                return {
                    "reply": f"🏆 **Declared Winners for {target.title}:**\n\n" + "\n".join(lines) + "\n\nManage standings and certificates in the **Results** dashboard.",
                    "suggestions": [f"Who attended {target.title}?", f"How many registered for {target.title}?", "Show certificates"],
                }

            # D. Certificates Uploaded Query
            if is_cert_query:
                target = ctx_event or (all_events[0] if all_events else None)
                if target:
                    results = db_service.get_event_results(target.id)
                    uploaded_results = [r for r in results if r.certificate_id]
                    if uploaded_results:
                        lines = [f"• **{r.student_name}** ({r.registration_number}) — Certificate `ESP-{r.certificate_id}` ({r.position})" for r in uploaded_results]
                        return {
                            "reply": f"🎓 **Uploaded Certificates for {target.title} ({len(uploaded_results)} issued):**\n\n" + "\n".join(lines),
                            "suggestions": [f"Who won {target.title}?", f"Who attended {target.title}?"],
                        }
                    else:
                        return {
                            "reply": f"No certificates have been issued for **{target.title}** yet. You can auto-generate or upload certificates under **Results** or **Certificates**.",
                            "suggestions": [f"Who won {target.title}?", f"Who attended {target.title}?"],
                        }

            # E. Follow-up "Who are they?" / "Who are the students?" / "List them"
            if has_any(["who are they", "who is that", "who are the", "list them", "show them", "tell me about them", "names of them"]) and ctx_event:
                all_regs = db_service.get_event_registrations(ctx_event.id)
                approved = [r for r in all_regs if r.status in ("approved", "attended", "completed")]
                if not approved:
                    return {
                        "reply": f"No approved student registrations found for **{ctx_event.title}** yet.",
                        "suggestions": [f"Who attended {ctx_event.title}?", f"How many registered for {ctx_event.title}?"],
                    }
                lines = []
                for r in approved[:10]:
                    name = r.student.name if r.student else f"Student #{r.student_id}"
                    reg_no = r.student.registration_number if r.student else "N/A"
                    lines.append(f"• **{name}** (`{reg_no}`) — Ticket: `{r.ticket_code}`")
                overflow = f"\n*...and {len(approved) - 10} more*" if len(approved) > 10 else ""
                return {
                    "reply": f"📋 **Approved Students for {ctx_event.title} ({len(approved)} total):**\n\n" + "\n".join(lines) + overflow,
                    "suggestions": [f"Who attended {ctx_event.title}?", f"Who won {ctx_event.title}?"],
                }

            # F. Who Attended? ("Who attended SPORTS?", "Show attended students")
            if is_att_query:
                target = ctx_event or (all_events[0] if all_events else None)
                if not target:
                    return {
                        "reply": "No events found to display attendance.",
                        "suggestions": ["How many students registered?", "What work is assigned to me?"],
                    }
                all_regs = db_service.get_event_registrations(target.id)
                attended = [r for r in all_regs if (r.status in ("attended", "completed") or r.checked_in_at) and r.status != "cancelled"]
                if not attended:
                    return {
                        "reply": f"👥 No students have been marked attended for **{target.title}** yet. Volunteer QR check-ins at the venue will update this list in real time.",
                        "suggestions": [f"How many registered for {target.title}?", f"Who registered for {target.title}?"],
                    }
                lines = []
                for r in attended[:10]:
                    name = r.student.name if r.student else f"Student #{r.student_id}"
                    reg_no = r.student.registration_number if r.student else "N/A"
                    time_str = r.checked_in_at.strftime("%I:%M %p") if isinstance(r.checked_in_at, datetime) else "Confirmed"
                    lines.append(f"• **{name}** (`{reg_no}`) — Checked in at {time_str}")
                overflow = f"\n*...and {len(attended) - 10} more*" if len(attended) > 10 else ""
                return {
                    "reply": f"👥 **Verified Attended Students for {target.title} ({len(attended)} total):**\n\n" + "\n".join(lines) + overflow + f"\n\nDownload the Attendance PDF in **Registration Reports**.",
                    "suggestions": [f"Who won {target.title}?", f"How many registered for {target.title}?"],
                }

            # G. Who Registered? ("Who registered for SPORTS?", "Show registered students")
            if is_reg_query and has_any(["who", "list", "names", "students", "roster", "show"]):
                target = ctx_event or (all_events[0] if all_events else None)
                if not target:
                    return {
                        "reply": "No events found to display registered students.",
                        "suggestions": ["What work is assigned to me?"],
                    }
                all_regs = db_service.get_event_registrations(target.id)
                approved = [r for r in all_regs if r.status in ("approved", "attended", "completed")]
                if not approved:
                    return {
                        "reply": f"No approved student registrations found for **{target.title}** yet.",
                        "suggestions": [f"How many registered for {target.title}?", "What work is assigned to me?"],
                    }
                lines = []
                for r in approved[:10]:
                    name = r.student.name if r.student else f"Student #{r.student_id}"
                    reg_no = r.student.registration_number if r.student else "N/A"
                    lines.append(f"• **{name}** (`{reg_no}`) — Ticket: `{r.ticket_code}`")
                overflow = f"\n*...and {len(approved) - 10} more*" if len(approved) > 10 else ""
                return {
                    "reply": f"📋 **Approved Registered Students for {target.title} ({len(approved)} total):**\n\n" + "\n".join(lines) + overflow,
                    "suggestions": [f"Who attended {target.title}?", f"Who won {target.title}?"],
                }

            # H. Registration Counts & Breakdown ("How many students registered?", "How many registered for SPORTS?")
            if is_reg_query or is_seat_query or has_any(["how many", "count", "total", "breakdown"]):
                if ctx_event:
                    cap = db_service.get_event_capacity(ctx_event.id)
                    return {
                        "reply": f"📊 **Registration Report for {ctx_event.title}:**\n\n• **Approved Registered:** {cap['approved_count']} Students\n• **Attended (QR Verified):** {cap['attended_count']} Students\n• **Pending Approval:** {cap['pending_count']}\n• **Cancelled:** {cap['cancelled_count']}\n• **Seats Left:** {cap['remainingSeats']} of {cap['totalCapacity']}",
                        "suggestions": [f"Who registered for {ctx_event.title}?", f"Who attended {ctx_event.title}?", f"Who won {ctx_event.title}?"],
                    }

                # Summary across all events
                lines = []
                for ev in all_events[:5]:
                    cap = db_service.get_event_capacity(ev.id)
                    lines.append(f"• **{ev.title}**: {cap['approved_count']} Approved, {cap['attended_count']} Attended ({cap['remainingSeats']}/{cap['totalCapacity']} seats left)")
                return {
                    "reply": "📊 **Event Registration & Attendance Summary:**\n\n" + "\n".join(lines) + "\n\nAsk about any specific event (e.g., *'Who registered for SPORTS?'*) for details.",
                    "suggestions": ["Who attended?", "Who won?", "What work is assigned to me?"],
                }

            # Faculty Default Fallback
            return {
                "reply": f"Hello Prof. {user.name}! I am **EventSphere AI**. You can ask me about registration counts, attendee lists, declared winners, uploading certificates, or your assigned work tasks.",
                "suggestions": ["How many students registered?", "Who attended?", "Who won?", "What work is assigned to me?"],
            }

        # =========================================================================
        # 3. VOLUNTEER INTENTS
        # =========================================================================
        elif role == "volunteer":
            dash_data = db_service.get_volunteer_dashboard_data(user)

            if has_any(["how do i scan", "how to scan", "scanner", "scan qr", "instructions"]):
                return {
                    "reply": "📷 **How to Scan Tickets as Volunteer:**\n\n1. Open your **Volunteer Dashboard**.\n2. Click the purple **[Scan Registration QR]** button.\n3. Point your device camera at the student's digital QR pass.\n4. If the ticket is approved and valid, tap **'Confirm Attendance'**.\n\n*Note: Cancelled or unapproved tickets will be blocked automatically.*",
                    "suggestions": ["Show my assigned events", "How many attendees scanned?", "Who has attended?"],
                }

            if is_task_query or has_any(["assigned", "my event", "today's events", "which event"]):
                assigned = dash_data.get("assigned_events", [])
                if not assigned:
                    return {
                        "reply": "You are authorized for open check-in across all active campus events. Click **[Scan Registration QR]** on your dashboard to scan passes.",
                        "suggestions": ["How many attendees scanned?", "How do I scan QR?"],
                    }
                lines = [f"• **{e['title']}** ({e['category']}) — Date: {e['event_date']}, Venue: {e['venue']}, Checked In: {e['checked_in']}/{e['registered']}" for e in assigned]
                return {
                    "reply": f"📅 **Your Assigned Events ({len(assigned)}):**\n\n" + "\n".join(lines),
                    "suggestions": ["How many attendees scanned?", "How do I scan QR?"],
                }

            if is_att_query or has_any(["how many", "scanned", "count", "stats"]):
                total_s = dash_data.get("total_scanned", 0)
                today_s = dash_data.get("today_scanned", 0)
                return {
                    "reply": f"📋 **Your Volunteer Check-in Statistics:**\n\n• **Total Attendees Verified by You:** {total_s}\n• **Attendees Checked-in Today:** {today_s}\n• **Status:** Active Volunteer Desk",
                    "suggestions": ["Show my assigned events", "How do I scan QR?"],
                }

            return {
                "reply": f"Hello Volunteer {user.name}! I am **EventSphere AI**. Ask me about scanning student passes, assigned event venues, or your verified check-in counts.",
                "suggestions": ["How do I scan QR?", "Show my assigned events", "How many attendees scanned?"],
            }

        # =========================================================================
        # 4. ADMIN INTENTS
        # =========================================================================
        elif role == "admin":
            if is_fac_query:
                fac_list = db_service.get_all_faculty_with_stats()
                dept_counts = {}
                for f in fac_list:
                    dept = f.get("department") or "General"
                    dept_counts[dept] = dept_counts.get(dept, 0) + 1
                dept_lines = [f"• {dept}: {cnt} faculty" for dept, cnt in dept_counts.items()]
                return {
                    "reply": f"👩‍🏫 **Faculty Directory ({len(fac_list)} Total Faculty):**\n\n" + "\n".join(dept_lines) + "\n\nManage task assignments under **Faculty** & **Assignments**.",
                    "suggestions": ["What work is assigned?", "How many events are active?", "Show reports"],
                }

            if is_task_query:
                all_tasks = db_service.get_all_assignments()
                pending = sum(1 for t in all_tasks if t.status in ("pending", "in_progress"))
                completed = sum(1 for t in all_tasks if t.status == "completed")
                lines = [f"• **{t.title}** &rarr; Prof. {t.faculty_name} [{t.priority.upper()}] — `{t.status}`" for t in all_tasks[:5]]
                return {
                    "reply": f"📑 **Work Assignments Overview:**\n\n• **Total Tasks:** {len(all_tasks)}\n• **In Progress / Pending:** {pending}\n• **Completed:** {completed}\n\n**Recent Tasks:**\n" + "\n".join(lines),
                    "suggestions": ["Show faculty", "How many events are active?", "Show reports"],
                }

            if has_any(["active events", "all events", "how many events", "event stats", "events are active", "events active", "what events"]):
                total_seats = sum(e.total_seats for e in all_events)
                total_avail = sum(e.available_seats for e in all_events)
                lines = [f"• **{e.title}**: {e.total_seats - e.available_seats}/{e.total_seats} registered" for e in all_events[:5]]
                return {
                    "reply": f"🎪 **Active Events ({len(all_events)} Total):**\n\n• **Total Capacity:** {total_seats} Seats\n• **Seats Remaining:** {total_avail}\n\n" + "\n".join(lines),
                    "suggestions": ["Show faculty", "What work is assigned?", "Show reports"],
                }

            if has_any(["report", "reports", "export", "download"]):
                return {
                    "reply": "📊 **Administrative Reports & Data Downloads:**\n\nOpen the **Reports** tab to generate and export:\n• Faculty Directory & Task Allocations\n• Master Events Catalog\n• Student Registrations\n• Attendance Logs\n• Event Results & Winners",
                    "suggestions": ["Show faculty", "What work is assigned?", "How many events are active?"],
                }

            return {
                "reply": f"Hello Administrator {user.name}! I am **EventSphere AI**. Ask me about faculty availability, active work assignments, campus event capacity, or generating administrative reports.",
                "suggestions": ["How many faculty are there?", "What work is assigned?", "How many events are active?", "Show reports"],
            }

        # Default Fallback: Prompt specifically mandates: If it does not know something: Say: "I don't have enough information to answer that accurately."
        return {
            "reply": "I don't have enough information to answer that accurately. I can assist with EventSphere event registrations, schedules, QR attendance, account approvals, and certificates.",
            "suggestions": ["What events are available?", "What events am I registered for?", "How does approval work?"],
        }

    except Exception as e:
        logger.exception("Error in chatbot response generation: %s", e)
        return {
            "reply": "I don't have enough information to answer that accurately right now. Please try asking about available campus events or registration status.",
            "suggestions": ["What events are available?", "What events am I registered for?"],
        }
