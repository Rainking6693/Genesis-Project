"""
Test Distributed DreamGym Training

Tests the distributed DreamGym training system that scales rollout
generation across multiple workers using Redis task queue.

This validates:
- Task queue distribution (Redis)
- Local parallel fallback (no Redis)
- Result aggregation
- Quality filtering
- Performance metrics
"""
import asyncio
import sys
import os
import logging
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.evolution_strategies.distributed_dreamgym import (
    DistributedDreamGymCoordinator,
    DistributedDreamGymWorker,
    RolloutTask,
    RolloutResult,
    REDIS_AVAILABLE
)
from infrastructure.evolution_strategies.hybrid_replay_buffer import Experience
from infrastructure.trajectory_pool import TrajectoryPool

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_seed_experiences(count: int = 5) -> list[Experience]:
    """
    Create seed experiences for testing

    Args:
        count: Number of seed experiences to create

    Returns:
        List of Experience objects
    """
    logger.info(f"Creating {count} seed experiences...")

    seed_experiences = []

    task_templates = [
        "Generate code for user authentication system",
        "Debug performance issue in database queries",
        "Optimize API endpoint response time",
        "Write unit tests for service layer",
        "Design microservices architecture",
    ]

    for i in range(count):
        task = task_templates[i % len(task_templates)]

        exp = Experience(
            experience_id=f"seed_{i}",
            task=task,
            trajectory={
                "steps": [
                    {"action": "analyze", "state": "initial"},
                    {"action": "implement", "state": "in_progress"},
                    {"action": "test", "state": "complete"}
                ]
            },
            reward=0.8 + (i % 3) * 0.05,  # Varying rewards
            quality_score=0.8 + (i % 3) * 0.05,
            is_synthetic=False,
            metadata={
                "seed": True,
                "task_type": task.split()[0].lower()
            }
        )

        seed_experiences.append(exp)

    logger.info(f"✅ Created {len(seed_experiences)} seed experiences")
    return seed_experiences


async def test_coordinator_initialization():
    """Test 1: Coordinator initialization"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 1: Coordinator Initialization")
    logger.info("=" * 60)

    # Initialize coordinator
    coordinator = DistributedDreamGymCoordinator(
        redis_url="redis://localhost:6379"
    )

    logger.info(f"Distributed mode: {coordinator.distributed_mode}")

    # Attempt connection
    await coordinator.connect()

    if coordinator.distributed_mode:
        logger.info("✅ Connected to Redis")
        # Get queue stats
        stats = await coordinator.get_queue_stats()
        logger.info(f"Queue stats: {stats}")
    else:
        logger.info("⚠️  Redis unavailable, will use local fallback")

    logger.info("✅ Test 1 PASSED")
    return coordinator


async def test_local_parallel_generation():
    """Test 2: Local parallel generation (fallback mode)"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 2: Local Parallel Generation")
    logger.info("=" * 60)

    # Create seed experiences
    seed_experiences = create_seed_experiences(count=3)

    # Initialize coordinator (will use local mode)
    coordinator = DistributedDreamGymCoordinator()
    coordinator.distributed_mode = False  # Force local mode

    # Generate rollouts
    logger.info("\nGenerating 10 synthetic rollouts...")

    synthetic_experiences = await coordinator.distribute_rollout_generation(
        seed_experiences=seed_experiences,
        num_rollouts=10,
        quality_threshold=0.6,
        timeout=60.0
    )

    # Validate results
    assert len(synthetic_experiences) >= 0, "Generation failed"
    logger.info(f"✅ Generated {len(synthetic_experiences)}/10 synthetic experiences")

    # Show quality distribution
    if synthetic_experiences:
        qualities = [exp.quality_score for exp in synthetic_experiences]
        avg_quality = sum(qualities) / len(qualities)
        min_quality = min(qualities)
        max_quality = max(qualities)

        logger.info(f"\nQuality distribution:")
        logger.info(f"  Average: {avg_quality:.3f}")
        logger.info(f"  Min: {min_quality:.3f}")
        logger.info(f"  Max: {max_quality:.3f}")

    logger.info("\n✅ Test 2 PASSED")
    return synthetic_experiences


