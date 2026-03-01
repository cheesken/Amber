from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists

logger = logging.getLogger(__name__)
router = APIRouter(tags=["checkin"])

# --- Models ---

class CheckInConfig(BaseModel):
    is_active: bool
    frequency_hours: int
    last_checkin_at: Optional[datetime] = None
    next_due_at: Optional[datetime] = None

class CheckInConfigUpdate(BaseModel):
    is_active: Optional[bool] = None
    frequency_hours: Optional[int] = None

class ContactBase(BaseModel):
    name: str
    phone: str
    relationship: str
    email: Optional[str] = None
    preferred_method: str = "sms"
    escalation_enabled: bool = True
    escalation_tier: int = 1

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: str
    user_id: str

# --- Helper ---

def _calculate_next_due(frequency_hours: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=frequency_hours)

# --- Check-in Endpoints ---

@router.get("/checkin/config/{user_id}", response_model=CheckInConfig)
async def get_checkin_config(user_id: str):
    """Get the safety check-in configuration for a user."""
    sb = _get_supabase()
    result = sb.table("checkin_config").select("*").eq("user_id", user_id).execute()
    
    if not result.data:
        # Create default config if missing
        default_config = {
            "user_id": user_id,
            "frequency_hours": 24,
            "is_active": True,
            "next_due_at": _calculate_next_due(24).isoformat()
        }
        _create_user_if_not_exists(user_id)
        new_cfg = sb.table("checkin_config").insert(default_config).execute()
        return new_cfg.data[0]
        
    return result.data[0]

@router.put("/checkin/config/{user_id}", response_model=CheckInConfig)
async def update_checkin_config(user_id: str, update: CheckInConfigUpdate):
    """Update check-in frequency or status."""
    sb = _get_supabase()
    
    # Get current config to know frequency if not provided in update
    current = await get_checkin_config(user_id)
    freq = update.frequency_hours if update.frequency_hours is not None else current["frequency_hours"]
    
    update_data = update.model_dump(exclude_none=True)
    
    # If frequency changed or re-activated, reset the timer
    if update.frequency_hours is not None or (update.is_active is True):
        update_data["next_due_at"] = _calculate_next_due(freq).isoformat()
        
    result = sb.table("checkin_config").update(update_data).eq("user_id", user_id).execute()
    return result.data[0]

@router.post("/checkin/{user_id}")
async def perform_checkin(user_id: str):
    """Manually check in as safe, resetting the watchdog timer."""
    sb = _get_supabase()
    
    # Get frequency
    config_res = sb.table("checkin_config").select("frequency_hours").eq("user_id", user_id).execute()
    if not config_res.data:
        raise HTTPException(status_code=404, detail="Check-in config not found")
        
    freq = config_res.data[0]["frequency_hours"]
    now = datetime.now(timezone.utc)
    
    # Update config
    sb.table("checkin_config").update({
        "last_checkin_at": now.isoformat(),
        "next_due_at": _calculate_next_due(freq).isoformat()
    }).eq("user_id", user_id).execute()
    
    # Log the successful check-in
    sb.table("checkin_logs").insert({
        "user_id": user_id,
        "checked_in_at": now.isoformat(),
        "was_missed": False
    }).execute()
    
    return {"status": "success", "next_due_at": _calculate_next_due(freq)}

# --- Contact Endpoints ---

@router.get("/contacts/{user_id}", response_model=List[ContactResponse])
async def get_contacts(user_id: str):
    """List all emergency contacts for a user."""
    sb = _get_supabase()
    result = sb.table("emergency_contacts").select("*").eq("user_id", user_id).execute()
    return result.data

@router.post("/contacts/{user_id}", response_model=ContactResponse)
async def add_contact(user_id: str, contact: ContactCreate):
    """Add a new emergency contact."""
    _create_user_if_not_exists(user_id)
    sb = _get_supabase()
    
    data = contact.model_dump()
    data["user_id"] = user_id
    
    result = sb.table("emergency_contacts").insert(data).execute()
    return result.data[0]

@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete an emergency contact."""
    sb = _get_supabase()
    sb.table("emergency_contacts").delete().eq("id", contact_id).execute()
    return {"status": "deleted"}
