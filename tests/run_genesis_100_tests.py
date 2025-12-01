"""
Test Runner for Genesis 100 Comprehensive Tests

Usage:
    python tests/run_genesis_100_tests.py                    # Run all tests
    python tests/run_genesis_100_tests.py --difficulty easy  # Run easy tests only
    python tests/run_genesis_100_tests.py --test-id E01      # Run specific test
    python tests/run_genesis_100_tests.py --no-stubs         # Fail on any stub detection
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import List, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tests.test_genesis_100_comprehensive import (
    GenesisTestRunner,
    ALL_TESTS,
    EASY_TESTS,
    INTERMEDIATE_TESTS,
    HARD_TESTS,
    HARDEST_TESTS,
    TOP_AGENT_ADVANCED_TESTS,
    ALL_AGENT_ADVANCED_TESTS,
    TOP_AGENT_EXPERT_TESTS,
    ALL_AGENT_EXPERT_TESTS,
    TestResult
)
from infrastructure.load_env import load_genesis_env

load_genesis_env()


async def run_tests(
    test_runner: GenesisTestRunner,
    test_list: List[dict],
    fail_on_stub: bool = False
) -> List[TestResult]:
    """Run a list of tests."""
    results = []
    
    for test_def in test_list:
        print(f"\n{'='*80}")
        print(f"Running {test_def['id']}: {test_def['name']} ({test_def['difficulty']})")
        print(f"{'='*80}")
        
        try:
            result = await test_runner.run_test(
                test_id=test_def["id"],
                name=test_def["name"],
                difficulty=test_def["difficulty"],
                agents=test_def["agents"],
                task=test_def["task"],
                method=test_def.get("method"),
                inputs=test_def.get("inputs")
            )
            
            results.append(result)
            
            # Print result (use ASCII-safe characters for Windows)
            status_icon = "[PASS]" if result.status == "passed" else "[FAIL]"
            print(f"{status_icon} {result.status.upper()}")
            print(f"   Duration: {result.duration_ms:.2f}ms")
            print(f"   Agents: {', '.join(result.agents_used)}")
            
            if result.se_darwin_improvement is not None:
                print(f"   SE-Darwin improvement: {result.se_darwin_improvement:.2%}")
            
            if result.error_message:
                print(f"   Error: {result.error_message}")
            
            if result.is_stub or result.status == "stub_detected":
                print(f"   [WARNING] STUB DETECTED!")
                if fail_on_stub:
                    print(f"   FAILING TEST DUE TO STUB DETECTION")
                    result.status = "failed"
            
        except Exception as e:
            print(f"[ERROR] {e}")
            results.append(TestResult(
                test_id=test_def["id"],
                name=test_def["name"],
                difficulty=test_def["difficulty"],
                status="error",
                duration_ms=0.0,
                agents_used=test_def["agents"],
                error_message=str(e)
            ))
    
    return results


def print_summary(results: List[TestResult]):
    """Print test summary."""
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")
    
    total = len(results)
    passed = sum(1 for r in results if r.status == "passed")
    failed = sum(1 for r in results if r.status == "failed")
    errors = sum(1 for r in results if r.status == "error")
    stubs = sum(1 for r in results if r.is_stub or r.status == "stub_detected")
    
    print(f"Total: {total}")
    print(f"[PASS] Passed: {passed} ({passed/total*100:.1f}%)")
    print(f"[FAIL] Failed: {failed} ({failed/total*100:.1f}%)")
    print(f"[ERROR] Errors: {errors} ({errors/total*100:.1f}%)")
    print(f"[STUB] Stubs: {stubs} ({stubs/total*100:.1f}%)")
    
    # Group by difficulty
    print(f"\nBy Difficulty:")
    for difficulty in ["easy", "intermediate", "hard", "hardest", "advanced", "expert"]:
        diff_results = [r for r in results if r.difficulty == difficulty]
        if diff_results:
            diff_passed = sum(1 for r in diff_results if r.status == "passed")
            print(f"  {difficulty.capitalize()}: {diff_passed}/{len(diff_results)} passed")
    
    # SE-Darwin improvements
    se_improvements = [r.se_darwin_improvement for r in results if r.se_darwin_improvement is not None]
    if se_improvements:
        avg_improvement = sum(se_improvements) / len(se_improvements)
        max_improvement = max(se_improvements)
        print(f"\nSE-Darwin Optimizations:")
        print(f"  Optimizations: {len(se_improvements)}/{total}")
        print(f"  Average improvement: {avg_improvement:.2%}")
        print(f"  Max improvement: {max_improvement:.2%}")
    
    # Failed tests
    failed_tests = [r for r in results if r.status != "passed"]
    if failed_tests:
        print(f"\nFailed Tests:")
        for result in failed_tests:
            print(f"  {result.test_id}: {result.name}")
            if result.error_message:
                print(f"    Error: {result.error_message}")


async def main():
    parser = argparse.ArgumentParser(description="Run Genesis 500 comprehensive tests")
    parser.add_argument("--difficulty", choices=["easy", "intermediate", "hard", "hardest", "advanced", "expert", "all"],
                       default="all", help="Test difficulty level")
    parser.add_argument("--agent-type", choices=["top", "all", "mixed"],
                       help="Agent type filter (top agents, all agents, or mixed)")
    parser.add_argument("--test-id", help="Run specific test by ID")
    parser.add_argument("--no-stubs", action="store_true", help="Fail on any stub detection")
    parser.add_argument("--output", help="Output JSON results file")
    
    args = parser.parse_args()
    
    # Select tests
    if args.test_id:
        test_list = [t for t in ALL_TESTS if t["id"] == args.test_id]
        if not test_list:
            print(f"Test {args.test_id} not found")
            return
    else:
        # Filter by difficulty
        if args.difficulty == "all":
            test_list = ALL_TESTS
        elif args.difficulty == "easy":
            test_list = EASY_TESTS
        elif args.difficulty == "intermediate":
            test_list = INTERMEDIATE_TESTS
        elif args.difficulty == "hard":
            test_list = HARD_TESTS
        elif args.difficulty == "hardest":
            test_list = HARDEST_TESTS
        elif args.difficulty == "advanced":
            test_list = TOP_AGENT_ADVANCED_TESTS + ALL_AGENT_ADVANCED_TESTS
        elif args.difficulty == "expert":
            test_list = TOP_AGENT_EXPERT_TESTS + ALL_AGENT_EXPERT_TESTS
        else:
            test_list = ALL_TESTS

        # Filter by agent type
        if args.agent_type:
            if args.agent_type == "top":
                # Include only tests with top agents (exclude all-agent tests)
                test_list = [t for t in test_list if not any(agent in ALL_AGENTS and agent not in TOP_AGENTS for agent in t["agents"])]
            elif args.agent_type == "all":
                # Include only tests with all agents
                test_list = [t for t in test_list if any(agent in ALL_AGENTS for agent in t["agents"])]
            # "mixed" means no additional filtering
    
    print(f"Running {len(test_list)} tests...")
    print(f"Fail on stub: {args.no_stubs}")
    
    # Create test runner
    test_runner = GenesisTestRunner()
    
    # Run tests
    results = await run_tests(test_runner, test_list, fail_on_stub=args.no_stubs)
    
    # Print summary
    print_summary(results)
    
    # Save results if requested
    if args.output:
        results_dict = [
            {
                "test_id": r.test_id,
                "name": r.name,
                "difficulty": r.difficulty,
                "status": r.status,
                "duration_ms": r.duration_ms,
                "agents_used": r.agents_used,
                "error_message": r.error_message,
                "se_darwin_improvement": r.se_darwin_improvement,
                "is_stub": r.is_stub
            }
            for r in results
        ]
        with open(args.output, 'w') as f:
            json.dump(results_dict, f, indent=2)
        print(f"\nResults saved to {args.output}")
    
    # Exit code
    passed_count = sum(1 for r in results if r.status == "passed")
    if passed_count == len(results):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

