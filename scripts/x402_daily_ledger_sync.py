#!/usr/bin/env python
"""
x402 Daily Ledger Sync
======================

Synchronizes x402 transaction logs into the Finance Agent's accounting records,
supports weekly spend summaries, and surfaces ledger health checks for schedulers.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from infrastructure.load_env import load_genesis_env

load_genesis_env()

from agents.finance_agent import FinanceAgent  # noqa: E402
from infrastructure.business_monitor import get_monitor  # noqa: E402
# REMOVED: Discord integration (integration disabled due to webhook errors)
# from infrastructure.genesis_discord import GenesisDiscord  # noqa: E402

LEDGER_PATH = Path("data/x402/transactions.jsonl")


def load_transactions() -> List[Dict[str, any]]:
    """Load every x402 ledger entry."""
    if not LEDGER_PATH.exists():
        return []
    entries: List[Dict[str, any]] = []
    with LEDGER_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def filter_daily(entries: List[Dict[str, any]], days: int = 1) -> List[Dict[str, any]]:
    """Return transactions within the past N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    filtered = []
    for entry in entries:
        ts = entry.get("timestamp")
        if not ts:
            continue
        try:
            parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            continue
        if parsed >= cutoff:
            filtered.append(entry)
    return filtered


async def post_weekly_report(summary: Dict[str, any]) -> None:
    """Send weekly spend summary to Discord metrics channel (Discord disabled)."""
    # REMOVED: Discord integration (integration disabled due to webhook errors)
    # discord = GenesisDiscord()
    # try:
    #     await discord.x402_spend_summary(
    #         business_id="weekly",
    #         business_name="Weekly Spend Report",
    #         summary=summary,
    #     )
    # finally:
    #     await discord.close()
    pass  # Stub for removed Discord integration


def build_summary(entries: List[Dict[str, any]]) -> Dict[str, any]:
    total = sum(e.get("amount_usdc", 0.0) for e in entries)
    by_vendor: Dict[str, float] = {}
    for entry in entries:
        vendor = entry.get("vendor", "unknown")
        by_vendor[vendor] = by_vendor.get(vendor, 0.0) + entry.get("amount_usdc", 0.0)
    return {
        "total_spend": round(total, 2),
        "by_vendor": {k: round(v, 2) for k, v in by_vendor.items()},
        "by_agent": {},
        "revenue_potential": 0.0,
        "roi_delta": -round(total, 2),
    }


def sync_finance(entries: List[Dict[str, any]]) -> Dict[str, any]:
    agent = FinanceAgent()
    summary = agent.import_x402_transactions(entries)
    output_file = Path("data/x402/finance_sync.json")
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def check_stale_authorizations(max_age: int) -> List[Dict[str, any]]:
    monitor = get_monitor()
    return monitor.get_stale_authorizations(max_age_seconds=max_age)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync x402 ledger to accounting + alerts")
    parser.add_argument("--weekly-report", action="store_true", help="Generate a weekly Discord summary")
    parser.add_argument("--check-stale", action="store_true", help="Report stale authorizations (>1 hour)")
    args = parser.parse_args()

    entries = load_transactions()
    daily = filter_daily(entries, days=1)
    summary = sync_finance(daily)
    print(f"Synced {summary['synced']} daily transactions into Finance Agent.")

    if args.check_stale:
        stale = check_stale_authorizations(max_age=3600)
        if stale:
            stale_path = Path("data/x402/stale_authorizations.json")
            stale_path.write_text(json.dumps(stale, indent=2), encoding="utf-8")
            print(f"⚠️  Found {len(stale)} stale authorizations. Written to {stale_path}")
        else:
            print("✅ No stale authorizations detected.")

    if args.weekly_report:
        weekly_entries = filter_daily(entries, days=7)
        weekly_summary = build_summary(weekly_entries)
        print("Posting weekly spend report to Discord metrics channel...")
        asyncio.run(post_weekly_report(weekly_summary))


if __name__ == "__main__":
    main()

