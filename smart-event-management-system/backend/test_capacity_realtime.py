"""
Test Suite for Real-time Event Capacity, Registration Count & Status Transitions
Validates all requirements from the prompt including Requirement 12 scenario.
"""
from datetime import date, datetime, timezone
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


class InMemoryFirestoreDoc:
    def __init__(self, doc_id, data=None):
        self.id = str(doc_id)
        self._data = data.copy() if data else {}
        self.exists = data is not None

    def to_dict(self):
        return self._data.copy() if self.exists else None

    def get(self, field=None, default=None, transaction=None):
        if field is not None and isinstance(field, str):
            return self._data.get(field, default)
        return self

    def set(self, data):
        self._data = data.copy()
        self.exists = True

    def update(self, data):
        if self._data is None:
            self._data = {}
        self._data.update(data)
        self.exists = True

    def delete(self):
        self._data = {}
        self.exists = False


class InMemoryFirestoreCollection:
    def __init__(self, name, db):
        self.name = name
        self.db = db
        self.docs = {}

    def document(self, doc_id):
        doc_id = str(doc_id)
        if doc_id not in self.docs:
            self.docs[doc_id] = InMemoryFirestoreDoc(doc_id, None)
        return self.docs[doc_id]

    def stream(self):
        return [doc for doc in self.docs.values() if doc.exists]

    def where(self, field, op, value):
        class Query:
            def __init__(self, collection, filters):
                self.collection = collection
                self.filters = filters

            def where(self, f, o, v):
                return Query(self.collection, self.filters + [(f, o, v)])

            def limit(self, n):
                self._limit = n
                return self

            def stream(self):
                matches = []
                for doc in self.collection.docs.values():
                    if not doc.exists:
                        continue
                    data = doc.to_dict()
                    match = True
                    for f, o, v in self.filters:
                        val = data.get(f)
                        if o == "==":
                            if isinstance(v, int) and isinstance(val, (int, str)) and str(val).isdigit():
                                if int(val) != v:
                                    match = False
                                    break
                            elif val != v:
                                match = False
                                break
                    if match:
                        matches.append(doc)
                return matches

        return Query(self, [(field, op, value)])


class MockFirestoreClient:
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        if name not in self.collections:
            self.collections[name] = InMemoryFirestoreCollection(name, self)
        return self.collections[name]

    def transaction(self):
        return MagicMock()

    def batch(self):
        return MagicMock()


# Set up mock database
mock_db = MockFirestoreClient()
counters = {}


def mock_get_next_id(collection_name: str) -> int:
    counters[collection_name] = counters.get(collection_name, 0) + 1
    return counters[collection_name]


