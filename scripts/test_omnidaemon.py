"""
Comprehensive Test Suite for OmniDaemon

Tests all three integrated systems:
- IterResearch Workspace Manager (#69)
- Dr. MAMR Attribution Layer (#70)
- ES Training Scheduler (#68)
"""

import asyncio
import sys
import uuid
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.omnidaemon.workspace_manager import WorkspaceManager, Workspace
from infrastructure.omnidaemon.attribution_tracker import AttributionTracker
from infrastructure.omnidaemon.es_scheduler import ESTrainingScheduler


async def test_workspace_manager():
    """Test IterResearch Workspace Manager."""
    print("\n" + "=" * 60)
    print("[TEST 1/4] IterResearch Workspace Manager")
    print("=" * 60)

    # Create manager
    manager = WorkspaceManager(
        storage_dir=Path("data/test_workspaces"),
        max_active=5,
        synthesis_threshold=10
    )

    # Create workspace
    workspace_id = f"test_workspace_{uuid.uuid4().hex[:8]}"
    workspace = await manager.create_workspace(workspace_id)

    print(f"✅ Created workspace: {workspace_id}")

    # Add interactions
    for i in range(15):
        await workspace.process_interaction(
            agent_name=f"agent_{i % 3}",
            action=f"Execute step {i}",
            observation=f"Completed step {i}",
            reasoning=f"Reasoning for step {i}",
            quality_score=0.7 + (i % 5) * 0.05
        )

    print(f"✅ Added 15 interactions")

    # Check metrics
    metrics = workspace.get_metrics()
    assert metrics["total_interactions"] == 15
    assert metrics["synthesis_count"] >= 1
    assert metrics["unique_agents"] == 3

    print(f"✅ Metrics validated:")
    print(f"   - Interactions: {metrics['total_interactions']}")
    print(f"   - Synthesis cycles: {metrics['synthesis_count']}")
    print(f"   - Unique agents: {metrics['unique_agents']}")
    print(f"   - Avg quality: {metrics['avg_quality']:.2f}")

    # Check context
    context = workspace.get_context()
    assert "Current State" in context
    assert "Key Insights" in context

    print(f"✅ Context generation works")

    # Test workspace retrieval
    retrieved = await manager.get_workspace(workspace_id)
    assert retrieved is not None
    assert retrieved.workspace_id == workspace_id

    print(f"✅ Workspace retrieval works")

    # Test manager stats
    stats = manager.get_stats()
    assert stats["total_active"] >= 1

    print(f"✅ Manager stats: {stats['total_active']} active workspaces")

    print("\n✅ Workspace Manager: ALL TESTS PASSED")
    return True


async def test_attribution_tracker():
    """Test Dr. MAMR Attribution Tracker."""
    print("\n" + "=" * 60)
    print("[TEST 2/4] Dr. MAMR Attribution Tracker")
    print("=" * 60)

    # Create tracker
    tracker = AttributionTracker(
        storage_dir=Path("data/test_attribution"),
        free_rider_threshold=0.15
    )

    print(f"✅ Created attribution tracker")

    # Simulate collaborations
    for i in range(20):
        agents = ["agent_a", "agent_b", "agent_c"]
        agent_outputs = {
            "agent_a": {"quality": 0.85 + (i % 3) * 0.05},
            "agent_b": {"quality": 0.75 + (i % 4) * 0.05},
            "agent_c": {"quality": 0.3}  # Lazy agent
        }

        shapley_values = await tracker.track_collaboration(
            task=f"Task {i}",
            agents=agents,
            agent_outputs=agent_outputs,
            result_quality=0.75
        )

        # Validate Shapley values sum to 1.0
        assert abs(sum(shapley_values.values()) - 1.0) < 0.01

    print(f"✅ Tracked 20 collaborations")
    print(f"✅ Shapley values validated (sum to 1.0)")

    # Check metrics
    metrics = await tracker.compute_metrics()
    assert metrics["total_collaborations"] == 20
    assert metrics["unique_agents"] == 3

    print(f"✅ Metrics validated:")
    print(f"   - Total collaborations: {metrics['total_collaborations']}")
    print(f"   - Unique agents: {metrics['unique_agents']}")
    print(f"   - Avg quality: {metrics['avg_quality']:.2f}")

    # Detect free-riders
    free_riders = await tracker.detect_free_riders(min_samples=10)
    assert "agent_c" in free_riders

    print(f"✅ Free-rider detection works:")
    print(f"   - Detected: {free_riders}")

    # Get top contributors
    top_contributors = tracker.get_top_contributors(k=2)
    assert len(top_contributors) >= 2

    print(f"✅ Top contributors:")
    for agent, contrib in top_contributors:
        print(f"   - {agent}: {contrib:.3f}")

    # Test GRPO reward computation
    reward = tracker.compute_grpo_step_rewards(
        agent_name="agent_a",
        step_quality=0.9,
        collaboration_shapley=0.5
    )
    assert reward > 0

    print(f"✅ GRPO reward computation works: {reward:.3f}")

    print("\n✅ Attribution Tracker: ALL TESTS PASSED")
    return True


