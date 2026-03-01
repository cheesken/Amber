from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.agents.state import IngestState
from app.config import get_settings

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """\
You are a forensic evidence analysis agent for AMBER, a domestic violence evidence \
collection platform. Your job is to analyze uploaded evidence and produce a structured \
JSON summary.

For each piece of evidence, output a JSON object with these keys:
- "summary": A 2-3 sentence plain-English description of what the evidence shows.
- "severity_flag": One of "low", "medium", "high" based on apparent severity.
- "pattern_notes": Any patterns you observe (frequency, escalation, time-of-day trends) \
based on the current evidence and any prior incident summaries provided.

If media analysis output (from Reka AI) is provided, incorporate it into your summary.
Be factual and neutral. Never render a verdict. Never say the case is strong or weak.
Respond ONLY with valid JSON, no markdown fencing.
"""


def analysis_node(state: IngestState) -> IngestState:
    """Analyze the uploaded evidence using Reka AI (for media) + GPT-4o (for synthesis)."""
    try:
        if state.get("error"):
            return state

        content_type = state.get("content_type", "note")
        settings = get_settings()

        reka_output: str | None = None

        # Run Reka AI on photos/video if API key is available
        if content_type in ("photo", "video") and settings.reka_api_key:
            reka_output = _call_reka(
                file_url=state.get("file_url", ""),
                content_type=content_type,
                api_key=settings.reka_api_key,
            )

        # Build context for GPT-4o synthesis
        analysis = _synthesize(
            content_type=content_type,
            text_content=state.get("text_content"),
            reka_output=reka_output,
            metadata=state.get("metadata", {}),
            user_id=state["user_id"],
        )

        # Write analysis back to the incident row
        _update_incident_analysis(state["incident_id"], analysis)

        logger.info("Analysis complete: incident=%s severity=%s", state["incident_id"], analysis.get("severity_flag"))
        return {**state, "analysis": analysis}

    except Exception as exc:
        logger.exception("Analysis failed")
        return {**state, "error": str(exc)}


def _call_reka(file_url: str, content_type: str, api_key: str) -> str | None:
    """Call Reka AI to describe the contents of a photo or video."""
    try:
        media_type = "image" if content_type == "photo" else "video"
        payload = {
            "model": "reka-core",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": media_type,
                            "url": file_url,
                        },
                        {
                            "type": "text",
                            "text": (
                                "Describe what you see in this evidence file in detail. "
                                "Note any visible injuries, property damage, threatening "
                                "messages, or other signs relevant to a domestic violence case. "
                                "Be factual and objective."
                            ),
                        },
                    ],
                }
            ],
        }

        resp = httpx.post(
            "https://api.reka.ai/v1/chat",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("Reka API call failed")
        return None


def _get_prior_summaries(user_id: str) -> list[str]:
    """Fetch previous incident summaries for pattern detection."""
    from app.agents.ingest import _get_supabase

    sb = _get_supabase()
    result = (
        sb.table("incidents")
        .select("analysis, timestamp, type")
        .eq("user_id", user_id)
        .not_.is_("analysis", "null")
        .order("timestamp", desc=False)
        .limit(50)
        .execute()
    )
    summaries = []
    for row in result.data:
        a = row.get("analysis")
        if a and isinstance(a, dict) and a.get("summary"):
            summaries.append(f"[{row['timestamp']} | {row['type']}] {a['summary']}")
    return summaries


def _synthesize(
    content_type: str,
    text_content: str | None,
    reka_output: str | None,
    metadata: dict[str, Any],
    user_id: str,
) -> dict[str, Any]:
    """Use Groq to produce a structured analysis JSON from all available info."""
    settings = get_settings()
    llm = ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0)

    prior = _get_prior_summaries(user_id)
    prior_block = "\n".join(prior) if prior else "No prior incidents on file."

    user_content = f"Evidence type: {content_type}\n"
    if text_content:
        user_content += f"Text content: {text_content}\n"
    if reka_output:
        user_content += f"Media analysis (Reka AI): {reka_output}\n"
    if metadata:
        user_content += f"Metadata: {json.dumps(metadata)}\n"
    user_content += f"\nPrior incident summaries:\n{prior_block}"

    messages = [
        SystemMessage(content=ANALYSIS_SYSTEM_PROMPT),
        HumanMessage(content=user_content),
    ]

    resp = llm.invoke(messages)
    raw = resp.content.strip()

    try:
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        analysis = {"summary": raw, "severity_flag": "medium", "pattern_notes": ""}

    if reka_output:
        analysis["reka_output"] = reka_output

    return analysis


def _update_incident_analysis(incident_id: str, analysis: dict[str, Any]) -> None:
    from app.agents.ingest import _get_supabase

    sb = _get_supabase()
    sb.table("incidents").update({"analysis": analysis}).eq("id", incident_id).execute()
