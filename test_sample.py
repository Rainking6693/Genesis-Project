#!/usr/bin/env python3
"""
Genesis Test Runner - Simplified Version for Testing

This script runs a smaller subset of tests to verify the system works
before executing the full 100-test suite.
"""

import asyncio
import sys
import argparse
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from genesis_100_test_suite import GenesisTestForge, TestPhase

async def run_sample_tests(test_count: int = 10):
    """Run a sample of tests to verify system functionality"""
    
    print("GENESIS SAMPLE TEST RUNNER")
    print("=" * 50)
    print(f"Running {test_count} sample tests...")
    
    # Initialize test forge
    test_forge = GenesisTestForge()
    
    # Run sample tests from both phases
    test_ids = []
    if test_count >= 5:
        test_ids.extend(range(1, 6))  # Tests 1-5 (Core 11 Agents)
    if test_count > 5:
        test_ids.extend(range(51, 51 + (test_count - 5)))  # Tests 51+ (Full Swarm)
    
    for test_id in test_ids:
        phase = TestPhase.CORE_11_AGENTS if test_id <= 50 else TestPhase.FULL_SWARM
        await test_forge.run_single_test(test_id, phase)
    
    # Calculate metrics and save results
    test_forge._calculate_final_metrics(60.0)  # Estimated duration
    test_forge.save_results()
    
    # Print summary
    metrics = test_forge.metrics
    print("\n" + "=" * 50)
    print("SAMPLE TEST RESULTS")
    print("=" * 50)
    print(f"Tests Run: {metrics.total_tests}")
    print(f"Passed: {metrics.tests_passed_hgm_80_plus}")
    print(f"Average HGM Score: {metrics.average_hgm_score:.1f}")
    if metrics.total_tests > 0:
        success_rate = (metrics.tests_passed_hgm_80_plus/metrics.total_tests*100)
        print(f"Success Rate: {success_rate:.1f}%")
        return 0 if (metrics.tests_passed_hgm_80_plus/metrics.total_tests) >= 0.6 else 1
    else:
        print("Error: No tests were executed")
        return 1

async def main():
    """Main execution function"""
    
    parser = argparse.ArgumentParser(description="Genesis Sample Test Runner")
    parser.add_argument("--tests", type=int, default=10, help="Number of sample tests to run (default: 10)")
    parser.add_argument("--quick", action="store_true", help="Quick test (5 tests)")
    
    args = parser.parse_args()
    
    if args.quick:
        test_count = 5
    else:
        test_count = args.tests
    
    try:
        return await run_sample_tests(test_count)
    except Exception as e:
        print(f"ERROR running sample tests: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))