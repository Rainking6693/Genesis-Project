"""
Performance Validation for CaseBank × Router Coupling

Simulates 1000 requests to measure routing distribution and cost reduction impact.
Validates 15-20% additional cost reduction beyond baseline routing.

Expected Results:
- Baseline (Day 1): 60% Haiku, 20% Sonnet, 20% VLM
- With Memory (Day 2): 75% Haiku, 10% Sonnet, 15% VLM (+15% additional cheap routing)
- Combined Reduction: ~82-85% total cost reduction
"""

import asyncio
import random
from typing import List, Dict, Any
from pathlib import Path
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.inference_router import InferenceRouter, ModelTier
from infrastructure.casebank import CaseBank


# Task templates for simulation
TASK_TEMPLATES = {
    "easy": [
        "Simple status check",
        "Basic greeting message",
        "Quick data lookup",
        "Simple calculation",
        "Basic text formatting"
    ],
    "moderate": [
        "Implement REST API endpoint with validation",
        "Design database schema for user management",
        "Create responsive UI component with React",
        "Write unit tests for authentication module",
        "Optimize SQL query performance"
    ],
    "hard": [
        "Design distributed consensus protocol",
        "Implement custom garbage collector",
        "Build real-time collaborative editing system",
        "Create machine learning pipeline for NLP",
        "Design fault-tolerant microservices architecture"
    ]
}


async def simulate_task_history(casebank: CaseBank, num_cases: int = 100):
    """
    Populate CaseBank with realistic task execution history.

    Simulation strategy:
    - Easy tasks: 90% success rate (reward 0.9)
    - Moderate tasks: 65% success rate (reward 0.65)
    - Hard tasks: 35% success rate (reward 0.35)
    """
    print(f"\nPopulating CaseBank with {num_cases} historical cases...")

    for _ in range(num_cases):
        # Random task difficulty distribution (60% easy, 30% moderate, 10% hard)
        difficulty = random.choices(
            ["easy", "moderate", "hard"],
            weights=[0.6, 0.3, 0.1]
        )[0]

        # Select random task from template
        task = random.choice(TASK_TEMPLATES[difficulty])

        # Assign reward based on difficulty
        if difficulty == "easy":
            reward = random.uniform(0.85, 0.95)  # High success
        elif difficulty == "moderate":
            reward = random.uniform(0.55, 0.75)  # Medium success
        else:
            reward = random.uniform(0.25, 0.45)  # Low success

        # Store case
        await casebank.add_case(
            state=task,
            action=f"Completed with {difficulty} difficulty",
            reward=reward,
            metadata={
                "agent": "simulation",
                "difficulty": difficulty
            }
        )

    print(f"CaseBank populated with {num_cases} cases")


async def run_baseline_simulation(num_requests: int = 1000):
    """
    Baseline routing (Day 1) - no memory signals.

    Expected distribution:
    - Haiku: ~60%
    - Sonnet: ~20%
    - VLM: ~20%
    """
    print("\n" + "=" * 70)
    print("BASELINE ROUTING (Day 1 - No Memory)")
    print("=" * 70)

    router = InferenceRouter(casebank=None)

    # Generate mix of tasks
    for _ in range(num_requests):
        difficulty = random.choices(
            ["easy", "moderate", "hard"],
            weights=[0.6, 0.3, 0.1]
        )[0]
        task = random.choice(TASK_TEMPLATES[difficulty])

        await router.route_request(
            agent_name="simulation_agent",
            task=task,
            context={}
        )

    stats = router.get_routing_stats()
    print(f"\nTotal requests: {stats['total_requests']}")
    print(f"Haiku: {stats['cheap']:.1%}")
    print(f"Sonnet: {stats['accurate']:.1%}")
    print(f"VLM: {stats['vlm']:.1%}")
    print(f"Cost reduction vs all-Sonnet: {stats['cost_reduction_estimate']:.2f}%")

    return stats


