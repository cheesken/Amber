from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import httpx
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings

logger = logging.getLogger(__name__)


class WatchdogScheduler:
    """Cron-based check-in monitor that runs tiered escalation."""

    def __init__(self, interval_seconds: int = 10):
        self._scheduler = BackgroundScheduler()
        self._interval_seconds = interval_seconds

    def start(self) -> None:
        self._scheduler.add_job(
            _check_all_users,
            "interval",
            seconds=self._interval_seconds,
            id="watchdog_sweep",
            replace_existing=True,
            max_instances=1,  # Prevent overlapping runs when notifications take >interval seconds
        )
        self._scheduler.start()
        logger.info("Watchdog scheduler started (every %d sec)", self._interval_seconds)

    def stop(self) -> None:
        self._scheduler.shutdown(wait=False)
        logger.info("Watchdog scheduler stopped")


def _get_supabase():
    from supabase import create_client

    s = get_settings()
    return create_client(s.supabase_url, s.supabase_secret_key)


def _check_all_users() -> None:
    """Sweep all active check-in configs and escalate if overdue."""
    try:
        sb = _get_supabase()
        now = datetime.now(timezone.utc)

        # Skip if Supabase not configured
        if not sb.supabase_url or not sb.supabase_key:
            logger.debug("Watchdog skipped: Supabase not configured")
            return

        configs = (
            sb.table("checkin_config")
            .select("*, users(*)")
            .eq("is_active", True)
            .lt("next_due_at", now.isoformat())
            .execute()
        )

        for cfg in configs.data or []:
            user_id = cfg["user_id"]
            logger.warning("Missed check-in for user %s (due %s)", user_id, cfg["next_due_at"])

            # Log the missed check-in
            sb.table("checkin_logs").insert({
                "user_id": user_id,
                "was_missed": True,
            }).execute()

            # Deactivate after firing — escalation fires only once until user logs in again
            sb.table("checkin_config").update({
                "is_active": False,
                "next_due_at": None
            }).eq("user_id", user_id).execute()

            # Notify personal contact, then run tiered escalation
            settings = get_settings()
            _notify_personal(cfg.get("users"), cfg.get("frequency_hours", 10), settings)
            _escalate(user_id, cfg.get("users"))

    except Exception:
        logger.exception("Watchdog sweep failed")


def _notify_personal(user_data: dict | None, frequency_hours: int, settings) -> None:
    """Send a one-time missed check-in alert to the personal phone number."""
    if not settings.personal_phone_number:
        logger.warning("PERSONAL_PHONE_NUMBER not set; skipping personal notification")
        return

    ud = user_data or {}
    first_name = ud.get("first_name") or "Someone"
    last_name = ud.get("last_name") or ""
    full_name = f"{first_name} {last_name}".strip()

    freq_labels = {10: "daily", 20: "every 2 days", 70: "every 7 days", 140: "every 14 days"}
    freq_label = freq_labels.get(frequency_hours, "on a regular schedule")

    message = (
        f"Hi {settings.personal_name}, this is Amber — a personal safety app. "
        f"I'm reaching out on behalf of {full_name}, who set up a safety check-in {freq_label}. "
        f"They've missed their scheduled check-in and haven't been heard from. "
        f"Please reach out to them to make sure they're safe and well."
    )

    result = _send_sms(settings.personal_phone_number, message, settings)
    if result == "delivered":
        logger.info("Personal notification sent to %s", settings.personal_phone_number)
    else:
        logger.warning("Personal notification %s to %s", result, settings.personal_phone_number)


def _escalate(user_id: str, user_data: dict | None) -> None:
    """Run tiered escalation: Tier 1 -> 2 -> 3."""
    sb = _get_supabase()
    settings = get_settings()

    escalation_configs = (
        sb.table("escalation_config")
        .select("*, emergency_contacts(*)")
        .eq("user_id", user_id)
        .order("tier", desc=False)
        .execute()
    )

    for esc in escalation_configs.data or []:
        tier = esc["tier"]
        contact = esc.get("emergency_contacts", {})
        method = esc.get("delivery_method", "sms")
        message = esc.get("approved_message", "")

        if not contact or not message:
            continue

        # Build demographic payload for Tier 2+
        demographic_payload = None
        if tier >= 2 and user_data:
            demographic_payload = {
                "name": f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                "age": user_data.get("age"),
                "hair_color": user_data.get("hair_color"),
                "eye_color": user_data.get("eye_color"),
                "race": user_data.get("race"),
                "photo_url": user_data.get("photo_url"),
            }
            # Append demographic info to message
            message += (
                f"\n\nPhysical description: {demographic_payload['name']}, "
                f"age {demographic_payload.get('age', 'unknown')}, "
                f"{demographic_payload.get('hair_color', '')} hair, "
                f"{demographic_payload.get('eye_color', '')} eyes, "
                f"{demographic_payload.get('race', '')}."
            )
            if demographic_payload.get("photo_url"):
                message += f"\nPhoto: {demographic_payload['photo_url']}"

        status = "pending"

        if method == "sms":
            status = _send_sms(contact.get("phone", ""), message, settings)
        elif method == "call" and tier == 3:
            status = _place_elevenlabs_call(contact.get("phone", ""), message, settings)
        elif method == "email":
            logger.info("Email escalation not yet implemented for tier %d", tier)
            status = "pending"

        # Log escalation
        sb.table("escalation_logs").insert({
            "user_id": user_id,
            "tier": tier,
            "contact_id": contact.get("id"),
            "delivery_method": method,
            "message_sent": message,
            "demographic_payload": demographic_payload,
            "status": status,
        }).execute()

        logger.info("Escalation tier %d sent to %s via %s: %s", tier, contact.get("name"), method, status)


def _send_sms(phone: str, message: str, settings) -> str:
    """Send SMS via Twilio."""
    if not settings.twilio_account_sid or not phone:
        logger.warning("Twilio not configured or no phone number; skipping SMS")
        return "skipped"
    try:
        resp = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            data={
                "From": f"whatsapp:{settings.twilio_from_number}",
                "To": f"whatsapp:{phone}",
                "Body": message,
            },
            timeout=15,
        )
        resp.raise_for_status()
        return "delivered"
    except Exception:
        logger.exception("Twilio SMS failed")
        return "failed"


def _place_elevenlabs_call(phone: str, script: str, settings) -> str:
    """Place a voice call via ElevenLabs conversational AI."""
    if not settings.elevenlabs_api_key or not phone:
        logger.warning("ElevenLabs not configured or no phone number; skipping call")
        return "skipped"
    try:
        resp = httpx.post(
            "https://api.elevenlabs.io/v1/convai/twilio/outbound_call",
            json={
                "to": phone,
                "from_": settings.twilio_from_number,
                "prompt": script,
            },
            headers={"xi-api-key": settings.elevenlabs_api_key},
            timeout=30,
        )
        resp.raise_for_status()
        return "delivered"
    except Exception:
        logger.exception("ElevenLabs call failed")
        return "failed"
