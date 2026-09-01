from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    type: NotificationType = NotificationType.general