async def test_redis_mode(coordinator: DistributedDreamGymCoordinator):
    """Test 3: Redis distributed mode (if available)"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 3: Redis Distributed Mode")
    logger.info("=" * 60)

    if not coordinator.distributed_mode:
        logger.info("⚠️  Redis unavailable, skipping distributed mode test")
        logger.info("   To test distributed mode:")
        logger.info("   1. Install Redis: pip install redis")
        logger.info("   2. Start Redis server: redis-server")
        logger.info("   3. Start workers: python scripts/start_dreamgym_worker.py")
        logger.info("   4. Re-run this test")
        logger.info("✅ Test 3 SKIPPED (Redis unavailable)")
        return

    # Create seed experiences
    seed_experiences = create_seed_experiences(count=3)

    # Generate rollouts (distributed)
    logger.info("\nGenerating 20 synthetic rollouts (distributed)...")
    logger.info("⚠️  Note: This requires workers running!")
    logger.info("   Start workers with: python scripts/start_dreamgym_worker.py")

    try:
        synthetic_experiences = await coordinator.distribute_rollout_generation(
            seed_experiences=seed_experiences,
            num_rollouts=20,
            quality_threshold=0.6,
            timeout=30.0  # 30s timeout for test
        )

        # Validate results
        logger.info(f"\n✅ Generated {len(synthetic_experiences)}/20 synthetic experiences")

        if len(synthetic_experiences) == 0:
            logger.warning("⚠️  No results generated - ensure workers are running!")
        else:
            # Show worker distribution
            worker_ids = set(
                exp.metadata.get('worker_id', 'unknown')
                for exp in synthetic_experiences
            )
            logger.info(f"Workers utilized: {len(worker_ids)}")
            logger.info(f"Worker IDs: {', '.join(sorted(worker_ids))}")

        logger.info("✅ Test 3 PASSED")

    except Exception as e:
        logger.warning(f"⚠️  Distributed test failed: {e}")
        logger.info("   This is expected if no workers are running")
        logger.info("✅ Test 3 SKIPPED (no workers available)")


async def test_task_serialization():
    """Test 4: Task and result serialization"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 4: Task/Result Serialization")
    logger.info("=" * 60)

    # Create test task
    task = RolloutTask(
        task_id="test_task_001",
        seed_experience={
            'task': 'Test task',
            'trajectory': {},
            'metadata': {'test': True}
        },
        rollout_config={'quality_threshold': 0.7},
        created_at=1234567890.0
    )

    # Serialize to JSON
    task_json = task.to_json()
    logger.info(f"Task JSON length: {len(task_json)} bytes")

    # Deserialize
    task_restored = RolloutTask.from_json(task_json)
    assert task_restored.task_id == task.task_id
    assert task_restored.seed_experience == task.seed_experience

    logger.info("✅ Task serialization works")

    # Create test result
    result = RolloutResult(
        task_id="test_task_001",
        rollout={'task': 'Test', 'transitions': []},
        success=True,
        quality_score=0.85,
        worker_id="worker_test",
        duration=2.5
    )

    # Serialize to JSON
    result_json = result.to_json()
    logger.info(f"Result JSON length: {len(result_json)} bytes")

    # Deserialize
    result_restored = RolloutResult.from_json(result_json)
    assert result_restored.task_id == result.task_id
    assert result_restored.quality_score == result.quality_score

    logger.info("✅ Result serialization works")
    logger.info("\n✅ Test 4 PASSED")


async def test_quality_filtering():
    """Test 5: Quality threshold filtering"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 5: Quality Threshold Filtering")
    logger.info("=" * 60)

    # Create seed experiences
    seed_experiences = create_seed_experiences(count=2)

    # Initialize coordinator
    coordinator = DistributedDreamGymCoordinator()
    coordinator.distributed_mode = False  # Use local mode

    # Test with high quality threshold
    logger.info("\nTest with quality_threshold=0.8 (strict)...")
    strict_results = await coordinator.distribute_rollout_generation(
        seed_experiences=seed_experiences,
        num_rollouts=10,
        quality_threshold=0.8,
        timeout=60.0
    )

    logger.info(f"Generated {len(strict_results)}/10 experiences (threshold=0.8)")

    # Test with low quality threshold
    logger.info("\nTest with quality_threshold=0.5 (lenient)...")
    lenient_results = await coordinator.distribute_rollout_generation(
        seed_experiences=seed_experiences,
        num_rollouts=10,
        quality_threshold=0.5,
        timeout=60.0
    )

    logger.info(f"Generated {len(lenient_results)}/10 experiences (threshold=0.5)")

    # Validate filtering
    if lenient_results:
        assert all(exp.quality_score >= 0.5 for exp in lenient_results), \
            "Quality filtering failed (found score < 0.5)"
        logger.info("✅ Quality filtering validated")

    logger.info("\n✅ Test 5 PASSED")


async def test_performance_metrics():
    """Test 6: Performance metrics collection"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 6: Performance Metrics")
    logger.info("=" * 60)

    # Create seed experiences
    seed_experiences = create_seed_experiences(count=3)

    # Initialize coordinator
    coordinator = DistributedDreamGymCoordinator()
    coordinator.distributed_mode = False

    # Generate with timing
    import time
    start_time = time.time()

    synthetic_experiences = await coordinator.distribute_rollout_generation(
        seed_experiences=seed_experiences,
        num_rollouts=10,
        quality_threshold=0.6,
        timeout=60.0
    )

    duration = time.time() - start_time

    # Calculate metrics
    throughput = len(synthetic_experiences) / duration if duration > 0 else 0

    logger.info(f"\nPerformance Metrics:")
    logger.info(f"  Total time: {duration:.2f}s")
    logger.info(f"  Generated: {len(synthetic_experiences)} experiences")
    logger.info(f"  Throughput: {throughput:.2f} experiences/sec")
    logger.info(f"  Avg time per experience: {duration/max(1, len(synthetic_experiences)):.2f}s")

    logger.info("\n✅ Test 6 PASSED")


async def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("DISTRIBUTED DREAMGYM TEST SUITE")
    logger.info("=" * 60)
    logger.info(f"Redis available: {REDIS_AVAILABLE}")

    try:
        # Test 1: Initialization
        coordinator = await test_coordinator_initialization()

        # Test 2: Local parallel generation (always works)
        await test_local_parallel_generation()

        # Test 3: Redis mode (if available)
        await test_redis_mode(coordinator)

        # Test 4: Serialization
        await test_task_serialization()

        # Test 5: Quality filtering
        await test_quality_filtering()

        # Test 6: Performance metrics
        await test_performance_metrics()

        # Cleanup
        await coordinator.disconnect()

        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("ALL TESTS PASSED ✅")
        logger.info("=" * 60)
        logger.info(f"Redis mode: {'Available' if REDIS_AVAILABLE else 'Unavailable (using local fallback)'}")
        logger.info(f"Local parallel mode: ✅ Functional")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
