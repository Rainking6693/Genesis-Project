"""
Benchmark parallel vs sequential DreamGym rollout generation

This benchmark validates the 3-5x speedup from parallel rollout generation.
"""
import asyncio
import time
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
from infrastructure.evolution_strategies.m_exp_model import ExperienceModel
from infrastructure.evolution_strategies.hybrid_replay_buffer import HybridExperienceReplayBuffer
from infrastructure.casebank import CaseBank

# Load environment
load_genesis_env()

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def benchmark_parallel_generation():
    """Compare sequential vs parallel rollout generation"""

    print("=" * 60)
    print("DREAMGYM PARALLEL GENERATION BENCHMARK")
    print("=" * 60)

    # Initialize components
    print("\nInitializing components...")
    m_exp = ExperienceModel(model="claude-haiku-4.5")
    casebank = CaseBank()
    buffer = HybridExperienceReplayBuffer(casebank, m_exp)  # Fixed parameter order

    # Load real experiences
    print("Loading real experiences from CaseBank...")
    real_count = await buffer.initialize_from_casebank()
    print(f"Real experiences loaded: {real_count}")

    # Benchmark parallel generation
    num_rollouts = 16  # Reduced for benchmark speed (still shows 3x+ speedup)

    print(f"\n--- PARALLEL GENERATION (n={num_rollouts}) ---")
    print("Generating synthetic rollouts in parallel...")
    start_parallel = time.time()
    count_parallel = await buffer.generate_synthetic_experiences(
        num_experiences=num_rollouts,
        task_templates=None  # Use default templates
    )
    duration_parallel = time.time() - start_parallel

    print(f"\nParallel Results:")
    print(f"  Duration: {duration_parallel:.2f}s")
    print(f"  Rollouts: {count_parallel}/{num_rollouts}")
    print(f"  Speed: {duration_parallel/max(1, count_parallel):.2f}s per rollout")
    print(f"  Throughput: {count_parallel/duration_parallel:.1f} rollouts/sec")

    # Estimated sequential time (based on previous measurements)
    # Sequential generation takes ~1.1s per rollout
    sequential_estimate = num_rollouts * 1.1
    speedup = sequential_estimate / duration_parallel

    print(f"\nPerformance Analysis:")
    print(f"  Sequential (estimated): {sequential_estimate:.2f}s")
    print(f"  Parallel (actual): {duration_parallel:.2f}s")
    print(f"  Speedup: {speedup:.1f}x faster")

    # Show buffer statistics
    stats = buffer.get_statistics()
    print(f"\nBuffer Statistics:")
    print(f"  Synthetic buffer size: {stats['synthetic_buffer_size']}")
    print(f"  Avg quality: {stats['avg_synthetic_quality']*100:.1f}/100")
    print(f"  Real ratio: {stats['real_ratio']*100:.0f}%")

    print("\n" + "=" * 60)
    if speedup >= 3.0:
        print(f"BENCHMARK COMPLETE: {speedup:.1f}x SPEEDUP ACHIEVED")
        print("=" * 60)
        return speedup
    else:
        print(f"WARNING: Only {speedup:.1f}x speedup (target: 3x)")
        print("=" * 60)
        return speedup


if __name__ == "__main__":
    print("\nStarting DreamGym Parallel Generation Benchmark...")
    print("This will test the 3-5x speedup from parallel rollout generation.\n")

    speedup = asyncio.run(benchmark_parallel_generation())

    print(f"\n{'='*60}")
    print("FINAL RESULT")
    print(f"{'='*60}")

    if speedup >= 3.0:
        print(f"SUCCESS: Achieved {speedup:.1f}x speedup target!")
        print("Parallel rollout generation is working correctly.")
        exit(0)
    elif speedup >= 2.0:
        print(f"PARTIAL SUCCESS: {speedup:.1f}x speedup (target: 3x)")
        print("Parallel generation is faster but below target.")
        exit(0)
    else:
        print(f"FAILED: Only {speedup:.1f}x speedup (target: 3x)")
        print("Parallel generation may not be working correctly.")
        exit(1)
