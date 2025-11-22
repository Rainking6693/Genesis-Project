#!/usr/bin/env python3
"""
Training Data Quality Audit
---------------------------

Performs data quality checks for the Genesis Unsloth-format corpus.

Example:
    python scripts/audit_training_quality.py \
        --input_dir data/unsloth_format \
        --output_report reports/training_quality_audit.md \
        --check duplicates \
        --check weights \
        --check content \
        --check distributions
"""

from __future__ import annotations

import argparse
import collections
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))
from typing import Dict, List, Optional, Sequence, Set, Tuple

import pandas as pd

from scripts.training_data_utils import (
    SIMHASH_BITS,
    TrainingExample,
    hamming_distance,
    load_training_examples,
)

DEFAULT_CHECKS = ("duplicates", "weights", "content", "distributions")
TOKEN_LOWER_BOUND = 50
TOKEN_UPPER_BOUND = 2000
NEAR_DUPLICATE_THRESHOLD = 0.9
SIMHASH_BUCKET_PREFIX = 16
WEIGHT_TOLERANCE = 0.05
EXPECTED_NATIVE_COUNT = 1333
EXPECTED_TOTAL_PER_AGENT = 19995
EXPECTED_DIFFICULTY_SPLIT = {"easy": 0.30, "medium": 0.45, "hard": 0.25}
MAX_DIFFICULTY_DEVIATION = 0.10
MIN_CATEGORY_VARIETY = 5
MAX_CATEGORY_DOMINANCE = 0.40


@dataclass
class AuditIssue:
    """Represents an issue discovered during the audit."""

    issue_type: str
    severity: str
    message: str
    example_refs: List[str] = field(default_factory=list)


def _normalize_agent_label(label: str) -> str:
    cleaned = label.strip().strip('*').lower()
    cleaned = cleaned.replace('agent', '').replace('se-darwin', 'se_darwin')
    cleaned = cleaned.replace('-', ' ').replace('/', ' ')
    cleaned = "_".join(part for part in cleaned.split() if part)
    if not cleaned:
        return 'unknown_agent'
    if not cleaned.endswith('agent'):
        cleaned = f"{cleaned}_agent"
    return cleaned


def load_compatibility_matrix(matrix_path: Path) -> pd.DataFrame:
    """Parse the compatibility matrix markdown table into a DataFrame."""

    lines = matrix_path.read_text(encoding='utf-8').splitlines()
    header_idx = next(
        (i for i, line in enumerate(lines) if 'Target ↓ / Source →' in line),
        None,
    )
    if header_idx is None:
        raise ValueError('Could not locate compatibility matrix table in markdown')

    header_line = lines[header_idx]
    header_cells = [cell.strip() for cell in header_line.split('|')[1:-1]]
    source_labels = [_normalize_agent_label(cell) for cell in header_cells[1:]]

    data = {}
    row_idx = header_idx + 2  # skip separator row of hyphens
    while row_idx < len(lines):
        line = lines[row_idx].strip()
        if not line.startswith('|'):
            break
        cells = [cell.strip() for cell in line.split('|')[1:-1]]
        if not cells or cells[0].startswith('-'):
            row_idx += 1
            continue
        row_label = _normalize_agent_label(cells[0])
        scores = {}
        for source, value in zip(source_labels, cells[1:]):
            value = value.replace('*', '').strip()
            if not value:
                continue
            try:
                scores[source] = float(value)
            except ValueError:
                continue
        data[row_label] = scores
        row_idx += 1

    matrix = pd.DataFrame.from_dict(data, orient='index', columns=source_labels, dtype=float)
    matrix = matrix.sort_index().sort_index(axis=1)
    for agent in matrix.index:
        if pd.isna(matrix.loc[agent, agent]):
            matrix.loc[agent, agent] = 1.0
    matrix = matrix.fillna(0.0)
    return matrix



