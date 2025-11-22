#!/usr/bin/env python3
"""
Migrates legacy JSON/Mongo memories into the Memori SQL backend.
"""

import argparse
import json
from pathlib import Path
from typing import Tuple

from infrastructure.memory.memori_client import MemoriClient


def migrate_casebank(path: Path, client: MemoriClient) -> int:
    if not path.exists():
        return 0

    migrated = 0
    with path.open("r") as handle:
        for line in handle:
            if not line.strip():
                continue
            payload = json.loads(line)
            client.upsert_case(payload)
            migrated += 1
    return migrated


def migrate_trajectories(root: Path, client: MemoriClient) -> int:
    if not root.exists():
        return 0

    migrated = 0
    for pool_file in root.rglob("trajectory_pool.json"):
        data = json.loads(pool_file.read_text())
        agent = data.get("agent_name", pool_file.parent.name)
        for trajectory_id, payload in data.get("trajectories", {}).items():
            payload["trajectory_id"] = trajectory_id
            payload.setdefault("agent_name", agent)
            client.upsert_trajectory(trajectory_id, agent, payload)
            migrated += 1
    return migrated


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate Genesis memories into Memori SQL backend")
    parser.add_argument("--casebank-json", type=Path, default=Path("data/memory/casebank.jsonl"))
    parser.add_argument("--trajectory-root", type=Path, default=Path("data/trajectory_pools"))
    parser.add_argument("--memori-db", type=Path, default=Path("data/memori/genesis_memori.db"))
    args = parser.parse_args()

    client = MemoriClient(str(args.memori_db))
    cases = migrate_casebank(args.casebank_json, client)
    trajectories = migrate_trajectories(args.trajectory_root, client)

    print(f"Migrated {cases} cases and {trajectories} trajectories into {args.memori_db}")


if __name__ == "__main__":
    main()
