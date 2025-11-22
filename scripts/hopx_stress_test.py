"""
HopX Environment Stress Test
============================

Creates multiple HopX environments in parallel to validate performance and
auto-teardown behavior. Works with both real API credentials and mock mode
(`HOPX_USE_FAKE=true`).
"""

from __future__ import annotations

import argparse
import asyncio
from typing import List

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from infrastructure.hopx_client import HopXClient


async def _exercise_environment(client: HopXClient, template: str, idx: int) -> dict:
    business_id = f"stress_{idx}"
    env = await client.create_environment(business_id, template=template)
    try:
        await client.execute_command(
            env.env_id,
            " && ".join(["echo HopX Stress Test", "ls"]),
            timeout=30,
        )
        return {"env_id": env.env_id, "business_id": business_id, "status": "success"}
    finally:
        await client.destroy_environment(env.env_id)


async def run_stress_test(count: int, template: str) -> List[dict]:
    client = HopXClient()
    tasks = [
        _exercise_environment(client, template, idx)
        for idx in range(count)
    ]
    return await asyncio.gather(*tasks, return_exceptions=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="HopX parallel environment stress test")
    parser.add_argument("--count", type=int, default=5, help="Number of environments to create")
    parser.add_argument(
        "--template",
        type=str,
        default="nodejs_environment",
        help="HopX template (nodejs_environment, python_environment, etc.)",
    )
    args = parser.parse_args()

    print(f"🚀 Starting HopX stress test ({args.count} envs, template={args.template})")
    results = asyncio.run(run_stress_test(args.count, args.template))

    successes = sum(1 for r in results if r.get("status") == "success")
    print(f"✅ Completed {successes}/{args.count} environments")
    for record in results:
        print(f" - {record['business_id']}: {record['env_id']}")


if __name__ == "__main__":
    main()