class TrainingDataAuditor:
    """Runs data quality checks and summarizes findings."""

    def __init__(
        self,
        input_dir: Path,
        output_report: Path,
        checks: Sequence[str],
        matrix_path: Path,
    ) -> None:
        self.input_dir = input_dir
        self.output_report = output_report
        self.checks = set(checks)
        self.matrix = load_compatibility_matrix(matrix_path)
        self.records: List[TrainingExample] = []
        self.issues: List[AuditIssue] = []
        self.stats: Dict[str, dict] = {}

    # ------------------------------------------------------------------ #
    def load_examples(self) -> None:
        if not self.input_dir.exists():
            raise FileNotFoundError(f"Input directory {self.input_dir} does not exist")
        self.records = load_training_examples(self.input_dir)

    # ------------------------------------------------------------------ #
    def check_duplicates(self) -> None:
        exact_map: Dict[str, List[str]] = collections.defaultdict(list)
        for record in self.records:
            exact_map[record.message_fingerprint].append(record.example_id)

        exact_dupe_groups = {
            fp: ids for fp, ids in exact_map.items() if len(ids) > 1
        }
        for ids in exact_dupe_groups.values():
            self.issues.append(
                AuditIssue(
                    issue_type="duplicates",
                    severity="high",
                    message=f"Exact duplicate detected ({len(ids)} instances)",
                    example_refs=ids,
                )
            )

        buckets: Dict[int, List[TrainingExample]] = collections.defaultdict(list)
        prefix_shift = SIMHASH_BITS - SIMHASH_BUCKET_PREFIX
        near_pairs: Set[Tuple[str, str]] = set()

        for record in self.records:
            bucket = record.simhash >> prefix_shift
            for other in buckets[bucket]:
                distance = hamming_distance(record.simhash, other.simhash)
                similarity = 1 - distance / SIMHASH_BITS
                if similarity >= NEAR_DUPLICATE_THRESHOLD:
                    pair = tuple(sorted((record.example_id, other.example_id)))
                    if pair not in near_pairs:
                        near_pairs.add(pair)
                        self.issues.append(
                            AuditIssue(
                                issue_type="duplicates",
                                severity="medium",
                                message=f"Near duplicate pair ({similarity:.2f} similarity)",
                                example_refs=list(pair),
                            )
                        )
            buckets[bucket].append(record)

        duplicate_stats = {
            "total_examples": len(self.records),
            "exact_duplicate_groups": len(exact_dupe_groups),
            "exact_duplicate_instances": sum(len(ids) - 1 for ids in exact_dupe_groups.values()),
            "near_duplicate_pairs": len(near_pairs),
        }
        self.stats["duplicates"] = duplicate_stats

    # ------------------------------------------------------------------ #
    def check_weights(self) -> None:
        mismatches = 0
        deviations: List[float] = []
        low_weight_outliers = 0
        high_weight_outliers = 0
        native_counts: Dict[str, int] = collections.Counter()
        cross_counts: Dict[str, int] = collections.Counter()

        for record in self.records:
            target = record.target_agent
            source = record.source_agent
            if target in self.matrix.index and source in self.matrix.columns:
                expected = float(self.matrix.loc[target, source])
                deviation = abs(record.weight - expected)
                deviations.append(deviation)
                if deviation > WEIGHT_TOLERANCE:
                    mismatches += 1
                    self.issues.append(
                        AuditIssue(
                            issue_type="weights",
                            severity="medium",
                            message=(
                                f"Weight mismatch {target}←{source}: "
                                f"observed {record.weight:.2f}, expected {expected:.2f}"
                            ),
                            example_refs=[record.example_id],
                        )
                    )
            if record.weight < 0.2:
                low_weight_outliers += 1
            if record.weight > 1.0 + 1e-6:
                high_weight_outliers += 1
            if source == target:
                native_counts[target] += 1
            else:
                cross_counts[target] += 1

        mean_deviation = statistics.mean(deviations) if deviations else 0.0
        self.stats["weights"] = {
            "mismatched_examples": mismatches,
            "mean_absolute_deviation": mean_deviation,
            "low_weight_outliers": low_weight_outliers,
            "high_weight_outliers": high_weight_outliers,
            "native_counts": dict(native_counts),
            "cross_counts": dict(cross_counts),
        }

        for agent, count in native_counts.items():
            expected_ratio = EXPECTED_NATIVE_COUNT / EXPECTED_TOTAL_PER_AGENT
            total = count + cross_counts.get(agent, 0)
            if total == 0:
                continue
            actual_ratio = count / total
            if abs(actual_ratio - expected_ratio) > 0.10:
                self.issues.append(
                    AuditIssue(
                        issue_type="weights",
                        severity="low",
                        message=(
                            f"Native ratio for {agent} is {actual_ratio:.3f}, "
                            f"expected ~{expected_ratio:.3f}"
                        ),
                    )
                )

    # ------------------------------------------------------------------ #
    def check_content_quality(self) -> None:
        short_examples = []
        long_examples = []
        punctuation_warnings = []
        pii_examples: Dict[str, List[str]] = collections.defaultdict(list)

        for record in self.records:
            if record.token_count < TOKEN_LOWER_BOUND:
                short_examples.append(record.example_id)
            if record.token_count > TOKEN_UPPER_BOUND:
                long_examples.append(record.example_id)
            if not record.has_trailing_punctuation:
                punctuation_warnings.append(record.example_id)
            for pii_type, count in record.pii_hits.items():
                if count > 0:
                    pii_examples[pii_type].append(record.example_id)

        if short_examples:
            self.issues.append(
                AuditIssue(
                    issue_type="content",
                    severity="medium",
                    message=f"{len(short_examples)} examples below {TOKEN_LOWER_BOUND} token minimum",
                    example_refs=short_examples[:10],
                )
            )
        if long_examples:
            self.issues.append(
                AuditIssue(
                    issue_type="content",
                    severity="low",
                    message=f"{len(long_examples)} examples exceed {TOKEN_UPPER_BOUND} tokens",
                    example_refs=long_examples[:10],
                )
            )
        if punctuation_warnings:
            self.issues.append(
                AuditIssue(
                    issue_type="content",
                    severity="low",
                    message=f"{len(punctuation_warnings)} examples end without sentence punctuation",
                    example_refs=punctuation_warnings[:10],
                )
            )
        for pii_type, refs in pii_examples.items():
            self.issues.append(
                AuditIssue(
                    issue_type="content",
                    severity="high",
                    message=f"{len(refs)} examples contain {pii_type} patterns",
                    example_refs=refs[:10],
                )
            )

        self.stats["content"] = {
            "short_examples": len(short_examples),
            "long_examples": len(long_examples),
            "punctuation_warnings": len(punctuation_warnings),
            "pii_counts": {k: len(v) for k, v in pii_examples.items()},
        }

    # ------------------------------------------------------------------ #
    def check_distributions(self) -> None:
        difficulty_counts: Dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
        category_counts: Dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
        source_diversity: Dict[str, collections.Counter] = collections.defaultdict(collections.Counter)

        for record in self.records:
            difficulty_counts[record.target_agent][record.difficulty or "unknown"] += 1
            category_counts[record.target_agent][record.category or "uncategorized"] += 1
            source_diversity[record.target_agent][record.source_agent] += 1

        for agent, counts in difficulty_counts.items():
            total = sum(counts.values())
            if total == 0:
                continue
            for level, expected_ratio in EXPECTED_DIFFICULTY_SPLIT.items():
                observed = counts.get(level, 0) / total
                if abs(observed - expected_ratio) > MAX_DIFFICULTY_DEVIATION:
                    self.issues.append(
                        AuditIssue(
                            issue_type="distribution",
                            severity="medium",
                            message=f"{agent}: {level} at {observed:.2f} (target {expected_ratio:.2f})",
                        )
                    )

        for agent, counts in category_counts.items():
            total = sum(counts.values())
            unique_categories = len(counts)
            if unique_categories < MIN_CATEGORY_VARIETY:
                self.issues.append(
                    AuditIssue(
                        issue_type="distribution",
                        severity="low",
                        message=f"{agent}: only {unique_categories} categories (min {MIN_CATEGORY_VARIETY})",
                    )
                )
            for category, value in counts.items():
                share = value / total if total else 0.0
                if share > MAX_CATEGORY_DOMINANCE:
                    self.issues.append(
                        AuditIssue(
                            issue_type="distribution",
                            severity="low",
                            message=f"{agent}: '{category}' accounts for {share:.2f} (> {MAX_CATEGORY_DOMINANCE:.2f})",
                        )
                    )

        for agent, sources in source_diversity.items():
            if len(sources) < 5:
                self.issues.append(
                    AuditIssue(
                        issue_type="distribution",
                        severity="medium",
                        message=f"{agent}: receives data from only {len(sources)} source agents",
                    )
                )

        self.stats["distributions"] = {
            "difficulty_counts": {agent: dict(counter) for agent, counter in difficulty_counts.items()},
            "category_counts": {agent: dict(counter) for agent, counter in category_counts.items()},
            "source_diversity": {agent: dict(counter) for agent, counter in source_diversity.items()},
        }

    # ------------------------------------------------------------------ #
    def generate_report(self) -> str:
        total_examples = len(self.records)
        total_issues = len(self.issues)

        lines = [
            "# Training Data Quality Audit Report",
            "",
            f"**Date:** {datetime.utcnow():%Y-%m-%d %H:%M UTC}",
            f"**Dataset Size:** {total_examples:,} examples",
            f"**Checks Run:** {', '.join(sorted(self.checks))}",
            "",
            "## Executive Summary",
            f"- Total issues logged: {total_issues}",
        ]

        duplicate_stats = self.stats.get("duplicates", {})
        if duplicate_stats:
            lines.append(
                f"- Duplicate check: {duplicate_stats.get('exact_duplicate_groups', 0)} exact groups,"
                f" {duplicate_stats.get('near_duplicate_pairs', 0)} near pairs"
            )

        weight_stats = self.stats.get("weights", {})
        if weight_stats:
            lines.append(
                f"- Weight mismatches: {weight_stats.get('mismatched_examples', 0)} "
                f"(mean abs deviation {weight_stats.get('mean_absolute_deviation', 0):.3f})"
            )

        content_stats = self.stats.get("content", {})
        if content_stats:
            lines.append(
                f"- Content warnings: {content_stats.get('short_examples', 0)} short,"
                f" {content_stats.get('long_examples', 0)} long,"
                f" {content_stats.get('punctuation_warnings', 0)} punctuation,"
                f" PII hits {content_stats.get('pii_counts', {})}"
            )

        lines.append("")
        lines.append("## Detailed Findings")
        if not self.issues:
            lines.append("No issues detected. Dataset meets configured quality thresholds.")
        else:
            severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            sorted_issues = sorted(
                self.issues,
                key=lambda issue: (
                    issue.issue_type,
                    severity_rank.get(issue.severity, 4),
                ),
            )
            for issue in sorted_issues:
                refs = ", ".join(issue.example_refs) if issue.example_refs else "N/A"
                lines.append(
                    f"- **[{issue.severity.upper()}] {issue.issue_type}:** {issue.message} (examples: {refs})"
                )

        dist_stats = self.stats.get("distributions", {})
        difficulty_counts = dist_stats.get("difficulty_counts", {})
        if difficulty_counts:
            lines.append("")
            lines.append("## Difficulty Distribution")
            lines.append("")
            lines.append("| Agent | Easy | Medium | Hard | Unknown |")
            lines.append("|-------|------|--------|------|---------|")
            for agent, counts in sorted(difficulty_counts.items()):
                total = sum(counts.values()) or 1
                easy = counts.get("easy", 0) / total
                medium = counts.get("medium", 0) / total
                hard = counts.get("hard", 0) / total
                unknown = counts.get("unknown", 0) / total
                lines.append(
                    f"| {agent} | {easy:.2%} | {medium:.2%} | {hard:.2%} | {unknown:.2%} |"
                )

        category_counts = dist_stats.get("category_counts", {})
        if category_counts:
            lines.append("")
            lines.append("## Top Categories by Agent")
            lines.append("")
            lines.append("| Agent | Top Categories |")
            lines.append("|-------|----------------|")
            for agent, counts in sorted(category_counts.items()):
                top = ", ".join(
                    f"{category} ({count})"
                    for category, count in sorted(
                        counts.items(), key=lambda kv: kv[1], reverse=True
                    )[:5]
                )
                lines.append(f"| {agent} | {top or 'N/A'} |")

        if weight_stats:
            lines.append("")
            lines.append("## Weight Distribution Summary")
            lines.append(
                f"- Mean absolute deviation from compatibility matrix: {weight_stats.get('mean_absolute_deviation', 0):.4f}"
            )
            lines.append(f"- Native counts: {weight_stats.get('native_counts', {})}")
            lines.append(f"- Cross-agent counts: {weight_stats.get('cross_counts', {})}")

        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    def run(self) -> str:
        self.load_examples()
        if "duplicates" in self.checks:
            self.check_duplicates()
        if "weights" in self.checks:
            self.check_weights()
        if "content" in self.checks:
            self.check_content_quality()
        if "distributions" in self.checks:
            self.check_distributions()

        report = self.generate_report()
        self.output_report.parent.mkdir(parents=True, exist_ok=True)
        self.output_report.write_text(report, encoding="utf-8")
        return report


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit Genesis training data quality.")
    parser.add_argument(
        "--input_dir",
        type=Path,
        required=True,
        help="Directory containing Unsloth-format JSONL training files.",
    )
    parser.add_argument(
        "--output_report",
        type=Path,
        required=True,
        help="Markdown file to write the audit summary.",
    )
    parser.add_argument(
        "--check",
        action="append",
        dest="checks",
        choices=list(DEFAULT_CHECKS),
        help="Quality checks to run (may be passed multiple times). Defaults to all.",
    )
    parser.add_argument(
        "--matrix_file",
        type=Path,
        default=Path("docs/ADP_CROSS_AGENT_LEARNING_MATRIX.md"),
        help="Path to the compatibility matrix markdown.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    checks = args.checks or DEFAULT_CHECKS
    auditor = TrainingDataAuditor(
        input_dir=args.input_dir,
        output_report=args.output_report,
        checks=checks,
        matrix_path=args.matrix_file,
    )
    auditor.run()
    print(f"✅ Audit complete. Report written to {args.output_report}")


if __name__ == "__main__":
    main()
