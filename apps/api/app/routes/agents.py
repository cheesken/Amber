from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.agents.graphs import run_ingest_pipeline, run_legal_report

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


@router.post("/setup-test-user")
async def setup_test_user():
    """Create a test user for development/testing."""
    try:
        from app.agents.ingest import _get_supabase
        sb = _get_supabase()
        
        test_user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        # Check if user already exists
        existing = sb.table("users").select("id").eq("id", test_user_id).execute()
        if existing.data:
            return {"message": "Test user already exists", "user_id": test_user_id}
        
        # Create test user with required fields according to schema
        user_data = {
            "id": test_user_id,
            "username": f"test-user-{test_user_id[:8]}",
            "password_hash": "test-hash-12345",  # Required field
            "timer_duration": 300  # Required field (5 minutes default)
        }
        
        try:
            result = sb.table("users").insert(user_data).execute()
            return {"message": "Test user created", "user_id": test_user_id, "data": result.data}
        except Exception as insert_error:
            # If insert fails, try to get more info about the table structure
            logger.error(f"User creation failed: {insert_error}")
            
            # Try to see what columns exist
            try:
                columns_info = sb.rpc("get_table_columns", {"table_name": "users"}).execute()
                logger.info(f"Users table columns: {columns_info.data}")
            except:
                logger.info("Could not fetch table structure")
            
            raise HTTPException(status_code=500, detail=f"User creation failed: {str(insert_error)}")
        
    except Exception as e:
        logger.error(f"Setup test user failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create test user: {str(e)}")


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
