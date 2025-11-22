"""
CLI helper for posting updates to Genesis Discord business channels.

Requires DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to be set. Use the same
business IDs that GenesisMetaAgent emits (sha256(name)[:12]).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
from pathlib import Path
from typing import Optional

from infrastructure.genesis_discord_bot import GenesisDiscordBot


def hash_business_id(name: str) -> str:
    return hashlib.sha256(name.encode("utf-8")).hexdigest()[:12]


async def post_update(
    business_id: str,
    business_name: Optional[str],
    message: str,
    auto_create: bool,
) -> None:
    async with GenesisDiscordBot() as bot:
        channel_id = None
        if auto_create:
            channel_id = await bot.ensure_business_channel(
                business_id,
                business_name or business_id,
            )
        if channel_id is None:
            raise RuntimeError(
                "Channel not found. Pass --auto-create with --business-name to create one."
            )
        await bot.post_business_update(channel_id, message)


async def archive_channel(business_id: str, business_name: Optional[str], reason: str) -> None:
    async with GenesisDiscordBot() as bot:
        channel_id = await bot.ensure_business_channel(
            business_id,
            business_name or business_id,
        )
        if channel_id:
            await bot.post_business_update(channel_id, f"📦 Archiving channel: {reason}")
            await bot.archive_channel(channel_id, reason=reason)


def load_message(args: argparse.Namespace) -> str:
    if args.message:
        return args.message
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    raise SystemExit("Provide --message or --file")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Post updates to Genesis Discord business channels."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    post_cmd = sub.add_parser("post", help="Post a message to a business channel")
    post_cmd.add_argument("--business-id", help="Existing business ID (12-char hash)")
    post_cmd.add_argument("--business-name", help="Business name (used to hash if ID missing)")
    post_cmd.add_argument("--message", help="Inline message text")
    post_cmd.add_argument("--file", help="Path to file containing message text")
    post_cmd.add_argument("--auto-create", action="store_true", help="Create channel if needed")

    archive_cmd = sub.add_parser("archive", help="Archive a business channel")
    archive_cmd.add_argument("--business-id", help="Existing business ID (12-char hash)")
    archive_cmd.add_argument("--business-name", help="Business name (used to hash if ID missing)")
    archive_cmd.add_argument("--reason", default="Build complete", help="Archive reason")

    return parser.parse_args()


def resolve_business_id(business_id: Optional[str], business_name: Optional[str]) -> str:
    if business_id:
        return business_id
    if business_name:
        return hash_business_id(business_name)
    raise SystemExit("Provide --business-id or --business-name")


async def main() -> None:
    args = parse_args()
    business_id = resolve_business_id(args.business_id, args.business_name)
    business_name = args.business_name

    if args.command == "post":
        message = load_message(args)
        await post_update(business_id, business_name, message, args.auto_create)
    elif args.command == "archive":
        await archive_channel(business_id, business_name, args.reason)


if __name__ == "__main__":
    asyncio.run(main())

