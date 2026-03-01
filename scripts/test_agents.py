#!/usr/bin/env python3
"""
Test script for AMBER agent endpoints.
Run this after setting up your .env file with API keys.
"""

import os
import unittest
import uuid
from typing import Any
from unittest.mock import Mock, patch


BASE_URL = os.getenv("AMBER_BASE_URL", "http://localhost:8000")
TEST_USER_ID = os.getenv("AMBER_TEST_USER_ID", "123e4567-e89b-12d3-a456-426614174000")


def _env_truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "y", "on"}


RUN_API_INTEGRATION = _env_truthy("AMBER_RUN_API_INTEGRATION")
VERBOSE = _env_truthy("AMBER_TEST_VERBOSE")


class UnitTests(unittest.TestCase):
    def test_settings_reads_reka_api_key_from_env(self) -> None:
        import importlib
        import app.config as config

        with patch.dict(os.environ, {"REKA_API_KEY": "reka_test_key"}, clear=False):
            importlib.reload(config)
            config.get_settings.cache_clear()
            settings = config.get_settings()
            self.assertEqual(settings.reka_api_key, "reka_test_key")

    def test_call_reka_sends_authorization_and_media_payload(self) -> None:
        from app.agents.analysis import _call_reka

        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={"choices": [{"message": {"content": "ok"}}]})

        with patch("app.agents.analysis.httpx.post", return_value=mock_response) as post:
            out = _call_reka(file_url="https://example.com/x.png", content_type="photo", api_key="k")
            self.assertEqual(out, "ok")

            self.assertTrue(post.called)
            kwargs = post.call_args.kwargs
            self.assertEqual(kwargs["headers"]["Authorization"], "Bearer k")
            payload = kwargs["json"]
            self.assertEqual(payload["model"], "reka-core")
            content = payload["messages"][0]["content"]
            self.assertEqual(content[0]["type"], "image")
            self.assertEqual(content[0]["url"], "https://example.com/x.png")

    def test_analysis_node_skips_reka_for_note(self) -> None:
        from app.agents.analysis import analysis_node

        state: dict[str, Any] = {
            "user_id": TEST_USER_ID,
            "content_type": "note",
            "text_content": "hello",
            "incident_id": "incident_1",
            "file_url": "",
            "metadata": {},
        }

        with patch("app.agents.analysis._call_reka") as call_reka, patch(
            "app.agents.analysis._synthesize",
            return_value={"summary": "s", "severity_flag": "low", "pattern_notes": ""},
        ) as synth, patch("app.agents.analysis._update_incident_analysis") as update:
            out = analysis_node(state)

            call_reka.assert_not_called()
            synth.assert_called_once()
            update.assert_called_once_with("incident_1", {"summary": "s", "severity_flag": "low", "pattern_notes": ""})
            self.assertIn("analysis", out)


