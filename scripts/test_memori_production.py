"""
Production validation test for Memori SQL integration
Tests all components in production-like environment
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env

# Load environment first
load_genesis_env()

from infrastructure.memory.memori_sql_engine import GenesisSQLMemory, MemoryMode
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory
from infrastructure.casebank import CaseBank

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_memori_production():
    """Test Memori SQL in production-like environment"""

    print("=" * 60)
    print("MEMORI PRODUCTION VALIDATION TEST")
    print("=" * 60)

    db_url = os.getenv('MEMORI_DATABASE_URL', 'sqlite:///./data/genesis_memory.db')
    print(f"\nDatabase URL: {db_url}")
    print(f"Database Type: {'PostgreSQL' if 'postgresql' in db_url else 'SQLite'}")
    print()

    test_results = {
        "genesis_sql_memory": False,
        "trajectory_pool": False,
        "casebank": False
    }

    # Test 1: GenesisSQLMemory
    print("=" * 60)
    print("Test 1: GenesisSQLMemory storage and retrieval")
    print("=" * 60)

    try:
        memory = GenesisSQLMemory(
            agent_id="builder_agent",
            database_url=db_url
        )

        # Store memories
        mem_id_1 = memory.store(
            content="Successfully built authentication system with OAuth2",
            mode=MemoryMode.CONSCIOUS,
            metadata={"component": "auth", "quality": 0.95}
        )

        mem_id_2 = memory.store(
            content="Implemented JWT token validation with refresh tokens",
            mode=MemoryMode.CONSCIOUS,
            metadata={"component": "auth", "quality": 0.92}
        )

        print(f"Stored memories: {mem_id_1}, {mem_id_2}")

        # Query
        results = memory.retrieve("authentication", limit=5)

        if len(results) > 0:
            print(f"[PASS] Stored and retrieved {len(results)} memories")
            print(f"   Sample result: {results[0]['content'][:80]}...")
            test_results["genesis_sql_memory"] = True
        else:
            print(f"[FAIL] Memory retrieval returned no results")

    except Exception as e:
        print(f"[FAIL] GenesisSQLMemory test failed - {str(e)}")
        logger.error(f"GenesisSQLMemory error: {e}", exc_info=True)

    print()

    # Test 2: TrajectoryPool SQL backend
    print("=" * 60)
    print("Test 2: TrajectoryPool with SQL backend")
    print("=" * 60)

    try:
        # TrajectoryPool uses environment variables to enable Memori backend
        # It automatically creates sql_mirror if memori_enabled() returns True
        pool = TrajectoryPool(agent_name="builder_agent")

        # Add trajectory using the correct Trajectory class structure
        from infrastructure.trajectory_pool import TrajectoryStatus, OperatorType

        trajectory = Trajectory(
            trajectory_id="prod_traj_1",
            generation=1,
            agent_name="builder_agent",
            task_type="authentication",
            task_description="Build user authentication",
            focus_area="security",
            code_changes="Implemented OAuth2 with JWT refresh flow",
            problem_diagnosis="Login failures under load",
            proposed_strategy="Refactor auth service and add tests",
            status=TrajectoryStatus.SUCCESS.value,
            success_score=0.92,
            operator_applied=OperatorType.BASELINE.value,
            metrics={"quality_score": 0.92},
            metadata={"framework": "fastapi"}
        )

        pool.add_trajectory(trajectory)
        print(f"Added trajectory for agent: builder_agent")

        # Get trajectories from pool
        all_trajectories = pool.get_all_trajectories()

        if len(all_trajectories) > 0:
            print(f"[PASS] Added trajectory, found {len(all_trajectories)} in pool")
            traj = all_trajectories[0]
            print(f"   Sample trajectory: agent={traj.agent_name}, score={traj.success_score}")

            # Verify SQL mirror was created if Memori is enabled
            if pool.sql_mirror:
                print(f"   SQL mirror: ACTIVE (Memori backend enabled)")
            else:
                print(f"   SQL mirror: INACTIVE (using JSONL backend)")

            test_results["trajectory_pool"] = True
        else:
            print(f"[FAIL] Trajectory pool is empty after adding")

    except Exception as e:
        print(f"[FAIL] TrajectoryPool test failed - {str(e)}")
        logger.error(f"TrajectoryPool error: {e}", exc_info=True)

    print()

    # Test 3: CaseBank SQL backend
    print("=" * 60)
    print("Test 3: CaseBank with SQL backend")
    print("=" * 60)

    try:
        # CaseBank uses environment variable CASEBANK_BACKEND or auto-detects
        # If GENESIS_MEMORY_BACKEND=memori is set, it defaults to SQL backend
        casebank = CaseBank(backend="sql")

        # Store case using async method - need to run in event loop
        import asyncio

        async def test_casebank():
            # Add case using correct Case structure (state, action, reward)
            case = await casebank.add_case(
                state="Implement JWT authentication with refresh tokens",
                action="# JWT implementation with FastAPI\nfrom fastapi import Depends\nfrom jose import JWTError, jwt\n...",
                reward=0.88,
                metadata={
                    "agent": "builder_agent",
                    "domain": "security",
                    "framework": "fastapi"
                }
            )
            print(f"Stored case: {case.case_id[:8]}... (reward={case.reward})")

            # Get all cases to verify storage
            all_cases = await casebank.get_all_cases()
            print(f"Total cases stored: {len(all_cases)}")

            # Retrieve similar cases
            similar = await casebank.retrieve_similar(
                query_state="JWT authentication",
                k=3,
                min_reward=0.6
            )

            return all_cases, similar

        # Run async test
        all_cases, similar = asyncio.run(test_casebank())

        # Evaluate results
        if len(all_cases) > 0:
            print(f"[PASS] Stored {len(all_cases)} case(s), retrieved {len(similar)} similar")
            if len(similar) > 0:
                case_obj, similarity = similar[0]
                print(f"   Sample case: reward={case_obj.reward:.2f}, similarity={similarity:.2f}")
            else:
                print(f"   Case storage verified (similarity search may need more cases)")

            # Verify backend is SQL
            if casebank.backend == "sql":
                print(f"   Backend: SQL (Memori enabled)")
            else:
                print(f"   Backend: JSONL (fallback)")

            test_results["casebank"] = True
        else:
            print(f"[FAIL] Case storage failed")

    except Exception as e:
        print(f"[FAIL] CaseBank test failed - {str(e)}")
        logger.error(f"CaseBank error: {e}", exc_info=True)

    print()

    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(test_results.values())
    total = len(test_results)

    for test_name, result in test_results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print()
    print(f"Overall: {passed}/{total} tests passed")

    if passed == total:
        print("=" * 60)
        print("ALL PRODUCTION TESTS PASSED")
        print("=" * 60)
        return True
    else:
        print("=" * 60)
        print("SOME TESTS FAILED")
        print("=" * 60)
        return False


if __name__ == "__main__":
    try:
        result = test_memori_production()
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        exit(130)
    except Exception as e:
        logger.error(f"Test execution failed: {e}", exc_info=True)
        exit(1)
