"""
VPS Implementation Deployment Validation Test
==============================================

Comprehensive test suite validating:
1. DreamGym synthetic batch generation
2. Memori backend connectivity and performance
3. TrajectoryPool automatic mirroring
4. Hybrid buffer maintenance of real/synthetic ratio
5. Data consistency across layers

Usage:
    python test_vps_deployment.py [--verbose]
"""

import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(name)s] - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Single test result"""
    test_name: str
    passed: bool
    duration_ms: float
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_name": self.test_name,
            "passed": self.passed,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "metrics": self.metrics,
        }


class VPSDeploymentValidator:
    """Validates VPS implementation deployment"""

    def __init__(self):
        self.results: List[TestResult] = []
        self.start_time = datetime.now(timezone.utc)

    def log_result(
        self,
        test_name: str,
        passed: bool,
        duration_ms: float,
        error: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log test result"""
        result = TestResult(
            test_name=test_name,
            passed=passed,
            duration_ms=duration_ms,
            error=error,
            metrics=metrics,
        )
        self.results.append(result)

        status = "PASS" if passed else "FAIL"
        logger.info(f"[{status}] {test_name} ({duration_ms:.1f}ms)")
        if error:
            logger.error(f"  Error: {error}")

    async def test_dreamgym_integration(self) -> None:
        """Test DreamGym synthetic batch generation"""
        test_name = "DreamGym Synthetic Batch Generation"
        start = time.time()

        try:
            # Import DreamGym components
            from infrastructure.dreamgym.integration import DreamGymTrainer
            from infrastructure.dreamgym.hybrid_buffer import HybridReplayBuffer

            # Initialize trainer
            trainer = DreamGymTrainer(agent_name="test_agent")
            logger.info("DreamGym trainer initialized")

            # Generate synthetic batch
            batch = trainer.generate_synthetic_batch(
                task_signature="test_task",
                batch_size=16
            )
            logger.info(f"Generated {len(batch)} synthetic experiences")

            # Verify batch structure
            assert len(batch) == 16, f"Expected 16 experiences, got {len(batch)}"
            assert all("task_signature" in exp for exp in batch), "Missing task_signature"
            assert all("reward" in exp for exp in batch), "Missing reward"
            assert all("novelty_score" in exp for exp in batch), "Missing novelty_score"

            # Check hybrid buffer stats
            stats = trainer.stats()
            logger.info(f"Buffer stats: {stats}")

            duration_ms = (time.time() - start) * 1000
            self.log_result(
                test_name,
                True,
                duration_ms,
                metrics={
                    "batch_size": len(batch),
                    "avg_reward": sum(e["reward"] for e in batch) / len(batch),
                    "avg_novelty": sum(e["novelty_score"] for e in batch) / len(batch),
                    "buffer_stats": stats,
                }
            )

        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.log_result(test_name, False, duration_ms, str(e))

    async def test_memori_backend(self) -> None:
        """Test Memori SQL backend connectivity"""
        test_name = "Memori SQL Backend Connectivity"
        start = time.time()

        try:
            from infrastructure.memory.memori_client import MemoriClient

            # Create client
            client = MemoriClient()
            logger.info("MemoriClient initialized")

            # Test basic operations
            record = client.upsert_memory(
                namespace="test",
                subject="validation",
                key="test_key",
                value={"test": "value"},
                metadata={"source": "deployment_test"}
            )
            logger.info(f"Upserted memory record: {record.key}")

            # Retrieve
            retrieved = client.get_memory("test", "validation", "test_key")
            assert retrieved is not None, "Failed to retrieve memory"
            assert retrieved.value["test"] == "value", "Value mismatch"
            logger.info("Retrieved memory record successfully")

            # Clean up
            client.delete_memory("test", "validation", "test_key")
            logger.info("Deleted memory record")

            # Check database info
            db_size = Path(client._conn.execute("PRAGMA database_list").fetchone()[2]).stat().st_size
            logger.info(f"Database size: {db_size / (1024**2):.2f}MB")

            client.close()

            duration_ms = (time.time() - start) * 1000
            self.log_result(
                test_name,
                True,
                duration_ms,
                metrics={
                    "db_size_mb": db_size / (1024**2),
                    "operations": ["upsert", "get", "delete"],
                }
            )

        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.log_result(test_name, False, duration_ms, str(e))

    async def test_trajectory_mirroring(self) -> None:
        """Test TrajectoryPool automatic mirroring to Memori"""
        test_name = "TrajectoryPool Memori Mirroring"
        start = time.time()

        try:
            from infrastructure.trajectory_pool import Trajectory, TrajectoryStatus, OperatorType
            from infrastructure.memory.memori_client import MemoriClient
            from datetime import datetime, timezone

            # Create test trajectory
            traj = Trajectory(
                trajectory_id="test_traj_001",
                agent_name="test_agent",
                generation=1,
                status=TrajectoryStatus.SUCCESS,
                operator_applied=OperatorType.BASELINE,
                problem_diagnosis="Test problem",
                code_changes="Test changes",
                success_score=0.85,
                reasoning_pattern="test_reasoning",
                created_at=datetime.now(timezone.utc),
            )
            logger.info(f"Created test trajectory: {traj.trajectory_id}")

            # Mirror to SQL backend
            from infrastructure.trajectory_pool import SQLTrajectoryMirror
            mirror = SQLTrajectoryMirror("test_agent")
            mirror.record(traj)
            logger.info("Trajectory mirrored to Memori")

            # Retrieve from Memori
            recent = mirror.recent(limit=10)
            logger.info(f"Retrieved {len(recent)} recent trajectories from Memori")

            assert len(recent) > 0, "No trajectories retrieved from Memori"
            found = any(t.get("trajectory_id") == "test_traj_001" for t in recent)
            assert found, "Mirrored trajectory not found in Memori"
            logger.info("Mirrored trajectory verified in Memori")

            duration_ms = (time.time() - start) * 1000
            self.log_result(
                test_name,
                True,
                duration_ms,
                metrics={
                    "trajectories_mirrored": 1,
                    "retrieval_success": True,
                    "recent_count": len(recent),
                }
            )

        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.log_result(test_name, False, duration_ms, str(e))

    async def test_hybrid_buffer_ratio(self) -> None:
        """Test hybrid buffer maintains real/synthetic ratio"""
        test_name = "Hybrid Buffer Real/Synthetic Ratio"
        start = time.time()

        try:
            from infrastructure.dreamgym.hybrid_buffer import HybridReplayBuffer
            from infrastructure.dreamgym.experience_model import DreamGymExperience

            buffer = HybridReplayBuffer(max_real=100, max_synthetic=400)
            logger.info("HybridReplayBuffer initialized")

            # Add real experiences
            for i in range(20):
                exp = DreamGymExperience(
                    task_signature="test",
                    difficulty="real",
                    synthetic=False,
                    observation=f"Real obs {i}",
                    action=f"Action {i}",
                    reward=0.5 + i * 0.01,
                    novelty_score=0.5,
                    generated_at=datetime.now(timezone.utc),
                    metadata={"source": "real"}
                )
                buffer.add(exp, "real")
            logger.info("Added 20 real experiences")

            # Add synthetic experiences
            for i in range(80):
                exp = DreamGymExperience(
                    task_signature="test",
                    difficulty="easy",
                    synthetic=True,
                    observation=f"Synthetic obs {i}",
                    action=f"Action {i}",
                    reward=0.4 + i * 0.005,
                    novelty_score=0.6,
                    generated_at=datetime.now(timezone.utc),
                    metadata={"source": "synthetic"}
                )
                buffer.add(exp, "synthetic")
            logger.info("Added 80 synthetic experiences")

            # Sample with 20/80 ratio
            samples = buffer.sample(batch_size=100, synthetic_ratio=0.8)
            logger.info(f"Sampled {len(samples)} experiences")

            real_count = sum(1 for s in samples if not s.synthetic)
            synthetic_count = sum(1 for s in samples if s.synthetic)
            real_ratio = real_count / len(samples)
            synthetic_ratio = synthetic_count / len(samples)

            logger.info(f"Real: {real_count} ({real_ratio:.1%}), Synthetic: {synthetic_count} ({synthetic_ratio:.1%})")

            # Verify ratio is close to target (20% real, 80% synthetic)
            assert 0.15 <= real_ratio <= 0.25, f"Real ratio {real_ratio} outside expected range"
            assert 0.75 <= synthetic_ratio <= 0.85, f"Synthetic ratio {synthetic_ratio} outside expected range"

            stats = buffer.stats()
            logger.info(f"Buffer stats: {stats}")

            duration_ms = (time.time() - start) * 1000
            self.log_result(
                test_name,
                True,
                duration_ms,
                metrics={
                    "real_experiences": stats["real"],
                    "synthetic_experiences": stats["synthetic"],
                    "sample_real_ratio": real_ratio,
                    "sample_synthetic_ratio": synthetic_ratio,
                }
            )

        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.log_result(test_name, False, duration_ms, str(e))

    async def test_data_consistency(self) -> None:
        """Test data consistency between TrajectoryPool and Memori"""
        test_name = "Data Consistency (TrajectoryPool <-> Memori)"
        start = time.time()

        try:
            from infrastructure.trajectory_pool import Trajectory, TrajectoryStatus, OperatorType
            from infrastructure.memory.memori_client import MemoriClient
            from infrastructure.trajectory_pool import SQLTrajectoryMirror

            # Create multiple trajectories
            trajectories = []
            for i in range(5):
                traj = Trajectory(
                    trajectory_id=f"consistency_test_{i:03d}",
                    agent_name="consistency_test_agent",
                    generation=i,
                    status=TrajectoryStatus.SUCCESS,
                    operator_applied=OperatorType.BASELINE,
                    problem_diagnosis=f"Problem {i}",
                    code_changes=f"Changes {i}",
                    success_score=0.5 + i * 0.1,
                    reasoning_pattern=f"Pattern {i}",
                    created_at=datetime.now(timezone.utc),
                )
                trajectories.append(traj)

            # Mirror all to Memori
            mirror = SQLTrajectoryMirror("consistency_test_agent")
            for traj in trajectories:
                mirror.record(traj)
            logger.info(f"Mirrored {len(trajectories)} trajectories to Memori")

            # Retrieve from Memori
            recent = mirror.recent(limit=10)
            logger.info(f"Retrieved {len(recent)} trajectories from Memori")

            # Verify consistency
            for traj in trajectories:
                found = any(
                    t.get("trajectory_id") == traj.trajectory_id
                    and t.get("agent_name") == traj.agent_name
                    for t in recent
                )
                assert found, f"Trajectory {traj.trajectory_id} not found in Memori"

            # Verify metadata consistency
            for memori_traj in recent[:len(trajectories)]:
                original = next(
                    (t for t in trajectories if t.trajectory_id == memori_traj.get("trajectory_id")),
                    None
                )
                if original:
                    assert memori_traj.get("generation") == original.generation
                    assert memori_traj.get("agent_name") == original.agent_name

            logger.info("Data consistency verified")

            duration_ms = (time.time() - start) * 1000
            self.log_result(
                test_name,
                True,
                duration_ms,
                metrics={
                    "trajectories_created": len(trajectories),
                    "trajectories_verified": len(trajectories),
                    "consistency_check": "passed",
                }
            )

        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.log_result(test_name, False, duration_ms, str(e))

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all validation tests"""
        logger.info("=" * 70)
        logger.info("VPS DEPLOYMENT VALIDATION TEST SUITE")
        logger.info("=" * 70)
        logger.info("")

        # Run tests in order
        await self.test_dreamgym_integration()
        await self.test_memori_backend()
        await self.test_trajectory_mirroring()
        await self.test_hybrid_buffer_ratio()
        await self.test_data_consistency()

        # Generate report
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)

        logger.info("")
        logger.info("=" * 70)
        logger.info("TEST SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total Tests: {total}")
        logger.info(f"Passed: {passed} (✓)")
        logger.info(f"Failed: {failed} (✗)")
        logger.info(f"Success Rate: {(passed/total)*100:.1f}%")
        logger.info("")

        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / total) * 100,
            "duration_minutes": (
                datetime.now(timezone.utc) - self.start_time
            ).total_seconds() / 60,
            "results": [r.to_dict() for r in self.results],
        }

    def save_report(self, output_path: str = "vps_deployment_test_report.json") -> None:
        """Save test report to file"""
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tests": [r.to_dict() for r in self.results],
            "summary": {
                "total": len(self.results),
                "passed": sum(1 for r in self.results if r.passed),
                "failed": sum(1 for r in self.results if not r.passed),
            },
        }

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Report saved to {output}")


async def main():
    """Main entry point"""
    validator = VPSDeploymentValidator()

    try:
        summary = await validator.run_all_tests()
        validator.save_report()

        logger.info("")
        logger.info(f"Overall Success Rate: {summary['success_rate']:.1f}%")
        logger.info(f"Duration: {summary['duration_minutes']:.1f} minutes")

        # Exit code based on pass/fail
        return 0 if summary["failed"] == 0 else 1

    except Exception as e:
        logger.error(f"Test suite error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
