from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph

from app.agents.analysis import analysis_node
from app.agents.ingest import ingest_node
from app.agents.legal import legal_analyze_node, legal_fetch_node, legal_pdf_node
from app.agents.state import IngestState, LegalState

logger = logging.getLogger(__name__)


def _should_continue_ingest(state: IngestState) -> str:
    if state.get("error"):
        return END
    return "analyze"


def _should_continue_legal(state: LegalState) -> str:
    if state.get("error"):
        return END
    return "next"


def _build_ingest_graph() -> StateGraph:
    """Ingest -> Analysis pipeline."""
    g = StateGraph(IngestState)
    g.add_node("ingest", ingest_node)
    g.add_node("analyze", analysis_node)

    g.set_entry_point("ingest")
    g.add_conditional_edges("ingest", _should_continue_ingest, {"analyze": "analyze", END: END})
    g.add_edge("analyze", END)

    return g


def _build_legal_graph() -> StateGraph:
    """Fetch incidents -> Analyze -> Generate PDF."""
    g = StateGraph(LegalState)
    g.add_node("fetch", legal_fetch_node)
    g.add_node("analyze", legal_analyze_node)
    g.add_node("pdf", legal_pdf_node)

    g.set_entry_point("fetch")
    g.add_conditional_edges("fetch", _should_continue_legal, {"next": "analyze", END: END})
    g.add_conditional_edges("analyze", _should_continue_legal, {"next": "pdf", END: END})
    g.add_edge("pdf", END)

    return g


_ingest_app = _build_ingest_graph().compile()
_legal_app = _build_legal_graph().compile()


async def run_ingest_pipeline(
    user_id: str,
    file_bytes: bytes | None = None,
    file_name: str = "upload",
    content_type: str = "note",
    text_content: str = "",
) -> dict[str, Any]:
    """Run the Ingest -> Analysis pipeline and return the final state."""
    initial: IngestState = {
        "user_id": user_id,
        "content_type": content_type,
        "file_name": file_name,
        "text_content": text_content,
    }
    if file_bytes is not None:
        initial["file_bytes"] = file_bytes

    logger.info("Starting ingest pipeline for user %s (%s)", user_id, content_type)
    result = await _ingest_app.ainvoke(initial)
    return dict(result)


async def run_legal_report(user_id: str) -> dict[str, Any]:
    """Run the Legal Agent pipeline and return the final state (includes pdf_url)."""
    initial: LegalState = {"user_id": user_id}

    logger.info("Starting legal report pipeline for user %s", user_id)
    result = await _legal_app.ainvoke(initial)
    return dict(result)