async def run_memory_routing_simulation(num_requests: int = 1000):
    """
    Memory-based routing (Day 2) - with CaseBank signals.

    Expected distribution:
    - Haiku: ~75% (+15% vs baseline)
    - Sonnet: ~10% (-10% vs baseline)
    - VLM: ~15% (-5% vs baseline)
    """
    print("\n" + "=" * 70)
    print("MEMORY ROUTING (Day 2 - With CaseBank)")
    print("=" * 70)

    # Create CaseBank and populate with history
    casebank = CaseBank(storage_path=":memory:")
    await simulate_task_history(casebank, num_cases=100)

    router = InferenceRouter(casebank=casebank)

    # Generate mix of tasks (some match history, some are new)
    cold_start_count = 0
    high_success_count = 0
    low_success_count = 0

    for _ in range(num_requests):
        # 70% tasks match history, 30% are new (cold start)
        if random.random() < 0.7:
            # Use task from history
            difficulty = random.choices(
                ["easy", "moderate", "hard"],
                weights=[0.6, 0.3, 0.1]
            )[0]
            task = random.choice(TASK_TEMPLATES[difficulty])

            if difficulty == "easy":
                high_success_count += 1
            elif difficulty == "hard":
                low_success_count += 1
        else:
            # New task (cold start)
            task = f"New unique task {random.randint(1000, 9999)}"
            cold_start_count += 1

        # Route with memory
        model, metadata = await router.route_with_memory(
            agent_name="simulation_agent",
            task=task,
            context={}
        )

    # Get statistics
    base_stats = router.get_routing_stats()
    memory_stats = router.get_memory_routing_stats()

    print(f"\nTotal requests: {memory_stats['total_memory_routed']}")
    print(f"\nMemory Routing Breakdown:")
    print(f"  Cold start → Haiku: {memory_stats['cold_start_cheap_pct']:.1%}")
    print(f"  High success → Haiku: {memory_stats['high_success_cheap_pct']:.1%}")
    print(f"  Low success → Sonnet: {memory_stats['low_success_accurate_pct']:.1%}")
    print(f"  Fallback to base: {memory_stats['no_memory_fallback_pct']:.1%}")

    print(f"\nModel Distribution:")
    print(f"  Haiku: {base_stats['cheap']:.1%}")
    print(f"  Sonnet: {base_stats['accurate']:.1%}")
    print(f"  VLM: {base_stats['vlm']:.1%}")

    print(f"\nCost Analysis:")
    print(f"  Additional cheap routing: +{memory_stats['additional_cheap_routing']:.1f}%")
    print(f"  Cost reduction vs all-Sonnet: {base_stats['cost_reduction_estimate']:.2f}%")

    return base_stats, memory_stats


async def main():
    """Run full validation suite"""
    print("\n" + "#" * 70)
    print("# CaseBank × Router Coupling Performance Validation")
    print("#" * 70)

    # Run baseline
    baseline_stats = await run_baseline_simulation(num_requests=1000)

    # Run memory routing
    memory_base_stats, memory_stats = await run_memory_routing_simulation(num_requests=1000)

    # Compare results
    print("\n" + "=" * 70)
    print("COMPARISON SUMMARY")
    print("=" * 70)

    haiku_increase = (memory_base_stats['cheap'] - baseline_stats['cheap']) * 100
    sonnet_decrease = (baseline_stats['accurate'] - memory_base_stats['accurate']) * 100

    print(f"\nRouting Distribution Changes:")
    print(f"  Haiku: {baseline_stats['cheap']:.1%} → {memory_base_stats['cheap']:.1%} (+{haiku_increase:.1f}%)")
    print(f"  Sonnet: {baseline_stats['accurate']:.1%} → {memory_base_stats['accurate']:.1%} (-{sonnet_decrease:.1f}%)")

    print(f"\nCost Reduction:")
    print(f"  Baseline (Day 1): {baseline_stats['cost_reduction_estimate']:.2f}%")
    print(f"  With Memory (Day 2): {memory_base_stats['cost_reduction_estimate']:.2f}%")
    print(f"  Additional reduction: +{memory_base_stats['cost_reduction_estimate'] - baseline_stats['cost_reduction_estimate']:.2f}%")

    # Validate targets
    print(f"\nTarget Validation:")
    target_haiku_increase = 15.0  # 15% increase in Haiku usage
    success = haiku_increase >= target_haiku_increase

    if success:
        print(f"  ✓ Target achieved: {haiku_increase:.1f}% Haiku increase (target: {target_haiku_increase}%)")
        print(f"  ✓ Additional cost reduction validated")
    else:
        print(f"  ✗ Target missed: {haiku_increase:.1f}% Haiku increase (target: {target_haiku_increase}%)")

    print("\n" + "#" * 70)
    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
