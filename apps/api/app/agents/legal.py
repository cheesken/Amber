from __future__ import annotations

import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from apps.api.app.agents.state import LegalState
from apps.api.app.config import get_settings

logger = logging.getLogger(__name__)

LEGAL_SYSTEM_PROMPT = """\
You are the Legal Agent for AMBER, a domestic violence evidence collection platform.

Your role:
1. Review all submitted evidence for a user.
2. Produce a chronological summary in neutral, factual language.
3. Perform a gap analysis: compare what evidence has been documented against what \
courts typically consider in domestic violence cases.

Courts typically consider:
- Photographs of injuries (with dates)
- Medical records / hospital visit documentation
- Screenshots of threatening messages (text, email, social media)
- Audio or video recordings of incidents
- Written contemporaneous notes / journal entries
- Police reports or prior restraining orders
- Witness statements from friends, family, neighbors
- Evidence of financial abuse or control
- Documentation of property damage
- Pattern over time (multiple incidents showing escalation)

Output a JSON object with these keys:
- "summary": A 3-5 sentence overview of the evidence on file.
- "present": A list of strings describing evidence types that ARE documented.
- "missing": A list of strings describing evidence types courts typically look for \
that are NOT yet documented.
- "notes": Additional observations or suggestions, framed as "courts often also \
consider..." or "you may want to discuss X with a lawyer."

Use neutral language. Never say the case is strong or weak. Never render a verdict.
Respond ONLY with valid JSON, no markdown fencing.
"""

DISCLAIMER = (
    "DISCLAIMER: This is AI-generated and not legal advice. It is not legally accurate. "
    "Use it however is useful to you, but consult a lawyer before taking action."
)


def legal_fetch_node(state: LegalState) -> LegalState:
    """Fetch all incidents for the user from the database."""
    try:
        from apps.api.app.agents.ingest import _get_supabase

        sb = _get_supabase()
        user_id = state["user_id"]

        result = (
            sb.table("incidents")
            .select("*")
            .eq("user_id", user_id)
            .order("timestamp", desc=False)
            .execute()
        )
        incidents = result.data or []
        logger.info("Legal fetch: %d incidents for user %s", len(incidents), user_id)
        return {**state, "incidents": incidents}

    except Exception as exc:
        logger.exception("Legal fetch failed")
        return {**state, "error": str(exc)}


def legal_analyze_node(state: LegalState) -> LegalState:
    """Run GPT-4o gap analysis on the full evidence history."""
    try:
        if state.get("error"):
            return state

        incidents = state.get("incidents", [])
        if not incidents:
            return {
                **state,
                "gap_analysis": {"summary": "No evidence on file.", "present": [], "missing": [], "notes": ""},
                "report_summary": "No evidence has been submitted yet.",
            }

        settings = get_settings()
        llm = ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0)

        incident_block = _format_incidents_for_prompt(incidents)

        messages = [
            SystemMessage(content=LEGAL_SYSTEM_PROMPT),
            HumanMessage(content=f"Evidence on file:\n{incident_block}"),
        ]

        resp = llm.invoke(messages)
        raw = resp.content.strip()

        try:
            gap_analysis = json.loads(raw)
        except json.JSONDecodeError:
            gap_analysis = {"summary": raw, "present": [], "missing": [], "notes": ""}

        logger.info("Legal analysis complete: %d present, %d missing", len(gap_analysis.get("present", [])), len(gap_analysis.get("missing", [])))
        return {**state, "gap_analysis": gap_analysis, "report_summary": gap_analysis.get("summary", "")}

    except Exception as exc:
        logger.exception("Legal analysis failed")
        return {**state, "error": str(exc)}


def legal_pdf_node(state: LegalState) -> LegalState:
    """Generate a styled PDF report using reportlab."""
    try:
        if state.get("error"):
            return state

        pdf_bytes = _build_pdf(
            incidents=state.get("incidents", []),
            gap_analysis=state.get("gap_analysis", {}),
            summary=state.get("report_summary", ""),
            user_id=state["user_id"],
        )

        # Upload PDF to Supabase Storage
        pdf_url = _upload_pdf(state["user_id"], pdf_bytes)

        # Create report row in DB
        report_id = _create_report_row(
            user_id=state["user_id"],
            incident_ids=[i["id"] for i in state.get("incidents", [])],
            pdf_url=pdf_url,
            gap_analysis=state.get("gap_analysis", {}),
        )

        logger.info("PDF generated: report=%s url=%s", report_id, pdf_url)
        return {**state, "pdf_bytes": pdf_bytes, "pdf_url": pdf_url, "report_id": report_id}

    except Exception as exc:
        logger.exception("PDF generation failed")
        return {**state, "error": str(exc)}