def run_capacity_test():
    with patch("app.core.firebase.get_firestore_db", return_value=mock_db), \
         patch("app.db.firestore_service.get_firestore_db", return_value=mock_db), \
         patch("app.core.firebase.get_next_id", side_effect=mock_get_next_id), \
         patch("app.db.firestore_service.get_next_id", side_effect=mock_get_next_id), \
         patch("app.utils.email_utils.send_registration_confirmation_email", return_value=True), \
         patch("app.utils.email_utils.send_registration_cancellation_email", return_value=True):

        from app.db import firestore_service as db_service
        from app.models.user import RoleEnum
        from app.models.registration import RegistrationStatus

        print("\n============================================================")
        print("RUNNING REAL-TIME CAPACITY & REGISTRATION SUITE")
        print("============================================================")

        # 1. Create Event with Capacity = 53
        event = db_service.create_event(
            title="TechFest 2026",
            description="Annual National Tech Fest with Workshops and Competitions",
            category="Technical",
            venue="Main Auditorium",
            event_date=date(2026, 9, 15),
            event_time="10:00 AM",
            total_seats=53,
            available_seats=53,
            created_by=1,
            organizer_name="Prof. Alan",
            registration_type="both",
        )
        event_id = event.id
        print(f"[INIT] Event created: ID={event_id}, Total Seats={event.total_seats}, Available Seats={event.available_seats}")

        # Verify initial capacity
        cap = db_service.get_event_capacity(event_id)
        assert cap["totalCapacity"] == 53
        assert cap["activeRegistrations"] == 0
        assert cap["remainingSeats"] == 53
        print(f"[PASS] Initial capacity check: {cap['activeRegistrations']} Active, {cap['remainingSeats']} Remaining")

        # Create Students A, B, C, D
        student_a = db_service.create_user("Student A", "studentA@college.edu", "pass123", RoleEnum.student, "STU001")
        student_b = db_service.create_user("Student B", "studentB@college.edu", "pass123", RoleEnum.student, "STU002")
        student_c = db_service.create_user("Student C", "studentC@college.edu", "pass123", RoleEnum.student, "STU003")
        student_d = db_service.create_user("Student D", "studentD@college.edu", "pass123", RoleEnum.student, "STU004")

        # Step 1: Register Student A, Student B, Student C
        ok_a, msg_a, reg_a = db_service.create_registration_atomic(event_id, student_a.id, "TCK-A")
        assert ok_a, f"Student A reg failed: {msg_a}"

        ok_b, msg_b, reg_b = db_service.create_registration_atomic(event_id, student_b.id, "TCK-B")
        assert ok_b, f"Student B reg failed: {msg_b}"

        ok_c, msg_c, reg_c = db_service.create_registration_atomic(event_id, student_c.id, "TCK-C")
        assert ok_c, f"Student C reg failed: {msg_c}"

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 1] 3 Registrations created -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 3, f"Expected 3 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 50, f"Expected 50 remaining, got {cap['remainingSeats']}"

        # Verify get_event_by_id also reports 50 available seats
        ev_check = db_service.get_event_by_id(event_id)
        assert ev_check.available_seats == 50

        # Step 2: Cancel Student B
        ok_cancel_b, msg_cb = db_service.cancel_registration_by_student(reg_b.id, student_b.id)
        assert ok_cancel_b, f"Cancel B failed: {msg_cb}"

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 2] Cancel Student B -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 2, f"Expected 2 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 51, f"Expected 51 remaining, got {cap['remainingSeats']}"

        # Step 3: Cancel Student C
        ok_cancel_c, msg_cc = db_service.cancel_registration_by_student(reg_c.id, student_c.id)
        assert ok_cancel_c, f"Cancel C failed: {msg_cc}"

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 3] Cancel Student C -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 1, f"Expected 1 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 52, f"Expected 52 remaining, got {cap['remainingSeats']}"

        # Step 4: Change Student A to attended
        up_reg_a, is_cancelling, _, _ = db_service.update_registration_status(reg_a.id, "attended")
        assert up_reg_a.status == RegistrationStatus.attended

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 4] Change Student A to attended -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 1, f"Expected 1 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 52, f"Expected 52 remaining, got {cap['remainingSeats']}"

        # Step 5: Register Student D
        ok_d, msg_d, reg_d = db_service.create_registration_atomic(event_id, student_d.id, "TCK-D")
        assert ok_d, f"Student D reg failed: {msg_d}"

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 5] Register Student D -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 2, f"Expected 2 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 51, f"Expected 51 remaining, got {cap['remainingSeats']}"

        # Step 6: Cancel Student D
        ok_cancel_d, msg_cd = db_service.cancel_registration_by_student(reg_d.id, student_d.id)
        assert ok_cancel_d, f"Cancel D failed: {msg_cd}"

        cap = db_service.get_event_capacity(event_id)
        print(f"[STEP 6] Cancel Student D -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")
        assert cap["activeRegistrations"] == 1, f"Expected 1 active, got {cap['activeRegistrations']}"
        assert cap["remainingSeats"] == 52, f"Expected 52 remaining, got {cap['remainingSeats']}"

        # Step 7: Prevent duplicate active registration
        # Student A is already actively registered ('attended')
        ok_dup, msg_dup, _ = db_service.create_registration_atomic(event_id, student_a.id, "TCK-A2")
        assert not ok_dup, "Duplicate registration should be rejected"
        print(f"[PASS] Duplicate active registration correctly rejected: {msg_dup}")

        # Step 8: Allow re-registration after cancellation
        # Student B was cancelled, should be allowed to re-register
        ok_rereg_b, msg_rereg_b, reg_b_new = db_service.create_registration_atomic(event_id, student_b.id, "TCK-B2")
        assert ok_rereg_b, f"Re-registration after cancellation failed: {msg_rereg_b}"
        cap = db_service.get_event_capacity(event_id)
        assert cap["activeRegistrations"] == 2
        assert cap["remainingSeats"] == 51
        print(f"[PASS] Student B re-registered successfully -> Active: {cap['activeRegistrations']}, Remaining: {cap['remainingSeats']}")

        # Step 9: Capacity Limit Boundary Test
        small_event = db_service.create_event(
            title="Small Workshop",
            description="Limited capacity workshop",
            category="Workshop",
            venue="Lab 1",
            event_date=date(2026, 9, 20),
            event_time="2:00 PM",
            total_seats=1,
            available_seats=1,
            created_by=1,
        )
        small_id = small_event.id

        # First student takes the last seat
        ok_s1, _, _ = db_service.create_registration_atomic(small_id, student_a.id, "TCK-S1")
        assert ok_s1
        cap_small = db_service.get_event_capacity(small_id)
        assert cap_small["remainingSeats"] == 0

        # Step 10: Test FastAPI HTTP API endpoints
        from app.main import app
        from app.core.security import create_access_token

        client = TestClient(app)
        fac_token = create_access_token(data={"sub": str(student_a.id), "role": "faculty", "email": "faculty@college.edu"})
        fac_headers = {"Authorization": f"Bearer {fac_token}"}

        res_cap1 = client.get(f"/api/events/{event_id}/capacity")
        assert res_cap1.status_code == 200, f"Event capacity endpoint failed: {res_cap1.text}"
        data_cap1 = res_cap1.json()
        assert data_cap1["totalCapacity"] == 53
        assert data_cap1["activeRegistrations"] == 2
        assert data_cap1["remainingSeats"] == 51

        res_cap2 = client.get(f"/api/registrations/event/{event_id}/capacity")
        assert res_cap2.status_code == 200, f"Registration event capacity endpoint failed: {res_cap2.text}"
        data_cap2 = res_cap2.json()
        assert data_cap2["totalCapacity"] == 53
        assert data_cap2["activeRegistrations"] == 2
        assert data_cap2["remainingSeats"] == 51
        print(f"[PASS] HTTP GET /api/events/{event_id}/capacity and /api/registrations/event/{event_id}/capacity returned correct data")

        print("\n[SUCCESS] ALL CAPACITY, SEAT CALCULATION & STATUS TRANSITION TESTS PASSED!\n")


if __name__ == "__main__":
    run_capacity_test()
