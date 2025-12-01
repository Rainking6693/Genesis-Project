#!/usr/bin/env python3
"""
Simple script to run a single test from the Genesis test suite.
"""
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from test_genesis_100_comprehensive import GenesisTestRunner, ALL_TESTS

async def run_single_test():
    runner = GenesisTestRunner()
    test_def = ALL_TESTS[0]  # E01 test
    print(f'Running test: {test_def["id"]} - {test_def["name"]}')
    print(f'Difficulty: {test_def["difficulty"]}')
    print(f'Agents: {test_def["agents"]}')
    print(f'Task: {test_def["task"]}')
    print('---')

    try:
        result = await runner.run_test(
            test_id=test_def['id'],
            name=test_def['name'],
            difficulty=test_def['difficulty'],
            agents=test_def['agents'],
            task=test_def['task'],
            method=test_def.get('method'),
            inputs=test_def.get('inputs')
        )
        print(f'Test result: {result.status}')
        print(f'Duration: {result.duration_ms:.2f}ms')
        if result.error_message:
            print(f'Error: {result.error_message}')
        if result.se_darwin_improvement:
            print(f'SE-Darwin improvement: {result.se_darwin_improvement:.2%}')
    except Exception as e:
        print(f'Exception: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_single_test())