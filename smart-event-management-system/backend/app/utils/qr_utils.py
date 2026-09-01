import io
import os
import uuid

import qrcode

from app.core.config import settings
from app.services.storage_service import upload_to_firebase_storage


def generate_ticket_code() -> str:
    return uuid.uuid4().hex[:16].upper()


def generate_qr_png_bytes(data: str) -> bytes:
    """Generates QR code PNG image bytes entirely in memory."""
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_qr_code(data: str, sub_folder: str = "qrcodes") -> str:
    """
    Generates a QR code PNG for `data` and stores it under uploads/<sub_folder>.
    Also uploads to Firebase Cloud Storage for persistence.
    Returns the relative path to be stored in the DB.
    """
    folder = os.path.join(settings.upload_dir_abs, sub_folder)
    os.makedirs(folder, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(folder, filename)

    png_bytes = generate_qr_png_bytes(data)
    with open(filepath, "wb") as f:
        f.write(png_bytes)

    rel_path = os.path.join("uploads", sub_folder, filename).replace("\\", "/")
    upload_to_firebase_storage(png_bytes, rel_path, content_type="image/png")
    return rel_path