def _format_incidents_for_prompt(incidents: list[dict[str, Any]]) -> str:
    lines = []
    for i, inc in enumerate(incidents, 1):
        ts = inc.get("timestamp", "unknown")
        typ = inc.get("type", "unknown")
        content = inc.get("content", "")
        analysis = inc.get("analysis", {})
        summary = ""
        if isinstance(analysis, dict):
            summary = analysis.get("summary", "")

        line = f"{i}. [{ts}] Type: {typ}"
        if content:
            line += f" | Content: {content[:200]}"
        if summary:
            line += f" | AI Summary: {summary}"
        lines.append(line)
    return "\n".join(lines)


def _build_pdf(
    incidents: list[dict[str, Any]],
    gap_analysis: dict[str, Any],
    summary: str,
    user_id: str,
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=inch, rightMargin=inch, topMargin=inch, bottomMargin=inch)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=18, spaceAfter=12)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=13, spaceAfter=8, textColor=colors.HexColor("#1a5c5c"))
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, spaceAfter=6)
    disclaimer_style = ParagraphStyle("Disclaimer", parent=styles["Normal"], fontSize=9, textColor=colors.gray, fontName="Helvetica-Oblique")

    elements: list = []
    now_str = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    # Cover
    elements.append(Paragraph("AMBER Evidence Report", title_style))
    elements.append(Paragraph(f"Generated: {now_str}", body_style))
    elements.append(Spacer(1, 12))
    elements.append(HRFlowable(width="100%", color=colors.HexColor("#1a5c5c")))
    elements.append(Spacer(1, 12))

    # Summary
    elements.append(Paragraph("Summary", heading_style))
    elements.append(Paragraph(summary or "No summary available.", body_style))
    elements.append(Spacer(1, 12))

    # Incident Timeline
    elements.append(Paragraph("Incident Timeline", heading_style))
    if incidents:
        table_data = [["#", "Date/Time", "Type", "Summary"]]
        for i, inc in enumerate(incidents, 1):
            ts = str(inc.get("timestamp", ""))[:19]
            typ = inc.get("type", "")
            a = inc.get("analysis", {})
            s = a.get("summary", inc.get("content", "")[:100]) if isinstance(a, dict) else str(inc.get("content", ""))[:100]
            table_data.append([str(i), ts, typ, Paragraph(s, body_style)])

        t = Table(table_data, colWidths=[0.4 * inch, 1.3 * inch, 0.7 * inch, 4.1 * inch])
        style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5c5c")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ])
        # Alternate row shading
        for row_idx in range(1, len(table_data)):
            if row_idx % 2 == 0:
                style.add("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#f0f0f0"))
        t.setStyle(style)
        elements.append(t)
    else:
        elements.append(Paragraph("No incidents recorded.", body_style))

    elements.append(Spacer(1, 16))

    # Gap Analysis
    elements.append(Paragraph("Gap Analysis", heading_style))
    present = gap_analysis.get("present", [])
    missing = gap_analysis.get("missing", [])

    gap_data = [["Evidence Documented", "Typically Considered by Courts"]]
    max_rows = max(len(present), len(missing), 1)
    for idx in range(max_rows):
        p = present[idx] if idx < len(present) else ""
        m = missing[idx] if idx < len(missing) else ""
        gap_data.append([p, m])

    gt = Table(gap_data, colWidths=[3.25 * inch, 3.25 * inch])
    gap_style = TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#2e7d32")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#e65100")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
    ])
    gt.setStyle(gap_style)
    elements.append(gt)

    notes = gap_analysis.get("notes", "")
    if notes:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(notes, body_style))

    elements.append(Spacer(1, 20))

    # Disclaimer page
    elements.append(HRFlowable(width="100%", color=colors.gray))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Legal Disclaimer", heading_style))
    elements.append(Paragraph(DISCLAIMER, disclaimer_style))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(
        "This app does not guarantee safety. Call 911 in immediate danger. "
        "National DV Hotline: 1-800-799-7233",
        disclaimer_style,
    ))

    doc.build(elements)
    buf.seek(0)
    return buf.read()


def _upload_pdf(user_id: str, pdf_bytes: bytes) -> str:
    from apps.api.app.agents.ingest import _get_supabase

    sb = _get_supabase()
    path = f"{user_id}/reports/{uuid.uuid4().hex}.pdf"
    sb.storage.from_("evidence").upload(path, pdf_bytes, {"content-type": "application/pdf"})
    return sb.storage.from_("evidence").get_public_url(path)


def _create_report_row(
    user_id: str,
    incident_ids: list[str],
    pdf_url: str,
    gap_analysis: dict[str, Any],
) -> str:
    from apps.api.app.agents.ingest import _get_supabase

    sb = _get_supabase()
    row = {
        "user_id": user_id,
        "incident_ids": incident_ids,
        "pdf_url": pdf_url,
        "gap_analysis": gap_analysis,
    }
    result = sb.table("reports").insert(row).execute()
    return result.data[0]["id"]
