#!/usr/bin/env python3
"""
Genesis 100 Real Execution Tests - Runner Script
================================================

This script runs the comprehensive 100-test suite with:
- 50 Weakness-focused tests (W01-W50)
- 50 Website generation tests (G01-G50)

All tests use REAL execution with:
- Acontext memory persistence
- Ring-1T multi-turn reasoning
- SE-Darwin multi-trajectory evolution
- Genesis Meta Agent oversight

Progressive difficulty: Easy -> Medium -> Hard -> Extreme

Usage:
    python run_genesis_100_real_tests.py                    # Run all tests
    python run_genesis_100_real_tests.py --weakness-only    # Run only weakness tests
    python run_genesis_100_real_tests.py --generation-only  # Run only generation tests
    python run_genesis_100_real_tests.py --output results.json
"""

import asyncio
import sys
import os
import argparse
from pathlib import Path
from datetime import datetime

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Set up environment
os.environ.setdefault("PYTHONPATH", str(PROJECT_ROOT))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

from tests.genesis_100_real_execution_tests import run_all_tests, run_weakness_tests, run_generation_tests, integrations


async def main():
    parser = argparse.ArgumentParser(
        description="Genesis 100 Real Execution Tests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Test Categories:
  W01-W10: Routing Execution (Easy-Medium)
  W11-W20: Multi-turn Context (Medium)
  W21-W30: Error Recovery (Medium-Hard)
  W31-W40: Output Validation (Hard)
  W41-W50: Multi-Agent Coordination (Hard-Extreme)

  G01-G10: Landing Page Generation (Easy-Medium)
  G11-G20: SaaS Dashboard Generation (Medium-Hard)
  G21-G30: E-commerce Site Generation (Hard-Extreme)
  G31-G40: Full-stack App Generation (Hard-Extreme)
  G41-G50: Complex Architecture Generation (Extreme)

Integrations:
  - Acontext: Memory persistence across sessions
  - Ring-1T: Multi-turn reasoning for complex problems
  - SE-Darwin: Multi-trajectory evolution
  - Genesis Meta Agent: Orchestration and oversight
        """
    )

    parser.add_argument(
        "--output", "-o",
        default=f"tests/genesis_100_real_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        help="Output file for results (default: timestamped JSON)"
    )

    parser.add_argument(
        "--weakness-only", "-w",
        action="store_true",
        help="Run only weakness-focused tests (W01-W50)"
    )

    parser.add_argument(
        "--generation-only", "-g",
        action="store_true",
        help="Run only website generation tests (G01-G50)"
    )

    parser.add_argument(
        "--difficulty",
        choices=["easy", "medium", "hard", "extreme", "all"],
        default="all",
        help="Run only tests of specified difficulty"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List tests without executing them"
    )

    args = parser.parse_args()

    # Print banner
    print("=" * 70)
    print("   GENESIS 100 REAL EXECUTION TESTS")
    print("   No Stubs - Real LLM Calls - Production Agents")
    print("=" * 70)
    print()
    print(f"  Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Output File: {args.output}")
    print()

    if args.dry_run:
        print("DRY RUN MODE - Listing tests without execution")
        print()
        print("WEAKNESS TESTS (W01-W50):")
        print("  W01-W10: Routing Execution")
        print("  W11-W20: Multi-turn Context")
        print("  W21-W30: Error Recovery")
        print("  W31-W40: Output Validation")
        print("  W41-W50: Multi-Agent Coordination")
        print()
        print("GENERATION TESTS (G01-G50):")
        print("  G01-G10: Landing Page Generation")
        print("  G11-G20: SaaS Dashboard Generation")
        print("  G21-G30: E-commerce Site Generation")
        print("  G31-G40: Full-stack App Generation")
        print("  G41-G50: Complex Architecture Generation")
        return

    # Initialize integrations
    print("Initializing integrations...")
    await integrations.initialize()
    print()

    if args.weakness_only:
        print("[RUNNING] Weakness-Focused Tests Only (W01-W50)")
        results = await run_weakness_tests()
        passed = sum(1 for r in results if r.status == "passed")
        print(f"\nResults: {passed}/{len(results)} passed ({passed/len(results)*100:.1f}%)")

    elif args.generation_only:
        print("[RUNNING] Website Generation Tests Only (G01-G50)")
        results = await run_generation_tests()
        passed = sum(1 for r in results if r.status == "passed")
        print(f"\nResults: {passed}/{len(results)} passed ({passed/len(results)*100:.1f}%)")

    else:
        # Run all tests
        result = await run_all_tests(output_file=args.output)

        # Final summary
        print()
        print("=" * 70)
        print("   FINAL RESULTS")
        print("=" * 70)
        print(f"   Total Tests: {result.total_tests}")
        print(f"   Passed: {result.passed} ({result.passed/result.total_tests*100:.1f}%)")
        print(f"   Failed: {result.failed} ({result.failed/result.total_tests*100:.1f}%)")
        print(f"   Errors: {result.errors} ({result.errors/result.total_tests*100:.1f}%)")
        print(f"   Duration: {result.duration_seconds:.2f} seconds")
        print()
        print("   By Difficulty:")
        for diff, stats in result.by_difficulty.items():
            print(f"     {diff.upper():8s}: {stats['passed']:2d}/{stats['total']:2d} passed ({stats['pass_rate']})")
        print()
        print(f"   Results saved to: {args.output}")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
