#!/usr/bin/env python3
"""
Genesis Incremental Training Runner
====================================

Run incrementally harder tests to identify and improve agent weaknesses.

Based on:
- better-agents: Agent Testing Pyramid (Unit -> Eval -> Simulation)
- agentmark: Type-safe prompt evaluation

Usage:
    python run_incremental_training.py                    # Run all tiers
    python run_incremental_training.py --tier 1          # Run Tier 1 only
    python run_incremental_training.py --tier 2 --max 5  # Run 5 Tier 2 tests
    python run_incremental_training.py --quick           # Quick test (3 per tier)
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from training.incremental_challenge_framework import (
    IncrementalChallengeFramework,
    Tier,
    print_report
)


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Run Genesis incremental training")
    parser.add_argument("--tier", "-t", type=int, choices=[1, 2, 3, 4],
                       help="Run specific tier only")
    parser.add_argument("--max", "-m", type=int, default=None,
                       help="Max challenges per tier")
    parser.add_argument("--quick", "-q", action="store_true",
                       help="Quick mode: 3 tests per tier")
    parser.add_argument("--output", "-o", type=str,
                       default="training/results/incremental_training.json",
                       help="Output JSON file")

    args = parser.parse_args()

    # Quick mode overrides max
    if args.quick:
        args.max = 3

    print("=" * 70)
    print("GENESIS INCREMENTAL TRAINING")
    print("=" * 70)
    print("""
Weakness Analysis (from better-agents & agentmark patterns):

1. ROUTING ONLY: Most agents only route, don't execute
2. NO CONVERSATION CONTEXT: Missing multi-turn handling
3. LIMITED ERROR RECOVERY: No graceful fallback on failures
4. NO OUTPUT VALIDATION: Results not schema-validated
5. WEAK MULTI-AGENT COORDINATION: Agents work in isolation
6. NO ADVERSARIAL HANDLING: No edge case tests
7. MISSING EVALUATION METRICS: No quality scoring

Training Tiers:
  Tier 1 (Basic):        90% pass threshold - routing & basic execution
  Tier 2 (Intermediate): 75% pass threshold - multi-agent & edge cases
  Tier 3 (Advanced):     60% pass threshold - error recovery & quality
  Tier 4 (Extreme):      40% pass threshold - production chaos
""")
    print("=" * 70)

    framework = IncrementalChallengeFramework()

    if args.tier:
        print(f"\nRunning Tier {args.tier} only...")
        reports = {args.tier: await framework.run_tier(Tier(args.tier), args.max)}
    else:
        print(f"\nRunning all tiers{' (quick mode)' if args.quick else ''}...")
        reports = await framework.run_all(args.max)

    print_report(reports)

    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Save results
    import json
    from datetime import datetime

    output_data = {
        "timestamp": datetime.now().isoformat(),
        "mode": "quick" if args.quick else "full",
        "max_per_tier": args.max,
        "tiers": {
            str(k): {
                "tier": v.tier,
                "total": v.total_challenges,
                "passed": v.passed,
                "failed": v.failed,
                "pass_rate": v.pass_rate,
                "average_score": v.average_score,
                "weaknesses": v.weaknesses
            }
            for k, v in reports.items()
        },
        "all_results": [
            {
                "id": r.challenge_id,
                "tier": r.tier,
                "category": r.category,
                "success": r.success,
                "score": r.score,
                "duration_ms": r.duration_ms,
                "error": r.error
            }
            for r in framework.results
        ]
    }

    output_path.write_text(json.dumps(output_data, indent=2))
    print(f"\nResults saved to: {output_path}")

    # Print improvement recommendations
    print("\n" + "=" * 70)
    print("IMPROVEMENT RECOMMENDATIONS")
    print("=" * 70)

    all_weaknesses = []
    for report in reports.values():
        all_weaknesses.extend(report.weaknesses)

    if all_weaknesses:
        print("\nIdentified Weaknesses:")
        for w in set(all_weaknesses):
            print(f"  - {w}")

        print("\nRecommended Actions:")
        print("  1. Add route_task to all agents (Tier 1 fix)")
        print("  2. Implement multi-agent workflow handlers (Tier 2 fix)")
        print("  3. Add input validation and sanitization (Tier 2 fix)")
        print("  4. Implement graceful error recovery (Tier 3 fix)")
        print("  5. Add output quality evaluation (Tier 3 fix)")
        print("  6. Implement resource throttling (Tier 4 fix)")
    else:
        print("\nNo critical weaknesses detected! Ready for production.")


if __name__ == "__main__":
    asyncio.run(main())
