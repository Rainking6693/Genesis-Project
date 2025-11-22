# scripts/test_iterresearch_integration.py
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.iterresearch_workspace import create_workspace, Interaction

async def test_workspace_basic():
    """Test basic workspace operations."""
    workspace = create_workspace("test_task_001")

    # Add interactions
    for i in range(55):  # Trigger synthesis at 50
        await workspace.add_interaction(
            agent_name=f"agent_{i % 3}",
            action=f"Execute step {i}",
            observation=f"Completed step {i}",
            reasoning=f"Reasoning for step {i}",
            quality_score=0.7 + (i % 10) * 0.03
        )

    # Check metrics
    metrics = workspace.get_metrics()
    assert metrics["total_interactions"] == 55
    assert metrics["synthesis_count"] == 1
    assert metrics["unique_agents"] == 3

    # Check workspace context
    context = workspace.get_workspace_context()
    assert "Current State" in context
    assert "Key Insights" in context

    print("[OK] Basic workspace test passed")
    print(f"Metrics: {metrics}")

async def test_workspace_with_trajectorypool():
    """Test workspace integration with TrajectoryPool."""
    from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus, OperatorType
    import uuid

    pool = TrajectoryPool(agent_name="test_agent")
    workspace = pool.attach_workspace("test_task_002")

    # Add interactions to workspace
    await workspace.add_interaction(
        agent_name="builder_agent",
        action="Build auth system",
        observation="Auth system created",
        reasoning="Used JWT approach",
        quality_score=0.92
    )

    # Add trajectory with workspace snapshot
    trajectory = Trajectory(
        trajectory_id=str(uuid.uuid4()),
        generation=1,
        agent_name="builder_agent",
        operator_applied=OperatorType.BASELINE.value,
        code_changes="Added auth",
        problem_diagnosis="Need auth",
        proposed_strategy="JWT",
        status=TrajectoryStatus.SUCCESS.value,
        success_score=0.92,
        test_results={},
        tools_used=[],
        modified_files=[],
        execution_time_seconds=10.0
    )

    await pool.add_trajectory_with_workspace(
        trajectory,
        workspace_snapshot=workspace.evolving_report
    )

    print("[OK] TrajectoryPool integration test passed")

async def main():
    print("Testing IterResearch Integration...")
    print("-" * 60)

    await test_workspace_basic()
    await test_workspace_with_trajectorypool()

    print("-" * 60)
    print("[SUCCESS] All IterResearch tests passed!")

if __name__ == "__main__":
    asyncio.run(main())
