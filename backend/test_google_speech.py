#!/usr/bin/env python3
"""Test Google Speech API credentials and connection."""

import os
import sys
from pathlib import Path

# Add backend dir to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(backend_dir / "google-credentials.json")

def test_credentials():
    print("Testing Google Speech API credentials...")
    print(f"Credentials path: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        print(f"✓ Credentials file exists: {cred_path}")
        print(f"  File size: {os.path.getsize(cred_path)} bytes")
    else:
        print(f"✗ Credentials file not found at: {cred_path}")
        return False

    # Try to load credentials
    try:
        from google.oauth2 import service_account
        credentials = service_account.Credentials.from_service_account_file(cred_path)
        print(f"✓ Credentials loaded successfully")
        print(f"  Project ID: {credentials.project_id if hasattr(credentials, 'project_id') else 'N/A'}")
        print(f"  Service account: {credentials.service_account_email if hasattr(credentials, 'service_account_email') else 'N/A'}")
    except Exception as e:
        print(f"✗ Failed to load credentials: {e}")
        return False

    # Try to create Speech client
    try:
        from google.cloud import speech_v1p1beta1 as speech
        client = speech.SpeechAsyncClient(credentials=credentials)
        print(f"✓ Google Speech client created successfully")
        print(f"  Client type: {type(client)}")
    except Exception as e:
        print(f"✗ Failed to create Speech client: {e}")
        return False

    # Try to create adapter
    try:
        import structlog
        from app.services.stt import create_stt_adapter

        logger = structlog.get_logger()
        adapter = create_stt_adapter(engine="google", language="ru-RU", logger=logger)
        print(f"✓ STT adapter created successfully")
        print(f"  Adapter type: {type(adapter).__name__}")
    except Exception as e:
        print(f"✗ Failed to create adapter: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    success = test_credentials()
    sys.exit(0 if success else 1)