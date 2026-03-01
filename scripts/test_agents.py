#!/usr/bin/env python3
"""
Test script for AMBER agent endpoints.
Run this after setting up your .env file with API keys.
"""

import asyncio
import httpx
import json
import os
import uuid
from pathlib import Path

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000"  # Test UUID

async def ensure_test_user_exists():
    """Create test user if it doesn't exist."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BASE_URL}/agents/setup-test-user")
            if response.status_code == 200:
                result = response.json()
                print(f"🔧 {result['message']}")
                return True
            else:
                print(f"⚠️  Failed to setup test user: {response.status_code}")
                return False
    except Exception as e:
        print(f"⚠️  Could not setup test user: {e}")
        print("   You may need to create the user manually in Supabase")
        return False

async def test_ingest_note():
    """Test the ingest note endpoint."""
    print("🧪 Testing /agents/ingest/note...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/agents/ingest/note",
            json={
                "user_id": TEST_USER_ID,
                "text_content": "This is a test note about an incident that occurred today. I felt threatened and unsafe."
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Incident ID: {result.get('incident_id')}")
            analysis = result.get('analysis')
            if analysis and isinstance(analysis, dict):
                print(f"   Analysis: {analysis.get('summary', 'N/A')}")
            else:
                print(f"   Analysis: Processing or not available")
            return result.get('incident_id')
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None

async def test_ingest_upload():
    """Test the ingest upload endpoint with a mock image."""
    print("\n🧪 Testing /agents/ingest/upload...")
    
    # Create a simple test image (1x1 PNG)
    test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
    
    async with httpx.AsyncClient() as client:
        files = {"file": ("test.png", test_image_data, "image/png")}
        data = {
            "user_id": TEST_USER_ID,
            "content_type": "photo"
        }
        
        response = await client.post(
            f"{BASE_URL}/agents/ingest/upload",
            files=files,
            data=data
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Incident ID: {result.get('incident_id')}")
            print(f"   File URL: {result.get('file_url', 'N/A')}")
            analysis = result.get('analysis')
            if analysis and isinstance(analysis, dict):
                print(f"   Analysis: {analysis.get('summary', 'N/A')}")
            else:
                print(f"   Analysis: Processing or not available")
            return result.get('incident_id')
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None

async def test_legal_report():
    """Test the legal report endpoint."""
    print("\n🧪 Testing /agents/report...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/agents/report",
            json={"user_id": TEST_USER_ID}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Report ID: {result.get('report_id')}")
            print(f"   PDF URL: {result.get('pdf_url', 'N/A')}")
            gap_analysis = result.get('gap_analysis', {})
            if gap_analysis:
                print(f"   Present evidence: {len(gap_analysis.get('present', []))} types")
                print(f"   Missing evidence: {len(gap_analysis.get('missing', []))} types")
            return result.get('report_id')
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None

async def main():
    """Run all tests."""
    print("🚀 AMBER Agent Endpoint Tests")
    print("=" * 50)
    
    # Ensure test user exists
    await ensure_test_user_exists()
    
    # Check if server is running
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code != 200:
                print("❌ Server health check failed. Is the server running?")
                return
    except Exception as e:
        print(f"❌ Cannot connect to server at {BASE_URL}: {e}")
        print("   Make sure your FastAPI server is running!")
        return
    
    print("✅ Server is healthy\n")
    
    # Run tests
    await test_ingest_note()
    await test_ingest_upload()
    await test_legal_report()
    
    print("\n🎉 Tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
