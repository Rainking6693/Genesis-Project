#!/usr/bin/env python3
"""
Run SLICE context linting against representative samples.

This script is used in CI to ensure the SLICE context linter remains
stable and continues to deliver token reductions on real-world contexts.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable, List

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from infrastructure.context_linter import ContextLinter, Message


def _parse_timestamp(value: str) -> datetime:
    """Parse ISO timestamps that may include a trailing Z."""
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def load_context_samples(path: Path) -> List[List[Message]]:
    """Load context samples from JSON file."""
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    contexts: List[List[Message]] = []
    for index, sample in enumerate(data, start=1):
        messages: List[Message] = []
        for entry in sample:
            messages.append(
                Message(
                    content=entry["content"],
                    role=entry["role"],
                    timestamp=_parse_timestamp(entry["timestamp"]),
                    source=entry.get("source", "unknown"),
                    metadata=entry.get("metadata", {}),
                )
            )

        contexts.append(messages)

    return contexts


def lint_samples(contexts: Iterable[List[Message]]) -> int:
    """Run the SLICE linter over each context and report reductions."""
    linter = ContextLinter(enable_otel=False)
    failures = 0
    min_token_reduction = float(os.getenv("SLICE_MIN_TOKEN_REDUCTION_PERCENT", "1.0"))

    for idx, messages in enumerate(contexts, start=1):
        result = linter.lint_context(messages)
        print(
            f"[SLICE] Sample {idx}: "
            f"{result.original_count}→{result.cleaned_count} messages "
            f"({result.message_reduction_percent:.1f}% reduction), "
            f"{result.original_tokens}→{result.cleaned_tokens} tokens "
            f"({result.token_reduction_percent:.1f}% reduction)"
        )

        if result.cleaned_count == 0:
            print(f"  ⚠️  Sample {idx} produced an empty context after linting.")
            failures += 1
        elif result.token_reduction_percent < min_token_reduction:
            print(
                "  ⚠️  Token reduction "
                f"{result.token_reduction_percent:.1f}% below threshold "
                f"{min_token_reduction:.1f}%."
            )
            failures += 1

    return failures


def main() -> None:
    sample_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("tests/fixtures/slice_context_samples.json")
    )

    if not sample_path.exists():
        raise SystemExit(f"Sample context file not found: {sample_path}")

    contexts = load_context_samples(sample_path)
    failures = lint_samples(contexts)

    if failures:
        raise SystemExit(f"SLICE linting detected {failures} failure(s).")

    print(f"SLICE linting completed successfully for {len(contexts)} sample contexts.")


if __name__ == "__main__":
    main()