@unittest.skipUnless(RUN_API_INTEGRATION, "Set AMBER_RUN_API_INTEGRATION=1 to run API integration tests")
class ApiIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        import httpx

        self._client = httpx.AsyncClient(timeout=60)
        self._user_id = os.getenv("AMBER_TEST_USER_ID", "").strip() or str(uuid.uuid4())
        self._created_incident_ids: list[str] = []

        health = await self._client.get(f"{BASE_URL}/health")
        if health.status_code != 200:
            await self._client.aclose()
            self.skipTest(f"Server health check failed at {BASE_URL}: {health.status_code} {health.text}")

        if VERBOSE:
            print(f"\n[AMBER] Integration test user_id={self._user_id} base_url={BASE_URL}")

    def _log(self, message: str) -> None:
        if VERBOSE:
            print(f"[AMBER] {message}")

    def _log_gap_analysis(self, gap_analysis: Any) -> None:
        if not VERBOSE:
            return
        if not isinstance(gap_analysis, dict):
            self._log(f"gap_analysis is not a dict: {type(gap_analysis)}")
            return

        present = gap_analysis.get("present")
        missing = gap_analysis.get("missing")
        summary = gap_analysis.get("summary", "")
        present_count = len(present) if isinstance(present, list) else -1
        missing_count = len(missing) if isinstance(missing, list) else -1
        self._log(f"gap_analysis present={present_count} missing={missing_count}")
        if isinstance(summary, str) and summary:
            self._log(f"gap_analysis summary preview={summary[:180]}")

    def _assert_gap_analysis_populated(self, gap_analysis: Any, *, context: str) -> None:
        self.assertIsInstance(gap_analysis, dict, msg=f"{context}: gap_analysis missing or not a dict: {gap_analysis}")
        present = gap_analysis.get("present")
        missing = gap_analysis.get("missing")
        self.assertIsInstance(present, list, msg=f"{context}: gap_analysis.present not a list: {present}")
        self.assertIsInstance(missing, list, msg=f"{context}: gap_analysis.missing not a list: {missing}")

        if len(present) == 0 and len(missing) == 0:
            summary_preview = gap_analysis.get("summary", "")
            if isinstance(summary_preview, str):
                summary_preview = summary_preview[:300]
            self.fail(
                f"{context}: gap_analysis is empty (present=0, missing=0). "
                f"This usually means the LLM response wasn't parsed as JSON or returned empty lists. "
                f"summary_preview={summary_preview!r}"
            )

    async def _create_note_incident(self) -> dict[str, Any]:
        resp = await self._client.post(
            f"{BASE_URL}/agents/ingest/note",
            json={
                "user_id": self._user_id,
                "text_content": "Test note: I felt threatened and unsafe.",
            },
        )
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        self.assertTrue(body.get("incident_id"), msg=f"Expected incident_id, got: {body}")
        self._created_incident_ids.append(body["incident_id"])
        self._log(f"Created note incident_id={body['incident_id']}")
        return body

    async def _create_note_incident_with_text(self, text: str) -> dict[str, Any]:
        resp = await self._client.post(
            f"{BASE_URL}/agents/ingest/note",
            json={
                "user_id": self._user_id,
                "text_content": text,
            },
        )
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        self.assertTrue(body.get("incident_id"), msg=f"Expected incident_id, got: {body}")
        self._created_incident_ids.append(body["incident_id"])
        self._log(f"Created note incident_id={body['incident_id']}")
        return body

    async def _upload_photo(self, file_name: str, png_bytes: bytes) -> dict[str, Any]:
        files = {"file": (file_name, png_bytes, "image/png")}
        data = {"user_id": self._user_id, "content_type": "photo"}
        resp = await self._client.post(f"{BASE_URL}/agents/ingest/upload", files=files, data=data)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        self.assertTrue(body.get("incident_id"), msg=f"Expected incident_id, got: {body}")
        self.assertIn("file_url", body)
        self.assertIn("file_hash", body)
        self._created_incident_ids.append(body["incident_id"])
        self._log(f"Uploaded photo incident_id={body['incident_id']} file_url={body.get('file_url', '')}")
        return body

    async def asyncTearDown(self) -> None:
        await self._client.aclose()

    async def test_health(self) -> None:
        resp = await self._client.get(f"{BASE_URL}/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("status"), "ok")

    async def test_ingest_note(self) -> None:
        body = await self._create_note_incident()
        self.assertIn("error", body)

    async def test_ingest_upload_photo(self) -> None:
        test_image_data = self._build_test_png_bytes(width=512, height=512)
        await self._upload_photo(file_name="test.png", png_bytes=test_image_data)

    def _build_test_png_bytes(self, width: int, height: int) -> bytes:
        try:
            import io

            from PIL import Image, ImageDraw

            img = Image.new("RGB", (width, height), color=(245, 245, 245))
            draw = ImageDraw.Draw(img)
            draw.rectangle([20, 20, width - 20, height - 20], outline=(0, 0, 0), width=4)
            draw.line([0, 0, width, height], fill=(255, 0, 0), width=6)
            draw.line([0, height, width, 0], fill=(0, 0, 255), width=6)

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()
        except Exception:
            # Minimal fallback (1x1 PNG) if Pillow isn't available.
            return (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
                b"\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82"
            )

    async def test_legal_report(self) -> None:
        await self._create_note_incident()
        resp = await self._client.post(f"{BASE_URL}/agents/report", json={"user_id": self._user_id})
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        self.assertTrue(body.get("report_id"), msg=f"Expected report_id, got: {body}")
        self.assertIn("pdf_url", body)

        self._log(f"Generated report_id={body.get('report_id', '')} pdf_url={body.get('pdf_url', '')}")

        gap_analysis = body.get("gap_analysis")
        self._log_gap_analysis(gap_analysis)
        self._assert_gap_analysis_populated(gap_analysis, context="test_legal_report")

        pdf_url = body.get("pdf_url")
        if isinstance(pdf_url, str) and pdf_url:
            pdf_resp = await self._client.get(pdf_url)
            self.assertEqual(pdf_resp.status_code, 200, msg=pdf_resp.text)
            self.assertTrue(pdf_resp.content.startswith(b"%PDF"), msg="Report URL did not return a PDF")

    async def test_scenario_strong_case(self) -> None:
        notes = [
            "March 1: He threatened me if I told anyone. He said he would take my phone and lock me out.",
            "March 3: He pushed me into a wall. I have bruising on my left arm and shoulder.",
            "March 6: He broke my bedroom door and threw my laptop. I took photos of the damage.",
            "March 9: He sent multiple threatening texts and said he would show up at my work.",
            "March 12: I went to urgent care for a swollen wrist. I have discharge papers.",
            "March 15: Neighbor heard yelling and banging and offered to be a witness.",
            "March 18: He restricted access to my bank account and took my debit card.",
        ]

        for idx, note in enumerate(notes, 1):
            with self.subTest(note_idx=idx):
                await self._create_note_incident_with_text(note)

        photo_1 = self._build_test_png_bytes(width=1024, height=768)
        photo_2 = self._build_test_png_bytes(width=1280, height=720)
        photo_3 = self._build_test_png_bytes(width=800, height=1200)

        await self._upload_photo(file_name="injury_photo.png", png_bytes=photo_1)
        await self._upload_photo(file_name="property_damage.png", png_bytes=photo_2)
        await self._upload_photo(file_name="screenshot_messages.png", png_bytes=photo_3)

        self.assertGreaterEqual(len(self._created_incident_ids), 10)
        self._log(f"Seeded incidents={len(self._created_incident_ids)}")

        resp = await self._client.post(f"{BASE_URL}/agents/report", json={"user_id": self._user_id})
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        self.assertTrue(body.get("report_id"), msg=f"Expected report_id, got: {body}")
        self.assertIn("pdf_url", body)
        self._log(f"Scenario report_id={body.get('report_id', '')} pdf_url={body.get('pdf_url', '')}")

        gap_analysis = body.get("gap_analysis")
        self._log_gap_analysis(gap_analysis)
        self._assert_gap_analysis_populated(gap_analysis, context="test_scenario_strong_case")


if __name__ == "__main__":
    unittest.main(verbosity=2)
