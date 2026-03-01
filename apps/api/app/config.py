from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")
    supabase_publishable_key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    reka_api_key: str = os.getenv("REKA_API_KEY", "")

    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "")

    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")

    groq_model: str = "llama-3.3-70b-versatile"
    reka_model: str = "reka-core"


@lru_cache
def get_settings() -> Settings:
    return Settings()
