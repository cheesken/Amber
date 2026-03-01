from __future__ import annotations

from typing import Any

from typing_extensions import TypedDict


class IngestState(TypedDict, total=False):
    """Shared state that flows through the Ingest -> Analysis pipeline."""

    user_id: str
    incident_id: str

    # Raw upload info
    file_bytes: bytes
    file_name: str
    content_type: str  # photo | video | audio | note
    text_content: str  # only for notes

    # Ingest Agent outputs
    file_hash: str  # SHA-256
    file_url: str  # Supabase Storage URL
    metadata: dict[str, Any]  # gps, device, exif

    # Analysis Agent outputs
    analysis: dict[str, Any]  # summary, severity_flag, pattern_notes, reka_output

    error: str


class LegalState(TypedDict, total=False):
    """Shared state for the Legal Agent report pipeline."""

    user_id: str

    # Fetched from DB
    incidents: list[dict[str, Any]]

    # Legal Agent outputs
    gap_analysis: dict[str, Any]  # present, missing, notes
    report_summary: str
    pdf_bytes: bytes
    pdf_url: str
    report_id: str

    # Delivery
    recipient_contact_ids: list[str]

    error: str
