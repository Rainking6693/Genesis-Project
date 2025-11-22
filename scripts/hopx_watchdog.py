#!/usr/bin/env python3
"""
HopX Watchdog
=============

Scans the HopX monitor state and alerts Discord whenever an environment
has been alive for too long. Designed to run once per minute via cron/task
scheduler so the alerts stay visible in #alerts and #hopx-errors.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from infrastructure.hopx_monitor import HopXMonitor  # noqa: E402
from infrastructure.hopx_watchdog import find_stuck_environments, notify_stuck_environments  # noqa: E402


async def _main(max_age: int, dry_run: bool) -> int:
    monitor = HopXMonitor()
    stuck = find_stuck_environments(max_age_seconds=max_age, monitor=monitor)
    if not stuck:
        print("No stuck HopX environments detected.")
        return 0

    if dry_run:
        print(f"{len(stuck)} stuck HopX environment(s) detected:")
        for record in stuck:
            print(
                f" - {record.env_id} (business: {record.business_id}, template: {record.template}, "
                f"created_at: {record.created_at:.0f})"
            )
        return 0

    await notify_stuck_environments(stuck)
    print(f"Alerted Discord for {len(stuck)} stuck HopX environment(s).")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Send Discord alerts for stuck HopX environments.")
    parser.add_argument(
        "--max-age",
        type=int,
        default=3600,
        help="Seconds before a HopX environment is considered stuck (default: 3600).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print stuck environments without sending Discord notifications.",
    )

    args = parser.parse_args()
    try:
        exit_code = asyncio.run(_main(args.max_age, args.dry_run))
    except KeyboardInterrupt:
        print("\nInterrupted.")
        exit_code = 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
