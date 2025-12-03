"""Verify test count and distribution."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.test_genesis_100_comprehensive import (
    ALL_TESTS,
    EASY_TESTS,
    INTERMEDIATE_TESTS,
    HARD_TESTS,
    HARDEST_TESTS,
    TOP_AGENTS,
    ALL_AGENTS
)

# Count tests
total = len(ALL_TESTS)
easy = len(EASY_TESTS)
intermediate = len(INTERMEDIATE_TESTS)
hard = len(HARD_TESTS)
hardest = len(HARDEST_TESTS)

print(f"Total tests: {total}")
print(f"  Easy: {easy}")
print(f"  Intermediate: {intermediate}")
print(f"  Hard: {hard}")
print(f"  Hardest: {hardest}")

# Count tests with top agents
top_agent_tests = sum(
    1 for t in ALL_TESTS
    if any(agent in t["agents"] for agent in TOP_AGENTS if agent != "se_darwin_agent")
    and "genesis_meta" in t["agents"]
    and "se_darwin_agent" in t["agents"]
)

# Count tests with all agents (non-top agents)
all_agent_tests = sum(
    1 for t in ALL_TESTS
    if any(agent in t["agents"] for agent in ALL_AGENTS if agent not in TOP_AGENTS)
    and "genesis_meta" in t["agents"]
    and "se_darwin_agent" in t["agents"]
)

print(f"\nTest distribution:")
print(f"  Tests with top agents: {top_agent_tests}")
print(f"  Tests with all agents: {all_agent_tests}")

# Verify all tests have SE_darwin
tests_with_se_darwin = sum(1 for t in ALL_TESTS if "se_darwin_agent" in t["agents"])
print(f"\nSE-Darwin integration:")
print(f"  Tests with SE_darwin: {tests_with_se_darwin}/{total}")

# Verify all tests have genesis_meta
tests_with_genesis = sum(1 for t in ALL_TESTS if "genesis_meta" in t["agents"])
print(f"  Tests with Genesis Meta: {tests_with_genesis}/{total}")

# Check for unique IDs
test_ids = [t["id"] for t in ALL_TESTS]
unique_ids = len(set(test_ids))
print(f"\nTest IDs:")
print(f"  Unique IDs: {unique_ids}/{total}")

if unique_ids != total:
    print("  WARNING: Duplicate test IDs found!")
    from collections import Counter
    duplicates = [id for id, count in Counter(test_ids).items() if count > 1]
    print(f"  Duplicates: {duplicates}")

print("\n✅ Verification complete!")




