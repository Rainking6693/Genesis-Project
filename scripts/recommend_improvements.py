#!/usr/bin/env python3
"""
Training Data Improvement Recommendations
----------------------------------------

Consumes the audit and bias reports to generate an actionable follow-up plan.

Example:
    python scripts/recommend_improvements.py \
        --audit_report reports/training_quality_audit.md \
        --bias_report reports/bias_analysis.md \
        --output reports/improvement_recommendations.md
"""

from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))
from typing import Dict, List, Optional, Sequence


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate training data improvement plan.")
    parser.add_argument(
        "--audit_report",
        type=Path,
        required=True,
        help="Path to training_quality_audit.md.",
    )
    parser.add_argument(
        "--bias_report",
        type=Path,
        required=True,
        help="Path to bias_analysis.md.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Destination markdown file for recommendations.",
    )
    return parser.parse_args(argv)


def load_markdown(path: Path) -> List[str]:
    if not path.exists():
        raise FileNotFoundError(f"Unable to locate {path}")
    return path.read_text(encoding="utf-8").splitlines()


def extract_audit_metrics(lines: List[str]) -> Dict[str, int]:
    metrics: Dict[str, int] = {}

    duplicate_match = next(
        (line for line in lines if line.strip().startswith("- Duplicate check:")), ""
    )
    if duplicate_match:
        exact = re.search(r"(\d+)\s+exact", duplicate_match)
        near = re.search(r"(\d+)\s+near pairs", duplicate_match)
        metrics["duplicate_groups"] = int(exact.group(1)) if exact else 0
        metrics["near_pairs"] = int(near.group(1)) if near else 0

    content_match = next(
        (line for line in lines if line.strip().startswith("- Content warnings:")), ""
    )
    if content_match:
        short = re.search(r"(\d+)\s+short", content_match)
        long_ = re.search(r"(\d+)\s+long", content_match)
        punct = re.search(r"(\d+)\s+punctuation", content_match)
        pii = re.search(r"PII hits\s+(\{.*\})", content_match)
        metrics["short_examples"] = int(short.group(1)) if short else 0
        metrics["long_examples"] = int(long_.group(1)) if long_ else 0
        metrics["punctuation_warnings"] = int(punct.group(1)) if punct else 0
        metrics["pii_hits"] = pii.group(1) if pii else "{}"

    mismatch_lines = [
        line for line in lines if "Weight mismatch" in line or "Native ratio" in line
    ]
    metrics["weight_issue_count"] = len(mismatch_lines)
    return metrics


def parse_table(lines: List[str], header: str) -> Dict[str, Dict[str, str]]:
    results: Dict[str, Dict[str, str]] = {}
    in_section = False
    for line in lines:
        if line.strip() == header:
            in_section = True
            continue
        if in_section and (line.startswith("## ") or not line.strip()):
            if line.startswith("## "):
                in_section = False
            continue
        if in_section and line.startswith("|") and not line.startswith("| Agent"):
            cells = [cell.strip() for cell in line.split("|")[1:-1]]
            if len(cells) >= 4:
                agent, status, notes, extra = cells[:4]
                results[agent] = {"status": status, "notes": notes, "extra": extra}
            elif len(cells) >= 3:
                agent, status, notes = cells[:3]
                results[agent] = {"status": status, "notes": notes, "extra": ""}
    return results


def build_recommendations(
    audit_metrics: Dict[str, int],
    specialization: Dict[str, Dict[str, str]],
    sources: Dict[str, Dict[str, str]],
    hard_coverage: Dict[str, Dict[str, str]],
    correlations: Dict[str, Dict[str, str]],
) -> str:
    priority_actions: List[str] = []
    follow_up_actions: List[str] = []

    if audit_metrics.get("duplicate_groups", 0) > 0:
        priority_actions.append(
            f"Remove {audit_metrics['duplicate_groups']} exact duplicate groups before fine-tuning."
        )
    if audit_metrics.get("short_examples", 0) > 0:
        priority_actions.append(
            f"Filter {audit_metrics['short_examples']} examples below the {audit_metrics.get('short_threshold', 50)}-token minimum."
        )
    if audit_metrics.get("pii_hits", "{}") not in ("{}", ""):
        priority_actions.append(
            f"Scrub PII from examples flagged in audit (counts: {audit_metrics['pii_hits']})."
        )
    if audit_metrics.get("weight_issue_count", 0):
        follow_up_actions.append(
            "Reconcile weight mismatches with the compatibility matrix (see audit findings)."
        )

    def collect_agents(report: Dict[str, Dict[str, str]], warning_label: str) -> List[str]:
        flagged = [
            f"{agent} ({info['notes']})"
            for agent, info in report.items()
            if warning_label in info.get("status", "")
        ]
        return flagged

    specialization_bias = collect_agents(specialization, "⚠️")
    if specialization_bias:
        follow_up_actions.append(
            "Add diversified task templates for: " + ", ".join(specialization_bias)
        )

    source_bias = collect_agents(sources, "⚠️")
    if source_bias:
        follow_up_actions.append(
            "Increase cross-agent mixing (target ≥5 sources) for: " + ", ".join(source_bias)
        )

    hard_bias = collect_agents(hard_coverage, "⚠️")
    if hard_bias:
        follow_up_actions.append(
            "Expand hard-difficulty coverage (≥3 categories) for: " + ", ".join(hard_bias)
        )

    correlation_bias = collect_agents(correlations, "⚠️")
    if correlation_bias:
        follow_up_actions.append(
            "Review prompt structure where difficulty correlates with length: " + ", ".join(correlation_bias)
        )

    report_lines = [
        "# Training Data Improvement Recommendations",
        "",
        f"**Date:** {datetime.utcnow():%Y-%m-%d %H:%M UTC}",
        "",
        "## Priority Actions (Week 2)",
    ]
    if priority_actions:
        report_lines.extend(f"- {item}" for item in priority_actions)
    else:
        report_lines.append("- No critical blockers detected.")

    report_lines.append("")
    report_lines.append("## Follow-Up Actions (Week 3)")
    if follow_up_actions:
        report_lines.extend(f"- {item}" for item in follow_up_actions)
    else:
        report_lines.append("- Dataset distributions appear balanced.")

    report_lines.extend(
        [
            "",
            "## Next Steps",
            "1. Deduplicate and cleanse the corpus, then regenerate the audit report.",
            "2. Address flagged bias sections by adding or re-labeling examples.",
            "3. Re-run `detect_biases.py` to confirm the mitigations before fine-tuning.",
        ]
    )

    return "\n".join(report_lines)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    audit_lines = load_markdown(args.audit_report)
    bias_lines = load_markdown(args.bias_report)

    audit_metrics = extract_audit_metrics(audit_lines)
    specialization = parse_table(bias_lines, "## Agent Specialization Analysis")
    sources = parse_table(bias_lines, "## Cross-Agent Source Diversity")
    hard_coverage = parse_table(bias_lines, "## Hard Difficulty Coverage")
    correlations = parse_table(bias_lines, "## Difficulty vs. Token Length Correlation")

    report = build_recommendations(
        audit_metrics,
        specialization,
        sources,
        hard_coverage,
        correlations,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"✅ Recommendations written to {args.output}")


if __name__ == "__main__":
    main()
