#!/usr/bin/env python3
"""
Reset Marketing Agent Budget and Verify Memory Systems
======================================================

This script:
1. Resets all AP2 batch mandate budgets (especially marketing_agent)
2. Verifies Memori, MemoryOS, CaseBank, and Acontext are configured
3. Reports system status

Usage:
    python scripts/reset_marketing_budget.py
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def print_header(title: str):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}\n")


async def reset_ap2_budgets():
    """Reset all AP2 batch mandate budgets."""
    print_header("Resetting AP2 Batch Mandate Budgets")

    try:
        from infrastructure.ap2_batch_approval import AP2BatchApprovalManager

        # Default budgets for all agents
        default_budgets = {
            "marketing_agent": {"monthly_limit": 5000.0},
            "billing_agent": {"monthly_limit": 10000.0},
            "content_agent": {"monthly_limit": 2000.0},
            "seo_agent": {"monthly_limit": 1500.0},
            "email_agent": {"monthly_limit": 1000.0},
            "analyst_agent": {"monthly_limit": 2000.0},
            "commerce_agent": {"monthly_limit": 5000.0},
            "legal_agent": {"monthly_limit": 3000.0},
            "support_agent": {"monthly_limit": 1000.0},
            "deploy_agent": {"monthly_limit": 500.0},
            "qa_agent": {"monthly_limit": 500.0},
            "maintenance_agent": {"monthly_limit": 500.0},
            "onboarding_agent": {"monthly_limit": 1000.0},
            "security_agent": {"monthly_limit": 1000.0},
            "spec_agent": {"monthly_limit": 500.0},
        }

        manager = AP2BatchApprovalManager(budgets=default_budgets)

        # Create fresh mandates for default owner
        user_id = "default_owner"
        created = manager.create_monthly_mandates(user_id, default_budgets)

        print(f"[OK] Created/Reset {len(created)} agent mandates for user '{user_id}':")
        for agent_name, mandate in created.items():
            print(f"     - {agent_name}: ${mandate.budget:.2f} budget (expires {mandate.expires_at.strftime('%Y-%m-%d')})")

        # Also reset any existing mandates
        manager.reset_monthly_budgets()
        print(f"\n[OK] All existing mandates reset to full budget")

        return True, manager

    except Exception as e:
        logger.error(f"Failed to reset AP2 budgets: {e}")
        return False, None


async def verify_memori():
    """Verify Memori SQL-native memory is configured."""
    print_header("Verifying Memori (SQL-native Memory)")

    try:
        # Check environment variable
        backend = os.getenv("GENESIS_MEMORY_BACKEND", "")
        if backend.lower() == "memori":
            print(f"[OK] GENESIS_MEMORY_BACKEND=memori")
        else:
            print(f"[WARN] GENESIS_MEMORY_BACKEND={backend or 'not set'} (should be 'memori')")

        # Try to import
        try:
            from infrastructure.memori_adapter import MemoriAdapter
            print("[OK] Memori adapter module available")
            return True
        except ImportError as e:
            print(f"[WARN] Memori adapter not available: {e}")
            return False

    except Exception as e:
        logger.error(f"Memori verification failed: {e}")
        return False


async def verify_memoryos():
    """Verify MemoryOS MongoDB backend is configured."""
    print_header("Verifying MemoryOS (MongoDB Backend)")

    mongodb_uri = os.getenv("MONGODB_URI", "")

    # Check for MongoDB Atlas or local
    if "mongodb+srv://" in mongodb_uri:
        print(f"[OK] MongoDB Atlas configured")
        print(f"     URI: {mongodb_uri[:50]}...")
    elif "localhost" in mongodb_uri or mongodb_uri == "":
        print(f"[INFO] Using local MongoDB (localhost:27017)")
        mongodb_uri = "mongodb://localhost:27017/"
    else:
        print(f"[OK] MongoDB URI configured: {mongodb_uri[:50]}...")

    # Try to connect
    try:
        from pymongo import MongoClient
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.server_info()  # Will raise if can't connect
        print("[OK] MongoDB connection successful")

        # Check databases
        dbs = client.list_database_names()
        genesis_dbs = [db for db in dbs if "genesis" in db.lower()]
        print(f"[OK] Found {len(genesis_dbs)} Genesis databases: {genesis_dbs[:5]}")

        client.close()
        return True

    except Exception as e:
        print(f"[WARN] MongoDB connection failed: {e}")
        print("       Make sure MongoDB is running (docker-compose --profile database up -d)")
        return False


async def verify_casebank():
    """Verify CaseBank is configured."""
    print_header("Verifying CaseBank (Case-Based Reasoning)")

    try:
        from infrastructure.casebank import CaseBank

        # Initialize CaseBank
        casebank = CaseBank()
        case_count = len(casebank.cases) if hasattr(casebank, 'cases') else 0

        print(f"[OK] CaseBank initialized with {case_count} cases")

        # Check storage file
        storage_path = Path("data/memory/casebank.jsonl")
        if storage_path.exists():
            line_count = sum(1 for _ in open(storage_path))
            print(f"[OK] CaseBank storage: {storage_path} ({line_count} entries)")
        else:
            print(f"[INFO] CaseBank storage will be created at: {storage_path}")

        return True

    except Exception as e:
        logger.error(f"CaseBank verification failed: {e}")
        return False


async def verify_acontext():
    """Verify Acontext is configured."""
    print_header("Verifying Acontext (Context Management)")

    # Check environment
    acontext_url = os.getenv("ACONTEXT_URL", "http://localhost:8000")
    print(f"[INFO] Acontext URL: {acontext_url}")

    try:
        from infrastructure.acontext_client import AcontextClient

        client = AcontextClient(base_url=acontext_url)
        print(f"[OK] Acontext client initialized")

        # Check local SQLite fallback
        local_db = Path("data/test_acontext.db")
        if local_db.exists():
            print(f"[OK] Local SQLite fallback available: {local_db}")
        else:
            print(f"[INFO] Local SQLite fallback will be created at: {local_db}")

        # Check if Docker Acontext is running
        try:
            import httpx
            response = httpx.get(f"{acontext_url}/health", timeout=2.0)
            if response.status_code == 200:
                print(f"[OK] Acontext Docker service is running")
            else:
                print(f"[WARN] Acontext service returned {response.status_code}")
        except:
            print(f"[INFO] Acontext Docker not running - using local SQLite fallback")
            print("       To start: docker-compose -f docker-compose.acontext.yml up -d")

        return True

    except ImportError as e:
        print(f"[WARN] Acontext client not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Acontext verification failed: {e}")
        return False


async def update_env_for_memory_systems():
    """Update .env with correct memory backend settings."""
    print_header("Updating Environment Configuration")

    env_path = Path("C:/Users/Administrator/Desktop/Genesis-Project/.env")

    if not env_path.exists():
        print(f"[ERROR] .env file not found at {env_path}")
        return False

    # Read current env
    with open(env_path, 'r') as f:
        env_content = f.read()

    updates = []

    # Check GENESIS_MEMORY_BACKEND
    if "GENESIS_MEMORY_BACKEND=memori" not in env_content:
        if "GENESIS_MEMORY_BACKEND=" in env_content:
            print("[OK] GENESIS_MEMORY_BACKEND already set")
        else:
            updates.append("GENESIS_MEMORY_BACKEND=memori")

    # Check MongoDB for local Docker
    if "MONGODB_LOCAL_URI=" not in env_content:
        updates.append("MONGODB_LOCAL_URI=mongodb://genesis:genesis_password@localhost:27017/genesis?authSource=admin")

    if updates:
        print(f"[INFO] Adding {len(updates)} environment variables:")
        for update in updates:
            print(f"       + {update.split('=')[0]}")
            env_content += f"\n{update}"

        with open(env_path, 'w') as f:
            f.write(env_content)
        print("[OK] Environment updated")
    else:
        print("[OK] Environment already configured correctly")

    return True


async def main():
    """Main entry point."""
    print("\n" + "="*60)
    print(" Genesis Memory Systems Setup & Budget Reset")
    print(" " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)

    results = {}

    # 1. Reset AP2 budgets
    success, manager = await reset_ap2_budgets()
    results["ap2_budgets"] = success

    # 2. Verify memory systems
    results["memori"] = await verify_memori()
    results["memoryos"] = await verify_memoryos()
    results["casebank"] = await verify_casebank()
    results["acontext"] = await verify_acontext()

    # 3. Update environment
    results["env_update"] = await update_env_for_memory_systems()

    # Summary
    print_header("Summary")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, status in results.items():
        icon = "[OK]" if status else "[FAIL]"
        print(f"  {icon} {name}")

    print(f"\n  Result: {passed}/{total} checks passed")

    if passed < total:
        print("\n  Next steps:")
        if not results["memoryos"]:
            print("    1. Start MongoDB: docker-compose --profile database up -d")
        if not results["acontext"]:
            print("    2. Start Acontext: docker-compose -f docker-compose.acontext.yml up -d")
        print("    3. Re-run this script to verify")
    else:
        print("\n  All memory systems configured!")
        print("  Ready to run tests: python run_genesis_100_real_tests.py")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
