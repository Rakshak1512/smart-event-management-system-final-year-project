from datetime import datetime
from typing import Optional


class Certificate:
    def __init__(
        self,
        id: int,
        registration_number: str,
        title: str,
        file_path: str,
        event_id: Optional[int] = None,
        uploaded_by: Optional[int] = None,
        uploaded_at: Optional[datetime] = None,
        pdf_base64: Optional[str] = None,
    ):
        self.id = int(id)
        self.registration_number = str(registration_number)
        self.title = title
        self.file_path = file_path
        self.event_id = int(event_id) if event_id is not None else None
        self.uploaded_by = int(uploaded_by) if uploaded_by is not None else None
        self.uploaded_at = uploaded_at or datetime.utcnow()
        self.pdf_base64 = pdf_base64

    def to_dict(self) -> dict:
        data = {
            "id": self.id,
            "registration_number": self.registration_number,
            "title": self.title,
            "file_path": self.file_path,
            "event_id": self.event_id,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at,
        }
        if self.pdf_base64:
            data["pdf_base64"] = self.pdf_base64
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Certificate":
        if not data:
            return None
        return cls(
            id=data.get("id"),
            registration_number=data.get("registration_number", ""),
            title=data.get("title", ""),
            file_path=data.get("file_path", ""),
            event_id=data.get("event_id"),
            uploaded_by=data.get("uploaded_by"),
            uploaded_at=data.get("uploaded_at"),
            pdf_base64=data.get("pdf_base64"),
        )
