#!/usr/bin/env python3
"""
Genesis 100 Comprehensive Tests Runner
======================================

Run 100 incrementally harder tests to improve Genesis agents.

Tests focus on identified weaknesses:
- Tier 1: routing (49%), execution (20%) - WEAK
- Tier 2: business_logic (58%) - NEEDS WORK
- Tier 4: multi_agent (0%), adversarial (0%), quality (0%) - CRITICAL

Usage:
    python run_genesis_100_tests.py                    # Run all 100 tests
    python run_genesis_100_tests.py --max 25          # Run first 25 tests
    python run_genesis_100_tests.py --difficulty EASY # Run only EASY tests
    python run_genesis_100_tests.py --quick           # Quick mode (5 per difficulty)
"""

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from tests.genesis_100_comprehensive_tests import (
    Genesis100Tests,
    Difficulty,
    print_report
)


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Run Genesis 100 comprehensive tests")
    parser.add_argument("--max", "-m", type=int, help="Max tests to run")
    parser.add_argument("--difficulty", "-d", choices=["EASY", "MEDIUM", "HARD", "VERY_HARD"],
                       help="Run specific difficulty only")
    parser.add_argument("--quick", "-q", action="store_true",
                       help="Quick mode: 5 tests per difficulty")
    parser.add_argument("--output", "-o", type=str, default="tests/genesis_100_results.json",
                       help="Output JSON file")

    args = parser.parse_args()

    print("=" * 70)
    print("GENESIS 100 COMPREHENSIVE TESTS")
    print("=" * 70)
    print("""
Weakness Focus Areas:
  - ROUTING (49% pass rate): Tests E01-E10, E25
  - EXECUTION (20% pass rate): Tests E11-E18
  - BUSINESS LOGIC (58%): Tests M36-M50
  - MULTI-AGENT (0%): Tests M26-M35, X76-X85
  - ADVERSARIAL (0%): Tests H51-H60, X86-X95
  - QUALITY (0%): Tests H71-H75
  - PRODUCTION (0%): Tests X96-X100

Test Distribution:
  EASY (1-25):      Basic routing + execution + SE-Darwin
  MEDIUM (26-50):   Multi-agent workflows + business logic
  HARD (51-75):     Adversarial + error recovery + quality
  VERY_HARD (76-100): Production chaos + stress tests
""")
    print("=" * 70)

    tester = Genesis100Tests()

    if args.quick:
        # Quick mode: 5 tests per difficulty
        print("\nRunning QUICK mode (5 tests per difficulty)...")
        for difficulty in Difficulty:
            await tester.run_difficulty(difficulty, max_tests=5)
    elif args.difficulty:
        difficulty = Difficulty[args.difficulty]
        print(f"\nRunning {args.difficulty} tests only...")
        await tester.run_difficulty(difficulty, args.max)
    else:
        print(f"\nRunning {'first ' + str(args.max) if args.max else 'all 100'} tests...")
        await tester.run_all(args.max)

    report = tester._generate_report()
    print_report(report)

    # Save results
    import json
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    print(f"\nResults saved to: {output_path}")

    # Print improvement recommendations
    print("\n" + "=" * 70)
    print("IMPROVEMENT RECOMMENDATIONS")
    print("=" * 70)

    weak_categories = [
        (cat, stats) for cat, stats in report.get("by_category", {}).items()
        if stats["pass_rate"] < 0.6
    ]

    if weak_categories:
        print("\nCritical Weaknesses:")
        for cat, stats in sorted(weak_categories, key=lambda x: x[1]["pass_rate"]):
            print(f"  - {cat}: {stats['pass_rate']:.0%} ({stats['passed']}/{stats['total']})")

        print("\nRecommended Actions:")
        for cat, _ in weak_categories:
            if cat == "routing":
                print("  1. Add route_task method to all agents")
            elif cat == "execution":
                print("  2. Implement actual method execution (not just routing)")
            elif cat == "multi_agent":
                print("  3. Add workflow coordination between agents")
            elif cat == "adversarial":
                print("  4. Add input validation and sanitization")
            elif cat == "business_logic":
                print("  5. Add constraint checking and validation")
            elif cat == "quality":
                print("  6. Implement output quality scoring")
            elif cat == "error_recovery":
                print("  7. Add graceful error handling")
    else:
        print("\nNo critical weaknesses! All categories above 60% pass rate.")


if __name__ == "__main__":
    asyncio.run(main())
