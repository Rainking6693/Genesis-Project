"""
Test Execution Backends for Genesis Training

Validates both OpenHands Local and Acontext SQLite implementations.

Usage:
    python scripts/test_execution_backends.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.openhands_local import OpenHandsClient, ExecutionResult
from src.integrations.acontext_client import AcontextClient


async def test_openhands_local():
    """Test OpenHands local execution sandbox"""
    print("\n" + "=" * 60)
    print("TEST 1: OpenHands Local Execution Sandbox")
    print("=" * 60)

    client = OpenHandsClient(timeout=10.0)

    # Test 1: Simple code execution
    print("\n1. Testing simple Python execution...")
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(f"Fibonacci(10) = {fibonacci(10)}")
"""

    result = await client.execute(
        instructions="Calculate Fibonacci numbers",
        code=code
    )

    print(f"   Success: {result.success}")
    print(f"   Exit Code: {result.exit_code}")
    print(f"   Runtime: {result.runtime_ms:.2f}ms")
    print(f"   Output: {result.output.strip()}")

    if not result.success:
        print(f"   Errors: {result.errors}")

    assert result.success, "Simple execution failed"
    assert "55" in result.output, "Fibonacci output incorrect"

    # Test 2: Code with errors
    print("\n2. Testing code with errors...")
    bad_code = """
print("Starting...")
x = 1 / 0  # Division by zero
print("This won't execute")
"""

    result = await client.execute(
        instructions="Test error handling",
        code=bad_code
    )

    print(f"   Success: {result.success}")
    print(f"   Exit Code: {result.exit_code}")
    print(f"   Errors: {result.errors[:100] if result.errors else 'None'}...")

    assert not result.success, "Should have failed"
    assert result.exit_code != 0, "Exit code should be non-zero"

    # Test 3: Timeout handling
    print("\n3. Testing timeout enforcement...")
    infinite_loop = """
import time
while True:
    time.sleep(0.1)
"""

    client_short = OpenHandsClient(timeout=2.0)
    result = await client_short.execute(
        instructions="Test timeout",
        code=infinite_loop
    )

    print(f"   Success: {result.success}")
    print(f"   Runtime: {result.runtime_ms:.2f}ms")
    print(f"   Timeout: {result.metadata.get('timeout', False)}")

    assert not result.success, "Should have timed out"
    assert result.metadata.get("timeout") == True, "Should have timeout flag"

    # Cleanup
    client.cleanup()
    client_short.cleanup()

    print("\n[PASS] All OpenHands local tests passed!")