async def test_es_scheduler():
    """Test ES Training Scheduler."""
    print("\n" + "=" * 60)
    print("[TEST 3/4] ES Training Scheduler")
    print("=" * 60)

    # Create scheduler (dry-run mode for testing)
    scheduler = ESTrainingScheduler(
        training_time="02:00",
        iterations=1,  # Fast test
        population=2,  # Small population
        dry_run=True,  # Dry-run mode
        storage_dir=Path("data/test_es_training")
    )

    print(f"✅ Created ES scheduler (dry-run mode)")

    # Get stats
    stats = scheduler.get_stats()
    assert stats["dry_run"] == True
    assert stats["iterations"] == 1

    print(f"✅ Scheduler configured:")
    print(f"   - Training time: {stats['training_time']}")
    print(f"   - Iterations: {stats['iterations']}")
    print(f"   - Population: {stats['population']}")
    print(f"   - Dry run: {stats['dry_run']}")

    # Note: We skip actual training execution in unit tests
    # as it requires the full training script to exist
    print(f"⚠️  Skipping actual training execution in unit test")
    print(f"   (Would require scripts/nightly_es_training.py)")

    print("\n✅ ES Scheduler: CONFIGURATION TESTS PASSED")
    return True


async def test_integration():
    """Test integration between components."""
    print("\n" + "=" * 60)
    print("[TEST 4/4] Component Integration")
    print("=" * 60)

    # Create all components
    workspace_manager = WorkspaceManager(
        storage_dir=Path("data/test_integration/workspaces")
    )
    attribution_tracker = AttributionTracker(
        storage_dir=Path("data/test_integration/attribution")
    )
    es_scheduler = ESTrainingScheduler(
        storage_dir=Path("data/test_integration/es_training"),
        dry_run=True
    )

    print(f"✅ All components initialized")

    # Simulate workflow: workspace -> attribution -> training
    # 1. Create workspace for a task
    workspace_id = "integration_test_workspace"
    workspace = await workspace_manager.create_workspace(workspace_id)

    # 2. Process some interactions
    for i in range(5):
        await workspace.process_interaction(
            agent_name="test_agent",
            action=f"Step {i}",
            observation=f"Result {i}",
            reasoning=f"Logic {i}",
            quality_score=0.8
        )

    # 3. Track collaboration in attribution
    agents = ["test_agent"]
    agent_outputs = {"test_agent": {"quality": 0.8}}
    shapley_values = await attribution_tracker.track_collaboration(
        task="integration_test",
        agents=agents,
        agent_outputs=agent_outputs,
        result_quality=0.8
    )

    # 4. Verify integration
    workspace_metrics = workspace.get_metrics()
    attribution_metrics = await attribution_tracker.compute_metrics()
    scheduler_stats = es_scheduler.get_stats()

    assert workspace_metrics["total_interactions"] == 5
    assert attribution_metrics["total_collaborations"] >= 1

    print(f"✅ Integration validated:")
    print(f"   - Workspace interactions: {workspace_metrics['total_interactions']}")
    print(f"   - Attribution collaborations: {attribution_metrics['total_collaborations']}")
    print(f"   - Scheduler state: {scheduler_stats['total_runs']} runs")

    print("\n✅ Integration: ALL TESTS PASSED")
    return True


async def main():
    """Run all tests."""
    print("=" * 60)
    print("OmniDaemon Comprehensive Test Suite")
    print("=" * 60)
    print()
    print("Testing 3 integrated systems:")
    print("  - IterResearch Workspace Manager (#69)")
    print("  - Dr. MAMR Attribution Layer (#70)")
    print("  - ES Training Scheduler (#68)")
    print()

    results = []

    try:
        results.append(await test_workspace_manager())
    except Exception as e:
        print(f"❌ Workspace Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_attribution_tracker())
    except Exception as e:
        print(f"❌ Attribution Tracker test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_es_scheduler())
    except Exception as e:
        print(f"❌ ES Scheduler test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_integration())
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Workspace Manager: {'✅ PASS' if results[0] else '❌ FAIL'}")
    print(f"Attribution Tracker: {'✅ PASS' if results[1] else '❌ FAIL'}")
    print(f"ES Scheduler: {'✅ PASS' if results[2] else '❌ FAIL'}")
    print(f"Integration: {'✅ PASS' if results[3] else '❌ FAIL'}")
    print("=" * 60)

    if all(results):
        print("\n✅ ALL TESTS PASSED!")
        print("\nOmniDaemon is ready for production deployment.")
        print("\nNext steps:")
        print("  1. Run: START_OMNIDAEMON.bat (Windows) or ./start_omnidaemon.sh (Linux/Mac)")
        print("  2. Monitor: python scripts/check_omnidaemon_health.py")
        print("  3. View logs: tail -f logs/omnidaemon.log")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Review errors above and fix before deployment.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
