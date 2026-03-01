from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel

from apps.api.app.agents.graphs import run_ingest_pipeline, run_legal_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


class IngestNoteRequest(BaseModel):
    user_id: str
    text_content: str


class IngestResponse(BaseModel):
    incident_id: str
    file_hash: str
    file_url: str
    analysis: dict | None = None
    error: str | None = None


class LegalReportRequest(BaseModel):
    user_id: str


class LegalReportResponse(BaseModel):
    report_id: str
    pdf_url: str
    gap_analysis: dict | None = None
    error: str | None = None


@router.post("/ingest/upload", response_model=IngestResponse)
async def ingest_upload(
    user_id: str = Form(...),
    content_type: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a file (photo/video/audio) and run the Ingest -> Analysis pipeline."""
    file_bytes = await file.read()
    result = await run_ingest_pipeline(
        user_id=user_id,
        file_bytes=file_bytes,
        file_name=file.filename or "upload",
        content_type=content_type,
    )
    return IngestResponse(
        incident_id=result.get("incident_id", ""),
        file_hash=result.get("file_hash", ""),
        file_url=result.get("file_url", ""),
        analysis=result.get("analysis"),
        error=result.get("error"),
    )


@router.post("/ingest/note", response_model=IngestResponse)
async def ingest_note(body: IngestNoteRequest):
    """Submit a text note and run the Ingest -> Analysis pipeline."""
    result = await run_ingest_pipeline(
        user_id=body.user_id,
        content_type="note",
        text_content=body.text_content,
    )
    return IngestResponse(
        incident_id=result.get("incident_id", ""),
        file_hash=result.get("file_hash", ""),
        file_url=result.get("file_url", ""),
        analysis=result.get("analysis"),
        error=result.get("error"),
    )


@router.post("/report", response_model=LegalReportResponse)
async def create_report(body: LegalReportRequest):
    """Run the Legal Agent: fetch evidence, gap analysis, generate PDF."""
    result = await run_legal_report(user_id=body.user_id)
    return LegalReportResponse(
        report_id=result.get("report_id", ""),
        pdf_url=result.get("pdf_url", ""),
        gap_analysis=result.get("gap_analysis"),
        error=result.get("error"),
    )
