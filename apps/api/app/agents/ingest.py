from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.agents.state import IngestState
from app.config import get_settings

logger = logging.getLogger(__name__)


from functools import lru_cache

@lru_cache()
def _get_supabase():
    from supabase import create_client

    s = get_settings()
    return create_client(s.supabase_url, s.supabase_secret_key)


def ingest_node(state: IngestState) -> IngestState:
    """Hash the file, upload to Supabase Storage, and create the incident row."""
    try:
        content_type = state.get("content_type", "note")
        user_id = state["user_id"]

        # For text notes, there is no file to upload
        if content_type == "note":
            incident_id = _create_incident_row(
                user_id=user_id,
                content_type=content_type,
                text_content=state.get("text_content", ""),
                file_url=None,
                file_hash=None,
                metadata={},
            )
            return {**state, "incident_id": incident_id, "file_hash": "", "file_url": "", "metadata": {}}

        file_bytes: bytes = state["file_bytes"]
        file_name: str = state.get("file_name", "upload")

        # SHA-256 hash
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Upload to Supabase Storage
        file_url = _upload_to_storage(user_id, file_name, file_bytes, content_type)

        # Extract basic metadata (EXIF / GPS handled here as best-effort)
        metadata = _extract_metadata(file_bytes, file_name, content_type)

        # Create incident row
        incident_id = _create_incident_row(
            user_id=user_id,
            content_type=content_type,
            text_content=state.get("text_content"),
            file_url=file_url,
            file_hash=file_hash,
            metadata=metadata,
        )

        logger.info("Ingest complete: incident=%s hash=%s", incident_id, file_hash[:12])
        return {
            **state,
            "incident_id": incident_id,
            "file_hash": file_hash,
            "file_url": file_url,
            "metadata": metadata,
        }

    except Exception as exc:
        logger.exception("Ingest failed")
        return {**state, "error": str(exc)}


def _upload_to_storage(user_id: str, file_name: str, file_bytes: bytes, content_type: str) -> str:
    sb = _get_supabase()
    bucket = "evidence"
    path = f"{user_id}/{uuid.uuid4().hex}_{file_name}"

    mime_map = {
        "photo": "image/jpeg",
        "video": "video/mp4",
        "audio": "audio/mpeg",
    }
    mime = mime_map.get(content_type, "application/octet-stream")

    sb.storage.from_(bucket).upload(path, file_bytes, {"content-type": mime})
    public_url = sb.storage.from_(bucket).get_public_url(path)
    return public_url


def _extract_metadata(file_bytes: bytes, file_name: str, content_type: str) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "original_filename": file_name,
        "size_bytes": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    if content_type == "photo":
        try:
            import io
            from PIL import Image
            from PIL.ExifTags import TAGS

            img = Image.open(io.BytesIO(file_bytes))
            exif_data = img._getexif()
            if exif_data:
                exif_readable = {}
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if isinstance(value, (str, int, float)):
                        exif_readable[str(tag)] = value
                meta["exif"] = exif_readable
        except Exception:
            logger.debug("EXIF extraction skipped (Pillow not installed or not an image)")

    return meta


def _create_user_if_not_exists(user_id: str) -> None:
    """Idempotently ensure a user exists in the database using upsert."""
    sb = _get_supabase()
    try:
        # Define user data according to schema requirements
        user_data = {
            "id": user_id,
            "username": f"test-user-{user_id[:8]}",
            "password_hash": "test-hash-12345",  # Placeholder required field
            "timer_duration": 300  # Default 5 minute timer
        }
        # Use upsert to prevent 409 Conflict logs if the user already exists
        # on_conflict='id' ensures we target the primary key
        result = sb.table("users").upsert(user_data, on_conflict="id").execute()
        logger.debug(f"User provisioning check complete for: {user_id}")
    except Exception as e:
        # We log and swallow to ensure main flow continues even if provisioning logic hits an edge case
        logger.warning(f"Note: User provisioning check for {user_id} produced: {e}")


def _create_incident_row(
    user_id: str,
    content_type: str,
    text_content: str | None = None,
    file_url: str | None = None,
    file_hash: str | None = None,
    metadata: Dict[str, Any] | None = None,
) -> str:
    """Create the incident row in Supabase."""
    sb = _get_supabase()
    
    # First, ensure user exists
    _create_user_if_not_exists(user_id)
    
    # Create row with correct schema fields
    row = {
        "user_id": user_id,
        "type": content_type,
        "file_url": file_url,
        "file_hash": file_hash,
        "content": text_content,  # Schema uses 'content', not 'text_content'
        "metadata": metadata or {},
        # Note: uploaded_at has DEFAULT now(), timestamp doesn't exist
    }
    
    result = sb.table("incidents").insert(row).execute()
    return result.data[0]["id"]
