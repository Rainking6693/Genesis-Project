#!/usr/bin/env python3
"""
Training Data Bias Detection
----------------------------

Analyses the Unsloth-format corpus for specialization or distribution biases.

Example:
    python scripts/detect_biases.py \
        --input_dir data/unsloth_format \
        --output_report reports/bias_analysis.md
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np

from scripts.training_data_utils import TrainingExample, load_training_examples

DIFFICULTY_ORDER = {"easy": 1, "medium": 2, "hard": 3}
MIN_SOURCE_DIVERSITY = 5
MAX_CATEGORY_SHARE = 0.50
MIN_HARD_CATEGORY_COUNT = 3
MAX_DIFFICULTY_CORRELATION = 0.90


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect training data biases.")
    parser.add_argument(
        "--input_dir",
        type=Path,
        required=True,
        help="Directory containing Unsloth-format JSONL files.",
    )
    parser.add_argument(
        "--output_report",
        type=Path,
        required=True,
        help="Markdown file to write the bias analysis summary.",
    )
    return parser.parse_args(argv)


def load_examples(input_dir: Path) -> List[TrainingExample]:
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory {input_dir} does not exist")
    return load_training_examples(input_dir)


def agent_category_distribution(records: Iterable[TrainingExample]) -> Dict[str, Counter]:
    distribution: Dict[str, Counter] = defaultdict(Counter)
    for record in records:
        category = record.category or "uncategorized"
        distribution[record.target_agent][category] += 1
    return distribution


def agent_source_distribution(records: Iterable[TrainingExample]) -> Dict[str, Counter]:
    sources: Dict[str, Counter] = defaultdict(Counter)
    for record in records:
        sources[record.target_agent][record.source_agent] += 1
    return sources


def difficulty_category_map(records: Iterable[TrainingExample]) -> Dict[str, Dict[str, Counter]]:
    mapping: Dict[str, Dict[str, Counter]] = defaultdict(lambda: defaultdict(Counter))
    for record in records:
        difficulty = record.difficulty or "unknown"
        category = record.category or "uncategorized"
        mapping[record.target_agent][difficulty][category] += 1
    return mapping


def difficulty_token_correlation(records: Iterable[TrainingExample]) -> Dict[str, float]:
    per_agent: Dict[str, List[Tuple[int, int]]] = defaultdict(list)
    for record in records:
        difficulty_idx = DIFFICULTY_ORDER.get(record.difficulty or "", 0)
        if difficulty_idx:
            per_agent[record.target_agent].append((difficulty_idx, record.token_count))

    correlations: Dict[str, float] = {}
    for agent, samples in per_agent.items():
        if len(samples) < 10:
            continue
        difficulties, tokens = zip(*samples)
        correlation = np.corrcoef(difficulties, tokens)[0, 1]
        correlations[agent] = float(correlation)
    return correlations


def build_report(
    records: List[TrainingExample],
    output_path: Path,
) -> str:
    total_examples = len(records)
    category_dist = agent_category_distribution(records)
    source_dist = agent_source_distribution(records)
    difficulty_map = difficulty_category_map(records)
    correlations = difficulty_token_correlation(records)

    specialization_findings = []
    for agent, categories in category_dist.items():
        total = sum(categories.values())
        dominant_category, dominant_count = categories.most_common(1)[0]
        dominant_share = dominant_count / total if total else 0.0
        status = "✅ Balanced"
        note = f"{len(categories)} task types"
        if dominant_share > MAX_CATEGORY_SHARE:
            status = "⚠️ Bias detected"
            note = f"'{dominant_category}' {dominant_share:.0%} of data"
        specialization_findings.append((agent, status, note, categories))

    source_findings = []
    for agent, sources in source_dist.items():
        unique_sources = len(sources)
        top_sources = ", ".join(
            f"{name} ({count})" for name, count in sources.most_common(3)
        )
        status = "✅ Good"
        if unique_sources < MIN_SOURCE_DIVERSITY:
            status = "⚠️ Needs attention"
        source_findings.append(
            (agent, status, unique_sources, top_sources or "N/A")
        )

    hard_findings = []
    for agent, diff_map in difficulty_map.items():
        hard_categories = diff_map.get("hard", {})
        status = "✅ Diverse"
        note = f"{len(hard_categories)} categories"
        if hard_categories and len(hard_categories) < MIN_HARD_CATEGORY_COUNT:
            status = "⚠️ Concentrated"
            note = f"Hard tasks cover {len(hard_categories)} categories (<{MIN_HARD_CATEGORY_COUNT})"
        hard_findings.append((agent, status, note))

    correlation_findings = []
    for agent, corr in correlations.items():
        status = "✅ Acceptable"
        note = f"{corr:.2f}"
        if abs(corr) > MAX_DIFFICULTY_CORRELATION:
            status = "⚠️ High correlation"
        correlation_findings.append((agent, status, note))

    lines = [
        "# Bias Analysis Report",
        "",
        f"**Date:** {datetime.utcnow():%Y-%m-%d %H:%M UTC}",
        f"**Dataset Size:** {total_examples:,} examples",
        "",
        "## Agent Specialization Analysis",
        "",
        "| Agent | Status | Notes | Top Task Types |",
        "|-------|--------|-------|----------------|",
    ]
    for agent, status, note, categories in sorted(specialization_findings):
        top = ", ".join(
            f"{name} ({count})"
            for name, count in categories.most_common(4)
        )
        lines.append(f"| {agent} | {status} | {note} | {top or 'N/A'} |")

    lines.extend(
        [
            "",
            "## Cross-Agent Source Diversity",
            "",
            "| Agent | Status | Unique Sources | Top 3 Sources |",
            "|-------|--------|----------------|---------------|",
        ]
    )
    for agent, status, unique_sources, top_sources in sorted(source_findings):
        lines.append(f"| {agent} | {status} | {unique_sources} | {top_sources} |")

    lines.extend(
        [
            "",
            "## Hard Difficulty Coverage",
            "",
            "| Agent | Status | Notes |",
            "|-------|--------|-------|",
        ]
    )
    for agent, status, note in sorted(hard_findings):
        lines.append(f"| {agent} | {status} | {note} |")

    lines.extend(
        [
            "",
            "## Difficulty vs. Token Length Correlation",
            "",
            "| Agent | Status | Correlation |",
            "|-------|--------|-------------|",
        ]
    )
    for agent, status, note in sorted(correlation_findings):
        lines.append(f"| {agent} | {status} | {note} |")

    lines.extend(
        [
            "",
            "## Recommendations",
            "",
            "1. Reduce dominant categories where status indicates bias above.",
            "2. Expand cross-agent sampling for agents with <5 unique sources.",
            "3. Add variety to hard-difficulty scenarios that only span a handful of categories.",
            "4. Review prompt templates if token length tracks difficulty too closely.",
        ]
    )

    report = "\n".join(lines)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    return report


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    records = load_examples(args.input_dir)
    build_report(records, args.output_report)
    print(f"✅ Bias analysis complete. Report written to {args.output_report}")


if __name__ == "__main__":
    main()
