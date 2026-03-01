from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")
    supabase_publishable_key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    reka_api_key: str = os.getenv("REKA_API_KEY", "")

    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "")
    twilio_voice_from_number: str = os.getenv("TWILIO_VOICE_FROM_NUMBER", "")
    personal_phone_number: str = os.getenv("PERSONAL_PHONE_NUMBER", "")
    personal_name: str = os.getenv("PERSONAL_NAME", "there")

    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_agent_id: str = os.getenv("ELEVENLABS_AGENT_ID", "")
    # Default: ElevenLabs "Rachel" voice — override with any voice ID from your account
    elevenlabs_voice_id: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

    groq_model: str = "llama-3.3-70b-versatile"
    reka_model: str = "reka-core"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
