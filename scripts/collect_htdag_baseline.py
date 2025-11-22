#!/usr/bin/env python3
"""
HTDAG Baseline Metrics Collection Script

Runs HTDAG planner on 100 benchmark tasks and collects baseline metrics
for RL training comparison. Metrics include success rate, decomposition depth,
execution time, LLM call efficiency, and parallelism.

Usage:
    python scripts/collect_htdag_baseline.py

Output:
    data/htdag_benchmarks/baseline_results.json

Author: Oracle (Discovery Agent)
Date: October 27, 2025
"""

import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
import statistics

# Add project root to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.htdag_planner import HTDAGPlanner
from infrastructure.task_dag import TaskDAG, Task


logger = logging.getLogger(__name__)


@dataclass
class BaselineMetrics:
    """Metrics collected for each benchmark task."""
    task_id: int
    task_description: str
    success: bool
    decomposition_depth: int
    num_subtasks: int
    parallel_tasks: int
    has_cycles: bool
    execution_time: float
    llm_calls: int
    error_message: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class AggregatedMetrics:
    """Aggregated baseline metrics across all tasks."""
    total_tasks: int
    success_rate: float
    mean_depth: float
    std_depth: float
    mean_subtasks: float
    std_subtasks: float
    mean_parallel_tasks: float
    parallelism_ratio: float
    mean_execution_time: float
    std_execution_time: float
    mean_llm_calls: float
    std_llm_calls: float
    cycle_error_rate: float

    def to_dict(self) -> Dict:
        return asdict(self)


