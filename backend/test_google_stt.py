#!/usr/bin/env python3
"""Test Google Speech-to-Text API connection"""

import os
import sys
import json
from pathlib import Path

# Set credentials path
backend_dir = Path(__file__).parent
creds_path = backend_dir / "google-credentials.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds_path)

# Add backend to path
sys.path.insert(0, str(backend_dir))

from app.services.stt import create_stt_adapter
import structlog

# Set up logging
logger = structlog.get_logger()

print(f"Testing Google Speech-to-Text API...")
print(f"Credentials path: {creds_path}")
print(f"Credentials exist: {creds_path.exists()}")

if creds_path.exists():
    with open(creds_path) as f:
        creds = json.load(f)
        print(f"Project ID: {creds.get('project_id')}")

# Check environment
print(f"\nEnvironment variables:")
print(f"VOX_STT_FORCE_STUB: {os.getenv('VOX_STT_FORCE_STUB')}")
print(f"GOOGLE_APPLICATION_CREDENTIALS: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")

# Try to create adapter
print(f"\nCreating Google Speech adapter...")
try:
    adapter = create_stt_adapter(
        engine="google",
        language="ru-RU",
        logger=logger
    )
    print(f"✅ Adapter created successfully: {adapter.__class__.__name__}")

    # Check if it's really Google or Stub
    if hasattr(adapter, 'engine'):
        print(f"   Engine: {adapter.engine}")
    if hasattr(adapter, '_client'):
        print(f"   Has Google client: {adapter._client is not None}")

except Exception as e:
    print(f"❌ Failed to create adapter: {e}")
    import traceback
    traceback.print_exc()