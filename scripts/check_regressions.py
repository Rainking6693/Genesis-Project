#!/usr/bin/env python3
"""
Check for Regressions

Checks evaluation results for regressions and exits with code 1 if found.

Usage:
    python scripts/check_regressions.py results.json
    python scripts/check_regressions.py results.json --fail-on-regression
"""

import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Check for Regressions")
    parser.add_argument(
        "results",
        type=Path,
        help="Path to results JSON file"
    )
    parser.add_argument(
        "--fail-on-regression",
        action="store_true",
        help="Exit with code 1 if regressions detected"
    )

    args = parser.parse_args()

    # Check results file exists
    if not args.results.exists():
        print(f"⚠️ Error: Results file not found: {args.results}", file=sys.stderr)
        return 1

    # Load results
    try:
        with open(args.results, 'r') as f:
            data = json.load(f)

        report = data.get("report", {})
        regressions = report.get("regressions", [])

    except Exception as e:
        print(f"⚠️ Error loading results: {e}", file=sys.stderr)
        return 1

    # Check for regressions
    if regressions:
        print(f"❌ REGRESSIONS DETECTED: {len(regressions)}")
        print()

        for reg in regressions:
            print(f"  - {reg['scenario_id']}")
            print(f"    Metric: {reg['metric']}")
            print(f"    Baseline: {reg['baseline']:.3f}")
            print(f"    Current: {reg['current']:.3f}")
            print(f"    Change: {reg['change_percent']:.1f}%")
            print()

        if args.fail_on_regression:
            print("❌ CI Check FAILED due to regressions")
            return 1
        else:
            print("⚠️  Regressions detected but not failing (--fail-on-regression not set)")
            return 0

    else:
        print("✅ No regressions detected")
        return 0


if __name__ == "__main__":
    sys.exit(main())
