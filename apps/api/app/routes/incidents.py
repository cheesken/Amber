from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists

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
async def create_incident(user_id: str, incident: IncidentCreate):
    """Create a new journal entry or incident report."""
    _create_user_if_not_exists(user_id)
    sb = _get_supabase()
    
    data = incident.model_dump()
    data["user_id"] = user_id
    data["uploaded_at"] = datetime.now(timezone.utc).isoformat()
    
    result = sb.table("incidents").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create incident")
        
    return result.data[0]

@router.delete("/incidents/{user_id}/{incident_id}")
async def delete_incident(user_id: str, incident_id: str):
    """Delete an incident or journal entry."""
    sb = _get_supabase()
    sb.table("incidents").delete().eq("id", incident_id).eq("user_id", user_id).execute()
    return {"status": "deleted"}
