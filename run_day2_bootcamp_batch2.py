"""
Day 2 Bootcamp Runner - Batch 2: 100 Test Challenge
Genesis + 11 Agents: Advanced Website Building & Operations

This is Batch 2 of the Day 2 bootcamp with 100 new unique test scenarios.
Uses the same runner infrastructure as Batch 1 with different scenarios.

Usage:
    python run_day2_bootcamp_batch2.py                    # Run all 100 tests
    python run_day2_bootcamp_batch2.py --quick            # Quick run: 5 per difficulty
    python run_day2_bootcamp_batch2.py --difficulty easy  # Run only easy tests
"""

import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Import the main runner
from run_day2_bootcamp import Day2BootcampRunner, main as bootcamp_main
import argparse
import asyncio
import os


async def run_batch2():
    """Run Batch 2 bootcamp tests."""
    parser = argparse.ArgumentParser(description="Day 2 Bootcamp - Batch 2")
    parser.add_argument("--quick", action="store_true", help="Quick run: 5 tests per difficulty")
    parser.add_argument("--max-tests", type=int, default=25, help="Max tests per difficulty")
    parser.add_argument("--difficulty", choices=["easy", "intermediate", "hard", "extreme"],
                       help="Run only specific difficulty")
    parser.add_argument("--no-llm", action="store_true", help="Run without LLM (simulated responses)")
    args = parser.parse_args()

    max_per_difficulty = 5 if args.quick else args.max_tests

    # Create runner with batch 2 scenarios
    runner = Day2BootcampRunner(
        scenarios_path="tests/day2_bootcamp_batch2.yaml",
        output_dir="data/bootcamp_results/batch2",
        use_llm=not args.no_llm,
    )

    # Run tests
    if args.difficulty:
        results = await runner.run_difficulty(args.difficulty, max_tests=max_per_difficulty)
    else:
        results = await runner.run_all(max_per_difficulty=max_per_difficulty)

    return results


if __name__ == "__main__":
    asyncio.run(run_batch2())
