from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ingest import _get_supabase, _create_user_if_not_exists
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agent"])

# --- Models ---

class InitiateCallPayload(BaseModel):
    contact_id: str
    contact_name: str

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


@router.post("/agent/initiate/{user_id}")
async def initiate_agent_call(user_id: str, payload: InitiateCallPayload):
    """
    Generate TTS audio via ElevenLabs, upload to Supabase,
    then place a Twilio call that plays the audio.
    """
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs not configured")
    if not settings.twilio_account_sid or not settings.twilio_voice_from_number:
        raise HTTPException(status_code=503, detail="Twilio Voice not configured")

    _create_user_if_not_exists(user_id)
    sb = _get_supabase()

    script = (
        f"Hi {settings.personal_name}, this is Amber — a personal safety app. "
        f"I'm calling to share an important update with you about someone who uses the app. "
        f"They've reached out for support and wanted you to be informed. "
        f"Please reach out to them to make sure they are safe and well."
    )

    # 1. Generate TTS audio via ElevenLabs
    try:
        tts_resp = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}",
            json={
                "text": script,
                "model_id": "eleven_flash_v2_5",
                "output_format": "mp3_44100_128",
            },
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        tts_resp.raise_for_status()
        audio_bytes = tts_resp.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ElevenLabs TTS failed: {exc}")

    # 2. Create the call record so we have an ID for the storage path
    call_res = sb.table("agent_calls").insert({
        "user_id": user_id,
        "contact_id": payload.contact_id,
        "contact_name": payload.contact_name,
        "duration": "0:00",
        "status": "active",
    }).execute()
    if not call_res.data:
        raise HTTPException(status_code=500, detail="Failed to create call record")

    call_id = call_res.data[0]["id"]

    # 3. Upload audio to Supabase Storage
    storage_path = f"tts/{call_id}.mp3"
    try:
        sb.storage.from_("amber_vault").upload(
            storage_path,
            audio_bytes,
            {"content-type": "audio/mpeg"},
        )
        signed = sb.storage.from_("amber_vault").create_signed_url(storage_path, 3600)
        audio_url = signed.get("signedURL") or signed.get("data", {}).get("signedUrl", "")
    except Exception as exc:
        sb.table("agent_calls").update({"status": "failed"}).eq("id", call_id).execute()
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")

    # 4. Place the Twilio call, playing the ElevenLabs audio
    twiml = f"<Response><Play>{audio_url}</Play></Response>"
    try:
        twilio_resp = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Calls.json",
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            data={
                "From": settings.twilio_voice_from_number,
                "To": settings.personal_phone_number,
                "Twiml": twiml,
            },
            timeout=30,
        )
        twilio_resp.raise_for_status()
        call_sid = twilio_resp.json().get("sid", "")
    except Exception as exc:
        sb.table("agent_calls").update({"status": "failed"}).eq("id", call_id).execute()
        raise HTTPException(status_code=502, detail=f"Twilio call failed: {exc}")

    # Store Twilio CallSid for polling, and save the script as the transcript
    sb.table("agent_calls").update({"conversation_id": call_sid}).eq("id", call_id).execute()
    sb.table("agent_call_transcripts").insert({
        "call_id": call_id,
        "speaker": "AI Agent",
        "text": script,
        "sequence_number": 0,
    }).execute()

    return {"call_id": call_id, "conversation_id": call_sid}


@router.get("/agent/conversation/{conversation_id}")
async def poll_conversation(conversation_id: str):
    """
    Poll Twilio for call status (conversation_id holds the Twilio CallSid).
    Mark the call completed when Twilio reports a terminal status.
    """
    settings = get_settings()
    sb = _get_supabase()

    try:
        resp = httpx.get(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Calls/{conversation_id}.json",
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=15,
        )
        resp.raise_for_status()
        call_data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Twilio fetch failed: {exc}")

    twilio_status = call_data.get("status", "queued")
    terminal = {"completed", "failed", "busy", "no-answer", "canceled"}

    if twilio_status not in terminal:
        return {"status": "in-progress", "transcript": []}

    call_res = sb.table("agent_calls").select("*").eq("conversation_id", conversation_id).execute()
    if not call_res.data:
        raise HTTPException(status_code=404, detail="Call record not found")

    call = call_res.data[0]
    call_id = call["id"]

    if call["status"] != "completed":
        duration_secs = int(float(call_data.get("duration", 0)))
        minutes, secs = divmod(duration_secs, 60)
        sb.table("agent_calls").update({
            "status": "completed",
            "duration": f"{minutes}:{secs:02d}",
        }).eq("id", call_id).execute()

    transcripts_res = (
        sb.table("agent_call_transcripts")
        .select("speaker, text")
        .eq("call_id", call_id)
        .order("sequence_number")
        .execute()
    )
    return {"status": "done", "transcript": transcripts_res.data or []}
