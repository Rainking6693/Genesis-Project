#!/usr/bin/env python3
"""Convert DeepResearch JSONL into Unsloth fine-tuning format."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert DeepResearch JSONL to Unsloth format")
    parser.add_argument("source", type=Path, help="Input DeepResearch JSONL file")
    parser.add_argument("destination", type=Path, help="Destination JSONL file for Unsloth")
    parser.add_argument(
        "--max-examples",
        type=int,
        default=None,
        help="Optional limit for number of records",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    count = 0
    with args.source.open("r", encoding="utf-8") as fin, args.destination.open("w", encoding="utf-8") as fout:
        for line in fin:
            record = json.loads(line)
            instruction = record.get("query", "")
            response = "\n".join(record.get("findings", []))
            output = {
                "instruction": instruction,
                "response": response,
                "agent": record.get("agent"),
                "topic": record.get("topic"),
                "citations": record.get("citations", []),
            }
            fout.write(json.dumps(output))
            fout.write("\n")
            count += 1
            if args.max_examples and count >= args.max_examples:
                break
    print(f"Wrote {count} examples to {args.destination}")


if __name__ == "__main__":
    main()
