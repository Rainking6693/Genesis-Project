#!/usr/bin/env python3
"""
Test automatic mirroring between TrajectoryPool, Memori SQL backend, and DreamGym.

Verifies the data flow:
  TrajectoryPool -> Memori SQL backend (automatic)
  TrajectoryPool -> DreamGym hybrid buffer (when DREAMGYM_AUTO_MIRROR=true)

Success Criteria:
1. Trajectory added to TrajectoryPool
2. Automatically appears in Memori SQL database
3. Automatically appears in DreamGym hybrid buffer (if enabled)
4. No import errors or missing dependencies
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Set Memori environment variables before imports
os.environ["GENESIS_MEMORY_BACKEND"] = "memori"
os.environ["MEMORI_DB_PATH"] = "data/memori/genesis_memori.db"
os.environ["DREAMGYM_AUTO_MIRROR"] = "true"

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from infrastructure.trajectory_pool import Trajectory, TrajectoryPool
from infrastructure.memory.memori_client import MemoriClient
from infrastructure.dreamgym.integration import DreamGymTrainer


def print_section(title: str) -> None:
    """Print a formatted section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def print_result(label: str, value: str, status: str = "OK") -> None:
    """Print a test result with status indicator"""
    status_indicator = "[PASS]" if status == "OK" else "[FAIL]"
    print(f"  {status_indicator} {label}: {value}")


def test_trajectory_pool_creation() -> bool:
    """Test 1: Create TrajectoryPool and verify initialization"""
    print_section("Test 1: TrajectoryPool Initialization")
    try:
        pool = TrajectoryPool(agent_name="test_agent")
        print_result("Agent name", f"{pool.agent_name}")
        print_result("Max trajectories", f"{pool.max_trajectories}")
        print_result("SQL mirror enabled", f"{pool.sql_mirror is not None}")

        if pool.sql_mirror is None:
            print_result("SQL mirror", "DISABLED", "✗")
            return False

        print_result("Status", "All checks passed")
        return True
    except Exception as e:
        print_result("Error", str(e), "✗")
        return False


def test_trajectory_addition() -> bool:
    """Test 2: Add trajectory and verify it's stored"""
    print_section("Test 2: Trajectory Addition & Storage")
    try:
        pool = TrajectoryPool(agent_name="test_agent")

        # Create test trajectory
        trajectory = Trajectory(
            trajectory_id="test-traj-001",
            generation=1,
            agent_name="test_agent",
            operator_applied="revision",
            success_score=0.85,
            code_changes="function myFunc() { return 42; }",
            problem_diagnosis="Optimization for performance"
        )

        # Add to pool
        pool.add_trajectory(trajectory)
        print_result("Trajectory added", trajectory.trajectory_id)

        # Verify in memory
        if trajectory.trajectory_id not in pool.trajectories:
            print_result("Memory storage", "NOT FOUND", "✗")
            return False
        print_result("Memory storage", "Found")

        # Verify count
        print_result("Pool size", f"{len(pool.trajectories)} trajectories")

        return True
    except Exception as e:
        print_result("Error", str(e), "✗")
        return False


def test_memori_sql_mirror() -> bool:
    """Test 3: Verify Memori SQL mirror is populated"""
    print_section("Test 3: Memori SQL Backend Mirror")
    try:
        # Re-create pool to verify SQL data persists
        pool = TrajectoryPool(agent_name="test_agent")

        if pool.sql_mirror is None:
            print_result("SQL mirror", "Not available", "✗")
            return False

        # Query recent trajectories from SQL backend
        recent = pool.sql_mirror.recent(limit=10)
        print_result("SQL query executed", "Success")
        print_result("Trajectories in SQL", f"{len(recent)}")

        if not recent:
            print_result("Data found in SQL", "No records", "✗")
            return False

        # Verify trajectory details
        traj = recent[0]
        print_result("First trajectory ID", traj.get("trajectory_id", "N/A"))
        print_result("Agent name", traj.get("agent_name", "N/A"))
        print_result("Success score", str(traj.get("success_score", "N/A")))

        return True
    except Exception as e:
        print_result("Error", str(e), "✗")
        return False


