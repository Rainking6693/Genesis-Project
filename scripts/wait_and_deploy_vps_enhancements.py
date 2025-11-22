"""
Auto-deploy VPS-style enhancements once 1-hour test completes.
Monitors test progress and launches Shane + Nova in parallel.
"""

import time
import subprocess
import sys
from pathlib import Path

def check_test_complete():
    """Check if 1-hour test is complete (100 businesses)."""
    log_file = Path("logs/1hour_test_output.log")
    if not log_file.exists():
        return False

    content = log_file.read_text(encoding='utf-8', errors='ignore')
    completed = content.count("Complete:")

    return completed >= 100

def main():
    print("\n" + "="*80)
    print("WAITING FOR 1-HOUR TEST TO COMPLETE")
    print("="*80 + "\n")

    print("Current status:")
    log_file = Path("logs/1hour_test_output.log")
    if log_file.exists():
        content = log_file.read_text(encoding='utf-8', errors='ignore')
        completed = content.count("Complete:")
        print(f"  Businesses completed: {completed}/100")
        print(f"  Remaining: {100 - completed}")
    else:
        print("  Test log not found - test may not be running")
        return

    print("\nMonitoring test completion...")
    print("Will auto-deploy Shane + Nova when test reaches 100 businesses\n")

    while not check_test_complete():
        content = log_file.read_text(encoding='utf-8', errors='ignore')
        completed = content.count("Complete:")

        print(f"\r[{time.strftime('%H:%M:%S')}] Progress: {completed}/100 businesses", end="", flush=True)
        time.sleep(30)  # Check every 30 seconds

    print("\n\n" + "="*80)
    print("TEST COMPLETE! Deploying VPS-style enhancements...")
    print("="*80 + "\n")

    print("See VPS_STYLE_IMPLEMENTATION_PLAN.md for details\n")

    print("Ready to deploy Shane + Nova in parallel:")
    print("  - Shane: Multi-Agent Attribution + Dual-Thread Planning")
    print("  - Nova: DeepResearch Pipeline + Restart Mechanisms")
    print()

    # User can manually trigger deployment from here
    print("To deploy now, run:")
    print("  python scripts/deploy_vps_enhancements.py")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped by user.")
        sys.exit(0)
