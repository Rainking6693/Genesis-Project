#!/usr/bin/env python3
"""
Check Vertex AI setup for Genesis tuned models.
Verifies all required environment variables and credentials.
"""

import os
import sys
from pathlib import Path

# Load .env
from dotenv import load_dotenv
load_dotenv()

def check_env_var(name: str, required: bool = True) -> tuple[bool, str]:
    """Check if environment variable exists."""
    value = os.getenv(name)
    if not value:
        if required:
            return False, f"❌ MISSING: {name} is not set in .env"
        else:
            return True, f"⚠️  OPTIONAL: {name} is not set (will use default)"
    return True, f"✅ FOUND: {name} = {value[:50]}..."

def main():
    """Check Vertex AI setup."""
    print("=" * 80)
    print("Genesis Vertex AI Setup Verification")
    print("=" * 80)
    print()

    checks = []

    # Check project and location
    print("1. Checking Vertex AI Project Configuration...")
    ok, msg = check_env_var("VERTEX_PROJECT_ID", required=True)
    print(f"   {msg}")
    checks.append(ok)

    ok, msg = check_env_var("VERTEX_LOCATION", required=False)
    print(f"   {msg}")
    checks.append(ok)
    print()

    # Check tuned models
    print("2. Checking Tuned Model Configuration...")
    models = [
        "GENESIS_QA_MODEL",
        "GENESIS_SUPPORT_MODEL",
        "GENESIS_ANALYST_MODEL",
        "GENESIS_LEGAL_MODEL",
        "GENESIS_CONTENT_MODEL",
        "GENESIS_SECURITY_MODEL",
    ]
    for model in models:
        ok, msg = check_env_var(model, required=False)
        print(f"   {msg}")
        if not ok:
            print(f"      → Will fall back to gemini-2.0-flash-001")
        checks.append(True)  # Not blocking if missing
    print()

    # Check service account
    print("3. Checking Service Account Credentials...")
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("   ⚠️  WARNING: GOOGLE_APPLICATION_CREDENTIALS not set in .env")
        print("   → Vertex AI will attempt to use default credentials")
        print("   → If running on GCP, this may work automatically")
        print("   → If running locally, you may need to:")
        print("      1. Create a service account in Google Cloud Console")
        print("      2. Download the JSON key file")
        print("      3. Set GOOGLE_APPLICATION_CREDENTIALS in .env")
        checks.append(True)  # Warning but not blocking
    else:
        creds_file = Path(creds_path)
        if creds_file.exists():
            print(f"   ✅ FOUND: Service account file at {creds_path}")
            checks.append(True)
        else:
            print(f"   ❌ ERROR: Service account file NOT FOUND at {creds_path}")
            print(f"      → Please create the file or update GOOGLE_APPLICATION_CREDENTIALS")
            checks.append(False)
    print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    critical_checks = checks[:2]  # PROJECT_ID and LOCATION are critical
    if all(critical_checks):
        print("✅ Critical configuration is complete")
        print("   You can proceed to run smoke_test_vertex.py")
        return 0
    else:
        print("❌ Critical configuration is INCOMPLETE")
        print("   Please fix the errors above before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(main())