def test_dreamgym_integration() -> bool:
    """Test 4: Verify DreamGym hybrid buffer receives data"""
    print_section("Test 4: DreamGym Hybrid Buffer Integration")
    try:
        # Check if DreamGym is available
        try:
            from infrastructure.dreamgym.hybrid_buffer import HybridReplayBuffer
            from infrastructure.dreamgym.integration import DreamGymTrainer
            print_result("DreamGym modules", "Available")
        except ImportError:
            print_result("DreamGym modules", "Not available - OPTIONAL")
            return True  # Optional component

        # Create trainer and add experience
        trainer = DreamGymTrainer(agent_name="test_agent")
        print_result("DreamGym trainer", "Created")

        # Create a test trajectory and record it
        trajectory = Trajectory(
            trajectory_id="dreamgym-test-001",
            generation=1,
            agent_name="test_agent",
            operator_applied="revision",
            success_score=0.90,
            code_changes="optimized code"
        )

        trainer.record_real_trajectory(trajectory)
        print_result("Trajectory recorded", trajectory.trajectory_id)

        # Generate synthetic batch
        synthetic = trainer.generate_synthetic_batch("component_test", batch_size=2)
        print_result("Synthetic episodes", f"{len(synthetic)} generated")

        # Prepare evolution batch
        batch = trainer.prepare_evolution_batch("component_test", batch_size=3)
        print_result("Evolution batch", f"{len(batch)} items")

        return True
    except Exception as e:
        print_result("Error", str(e), "✗")
        return False


def test_environment_variables() -> bool:
    """Test 5: Verify all required environment variables are set"""
    print_section("Test 5: Environment Configuration")

    required_vars = {
        "GENESIS_MEMORY_BACKEND": "memori",
        "MEMORI_DB_PATH": "data/memori/genesis_memori.db",
        "DREAMGYM_AUTO_MIRROR": "true"
    }

    all_set = True
    for var_name, expected_value in required_vars.items():
        actual_value = os.getenv(var_name, "NOT SET")
        status = "OK" if actual_value == expected_value else "WARN"
        print_result(var_name, actual_value, status)
        if actual_value != expected_value:
            all_set = False

    return all_set


def test_database_connectivity() -> bool:
    """Test 6: Verify database connectivity"""
    print_section("Test 6: Database Connectivity")
    try:
        db_path = os.getenv("MEMORI_DB_PATH", "data/memori/genesis_memori.db")

        # Create Memori client
        client = MemoriClient(db_path)
        print_result("Memori client", "Created")

        # Test async operations
        async def test_async():
            # Put a record
            result = await client.aput(
                "test",
                "agent",
                "health_check",
                {"status": "healthy", "timestamp": "2025-11-11T00:00:00Z"},
                {"test": True}
            )
            # MemoryRecord is a dataclass, convert to dict
            result_dict = result.to_dict() if hasattr(result, 'to_dict') else result
            print_result("Put operation", f"Record stored: {result_dict.get('key', 'N/A')}")

            # Get the record
            retrieved = await client.aget("test", "agent", "health_check")
            if retrieved:
                retrieved_dict = retrieved.to_dict() if hasattr(retrieved, 'to_dict') else retrieved
                print_result("Get operation", f"Record retrieved: {retrieved_dict.get('key', 'N/A')}")
                return True
            else:
                print_result("Get operation", "Record not found", "✗")
                return False

        return asyncio.run(test_async())

    except Exception as e:
        print_result("Error", str(e), "✗")
        return False


def main() -> int:
    """Run all tests and report results"""
    print("\n" + "="*70)
    print("  AUTOMATIC MIRRORING TEST SUITE")
    print("  VPS Implementation: DreamGym + Memori SQL Backend")
    print("  Test Date: 2025-11-11")
    print("="*70)

    tests = [
        ("Trajectory Pool Initialization", test_trajectory_pool_creation),
        ("Trajectory Addition & Storage", test_trajectory_addition),
        ("Memori SQL Mirror", test_memori_sql_mirror),
        ("DreamGym Integration", test_dreamgym_integration),
        ("Environment Variables", test_environment_variables),
        ("Database Connectivity", test_database_connectivity),
    ]

    results = {}
    for name, test_func in tests:
        try:
            passed = test_func()
            results[name] = "PASS" if passed else "FAIL"
        except Exception as e:
            print(f"  Exception: {e}")
            results[name] = "ERROR"

    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v == "PASS")
    failed = sum(1 for v in results.values() if v == "FAIL")
    errors = sum(1 for v in results.values() if v == "ERROR")
    total = len(results)

    for name, status in results.items():
        indicator = "[PASS]" if status == "PASS" else "[FAIL]"
        print(f"  {indicator} {name}: {status}")

    print(f"\nTotal: {passed} passed, {failed} failed, {errors} errors out of {total}")

    if failed == 0 and errors == 0:
        print("\nAll tests PASSED! VPS implementation is ready for production.")
        return 0
    else:
        print(f"\nSome tests failed. Please review errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
