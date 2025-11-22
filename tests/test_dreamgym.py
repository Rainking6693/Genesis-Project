import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.casebank import CaseBank
from infrastructure.trajectory_pool import TrajectoryPool
from infrastructure.evolution_strategies.m_exp_model import ExperienceModel, State
from infrastructure.evolution_strategies.hybrid_replay_buffer import HybridExperienceReplayBuffer
from infrastructure.evolution_strategies.curriculum_generator import AdaptiveCurriculumGenerator
from infrastructure.evolution_strategies.darwin_dreamgym_bridge import DreamGymDarwinBridge


@pytest.mark.asyncio
async def test_parallel_rollout_generation_tracks_statistics():
    casebank = CaseBank()
    model = ExperienceModel(max_rollout_steps=3)
    buffer = HybridExperienceReplayBuffer(
        casebank=casebank,
        experience_model=model,
        min_quality_threshold=0.1
    )

    generated = await buffer.generate_synthetic_experiences(num_experiences=5)
    stats = buffer.get_statistics()

    assert generated == stats["synthetic_generated"]
    assert stats["synthetic_buffer_size"] >= generated


@pytest.mark.asyncio
async def test_darwin_bridge_records_trajectories_and_cases():
    trajectory_pool = TrajectoryPool(agent_name="bridge_tester")
    casebank = CaseBank()
    curriculum_gen = AdaptiveCurriculumGenerator(trajectory_pool)

    bridge = DreamGymDarwinBridge(
        curriculum_generator=curriculum_gen,
        trajectory_pool=trajectory_pool,
        casebank=casebank
    )

    metrics = await bridge.run_improvement_cycle(
        agent_id="tester",
        num_tasks=2,
        parallel_tasks=1
    )

    assert metrics["tasks_attempted"] >= metrics["tasks_successful"]
    assert trajectory_pool.size() >= metrics["tasks_successful"]
    stored_cases = await casebank.get_all_cases()
    assert len(stored_cases) >= metrics["high_quality_cases"]
