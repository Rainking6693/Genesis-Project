#!/usr/bin/env python3
"""Generate descriptive statistics for ADP-formatted datasets."""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


def iter_adp_examples(path: Path) -> Iterable[dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def collect_files(input_path: Path) -> List[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted(input_path.glob("*_adp.jsonl"))
    raise FileNotFoundError(f"Input path {input_path} does not exist")


def compute_statistics(files: List[Path]) -> Dict[str, object]:
    difficulty_counts = Counter()
    category_counts = Counter()
    task_type_counts = Counter()
    agent_counts = Counter()
    complexity_by_agent: Dict[str, List[float]] = defaultdict(list)
    complexity_scores: List[float] = []
    reasoning_steps_by_agent: Dict[str, List[int]] = defaultdict(list)
    reasoning_steps_by_difficulty: Dict[str, List[int]] = defaultdict(list)
    tags_by_agent: Dict[str, set[str]] = defaultdict(set)
    context_lengths: List[int] = []

    total_examples = 0

    for file_path in files:
        for example in iter_adp_examples(file_path):
            total_examples += 1
            content = example.get("content", [])
            observation = next((item for item in content if item.get("type") == "observation"), {})
            observation_text = observation.get("data", {}).get("content", "")
            context_lengths.append(len(observation_text.split()))

            action = next((item for item in content if item.get("type") == "action"), {})
            reasoning_steps = action.get("data", {}).get("reasoning_steps", [])

            extensions = example.get("genesis_extensions", {})
            difficulty = extensions.get("difficulty", "unknown")
            category = extensions.get("task_category", "unknown")
            task_type = extensions.get("task_type", "unknown")
            agent = extensions.get("agent_name", "unknown_agent")
            complexity = extensions.get("complexity_score")

            difficulty_counts[difficulty] += 1
            category_counts[category] += 1
            task_type_counts[task_type] += 1
            agent_counts[agent] += 1

            if isinstance(complexity, (int, float)):
                complexity_scores.append(float(complexity))
                complexity_by_agent[agent].append(float(complexity))

            step_count = len(reasoning_steps) if isinstance(reasoning_steps, list) else 0
            reasoning_steps_by_agent[agent].append(step_count)
            reasoning_steps_by_difficulty[difficulty].append(step_count)

            tags = example.get("details", {}).get("tags", [])
            if isinstance(tags, list):
                for tag in tags:
                    tags_by_agent[agent].add(str(tag).lower())

    tag_overlap = build_tag_overlap_matrix(tags_by_agent)

    return {
        "total_examples": total_examples,
        "difficulty_counts": difficulty_counts,
        "category_counts": category_counts,
        "task_type_counts": task_type_counts,
        "agent_counts": agent_counts,
        "complexity_scores": complexity_scores,
        "complexity_by_agent": complexity_by_agent,
        "reasoning_steps_by_agent": reasoning_steps_by_agent,
        "reasoning_steps_by_difficulty": reasoning_steps_by_difficulty,
        "tags_by_agent": tags_by_agent,
        "tag_overlap": tag_overlap,
        "context_lengths": context_lengths,
    }


def build_tag_overlap_matrix(tags_by_agent: Dict[str, set[str]]) -> Dict[Tuple[str, str], float]:
    overlap: Dict[Tuple[str, str], float] = {}
    agents = sorted(tags_by_agent)
    for i, agent_a in enumerate(agents):
        tags_a = tags_by_agent[agent_a]
        for agent_b in agents[i:]:
            tags_b = tags_by_agent[agent_b]
            if not tags_a and not tags_b:
                score = 1.0
            else:
                intersection = len(tags_a & tags_b)
                union = len(tags_a | tags_b) or 1
                score = intersection / union
            overlap[(agent_a, agent_b)] = score
            overlap[(agent_b, agent_a)] = score
    return overlap


def render_markdown(stats: Dict[str, object]) -> str:
    total = stats["total_examples"]
    difficulty_counts: Counter = stats["difficulty_counts"]
    category_counts: Counter = stats["category_counts"]
    task_type_counts: Counter = stats["task_type_counts"]
    agent_counts: Counter = stats["agent_counts"]
    complexity_scores: List[float] = stats["complexity_scores"]
    complexity_by_agent: Dict[str, List[float]] = stats["complexity_by_agent"]
    reasoning_steps_by_agent: Dict[str, List[int]] = stats["reasoning_steps_by_agent"]
    reasoning_steps_by_difficulty: Dict[str, List[int]] = stats["reasoning_steps_by_difficulty"]
    context_lengths: List[int] = stats["context_lengths"]
    tags_by_agent: Dict[str, set[str]] = stats["tags_by_agent"]
    tag_overlap: Dict[Tuple[str, str], float] = stats["tag_overlap"]

    lines: List[str] = []
    lines.append("# ADP Dataset Statistics")
    lines.append("")
    lines.append(f"Total examples analysed: **{total}**")
    lines.append("")

    lines.append("## Difficulty Distribution")
    lines.append("")
    lines.append("| Difficulty | Count | Percentage |")
    lines.append("|------------|-------|------------|")
    for difficulty, count in difficulty_counts.most_common():
        percentage = (count / total * 100) if total else 0
        lines.append(f"| {difficulty} | {count} | {percentage:.1f}% |")
    lines.append("")

    lines.append("## Task Category Coverage")
    lines.append("")
    for category, count in category_counts.most_common():
        lines.append(f"- **{category}**: {count}")
    lines.append("")

    lines.append("## Task Type Distribution")
    lines.append("")
    for task_type, count in task_type_counts.most_common():
        lines.append(f"- **{task_type}**: {count}")
    lines.append("")

    lines.append("## Complexity Score Summary")
    lines.append("")
    if complexity_scores:
        lines.append(f"- Mean: {statistics.mean(complexity_scores):.2f}")
        lines.append(f"- Median: {statistics.median(complexity_scores):.2f}")
        lines.append(f"- Min/Max: {min(complexity_scores):.2f} / {max(complexity_scores):.2f}")
    else:
        lines.append("No complexity scores available")
    lines.append("")

    lines.append("## Average Complexity by Agent")
    lines.append("")
    for agent, values in sorted(complexity_by_agent.items()):
        mean_value = statistics.mean(values) if values else float("nan")
        lines.append(f"- **{agent}**: {mean_value:.2f} (n={len(values)})")
    lines.append("")

    lines.append("## Reasoning Depth")
    lines.append("")
    lines.append("### By Agent")
    for agent, values in sorted(reasoning_steps_by_agent.items()):
        mean_value = statistics.mean(values) if values else 0
        lines.append(f"- **{agent}**: {mean_value:.2f} steps")
    lines.append("")
    lines.append("### By Difficulty")
    for difficulty, values in reasoning_steps_by_difficulty.items():
        mean_value = statistics.mean(values) if values else 0
        lines.append(f"- **{difficulty}**: {mean_value:.2f} steps")
    lines.append("")

    lines.append("## Tag Diversity")
    lines.append("")
    for agent, tags in sorted(tags_by_agent.items()):
        lines.append(f"- **{agent}**: {len(tags)} unique tags")
    lines.append("")

    lines.append("## Tag Overlap Matrix (Jaccard)")
    agents = sorted(tags_by_agent)
    if agents:
        header = "| Agent | " + " | ".join(agents) + " |"
        lines.append(header)
        lines.append("|" + "---|" * (len(agents) + 1))
        for agent_a in agents:
            row = [agent_a]
            for agent_b in agents:
                score = tag_overlap.get((agent_a, agent_b), 0.0)
                row.append(f"{score:.2f}")
            lines.append("| " + " | ".join(row) + " |")
    else:
        lines.append("No tag information available.")
    lines.append("")

    lines.append("## Context Length Statistics")
    lines.append("")
    if context_lengths:
        lines.append(f"- Mean words: {statistics.mean(context_lengths):.1f}")
        lines.append(f"- Median words: {statistics.median(context_lengths):.1f}")
        lines.append(f"- Min/Max words: {min(context_lengths)} / {max(context_lengths)}")
    else:
        lines.append("No context information available.")

    return "\n".join(lines)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate ADP statistics")
    parser.add_argument("input_path", type=Path, help="ADP JSONL file or directory")
    parser.add_argument(
        "--output", type=Path, default=Path("reports/adp_statistics.md"), help="Markdown report path"
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    files = collect_files(args.input_path)
    if not files:
        raise SystemExit("No ADP files found for analysis")
    stats = compute_statistics(files)
    markdown = render_markdown(stats)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(markdown, encoding="utf-8")
    print(f"Statistics written to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