class HTDAGBaselineCollector:
    """Collects baseline metrics for HTDAG planner."""

    def __init__(self, htdag_planner: HTDAGPlanner, benchmark_tasks: List[str]):
        """
        Initialize baseline collector.

        Args:
            htdag_planner: HTDAG planner instance
            benchmark_tasks: List of benchmark task descriptions
        """
        self.planner = htdag_planner
        self.benchmark_tasks = benchmark_tasks
        self.results: List[BaselineMetrics] = []

        logger.info(f"Initialized baseline collector with {len(benchmark_tasks)} tasks")

    async def collect_all(self) -> List[BaselineMetrics]:
        """
        Run HTDAG on all benchmark tasks and collect metrics.

        Returns:
            List of baseline metrics for each task
        """
        logger.info("Starting baseline collection...")

        for i, task_desc in enumerate(self.benchmark_tasks):
            logger.info(f"[{i+1}/{len(self.benchmark_tasks)}] Processing: {task_desc[:60]}...")

            try:
                metrics = await self._collect_single_task(i, task_desc)
                self.results.append(metrics)

                logger.info(
                    f"  → Success={metrics.success}, Depth={metrics.decomposition_depth}, "
                    f"Subtasks={metrics.num_subtasks}, Time={metrics.execution_time:.2f}s"
                )

            except Exception as e:
                logger.error(f"  → ERROR: {str(e)}")
                # Record failed task
                self.results.append(BaselineMetrics(
                    task_id=i,
                    task_description=task_desc,
                    success=False,
                    decomposition_depth=0,
                    num_subtasks=0,
                    parallel_tasks=0,
                    has_cycles=False,
                    execution_time=0.0,
                    llm_calls=0,
                    error_message=str(e)
                ))

        logger.info(f"Baseline collection complete. Collected {len(self.results)} results.")
        return self.results

    async def _collect_single_task(self, task_id: int, task_desc: str) -> BaselineMetrics:
        """
        Collect metrics for single benchmark task.

        Args:
            task_id: Unique task identifier
            task_desc: Task description

        Returns:
            BaselineMetrics for this task
        """
        start_time = time.time()

        # Track LLM calls (if planner has instrumentation)
        initial_llm_calls = getattr(self.planner, '_total_llm_calls', 0)

        # Run HTDAG decomposition
        try:
            dag = await self.planner.decompose_task(task_desc, context={})
            success = True
            error_message = ""

        except Exception as e:
            # Decomposition failed
            dag = TaskDAG()
            success = False
            error_message = str(e)

        execution_time = time.time() - start_time

        # Compute metrics
        depth = dag.max_depth() if dag else 0
        num_subtasks = len(dag) if dag else 0
        parallel_tasks = self._count_parallel_tasks(dag) if dag else 0
        has_cycles = dag.has_cycle() if dag else False

        llm_calls = getattr(self.planner, '_total_llm_calls', 0) - initial_llm_calls

        metrics = BaselineMetrics(
            task_id=task_id,
            task_description=task_desc,
            success=success,
            decomposition_depth=depth,
            num_subtasks=num_subtasks,
            parallel_tasks=parallel_tasks,
            has_cycles=has_cycles,
            execution_time=execution_time,
            llm_calls=llm_calls,
            error_message=error_message
        )

        return metrics

    def _count_parallel_tasks(self, dag: TaskDAG) -> int:
        """Count tasks that can execute in parallel (no dependencies)."""
        if not dag or len(dag) == 0:
            return 0

        parallel_count = sum(
            1 for task in dag.tasks.values()
            if len(task.dependencies) == 0
        )
        return parallel_count

    def aggregate_metrics(self) -> AggregatedMetrics:
        """
        Compute aggregated statistics across all tasks.

        Returns:
            AggregatedMetrics with summary statistics
        """
        if not self.results:
            raise ValueError("No results to aggregate. Run collect_all() first.")

        # Filter successful tasks for metrics that require valid decomposition
        successful_results = [r for r in self.results if r.success]

        if not successful_results:
            logger.warning("No successful tasks! All metrics will be zero.")
            return AggregatedMetrics(
                total_tasks=len(self.results),
                success_rate=0.0,
                mean_depth=0.0,
                std_depth=0.0,
                mean_subtasks=0.0,
                std_subtasks=0.0,
                mean_parallel_tasks=0.0,
                parallelism_ratio=0.0,
                mean_execution_time=0.0,
                std_execution_time=0.0,
                mean_llm_calls=0.0,
                std_llm_calls=0.0,
                cycle_error_rate=0.0
            )

        # Compute aggregated metrics
        depths = [r.decomposition_depth for r in successful_results]
        subtasks = [r.num_subtasks for r in successful_results]
        parallel_tasks = [r.parallel_tasks for r in successful_results]
        execution_times = [r.execution_time for r in self.results]  # Include all tasks
        llm_calls = [r.llm_calls for r in successful_results]

        # Parallelism ratio: parallel tasks / total subtasks
        total_parallel = sum(parallel_tasks)
        total_subtasks = sum(subtasks)
        parallelism_ratio = total_parallel / total_subtasks if total_subtasks > 0 else 0.0

        # Cycle error rate
        cycle_errors = sum(1 for r in self.results if r.has_cycles)
        cycle_error_rate = cycle_errors / len(self.results)

        aggregated = AggregatedMetrics(
            total_tasks=len(self.results),
            success_rate=len(successful_results) / len(self.results),
            mean_depth=statistics.mean(depths),
            std_depth=statistics.stdev(depths) if len(depths) > 1 else 0.0,
            mean_subtasks=statistics.mean(subtasks),
            std_subtasks=statistics.stdev(subtasks) if len(subtasks) > 1 else 0.0,
            mean_parallel_tasks=statistics.mean(parallel_tasks),
            parallelism_ratio=parallelism_ratio,
            mean_execution_time=statistics.mean(execution_times),
            std_execution_time=statistics.stdev(execution_times) if len(execution_times) > 1 else 0.0,
            mean_llm_calls=statistics.mean(llm_calls),
            std_llm_calls=statistics.stdev(llm_calls) if len(llm_calls) > 1 else 0.0,
            cycle_error_rate=cycle_error_rate
        )

        return aggregated

    def save_results(self, output_path: str):
        """
        Save baseline results to JSON file.

        Args:
            output_path: Path to output JSON file
        """
        # Create output directory
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Aggregate metrics
        aggregated = self.aggregate_metrics()

        output = {
            'metadata': {
                'collection_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                'num_tasks': len(self.benchmark_tasks),
                'planner_version': 'htdag_v1.0'
            },
            'aggregated_metrics': aggregated.to_dict(),
            'individual_results': [r.to_dict() for r in self.results]
        }

        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)

        logger.info(f"Baseline results saved to {output_path}")

    def print_summary(self):
        """Print summary of baseline metrics to console."""
        aggregated = self.aggregate_metrics()

        print("\n" + "="*70)
        print("HTDAG BASELINE METRICS SUMMARY")
        print("="*70)
        print(f"Total Tasks:          {aggregated.total_tasks}")
        print(f"Success Rate:         {aggregated.success_rate*100:.1f}%")
        print(f"Mean Depth:           {aggregated.mean_depth:.2f} ± {aggregated.std_depth:.2f}")
        print(f"Mean Subtasks:        {aggregated.mean_subtasks:.1f} ± {aggregated.std_subtasks:.1f}")
        print(f"Mean Parallel Tasks:  {aggregated.mean_parallel_tasks:.1f}")
        print(f"Parallelism Ratio:    {aggregated.parallelism_ratio*100:.1f}%")
        print(f"Mean Execution Time:  {aggregated.mean_execution_time:.2f}s ± {aggregated.std_execution_time:.2f}s")
        print(f"Mean LLM Calls:       {aggregated.mean_llm_calls:.1f} ± {aggregated.std_llm_calls:.1f}")
        print(f"Cycle Error Rate:     {aggregated.cycle_error_rate*100:.1f}%")
        print("="*70 + "\n")


