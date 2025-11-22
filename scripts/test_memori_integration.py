"""
Test Script: Memori SQL Integration
-----------------------------------
Validates the SQL-native memory stack end to end:

1. GenesisSQLMemory basic store/retrieve semantics
2. A2A memory bridge cross-agent sharing
3. TrajectoryPool SQL mirroring
4. CaseBank SQL backend with legacy payload compatibility
"""
import argparse
import asyncio
import logging
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Ensure repo root on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.memory.memori_sql_engine import GenesisSQLMemory, MemoryMode
from infrastructure.memory.a2a_memory_bridge import A2AMemoryBridge, AccessLevel
from infrastructure.memory.memori_client import MemoriClient
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus
from infrastructure.casebank import CaseBank


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MemoriTestSuite:
    """Collection of verification routines for Memori SQL integration."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or "sqlite:///test_genesis_memory.db"
        self.results: Dict[str, Any] = {
            "tests_passed": 0,
            "tests_failed": 0,
            "test_details": []
        }

    def _record(self, name: str, success: bool, **details: Any) -> None:
        bucket = "tests_passed" if success else "tests_failed"
        self.results[bucket] += 1
        self.results["test_details"].append(
            {"test": name, "status": "PASSED" if success else "FAILED", **details}
        )

    def _memori_db_path(self) -> str:
        if self.database_url.startswith("sqlite:///"):
            return self.database_url.replace("sqlite:///", "")
        return self.database_url

    def test_genesis_sql_memory(self) -> None:
        """Exercise GenesisSQLMemory store/retrieve."""
        logger.info("\n=== TEST 1: GenesisSQLMemory Basic Ops ===")
        try:
            memory = GenesisSQLMemory(agent_id="builder_agent", database_url=self.database_url)
            mem_id = memory.store(
                "Implemented user auth with JWT refresh tokens",
                mode=MemoryMode.CONSCIOUS,
                metadata={"component": "auth", "quality": 0.95}
            )
            logger.info(f"Stored memory: {mem_id}")

            captured = memory.capture_context(
                task="deploy_api",
                context={"platform": "aws", "status": "success"}
            )
            logger.info(f"Captured context memory: {captured}")

            results = memory.retrieve("authentication", limit=3)
            logger.info(f"Retrieved {len(results)} memories for 'authentication'")

            stats = memory.get_stats()
            logger.info(f"Memory stats: {stats}")
            memory.close()

            self._record("GenesisSQLMemory", True, memories=len(results))
        except Exception as exc:  # pragma: no cover - diagnostic logging
            logger.exception("GenesisSQLMemory test failed")
            self._record("GenesisSQLMemory", False, error=str(exc))

    def test_a2a_memory_bridge(self) -> None:
        """Exercise the A2A cross-agent bridge."""
        logger.info("\n=== TEST 2: A2A Memory Bridge ===")
        try:
            bridge = A2AMemoryBridge(database_url=self.database_url)
            bridge.grant_access("qa_agent", "builder_agent", AccessLevel.READ)

            builder_memory = bridge._get_memory("builder_agent")
            builder_memory.store(
                "Fixed auth bug in refresh endpoint",
                mode=MemoryMode.CONSCIOUS,
                metadata={"component": "auth", "priority": "high"}
            )

            shared = bridge.query_agent_memory(
                source_agent="qa_agent",
                target_agent="builder_agent",
                query="auth",
                limit=5
            )
            logger.info(f"QA agent received {len(shared)} shared memories")

            context_id = bridge.share_context(
                source_agent="builder_agent",
                target_agent="qa_agent",
                context={"coverage": 0.9, "tests": ["login", "refresh"]},
                metadata={"shared_at": datetime.now().isoformat()}
            )
            logger.info(f"Shared execution context id={context_id}")

            stats = bridge.get_bridge_stats()
            logger.info(f"Bridge stats: {stats}")
            bridge.close_all()

            self._record("A2AMemoryBridge", True, shared=len(shared))
        except Exception as exc:  # pragma: no cover - diagnostic logging
            logger.exception("A2A bridge test failed")
            self._record("A2AMemoryBridge", False, error=str(exc))

    def test_trajectory_pool_sql(self) -> None:
        """Ensure TrajectoryPool mirrors to SQL when Memori backend enabled."""
        logger.info("\n=== TEST 3: TrajectoryPool SQL Mirror ===")
        try:
            pool = TrajectoryPool(agent_name="builder_agent")
            for i in range(3):
                trajectory = Trajectory(
                    trajectory_id=f"traj_{i}",
                    generation=i + 1,
                    agent_name="builder_agent",
                    task_type="code_generation",
                    task_description=f"Implement feature {i}",
                    focus_area="auth",
                    code_changes=f\"code_changes_{i}\",
                    problem_diagnosis=\"bug fix\",
                    proposed_strategy=\"unit test + patch\",
                    status=TrajectoryStatus.SUCCESS.value,
                    success_score=0.82 + i * 0.03,
                    metrics={\"quality_score\": 0.82 + i * 0.03},
                    metadata={\"seed\": True}
                )
                pool.add_trajectory(trajectory)

            assert pool.sql_mirror is not None, "SQL mirror not initialized"
            recent = pool.sql_mirror.recent()
            logger.info(f"SQL mirror returned {len(recent)} trajectories")
            self._record("TrajectoryPoolSQL", True, mirrored=len(recent))
        except Exception as exc:  # pragma: no cover
            logger.exception("TrajectoryPool SQL test failed")
            self._record("TrajectoryPoolSQL", False, error=str(exc))

    def test_casebank_sql(self) -> None:
        """Validate CaseBank SQL backend using legacy-style payloads."""
        logger.info("\n=== TEST 4: CaseBank SQL Backend ===")
        try:
            client = MemoriClient(self._memori_db_path())
            casebank = CaseBank(backend="sql", memori_client=client)

            async def seed_and_query():
                payloads = [
                    {
                        "problem": "JWT token validation fails intermittently",
                        "solution": "Rebuilt validation middleware",
                        "context": {"component": "auth"},
                        "outcome": {"quality_score": 0.9, "resolved": True},
                        "metadata": {"priority": "high", "agent_id": "builder_agent"}
                    },
                    {
                        "problem": "Postgres pool exhaustion",
                        "solution": "Added connection reuse and query batching",
                        "context": {"component": "database"},
                        "outcome": {"quality_score": 0.86, "resolved": True},
                        "metadata": {"priority": "critical", "agent_id": "builder_agent"}
                    }
                ]
                for payload in payloads:
                    await casebank.store_case(payload)

                all_cases = await casebank.get_all_cases()
                similar = await casebank.retrieve_similar("authentication", k=5)
                high_quality = await casebank.get_high_quality_cases(min_quality=0.85)
                return all_cases, similar, high_quality

            all_cases, similar, high_quality = asyncio.run(seed_and_query())
            logger.info(f"CaseBank stored {len(all_cases)} cases, {len(similar)} similar, {len(high_quality)} HQ")
            self._record(
                "CaseBankSQL",
                True,
                total=len(all_cases),
                similar=len(similar),
                high_quality=len(high_quality)
            )
        except Exception as exc:  # pragma: no cover
            logger.exception("CaseBank SQL test failed")
            self._record("CaseBankSQL", False, error=str(exc))

    def run_all(self) -> Dict[str, Any]:
        """Execute the full test suite."""
        start = time.time()
        self.test_genesis_sql_memory()
        self.test_a2a_memory_bridge()
        self.test_trajectory_pool_sql()
        self.test_casebank_sql()
        self.results["duration_sec"] = time.time() - start
        logger.info("\n=== Test Suite Complete ===")
        logger.info(self.results)
        return self.results


def main() -> None:
    parser = argparse.ArgumentParser(description="Memori SQL integration test suite")
    parser.add_argument("--database-url", type=str, default=None, help="Override database URL")
    args = parser.parse_args()

    suite = MemoriTestSuite(database_url=args.database_url)
    suite.run_all()


if __name__ == "__main__":
    main()
