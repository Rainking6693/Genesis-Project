#!/usr/bin/env python3
"""
Run CI Evaluation Harness

Executes full benchmark suite and saves results.

Usage:
    python scripts/run_eval_harness.py --output results.json
    python scripts/run_eval_harness.py --output results.json --baseline baseline/results.json --agents builder_agent deploy_agent
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ci_eval_harness import CIEvalHarness


async def main():
    parser = argparse.ArgumentParser(description="Run CI Evaluation Harness")
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Output path for results JSON"
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        help="Path to baseline results JSON (optional)"
    )
    parser.add_argument(
        "--agents",
        nargs="+",
        help="List of agent names to evaluate (default: all)"
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=5,
        help="Maximum concurrent scenario executions (default: 5)"
    )
    parser.add_argument(
        "--regression-threshold",
        type=float,
        default=0.05,
        help="Regression threshold (default: 0.05 = 5%%)"
    )

    args = parser.parse_args()

    # Handle "all" keyword
    agent_names = None
    if args.agents and "all" in args.agents:
        agent_names = None  # Use all agents
    elif args.agents:
        agent_names = args.agents

    # Initialize harness
    harness = CIEvalHarness(
        regression_threshold=args.regression_threshold,
        max_concurrent=args.max_concurrent
    )

    print(f"🚀 Starting CI Evaluation Harness...")
    print(f"   Output: {args.output}")
    print(f"   Baseline: {args.baseline or 'None'}")
    print(f"   Agents: {agent_names or 'All'}")
    print(f"   Max Concurrent: {args.max_concurrent}")
    print()

    # Run evaluation
    report = await harness.run_full_evaluation(
        agent_names=agent_names,
        baseline_results_path=args.baseline,
        output_path=args.output
    )

    # Print summary
    print()
    print("=" * 60)
    print("EVALUATION COMPLETE")
    print("=" * 60)
    print(f"Total Scenarios: {report.total_scenarios}")
    print(f"Passed: {report.passed} ({report.passed/report.total_scenarios*100:.1f}%)")
    print(f"Failed: {report.failed}")
    print(f"Avg Execution Time: {report.avg_execution_time_ms:.1f} ms")
    print(f"Avg Quality Score: {report.avg_quality_score:.3f}")
    print(f"Total Cost: ${report.total_cost_usd:.4f}")
    print()

    if report.regressions:
        print(f"⚠️  REGRESSIONS DETECTED: {len(report.regressions)}")
        for reg in report.regressions[:5]:  # Show first 5
            print(f"   - {reg['scenario_id']}: {reg['metric']} regressed by {abs(reg['change_percent']):.1f}%")
        if len(report.regressions) > 5:
            print(f"   ... and {len(report.regressions) - 5} more")
        print()

    if report.improvements:
        print(f"✅ IMPROVEMENTS: {len(report.improvements)}")
        for imp in report.improvements[:3]:  # Show first 3
            print(f"   - {imp['scenario_id']}: {imp['metric']} improved by {imp['change_percent']:.1f}%")
        if len(report.improvements) > 3:
            print(f"   ... and {len(report.improvements) - 3} more")
        print()

    print(f"📊 Results saved to: {args.output}")

    # Exit with code 0 (success) - regressions are reported but don't fail the run
    # check_regressions.py will handle failing the CI if needed
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
