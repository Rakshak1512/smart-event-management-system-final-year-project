from datetime import date, datetime
from typing import Optional


class Event:
    def __init__(
        self,
        id: Optional[int],
        title: str,
        description: str,
        category: str,
        venue: str,
        event_date: date,
        event_time: str,
        total_seats: int,
        available_seats: int,
        poster_url: Optional[str] = None,
        created_by: Optional[int] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        updated_by: Optional[int] = None,
        organizer_name: Optional[str] = None,
        organizer_email: Optional[str] = None,
        organizer_department: Optional[str] = None,
        registration_type: str = "both",
        max_team_size: int = 4,
        rules: Optional[str] = None,
        requirements: Optional[str] = None,
        updated_by_name: Optional[str] = None,
        **kwargs,
    ):
        self.id = int(id) if id is not None else None
        self.title = title
        self.description = description
        self.category = category
        self.venue = venue
        if isinstance(event_date, str):
            self.event_date = date.fromisoformat(event_date)
        else:
            self.event_date = event_date
        self.event_time = event_time
        self.total_seats = int(total_seats) if total_seats is not None else 0
        self.available_seats = int(available_seats) if available_seats is not None else 0
        self.poster_url = poster_url
        self.created_by = int(created_by) if created_by is not None else None
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.updated_by = int(updated_by) if updated_by is not None else None
        self.organizer_name = organizer_name
        self.organizer_email = organizer_email
        self.organizer_department = organizer_department
        self.registration_type = registration_type or "both"
        self.max_team_size = int(max_team_size) if max_team_size is not None else 4
        self.rules = rules
        self.requirements = requirements
        self.updated_by_name = updated_by_name

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "venue": self.venue,
            "event_date": self.event_date.isoformat() if isinstance(self.event_date, (date, datetime)) else str(self.event_date),
            "event_time": self.event_time,
            "total_seats": self.total_seats,
            "available_seats": self.available_seats,
            "poster_url": self.poster_url,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
            "organizer_name": self.organizer_name,
            "organizer_email": self.organizer_email,
            "organizer_department": self.organizer_department,
            "registration_type": self.registration_type,
            "max_team_size": self.max_team_size,
            "rules": self.rules,
            "requirements": self.requirements,
            "updated_by_name": self.updated_by_name,
        }

    @classmethod
    def from_dict(cls, data: dict, doc_id: Optional[str] = None) -> Optional["Event"]:
        if not data:
            return None
        ev_id = data.get("id")
        if ev_id is None and doc_id:
            try:
                ev_id = int(doc_id)
            except (ValueError, TypeError):
                ev_id = doc_id

        raw_date = data.get("event_date")
        if isinstance(raw_date, str):
            try:
                parsed_date = date.fromisoformat(raw_date.strip().split("T")[0])
            except Exception:
                parsed_date = date.today()
        elif isinstance(raw_date, datetime):
            parsed_date = raw_date.date()
        elif isinstance(raw_date, date):
            parsed_date = raw_date
        else:
            parsed_date = date.today()

        return cls(
            id=ev_id,
            title=data.get("title", ""),
            description=data.get("description", ""),
            category=data.get("category", "Technical"),
            venue=data.get("venue", ""),
            event_date=parsed_date,
            event_time=data.get("event_time", ""),
            total_seats=data.get("total_seats", 50),
            available_seats=data.get("available_seats", 50),
            poster_url=data.get("poster_url"),
            created_by=data.get("created_by"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            updated_by=data.get("updated_by"),
            organizer_name=data.get("organizer_name"),
            organizer_email=data.get("organizer_email"),
            organizer_department=data.get("organizer_department"),
            registration_type=data.get("registration_type", "both"),
            max_team_size=data.get("max_team_size", 4),
            rules=data.get("rules"),
            requirements=data.get("requirements"),
            updated_by_name=data.get("updated_by_name"),
        )

