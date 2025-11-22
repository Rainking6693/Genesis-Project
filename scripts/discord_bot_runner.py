"""
Discord bot for two-way Genesis commands.

Uses discord.py command prefix "!" and reads credentials from environment:
    DISCORD_BOT_TOKEN
    DISCORD_GUILD_ID
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

import discord
from discord.ext import commands

from infrastructure.business_monitor import get_monitor
from scripts.daily_discord_report import load_statistics

INTENTS = discord.Intents.none()
INTENTS.guilds = True
INTENTS.messages = True

bot = commands.Bot(command_prefix="!", intents=INTENTS)
MONITOR = get_monitor()
DATA_DIR = Path("logs/commands")
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_dashboard_snapshot() -> dict:
    snapshot_path = Path("logs/business_generation/dashboard_snapshot.json")
    if snapshot_path.exists():
        return json.loads(snapshot_path.read_text())
    return {"status": "unavailable"}


def _load_hopx_state() -> dict:
    path = Path("logs/hopx_environments/active_environments.json")
    if path.exists():
        return json.loads(path.read_text())
    return {}


def _queue_build(business_name: str, idea: str) -> Path:
    queue_path = DATA_DIR / "build_queue.jsonl"
    record = {
        "business_name": business_name,
        "idea": idea,
        "requested_at": datetime.utcnow().isoformat(),
    }
    with queue_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + os.linesep)
    return queue_path


@bot.command(name="status")
async def status(ctx: commands.Context) -> None:
    snapshot = _load_dashboard_snapshot()
    summary = snapshot.get("global_stats", {})
    await ctx.send(
        f"📊 Businesses: {summary.get('total_businesses', 'n/a')} "
        f"(in progress: {summary.get('in_progress', 'n/a')})\n"
        f"Active agents: {len(MONITOR.businesses)}"
    )


@bot.command(name="hopx")
async def hopx(ctx: commands.Context) -> None:
    state = _load_hopx_state()
    await ctx.send(f"🔧 Active HopX environments: {len(state)}")


@bot.command(name="stats")
async def stats(ctx: commands.Context) -> None:
    daily = load_statistics()
    weekly = load_statistics(window_days=7)
    await ctx.send(
        f"📆 Daily businesses: {daily.get('businesses_built', 0)} | "
        f"Weekly: {weekly.get('businesses_built', 0)}"
    )


@bot.command(name="build")
async def build(ctx: commands.Context, *, payload: str) -> None:
    try:
        name, idea = [part.strip() for part in payload.split("|", 1)]
    except ValueError:
        await ctx.send("Usage: !build Business Name | Short idea description")
        return
    queue_path = _queue_build(name, idea)
    await ctx.send(f"🏗️ Queued build for **{name}**. Idea: {idea}\nQueue: {queue_path}")


@bot.command(name="agents")
async def agents(ctx: commands.Context) -> None:
    snapshot = _load_dashboard_snapshot()
    components = snapshot.get("component_list", [])
    await ctx.send(f"🤖 Active components: {', '.join(components) or 'n/a'}")


def main() -> None:
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        raise SystemExit("Set DISCORD_BOT_TOKEN")
    bot.run(token)


if __name__ == "__main__":
    main()

