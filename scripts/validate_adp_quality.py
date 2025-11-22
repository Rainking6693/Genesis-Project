#!/usr/bin/env python3
"""Validate ADP-formatted datasets for schema and quality issues."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

DIFFICULTY_RANGES = {"easy": (3.0, 5.0), "medium": (5.0, 8.0), "hard": (8.0, 10.0)}
REQUIRED_AGENTS = {
    "qa_agent",
    "support_agent",
    "legal_agent",
    "analyst_agent",
    "content_agent",
    "builder_agent",
    "deploy_agent",
    "marketing_agent",
    "sales_agent",
    "finance_agent",
    "research_agent",
    "vision_agent",
    "se_darwin_agent",
    "memory_agent",
    "security_agent",
}


@dataclass
class ExampleStatus:
    schema_errors: List[str]
    quality_warnings: List[str]


def iter_adp_examples(path: Path) -> Iterable[dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON in {path}: {exc}")


def validate_example(example: dict, seen_ids: set[str]) -> ExampleStatus:
    schema_errors: List[str] = []
    quality_warnings: List[str] = []

    adp_id = example.get("id")
    if not isinstance(adp_id, str) or not adp_id:
        schema_errors.append("Missing or invalid id")
    elif adp_id in seen_ids:
        schema_errors.append("Duplicate id detected")
    else:
        seen_ids.add(adp_id)

    content = example.get("content")
    if not isinstance(content, list) or len(content) < 2:
        schema_errors.append("Content array missing or incomplete")
    else:
        prev_type = None
        for item in content:
            current_type = item.get("type")
            if prev_type == current_type:
                schema_errors.append("Content entries do not alternate observation/action")
                break
            prev_type = current_type

    details = example.get("details", {})
    if not isinstance(details, dict):
        schema_errors.append("Missing details object")
    else:
        tags = details.get("tags")
        if not isinstance(tags, list) or not 2 <= len(tags) <= 5:
            quality_warnings.append("Tags missing or outside 2-5 range")

    extensions = example.get("genesis_extensions", {})
    if not isinstance(extensions, dict):
        schema_errors.append("Missing genesis_extensions object")
    else:
        agent = extensions.get("agent_name")
        if agent not in REQUIRED_AGENTS:
            schema_errors.append("Unknown agent_name")
        difficulty = extensions.get("difficulty")
        if difficulty not in DIFFICULTY_RANGES:
            schema_errors.append("Invalid difficulty value")
        complexity = extensions.get("complexity_score")
        if isinstance(complexity, (int, float)) and difficulty in DIFFICULTY_RANGES:
            lower, upper = DIFFICULTY_RANGES[difficulty]
            if not (lower <= complexity <= upper):
                quality_warnings.append(
                    f"Complexity score {complexity} outside expected range {lower}-{upper}"
                )
        else:
            quality_warnings.append("Missing or invalid complexity_score")
        estimated = extensions.get("estimated_time_minutes")
        if not isinstance(estimated, (int, float)) or estimated <= 0:
            quality_warnings.append("Missing or invalid estimated_time_minutes")

    action = next((item for item in (content or []) if item.get("type") == "action"), None)
    if not isinstance(action, dict):
        schema_errors.append("Missing action entry in content")
    else:
        data_section = action.get("data", {})
        reasoning_steps = data_section.get("reasoning_steps", [])
        if not isinstance(reasoning_steps, list) or len(reasoning_steps) < 3:
            quality_warnings.append("Reasoning steps fewer than 3")
        actions = data_section.get("actions", [])
        if not isinstance(actions, list) or not actions:
            quality_warnings.append("Actions list missing or empty")

    return ExampleStatus(schema_errors, quality_warnings)


def validate_files(files: List[Path]) -> Tuple[Dict[str, Counter], Counter, Counter, int]:
    per_agent: Dict[str, Counter] = defaultdict(Counter)
    schema_issues = Counter()
    quality_warnings = Counter()
    total_examples = 0

    for file_path in files:
        seen_ids: set[str] = set()
        for example in iter_adp_examples(file_path):
            total_examples += 1
            extensions = example.get("genesis_extensions", {})
            agent = extensions.get("agent_name", "unknown_agent")
            status = validate_example(example, seen_ids)
            if status.schema_errors:
                schema_issues.update(status.schema_errors)
                per_agent[agent]["schema_failures"] += 1
            else:
                per_agent[agent]["schema_pass"] += 1
            if status.quality_warnings:
                quality_warnings.update(status.quality_warnings)
                per_agent[agent]["quality_warnings"] += 1
            else:
                per_agent[agent]["quality_pass"] += 1
    return per_agent, schema_issues, quality_warnings, total_examples


def collect_files(input_path: Path) -> List[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted(input_path.glob("*_adp.jsonl"))
    raise FileNotFoundError(f"Input path {input_path} does not exist")


def render_report(
    per_agent: Dict[str, Counter],
    schema_issues: Counter,
    quality_warnings: Counter,
    total_examples: int,
) -> str:
    lines: List[str] = []
    lines.append("=== ADP Validation Report ===")
    lines.append(f"Total examples: {total_examples}")
    schema_failures = sum(schema_issues.values())
    quality_counts = sum(quality_warnings.values())
    lines.append(f"Schema failures: {schema_failures}")
    lines.append(f"Quality warnings: {quality_counts}")
    lines.append("")

    if schema_issues:
        lines.append("Top schema issues:")
        for issue, count in schema_issues.most_common(10):
            lines.append(f"  - {issue}: {count}")
        lines.append("")

    if quality_warnings:
        lines.append("Top quality warnings:")
        for warn, count in quality_warnings.most_common(10):
            lines.append(f"  - {warn}: {count}")
        lines.append("")

    lines.append("Breakdown by agent:")
    for agent, counts in sorted(per_agent.items()):
        total = counts.get("schema_pass", 0) + counts.get("schema_failures", 0)
        lines.append(f"- {agent}: {total} examples")
        schema_fail = counts.get("schema_failures", 0)
        if schema_fail:
            lines.append(f"  • Schema failures: {schema_fail}")
        warnings = counts.get("quality_warnings", 0)
        if warnings:
            lines.append(f"  • Quality warnings: {warnings}")
    return "\n".join(lines)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate ADP-format datasets")
    parser.add_argument("input_path", type=Path, help="ADP JSONL file or directory")
    parser.add_argument("--report", type=Path, help="Optional path to save the validation report")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    files = collect_files(args.input_path)
    if not files:
        raise SystemExit("No ADP files found to validate")
    per_agent, schema_issues, quality_warnings, total = validate_files(files)
    report = render_report(per_agent, schema_issues, quality_warnings, total)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(report, encoding="utf-8")
    print(report)
    return 0 if not schema_issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
