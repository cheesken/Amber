from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agent"])

# --- Models ---

class TranscriptMessage(BaseModel):
    speaker: str
    text: str

class CallCreate(BaseModel):
    contact_id: Optional[str] = None
    contact_name: str
    duration: str
    transcript: List[TranscriptMessage]

class CallResponse(BaseModel):
    id: str
    user_id: str
    contact_id: Optional[str] = None
    contact_name: str
    duration: str
    status: str
    transcript: List[TranscriptMessage] = []
    created_at: datetime

# --- Endpoints ---

@router.get("/agent/calls/{user_id}", response_model=List[CallResponse])
async def get_agent_calls(user_id: str):
    """Fetch call history for a user, including transcripts."""
    sb = _get_supabase()
    
    # Fetch calls
    calls_res = sb.table("agent_calls").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    calls = calls_res.data
    
    if not calls:
        return []
        
    call_ids = [c["id"] for c in calls]
    
    # Fetch transcripts for these calls
    transcripts_res = sb.table("agent_call_transcripts").select("*").in_("call_id", call_ids).order("sequence_number").execute()
    transcripts = transcripts_res.data
    
    # Group transcripts by call_id
    trans_map = {}
    for t in transcripts:
        cid = t["call_id"]
        if cid not in trans_map:
            trans_map[cid] = []
        trans_map[cid].append({
            "speaker": t["speaker"],
            "text": t["text"]
        })
        
    # Combine
    results = []
    for c in calls:
        results.append({
            **c,
            "transcript": trans_map.get(c["id"], [])
        })
        
    return results

@router.post("/agent/calls/{user_id}", response_model=CallResponse)
async def create_agent_call(user_id: str, payload: CallCreate):
    """Record a new agent call and its transcript."""
    _create_user_if_not_exists(user_id)
    sb = _get_supabase()
    
    # 1. Insert call record
    call_data = {
        "user_id": user_id,
        "contact_id": payload.contact_id,
        "contact_name": payload.contact_name,
        "duration": payload.duration,
        "status": "completed"
    }
    call_res = sb.table("agent_calls").insert(call_data).execute()
    if not call_res.data:
        raise HTTPException(status_code=500, detail="Failed to create call record")
        
    new_call = call_res.data[0]
    call_id = new_call["id"]
    
    # 2. Insert transcript messages
    transcript_data = []
    for i, msg in enumerate(payload.transcript):
        transcript_data.append({
            "call_id": call_id,
            "speaker": msg.speaker,
            "text": msg.text,
            "sequence_number": i
        })
        
    if transcript_data:
        sb.table("agent_call_transcripts").insert(transcript_data).execute()
        
    return {
        **new_call,
        "transcript": payload.transcript
    }
