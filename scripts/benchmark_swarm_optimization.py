"""
BENCHMARK: SWARM OPTIMIZATION vs RANDOM ASSIGNMENT
Version: 1.0
Last Updated: November 2, 2025

Comprehensive benchmark comparing Inclusive Fitness PSO optimization
against random team assignment.

Expected Results (from Rosseau et al., 2025):
- 15-20% improvement in team performance
- Better capability coverage
- Higher cooperation scores

Metrics:
1. Team fitness score
2. Task success rate
3. Capability coverage
4. Genotype diversity
5. Cooperation score
6. Execution time
"""

import time
import random
import statistics
from typing import List, Dict, Tuple
from dataclasses import dataclass

from infrastructure.swarm.swarm_halo_bridge import (
    create_swarm_halo_bridge,
    GENESIS_DEFAULT_PROFILES,
)
from infrastructure.inclusive_fitness_swarm import TaskRequirement


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run"""
    method: str  # "PSO" or "Random"
    fitness_score: float
    team_size: int
    capability_coverage: float
    genotype_diversity: float
    cooperation_score: float
    execution_time: float
    agent_names: List[str]


def run_pso_optimization(
    bridge,
    task: TaskRequirement,
    verbose: bool = False
) -> BenchmarkResult:
    """
    Run PSO optimization and return metrics

    Args:
        bridge: SwarmHALOBridge instance
        task: Task requirements
        verbose: Print progress

    Returns:
        BenchmarkResult with all metrics
    """
    start_time = time.time()

    # Optimize team
    agent_names, fitness, explanations = bridge.optimize_team(
        task_id=task.task_id,
        required_capabilities=task.required_capabilities,
        team_size_range=task.team_size_range,
        priority=task.priority,
        verbose=verbose
    )

    execution_time = time.time() - start_time

    # Calculate metrics
    agent_dict = {agent.name: agent for agent in bridge.swarm_agents}
    team_capabilities = set()
    for name in agent_names:
        team_capabilities.update(agent_dict[name].capabilities)

    required = set(task.required_capabilities)
    coverage = len(required & team_capabilities) / len(required) if required else 0.0

    diversity = bridge.get_team_genotype_diversity(agent_names)
    cooperation = bridge.get_team_cooperation_score(agent_names)

    return BenchmarkResult(
        method="PSO",
        fitness_score=fitness,
        team_size=len(agent_names),
        capability_coverage=coverage,
        genotype_diversity=diversity,
        cooperation_score=cooperation,
        execution_time=execution_time,
        agent_names=agent_names
    )


def run_random_assignment(
    bridge,
    task: TaskRequirement,
    seed: int = None
) -> BenchmarkResult:
    """
    Run random team assignment and return metrics

    Args:
        bridge: SwarmHALOBridge instance
        task: Task requirements
        seed: Random seed

    Returns:
        BenchmarkResult with all metrics
    """
    start_time = time.time()

    # Random team selection
    rng = random.Random(seed)
    min_size, max_size = task.team_size_range
    team_size = rng.randint(min_size, max_size)
    agent_names = [agent.name for agent in rng.sample(bridge.swarm_agents, team_size)]

    execution_time = time.time() - start_time

    # Evaluate team
    agents = [a for a in bridge.swarm_agents if a.name in agent_names]
    outcome = bridge.swarm.evaluate_team(agents, task, simulate=True)

    # Calculate fitness (same as PSO evaluation)
    total_inclusive_fitness = 0.0
    for agent in agents:
        inclusive_fitness = bridge.swarm.inclusive_fitness_reward(
            agent=agent,
            action="team_task",
            outcome=outcome,
            team=agents
        )
        total_inclusive_fitness += inclusive_fitness

    avg_fitness = total_inclusive_fitness / len(agents)
    if outcome.success:
        avg_fitness *= 1.5

    # Calculate metrics
    agent_dict = {agent.name: agent for agent in bridge.swarm_agents}
    team_capabilities = set()
    for name in agent_names:
        team_capabilities.update(agent_dict[name].capabilities)

    required = set(task.required_capabilities)
    coverage = len(required & team_capabilities) / len(required) if required else 0.0

    diversity = bridge.get_team_genotype_diversity(agent_names)
    cooperation = bridge.get_team_cooperation_score(agent_names)

    return BenchmarkResult(
        method="Random",
        fitness_score=avg_fitness,
        team_size=len(agent_names),
        capability_coverage=coverage,
        genotype_diversity=diversity,
        cooperation_score=cooperation,
        execution_time=execution_time,
        agent_names=agent_names
    )


def print_comparison(
    pso_results: List[BenchmarkResult],
    random_results: List[BenchmarkResult]
):
    """
    Print comprehensive comparison of PSO vs Random

    Args:
        pso_results: List of PSO benchmark results
        random_results: List of Random benchmark results
    """
    print("\n" + "=" * 80)
    print("SWARM OPTIMIZATION BENCHMARK RESULTS")
    print("=" * 80)

    # Aggregate metrics
    metrics = [
        ("Fitness Score", "fitness_score"),
        ("Capability Coverage", "capability_coverage"),
        ("Genotype Diversity", "genotype_diversity"),
        ("Cooperation Score", "cooperation_score"),
        ("Execution Time (s)", "execution_time"),
    ]

    print("\n{:<25} {:<15} {:<15} {:<15}".format(
        "Metric", "PSO (Avg)", "Random (Avg)", "Improvement"
    ))
    print("-" * 80)

    for metric_name, metric_attr in metrics:
        pso_values = [getattr(r, metric_attr) for r in pso_results]
        random_values = [getattr(r, metric_attr) for r in random_results]

        pso_avg = statistics.mean(pso_values)
        random_avg = statistics.mean(random_values)

        if random_avg > 0:
            improvement = ((pso_avg - random_avg) / random_avg) * 100
            improvement_str = f"{improvement:+.1f}%"
        else:
            improvement_str = "N/A"

        print("{:<25} {:<15.3f} {:<15.3f} {:<15}".format(
            metric_name, pso_avg, random_avg, improvement_str
        ))

    # Statistical significance
    print("\n" + "-" * 80)
    print("STATISTICAL SUMMARY:")
    print("-" * 80)

    for metric_name, metric_attr in metrics[:4]:  # Exclude execution time
        pso_values = [getattr(r, metric_attr) for r in pso_results]
        random_values = [getattr(r, metric_attr) for r in random_results]

        pso_std = statistics.stdev(pso_values) if len(pso_values) > 1 else 0
        random_std = statistics.stdev(random_values) if len(random_values) > 1 else 0

        print(f"\n{metric_name}:")
        print(f"  PSO:    {statistics.mean(pso_values):.3f} ± {pso_std:.3f}")
        print(f"  Random: {statistics.mean(random_values):.3f} ± {random_std:.3f}")

    # Overall assessment
    print("\n" + "=" * 80)
    pso_fitness = statistics.mean([r.fitness_score for r in pso_results])
    random_fitness = statistics.mean([r.fitness_score for r in random_results])
    overall_improvement = ((pso_fitness - random_fitness) / random_fitness) * 100

    print("OVERALL ASSESSMENT:")
    print(f"  PSO Improvement: {overall_improvement:+.1f}%")

    if overall_improvement >= 15:
        print("  Status: ✅ EXCEEDS EXPECTED 15-20% IMPROVEMENT")
    elif overall_improvement >= 10:
        print("  Status: ✅ SIGNIFICANT IMPROVEMENT (10-15%)")
    elif overall_improvement >= 5:
        print("  Status: ⚠️  MODERATE IMPROVEMENT (5-10%)")
    else:
        print("  Status: ❌ BELOW EXPECTED IMPROVEMENT (<5%)")

    print("=" * 80 + "\n")


def main():
    """Run comprehensive benchmark"""
    print("Initializing Swarm-HALO Bridge with Genesis 15 agents...")

    # Create bridge with Genesis default profiles
    bridge = create_swarm_halo_bridge(
        GENESIS_DEFAULT_PROFILES,
        n_particles=30,
        max_iterations=50,
        random_seed=42
    )

    # Define benchmark tasks
    tasks = [
        TaskRequirement(
            task_id="ecommerce_launch",
            required_capabilities=["coding", "ads", "deployment", "payments"],
            team_size_range=(4, 6),
            priority=1.0
        ),
        TaskRequirement(
            task_id="saas_product",
            required_capabilities=["coding", "testing", "customer_service", "email_marketing"],
            team_size_range=(5, 7),
            priority=1.5
        ),
        TaskRequirement(
            task_id="content_platform",
            required_capabilities=["writing", "seo", "content_strategy", "social_media"],
            team_size_range=(3, 5),
            priority=1.0
        ),
        TaskRequirement(
            task_id="fintech_app",
            required_capabilities=["coding", "security_audit", "payments", "compliance"],
            team_size_range=(4, 6),
            priority=2.0
        ),
    ]

    print(f"\nRunning benchmark with {len(tasks)} tasks, 5 runs each...")
    print("(This may take 1-2 minutes)\n")

    pso_results = []
    random_results = []

    for i, task in enumerate(tasks, 1):
        print(f"Task {i}/{len(tasks)}: {task.task_id}...")

        for run in range(5):
            # PSO optimization
            pso_result = run_pso_optimization(bridge, task, verbose=False)
            pso_results.append(pso_result)

            # Random assignment
            random_result = run_random_assignment(bridge, task, seed=run)
            random_results.append(random_result)

    # Print comparison
    print_comparison(pso_results, random_results)

    # Print example teams
    print("\nEXAMPLE OPTIMIZED TEAMS:")
    print("-" * 80)
    for i, task in enumerate(tasks):
        result = pso_results[i * 5]  # First run of each task
        print(f"\n{task.task_id}:")
        print(f"  Team: {', '.join(result.agent_names)}")
        print(f"  Fitness: {result.fitness_score:.3f}")
        print(f"  Coverage: {result.capability_coverage:.1%}")
        print(f"  Cooperation: {result.cooperation_score:.3f}")


if __name__ == "__main__":
    main()
