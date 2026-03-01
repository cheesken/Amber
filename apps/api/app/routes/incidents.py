import logging
import hashlib
import uuid
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists, _upload_to_storage, _create_incident_row

logger = logging.getLogger(__name__)
router = APIRouter(tags=["incidents"])

# --- Models ---

class IncidentBase(BaseModel):
    type: str # photo | video | audio | note
    content: Optional[str] = None
    file_url: Optional[str] = None
    metadata: Optional[dict] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentResponse(IncidentBase):
    id: str
    user_id: str
    analysis: Optional[dict] = None
    uploaded_at: datetime

# --- Endpoints ---

@router.get("/incidents/{user_id}", response_model=List[IncidentResponse])
async def get_incidents(user_id: str):
    """List all incidents for a user (Vault)."""
    sb = _get_supabase()
    result = sb.table("incidents").select("*").eq("user_id", user_id).order("uploaded_at", desc=True).execute()
    return result.data

@router.post("/incidents/{user_id}", response_model=IncidentResponse)
async def create_incident(
    user_id: str,
    type: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Create a new journal entry or incident report with optional media."""
    try:
        _create_user_if_not_exists(user_id)
        sb = _get_supabase()
        
        # Pre-generate ID to link storage and DB
        incident_id = str(uuid.uuid4())
        file_url = None
        file_hash = None
        
        if file:
            file_bytes = await file.read()
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            # Upload to storage using the pre-generated ID
            file_url = _upload_to_storage(user_id, incident_id, file.filename, file_bytes, type)
        
        # Create the row
        _create_incident_row(
            user_id=user_id,
            content_type=type,
            text_content=content,
            file_url=file_url,
            file_hash=file_hash,
            metadata={"filename": file.filename if file else None},
            id=incident_id
        )
        
        # Prefetch the newly created row to return full response model
        result = sb.table("incidents").select("*").eq("id", incident_id).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to retrieve created incident")
            
        return result.data[0]
    except Exception as e:
        logger.error(f"Error in create_incident: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/incidents/{user_id}/{incident_id}")
async def delete_incident(user_id: str, incident_id: str):
    """Delete an incident or journal entry."""
    sb = _get_supabase()
    sb.table("incidents").delete().eq("id", incident_id).eq("user_id", user_id).execute()
    return {"status": "deleted"}
