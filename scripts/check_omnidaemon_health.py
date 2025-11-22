"""
OmniDaemon Health Check Script

Checks the health of the running OmniDaemon instance.
Reads heartbeat file and displays status.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path


def check_health():
    """Check OmniDaemon health."""
    heartbeat_file = Path("/tmp/omnidaemon_heartbeat.json")

    if not heartbeat_file.exists():
        print("❌ CRITICAL: OmniDaemon heartbeat file not found")
        print("   OmniDaemon is likely not running")
        return 1

    try:
        with open(heartbeat_file, 'r') as f:
            heartbeat = json.load(f)

        # Check timestamp
        timestamp = datetime.fromisoformat(heartbeat["timestamp"])
        age_seconds = (datetime.now() - timestamp).total_seconds()

        print("=" * 60)
        print("OmniDaemon Health Check")
        print("=" * 60)
        print()

        # Status
        status = heartbeat.get("status", "unknown")
        if status == "running":
            print("✅ Status: RUNNING")
        else:
            print(f"⚠️  Status: {status.upper()}")

        # Heartbeat age
        if age_seconds < 60:
            print(f"✅ Last heartbeat: {age_seconds:.0f}s ago (healthy)")
        elif age_seconds < 300:
            print(f"⚠️  Last heartbeat: {age_seconds:.0f}s ago (warning)")
        else:
            print(f"❌ Last heartbeat: {age_seconds:.0f}s ago (stale)")

        # Uptime
        uptime = heartbeat.get("uptime_seconds", 0)
        uptime_str = format_uptime(uptime)
        print(f"⏱️  Uptime: {uptime_str}")

        # Metrics
        print()
        print("📊 Metrics:")
        metrics = heartbeat.get("metrics", {})
        print(f"   - Workspace cycles: {metrics.get('workspace_cycles', 0)}")
        print(f"   - ES training runs: {metrics.get('es_training_runs', 0)}")
        print(f"   - Attribution checks: {metrics.get('attribution_checks', 0)}")
        print(f"   - Active workspaces: {metrics.get('active_workspaces', 0)}")

        # Config
        print()
        print("⚙️  Configuration:")
        config = heartbeat.get("config", {})
        print(f"   - ES training enabled: {config.get('es_training_enabled', False)}")
        print(f"   - ES training time: {config.get('es_training_time', 'N/A')}")
        print(f"   - Attribution enabled: {config.get('attribution_enabled', False)}")
        print(f"   - Max workspaces: {config.get('max_active_workspaces', 'N/A')}")

        print()
        print("=" * 60)

        # Return code based on health
        if age_seconds < 60:
            print("✅ Health: EXCELLENT")
            return 0
        elif age_seconds < 300:
            print("⚠️  Health: DEGRADED (heartbeat is stale)")
            return 1
        else:
            print("❌ Health: CRITICAL (heartbeat is very stale)")
            return 2

    except Exception as e:
        print(f"❌ ERROR: Failed to read heartbeat: {e}")
        return 3


def format_uptime(seconds: float) -> str:
    """Format uptime in human-readable format."""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{secs}s")

    return " ".join(parts)


if __name__ == "__main__":
    exit_code = check_health()
    sys.exit(exit_code)
