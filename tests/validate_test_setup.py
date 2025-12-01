#!/usr/bin/env python3
"""
Validation script to check if the test setup works correctly.
Tests agent loading and stub detection without running full agent logic.
"""
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from test_genesis_100_comprehensive import GenesisTestRunner, StubDetector, WORKING_AGENTS, ALL_TESTS

async def validate_setup():
    """Validate the test setup."""
    print("Validating Genesis Test Setup")
    print("=" * 50)

    # 1. Check test count
    print(f"[OK] Total tests: {len(ALL_TESTS)} (expected: 100)")

    # 2. Check working agents
    print(f"[OK] Working agents: {len(WORKING_AGENTS)} - {WORKING_AGENTS}")

    # 3. Check test distribution
    difficulties = {}
    for test in ALL_TESTS:
        diff = test['difficulty']
        difficulties[diff] = difficulties.get(diff, 0) + 1

    print("[OK] Test distribution by difficulty:")
    for diff, count in difficulties.items():
        print(f"   {diff}: {count} tests")

    # 4. Test agent loading
    print("\nTesting agent loading...")
    runner = GenesisTestRunner()

    loaded_agents = []
    failed_agents = []

    for agent_name in WORKING_AGENTS:
        try:
            print(f"   Loading {agent_name}...")
            agent = await runner._get_agent(agent_name)
            loaded_agents.append(agent_name)
            print(f"   [OK] {agent_name} loaded successfully")

            # Check for stub methods
            stub_methods = StubDetector.check_agent_methods_for_stubs(agent, agent_name)
            if stub_methods:
                print(f"   [WARN] {agent_name} has stub methods: {stub_methods}")
            else:
                print(f"   [OK] {agent_name} has no stub methods")

        except Exception as e:
            failed_agents.append((agent_name, str(e)))
            print(f"   [FAIL] {agent_name} failed: {e}")

    print(f"\nAgent loading results:")
    print(f"   [OK] Loaded: {len(loaded_agents)}")
    print(f"   [FAIL] Failed: {len(failed_agents)}")

    if failed_agents:
        print("   Failed agents:")
        for name, error in failed_agents:
            print(f"     - {name}: {error}")

    # 5. Check SE-Darwin availability
    try:
        se_darwin = await runner._get_agent("se_darwin_agent")
        print("[OK] SE-Darwin agent available for evolutionary improvements")
    except Exception as e:
        print(f"[FAIL] SE-Darwin agent not available: {e}")

    # 6. Check Genesis Meta availability
    try:
        genesis_meta = await runner._get_agent("genesis_meta")
        print("[OK] Genesis Meta agent available")
    except Exception as e:
        print(f"[FAIL] Genesis Meta agent not available: {e}")

    # 7. Sample test validation
    print("\nValidating sample tests...")
    sample_tests = ALL_TESTS[:3]  # Check first 3 tests

    for test_def in sample_tests:
        print(f"   Checking {test_def['id']}: {test_def['name']}")

        # Check required fields
        required_fields = ['id', 'name', 'difficulty', 'agents', 'task']
        missing_fields = [f for f in required_fields if f not in test_def]
        if missing_fields:
            print(f"     [FAIL] Missing fields: {missing_fields}")
        else:
            print("     [OK] All required fields present")

        # Check agents include genesis_meta and se_darwin_agent
        if 'genesis_meta' not in test_def['agents']:
            print("     [FAIL] Missing genesis_meta agent")
        if 'se_darwin_agent' not in test_def['agents']:
            print("     [FAIL] Missing se_darwin_agent")
        if 'genesis_meta' in test_def['agents'] and 'se_darwin_agent' in test_def['agents']:
            print("     [OK] Includes Genesis Meta and SE-Darwin")

        # Check agents are from working list
        invalid_agents = [a for a in test_def['agents'] if a not in WORKING_AGENTS + ['genesis_meta', 'se_darwin_agent']]
        if invalid_agents:
            print(f"     [FAIL] Invalid agents: {invalid_agents}")
        else:
            print("     [OK] All agents are valid")

    print("\nValidation complete!")
    print("=" * 50)

    success = len(loaded_agents) > 0 and len(ALL_TESTS) == 100
    if success:
        print("[PASS] Test setup validation PASSED")
        print("Ready to run full test suite!")
    else:
        print("[FAIL] Test setup validation FAILED")
        print("Please fix the issues above before running tests")

    return success

if __name__ == "__main__":
    success = asyncio.run(validate_setup())
    sys.exit(0 if success else 1)