"""
Daily Discord Report
====================

Generates a high-level KPI summary and sends it to the metrics Discord channel.
This script is designed to run via cron / Windows Task Scheduler.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from infrastructure.genesis_discord import GenesisDiscord
from infrastructure.business_monitor import get_monitor

LOG_DIR = Path("logs/business_generation")


def load_statistics(*, window_days: Optional[int] = None) -> Dict[str, Any]:
    if window_days:
        try:
            monitor = get_monitor()
            return monitor.get_rolling_statistics(window_days)
        except Exception as exc:  # pragma: no cover - best effort fallback
            logging.warning("Rolling stats unavailable (%s). Falling back to snapshot.", exc)

    stats_path = LOG_DIR / "global_stats.json"
    if stats_path.exists():
        return json.loads(stats_path.read_text())
    return {
        "window_days": window_days or 1,
        "businesses_built": 0,
        "success_rate": 0,
        "avg_quality_score": 0,
        "total_revenue": 0.0,
        "active_businesses": 0,
        "generated_at": None,
    }


async def main(dry_run: bool, window_days: Optional[int]) -> None:
    stats = load_statistics(window_days=window_days)
    discord = GenesisDiscord()
    if dry_run:
        print(json.dumps(stats, indent=2))
    else:
        if window_days and window_days > 1:
            stats.setdefault("period", f"Last {window_days} days")
        await discord.daily_report(stats)
    await discord.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send the Discord KPI report.")
    parser.add_argument("--dry-run", action="store_true", help="Print to stdout instead of Discord")
    parser.add_argument(
        "--window-days",
        type=int,
        default=None,
        help="Rolling window size for summary stats (e.g., 7 for weekly).",
    )
    parser.add_argument(
        "--weekly",
        action="store_true",
        help="Shortcut for a 7-day rolling summary (equivalent to --window-days 7).",
    )
    args = parser.parse_args()
    window = args.window_days or (7 if args.weekly else None)
    asyncio.run(main(args.dry_run, window))

