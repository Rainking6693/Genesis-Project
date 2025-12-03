import asyncio
import pytest

from infrastructure.latentmas_integration import (
    GenesisLatentMAS,
    LatentMASConfig,
)


@pytest.mark.asyncio
async def test_latentmas_credit_assignment_updates_trajectory_pool():
    """
    Run a real LatentMAS collaboration (no unittest.mock patches) and
    verify MATPO credit assignment writes back to the TrajectoryPool.
    """
    config = LatentMASConfig(
        enable_mock_mode=True,  # Allow latent generation without external LLM for CI
        require_integrations=False,
        require_credit_assignment=True,
    )

    genesis = GenesisLatentMAS(config)

    result = await genesis.run_business_task(
        task_description="Build a minimal landing page for testing",
        business_type="saas",
    )

    # Trajectory should be recorded
    assert result.latent_trajectory is not None
    assert genesis._trajectory_pool is not None
    assert result.latent_trajectory.trajectory_id in genesis._trajectory_pool.trajectories

    # Credits should be assigned and persisted onto the trajectory metadata
    assert genesis._credits_assigned_count > 0
    trajectory = genesis._trajectory_pool.trajectories[result.latent_trajectory.trajectory_id]
    assert trajectory.metadata.get("matpo_credits_assigned", 0) > 0

    # Metrics should report LLM call counters even in mock mode
    stats = genesis.get_stats()
    assert "llm_calls" in stats["metrics"]
    assert "credits_assigned" in stats["metrics"]