async def test_acontext_sqlite():
    """Test Acontext SQLite persistence"""
    print("\n" + "=" * 60)
    print("TEST 2: Acontext SQLite Persistence")
    print("=" * 60)

    # Use test database
    test_db = "data/acontext_test.db"
    if os.path.exists(test_db):
        os.remove(test_db)

    client = AcontextClient(db_path=test_db)

    # Force local fallback mode
    client._use_local_fallback = True

    # Test 1: Create space
    print("\n1. Testing space creation...")
    result = client.create_space(
        space="test_training",
        metadata={"purpose": "ES training", "iteration": 1}
    )

    print(f"   Created: {result.get('created')}")
    print(f"   Space: {result.get('space')}")
    print(f"   Local: {result.get('local')}")

    assert result.get("created") == True, "Space creation failed"

    # Test 2: Create blocks
    print("\n2. Testing block creation...")
    block1 = client.create_block(
        space="test_training",
        path="/rl/iteration_1.md",
        content="# Iteration 1\n\nFitness: 0.75",
        metadata={"iteration": 1, "fitness": 0.75}
    )

    print(f"   Block path: {block1.get('path')}")
    print(f"   Version: {block1.get('version')}")
    print(f"   Local: {block1.get('local')}")

    assert block1.get("version") == 1, "First version should be 1"

    # Test 3: Update block (versioning)
    print("\n3. Testing block versioning...")
    block2 = client.create_block(
        space="test_training",
        path="/rl/iteration_1.md",
        content="# Iteration 1 (Updated)\n\nFitness: 0.82",
        metadata={"iteration": 1, "fitness": 0.82}
    )

    print(f"   Version: {block2.get('version')}")
    assert block2.get("version") == 2, "Updated version should be 2"

    # Test 4: Retrieve block
    print("\n4. Testing block retrieval...")
    retrieved = client.get_block(
        space="test_training",
        path="/rl/iteration_1.md"
    )

    print(f"   Retrieved: {retrieved is not None}")
    print(f"   Content preview: {retrieved['content'][:40]}...")
    print(f"   Version: {retrieved['version']}")

    assert retrieved is not None, "Block retrieval failed"
    assert retrieved["version"] == 2, "Should retrieve latest version"
    assert "Updated" in retrieved["content"], "Content should be updated"

    # Test 5: List blocks
    print("\n5. Testing block listing...")
    client.create_block(
        space="test_training",
        path="/rl/iteration_2.md",
        content="# Iteration 2\n\nFitness: 0.88",
        metadata={"iteration": 2}
    )

    blocks = client.list_blocks(space="test_training", prefix="/rl/")

    print(f"   Blocks found: {len(blocks)}")
    for block in blocks:
        print(f"   - {block['path']} (v{block['version']})")

    assert len(blocks) == 2, "Should have 2 blocks"

    # Test 6: Search blocks
    print("\n6. Testing block search...")
    results = client.search(
        space="test_training",
        query="fitness",
        limit=10
    )

    print(f"   Search results: {len(results)}")
    for result in results:
        print(f"   - {result['path']} (score: {result['score']})")

    assert len(results) >= 2, "Search should find both blocks"

    # Test 7: Persistence (close and reopen)
    print("\n7. Testing persistence across sessions...")
    client.close()

    # Create new client with same DB
    client2 = AcontextClient(db_path=test_db)
    client2._use_local_fallback = True

    retrieved2 = client2.get_block(
        space="test_training",
        path="/rl/iteration_1.md"
    )

    print(f"   Retrieved after restart: {retrieved2 is not None}")
    print(f"   Version persisted: {retrieved2['version']}")

    assert retrieved2 is not None, "Persistence failed"
    assert retrieved2["version"] == 2, "Version should persist"

    # Cleanup
    client2.close()
    if os.path.exists(test_db):
        os.remove(test_db)

    print("\n[PASS] All Acontext SQLite tests passed!")


async def test_integration():
    """Test both backends working together"""
    print("\n" + "=" * 60)
    print("TEST 3: Integration Test")
    print("=" * 60)

    # Simulate ES training workflow
    print("\n1. Simulating ES training iteration...")

    # Execute code with OpenHands
    openhands = OpenHandsClient(timeout=5.0)

    code = """
import numpy as np

# Simulate fitness evaluation
np.random.seed(42)
fitness = np.random.random()
print(f"Fitness: {fitness:.4f}")
"""

    exec_result = await openhands.execute(
        instructions="Evaluate model fitness",
        code=code
    )

    print(f"   Code executed: {exec_result.success}")
    print(f"   Runtime: {exec_result.runtime_ms:.2f}ms")

    # Store results in Acontext
    acontext = AcontextClient(db_path="data/acontext_integration_test.db")
    acontext._use_local_fallback = True

    acontext.create_space("es_training", metadata={"test": "integration"})

    block = acontext.create_block(
        space="es_training",
        path="/results/exec_1.md",
        content=f"# Execution Result\n\n{exec_result.output}\n\nRuntime: {exec_result.runtime_ms:.2f}ms",
        metadata={
            "success": exec_result.success,
            "runtime_ms": exec_result.runtime_ms
        }
    )

    print(f"   Results stored: {block.get('local')}")

    # Retrieve and verify
    retrieved = acontext.get_block("es_training", "/results/exec_1.md")
    print(f"   Results retrieved: {retrieved is not None}")

    assert retrieved is not None, "Integration failed"

    # Cleanup
    openhands.cleanup()
    acontext.close()

    if os.path.exists("data/acontext_integration_test.db"):
        os.remove("data/acontext_integration_test.db")

    print("\n[PASS] Integration test passed!")


async def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("GENESIS EXECUTION BACKENDS TEST SUITE")
    print("=" * 60)
    print("\nTesting OpenHands Local and Acontext SQLite implementations")

    try:
        await test_openhands_local()
        await test_acontext_sqlite()
        await test_integration()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED [SUCCESS]")
        print("=" * 60)
        print("\nBoth execution backends are ready for ES training!")

    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
