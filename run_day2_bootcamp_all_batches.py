"""
Day 2 Bootcamp - Run All Batches (Batch 1-6, 600 Tests Total)
Genesis + 11 Agents: Website Building & Running Focus

Usage:
    python run_day2_bootcamp_all_batches.py                    # Run all 6 batches
    python run_day2_bootcamp_all_batches.py --batch 2          # Run only batch 2
    python run_day2_bootcamp_all_batches.py --quick            # Quick run: 5 per difficulty
    python run_day2_bootcamp_all_batches.py --batch 3 --quick  # Quick run batch 3
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from run_day2_bootcamp import Day2BootcampRunner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("bootcamp_all_batches")

# Batch configurations
BATCH_CONFIGS = {
    1: {"yaml": "tests/day2_bootcamp_scenarios.yaml", "output": "data/bootcamp_results/batch1"},
    2: {"yaml": "tests/day2_bootcamp_batch2.yaml", "output": "data/bootcamp_results/batch2"},
    3: {"yaml": "tests/day2_bootcamp_batch3.yaml", "output": "data/bootcamp_results/batch3"},
    4: {"yaml": "tests/day2_bootcamp_batch4.yaml", "output": "data/bootcamp_results/batch4"},
    5: {"yaml": "tests/day2_bootcamp_batch5.yaml", "output": "data/bootcamp_results/batch5"},
    6: {"yaml": "tests/day2_bootcamp_batch6.yaml", "output": "data/bootcamp_results/batch6"},
}


async def run_batch(batch_num: int, max_per_difficulty: int = 25, use_llm: bool = True) -> dict:
    """Run a single batch of tests."""
    if batch_num not in BATCH_CONFIGS:
        logger.error(f"Invalid batch number: {batch_num}. Must be 1-6.")
        return {}

    config = BATCH_CONFIGS[batch_num]
    yaml_path = config["yaml"]
    output_dir = config["output"]

    # Check if YAML exists
    if not Path(yaml_path).exists():
        logger.error(f"Batch {batch_num} YAML not found: {yaml_path}")
        return {}

    logger.info(f"\n{'='*70}")
    logger.info(f"  BATCH {batch_num}: Starting 100 Test Challenge")
    logger.info(f"  Scenarios: {yaml_path}")
    logger.info(f"  Output: {output_dir}")
    logger.info(f"{'='*70}")

    # Create runner
    runner = Day2BootcampRunner(
        scenarios_path=yaml_path,
        output_dir=output_dir,
        use_llm=use_llm,
    )

    # Run all tests
    results = await runner.run_full_bootcamp(max_per_difficulty=max_per_difficulty)
    return results


async def run_all_batches(
    batches: list = None,
    max_per_difficulty: int = 25,
    use_llm: bool = True
) -> dict:
    """Run multiple batches of tests."""
    if batches is None:
        batches = [1, 2, 3, 4, 5, 6]

    all_results = {
        "total_tests": 0,
        "total_passed": 0,
        "total_reward": 0.0,
        "total_max_reward": 0.0,
        "batches": {},
    }

    for batch_num in batches:
        results = await run_batch(batch_num, max_per_difficulty, use_llm)

        if results:
            all_results["batches"][batch_num] = {
                "passed": results.passed,
                "total": results.total_tests,
                "reward": results.total_reward,
                "max_reward": results.max_possible_reward,
            }
            all_results["total_tests"] += results.total_tests
            all_results["total_passed"] += results.passed
            all_results["total_reward"] += results.total_reward
            all_results["total_max_reward"] += results.max_possible_reward

    # Print summary
    logger.info(f"\n{'='*70}")
    logger.info(f"  ALL BATCHES COMPLETE")
    logger.info(f"{'='*70}")
    logger.info(f"  Total Tests: {all_results['total_tests']}")
    logger.info(f"  Total Passed: {all_results['total_passed']}")
    if all_results["total_tests"] > 0:
        pass_rate = (all_results["total_passed"] / all_results["total_tests"]) * 100
        logger.info(f"  Pass Rate: {pass_rate:.1f}%")
    logger.info(f"  Total Reward: {all_results['total_reward']:.2f}/{all_results['total_max_reward']:.2f}")

    # Save combined results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = Path("data/bootcamp_results") / f"all_batches_{timestamp}.json"
    results_file.parent.mkdir(parents=True, exist_ok=True)
    with open(results_file, "w") as f:
        json.dump(all_results, f, indent=2)
    logger.info(f"  Combined results saved: {results_file}")

    return all_results


async def main():
    parser = argparse.ArgumentParser(description="Day 2 Bootcamp - All Batches")
    parser.add_argument("--batch", type=int, help="Run specific batch (1-6)")
    parser.add_argument("--batches", type=str, help="Run specific batches (comma-separated, e.g., '2,3,4')")
    parser.add_argument("--quick", action="store_true", help="Quick run: 5 tests per difficulty")
    parser.add_argument("--max-tests", type=int, default=25, help="Max tests per difficulty")
    parser.add_argument("--no-llm", action="store_true", help="Run without LLM (simulated)")
    args = parser.parse_args()

    max_per_difficulty = 5 if args.quick else args.max_tests
    use_llm = not args.no_llm

    if args.batch:
        await run_batch(args.batch, max_per_difficulty, use_llm)
    elif args.batches:
        batches = [int(b.strip()) for b in args.batches.split(",")]
        await run_all_batches(batches, max_per_difficulty, use_llm)
    else:
        await run_all_batches(max_per_difficulty=max_per_difficulty, use_llm=use_llm)


if __name__ == "__main__":
    asyncio.run(main())
