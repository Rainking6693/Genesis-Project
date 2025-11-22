#!/usr/bin/env python3
"""
Generate CI Evaluation Report

Generates markdown report from evaluation results.

Usage:
    python scripts/generate_eval_report.py results.json
    python scripts/generate_eval_report.py results.json baseline/results.json > report.md
"""

import argparse
import json
import sys
from pathlib import Path
from dataclasses import dataclass

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ci_eval_harness import CIEvalHarness, EvaluationReport


def load_results(path: Path) -> EvaluationReport:
    """Load evaluation report from JSON"""
    with open(path, 'r') as f:
        data = json.load(f)

    report_dict = data.get("report", {})

    return EvaluationReport(**report_dict)


def main():
    parser = argparse.ArgumentParser(description="Generate CI Evaluation Report")
    parser.add_argument(
        "results",
        type=Path,
        help="Path to results JSON file"
    )
    parser.add_argument(
        "baseline",
        type=Path,
        nargs="?",
        help="Path to baseline results JSON (optional)"
    )

    args = parser.parse_args()

    # Check results file exists
    if not args.results.exists():
        print(f"⚠️ Error: Results file not found: {args.results}", file=sys.stderr)
        print()
        print("## CI Evaluation Report")
        print()
        print("⚠️ **Evaluation failed - Results file not found**")
        print()
        print("Please check the workflow logs for errors.")
        return 1

    # Load results
    try:
        report = load_results(args.results)
    except Exception as e:
        print(f"⚠️ Error loading results: {e}", file=sys.stderr)
        print()
        print("## CI Evaluation Report")
        print()
        print(f"⚠️ **Evaluation failed - Error loading results: {e}**")
        return 1

    # Generate markdown report
    harness = CIEvalHarness()
    markdown = harness.generate_markdown_report(report)

    # Add metadata
    timestamp_info = ""
    try:
        with open(args.results, 'r') as f:
            data = json.load(f)
            timestamp = data.get("timestamp", "Unknown")
            if timestamp != "Unknown":
                from datetime import datetime
                dt = datetime.fromtimestamp(timestamp)
                timestamp_info = f"\n*Generated: {dt.strftime('%Y-%m-%d %H:%M:%S UTC')}*\n"
    except:
        pass

    # Add baseline comparison note
    baseline_info = ""
    if args.baseline and args.baseline.exists():
        baseline_info = "\n*Compared against baseline from main branch*\n"
    elif report.regressions or report.improvements:
        baseline_info = "\n*Warning: Baseline results not found - regression detection may be incomplete*\n"

    # Print full report
    print(markdown)
    print(timestamp_info)
    print(baseline_info)

    # Add pass/fail indicator
    if report.regressions:
        print("\n---")
        print()
        print(f"❌ **CI Check: REGRESSIONS DETECTED** ({len(report.regressions)} regressions)")
        print()
        print("Please review the regressions above and:")
        print("1. Fix the performance issues, OR")
        print("2. If the changes are intentional, update the baseline")
    else:
        print("\n---")
        print()
        print(f"✅ **CI Check: PASSED** (Pass rate: {report.passed/report.total_scenarios*100:.1f}%)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
