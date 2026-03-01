from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])

class ProfileData(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    race: Optional[str] = None

@router.get("/{user_id}", response_model=ProfileData)
async def get_profile(user_id: str):
    """Fetch the user's demographic profile."""
    # Ensure test user exists if this is a development flow
    _create_user_if_not_exists(user_id)
    
    sb = _get_supabase()
    result = sb.table("users").select(
        "first_name, last_name, gender, age, hair_color, eye_color, race"
    ).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    row = result.data[0]
    return ProfileData(
        first_name=row.get("first_name"),
        last_name=row.get("last_name"),
        gender=row.get("gender"),
        age=row.get("age"),
        hair_color=row.get("hair_color"),
        eye_color=row.get("eye_color"),
        race=row.get("race"),
    )

@router.put("/{user_id}", response_model=ProfileData)
async def update_profile(user_id: str, profile: ProfileData):
    """Update the user's demographic profile."""
    _create_user_if_not_exists(user_id)
    
    sb = _get_supabase()
    
    update_data = {
        k: v for k, v in profile.model_dump().items() if v is not None
    }
    
    if not update_data:
        # If nothing to update, just return current state
        return await get_profile(user_id)
    
    result = sb.table("users").update(update_data).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    row = result.data[0]
    return ProfileData(
        first_name=row.get("first_name"),
        last_name=row.get("last_name"),
        gender=row.get("gender"),
        age=row.get("age"),
        hair_color=row.get("hair_color"),
        eye_color=row.get("eye_color"),
        race=row.get("race"),
    )