def create_benchmark_tasks() -> List[str]:
    """
    Create 100 benchmark tasks for baseline collection.

    Returns:
        List of 100 task descriptions
    """
    tasks = []

    # Simple tasks (25)
    simple_tasks = [
        "Create a landing page for a SaaS product",
        "Write API documentation for REST endpoints",
        "Deploy a static website to Vercel",
        "Set up a GitHub repository with README",
        "Configure CI/CD for Python project",
    ]
    tasks.extend(simple_tasks * 5)

    # Medium tasks (35)
    medium_tasks = [
        "Build a full-stack CRUD app with authentication",
        "Create an e-commerce checkout flow",
        "Implement a CI/CD pipeline for microservices",
        "Design a database schema for multi-tenant SaaS",
        "Set up monitoring and alerting for production app",
        "Build a REST API with rate limiting and caching",
        "Create a responsive dashboard with charts",
    ]
    tasks.extend(medium_tasks * 5)

    # Complex tasks (30)
    complex_tasks = [
        "Design and deploy a multi-tenant SaaS platform",
        "Build a real-time collaborative editor",
        "Create an ML model training pipeline with monitoring",
        "Implement a distributed task queue with Redis",
        "Design a microservices architecture with service mesh",
        "Build a data analytics pipeline with Spark",
    ]
    tasks.extend(complex_tasks * 5)

    # Edge cases (10)
    edge_cases = [
        "Handle circular dependency in task graph",
        "Decompose ambiguous user request with missing context",
        "Optimize DAG for maximum parallelism",
        "Recover from failed task execution",
        "Handle conflicting task dependencies",
    ]
    tasks.extend(edge_cases * 2)

    return tasks[:100]


async def main():
    """Main entry point for baseline collection."""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    logger.info("HTDAG Baseline Collection Script")
    logger.info("="*70)

    # Initialize HTDAG planner (without LLM for baseline)
    planner = HTDAGPlanner(llm_client=None)

    # Create benchmark tasks
    benchmark_tasks = create_benchmark_tasks()
    logger.info(f"Created {len(benchmark_tasks)} benchmark tasks")

    # Save benchmark tasks
    benchmark_output = '/home/genesis/genesis-rebuild/data/htdag_benchmarks/benchmark_tasks.json'
    os.makedirs(os.path.dirname(benchmark_output), exist_ok=True)
    with open(benchmark_output, 'w') as f:
        json.dump({'tasks': benchmark_tasks}, f, indent=2)
    logger.info(f"Saved benchmark tasks to {benchmark_output}")

    # Initialize collector
    collector = HTDAGBaselineCollector(planner, benchmark_tasks)

    # Collect baseline metrics
    results = await collector.collect_all()

    # Print summary
    collector.print_summary()

    # Save results
    output_path = '/home/genesis/genesis-rebuild/data/htdag_benchmarks/baseline_results.json'
    collector.save_results(output_path)

    logger.info("Baseline collection complete!")
    logger.info(f"Results saved to: {output_path}")

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
