#!/usr/bin/env python3
"""
HTDAG LLM-Enhanced Baseline Collection Script

Re-runs baseline collection with LLM-powered decomposition to generate
richer training data for RL. Uses Claude Haiku 4.5 for cost efficiency.

Usage:
    python scripts/collect_htdag_baseline_llm.py

Output:
    data/htdag_benchmarks/baseline_results_llm.json

Author: Oracle (Discovery Agent)
Date: October 27, 2025
"""

import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import statistics

# Add project root to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.htdag_planner import HTDAGPlanner
from infrastructure.task_dag import TaskDAG, Task
from infrastructure.llm_client import AnthropicClient, LLMProvider


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
    quality_score: float  # NEW: Quality score for RL training
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
    mean_quality_score: float
    std_quality_score: float
    cycle_error_rate: float

    def to_dict(self) -> Dict:
        return asdict(self)


class HTDAGLLMBaselineCollector:
    """Collects LLM-enhanced baseline metrics for HTDAG planner."""

    def __init__(self, htdag_planner: HTDAGPlanner, benchmark_tasks: List[str]):
        """
        Initialize baseline collector with LLM support.

        Args:
            htdag_planner: HTDAG planner instance (with LLM)
            benchmark_tasks: List of benchmark task descriptions
        """
        self.planner = htdag_planner
        self.benchmark_tasks = benchmark_tasks
        self.results: List[BaselineMetrics] = []

        logger.info(f"Initialized LLM baseline collector with {len(benchmark_tasks)} tasks")

    async def collect_all(self) -> List[BaselineMetrics]:
        """
        Run HTDAG on all benchmark tasks with LLM and collect metrics.

        Returns:
            List of baseline metrics for each task
        """
        logger.info("Starting LLM-enhanced baseline collection...")

        for i, task_desc in enumerate(self.benchmark_tasks):
            logger.info(f"[{i+1}/{len(self.benchmark_tasks)}] Processing: {task_desc[:60]}...")

            try:
                metrics = await self._collect_single_task(i, task_desc)
                self.results.append(metrics)

                logger.info(
                    f"  → Success={metrics.success}, Depth={metrics.decomposition_depth}, "
                    f"Subtasks={metrics.num_subtasks}, Quality={metrics.quality_score:.2f}"
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
                    quality_score=0.0,
                    error_message=str(e)
                ))

        logger.info(f"LLM baseline collection complete. Collected {len(self.results)} results.")
        return self.results

    async def _collect_single_task(self, task_id: int, task_desc: str) -> BaselineMetrics:
        """
        Collect metrics for single benchmark task with LLM decomposition.

        Args:
            task_id: Unique task identifier
            task_desc: Task description

        Returns:
            BaselineMetrics for this task
        """
        start_time = time.time()

        # Track LLM calls (reset counter)
        llm_calls_before = getattr(self.planner, '_llm_call_count', 0)

        # Decompose task with LLM
        dag = await self.planner.decompose_task(task_desc)

        # Calculate metrics
        execution_time = time.time() - start_time
        llm_calls = getattr(self.planner, '_llm_call_count', 0) - llm_calls_before

        # Analyze DAG structure
        depth = self._calculate_depth(dag)
        num_subtasks = len(dag.tasks)
        parallel_tasks = self._count_parallel_tasks(dag)
        has_cycles = self._check_for_cycles(dag)

        # Calculate quality score (0-10)
        quality_score = self._calculate_quality_score(dag, task_desc)

        return BaselineMetrics(
            task_id=task_id,
            task_description=task_desc,
            success=True,
            decomposition_depth=depth,
            num_subtasks=num_subtasks,
            parallel_tasks=parallel_tasks,
            has_cycles=has_cycles,
            execution_time=execution_time,
            llm_calls=llm_calls,
            quality_score=quality_score,
            error_message=""
        )

    def _calculate_depth(self, dag: TaskDAG) -> int:
        """Calculate maximum depth of task decomposition."""
        if not dag.tasks:
            return 0

        # BFS to find maximum depth
        task_depths = {}
        root_tasks = [t for t in dag.tasks.values() if not t.dependencies]

        if not root_tasks:
            return 0

        for root in root_tasks:
            task_depths[root.id] = 0

        queue = root_tasks[:]
        while queue:
            current = queue.pop(0)
            current_depth = task_depths[current.id]

            # Find dependent tasks
            for task in dag.tasks.values():
                if current.id in task.dependencies and task.id not in task_depths:
                    task_depths[task.id] = current_depth + 1
                    queue.append(task)

        return max(task_depths.values()) if task_depths else 0

    def _count_parallel_tasks(self, dag: TaskDAG) -> int:
        """Count tasks that can run in parallel (no dependencies between them)."""
        if not dag.tasks:
            return 0

        # Group tasks by dependency level
        levels = {}
        for task_id, depth in self._get_task_levels(dag).items():
            if depth not in levels:
                levels[depth] = []
            levels[depth].append(task_id)

        # Count max parallel tasks at any level
        max_parallel = max(len(tasks) for tasks in levels.values()) if levels else 0
        return max_parallel

    def _get_task_levels(self, dag: TaskDAG) -> Dict[str, int]:
        """Get dependency level for each task."""
        task_levels = {}
        root_tasks = [t for t in dag.tasks.values() if not t.dependencies]

        for root in root_tasks:
            task_levels[root.id] = 0

        queue = root_tasks[:]
        while queue:
            current = queue.pop(0)
            current_level = task_levels[current.id]

            for task in dag.tasks.values():
                if current.id in task.dependencies and task.id not in task_levels:
                    task_levels[task.id] = current_level + 1
                    queue.append(task)

        return task_levels

    def _check_for_cycles(self, dag: TaskDAG) -> bool:
        """Check if DAG contains cycles (should never happen)."""
        visited = set()
        rec_stack = set()

        def has_cycle(task_id: str) -> bool:
            visited.add(task_id)
            rec_stack.add(task_id)

            # Check dependencies
            task = dag.tasks.get(task_id)
            if task:
                for dep_id in task.dependencies:
                    if dep_id not in visited:
                        if has_cycle(dep_id):
                            return True
                    elif dep_id in rec_stack:
                        return True

            rec_stack.remove(task_id)
            return False

        for task_id in dag.tasks:
            if task_id not in visited:
                if has_cycle(task_id):
                    return True

        return False

    def _calculate_quality_score(self, dag: TaskDAG, original_task: str) -> float:
        """
        Calculate quality score for decomposition (0-10).

        Factors:
        - Decomposition depth (deeper = better, up to 3)
        - Number of subtasks (more = better, up to 10)
        - Parallelism (higher ratio = better)
        - No cycles (penalty if cycles exist)
        """
        if not dag.tasks:
            return 0.0

        # Depth score (0-3 points)
        depth = self._calculate_depth(dag)
        depth_score = min(depth / 3.0 * 3, 3.0)

        # Subtask count score (0-3 points)
        num_subtasks = len(dag.tasks)
        subtask_score = min(num_subtasks / 10.0 * 3, 3.0)

        # Parallelism score (0-3 points)
        parallel_tasks = self._count_parallel_tasks(dag)
        parallelism_ratio = parallel_tasks / num_subtasks if num_subtasks > 0 else 0
        parallelism_score = parallelism_ratio * 3

        # Cycle penalty (-5 points)
        has_cycles = self._check_for_cycles(dag)
        cycle_penalty = -5.0 if has_cycles else 0.0

        # Completeness bonus (0-1 points)
        # Give bonus if all tasks have descriptions
        completeness_bonus = 1.0 if all(t.description for t in dag.tasks.values()) else 0.5

        total_score = depth_score + subtask_score + parallelism_score + cycle_penalty + completeness_bonus
        return max(0.0, min(10.0, total_score))

    def aggregate_metrics(self) -> AggregatedMetrics:
        """
        Compute aggregated statistics across all tasks.

        Returns:
            AggregatedMetrics with summary statistics
        """
        if not self.results:
            raise ValueError("No results to aggregate. Run collect_all() first.")

        # Filter successful tasks
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
                mean_quality_score=0.0,
                std_quality_score=0.0,
                cycle_error_rate=0.0
            )

        # Compute aggregated metrics
        depths = [r.decomposition_depth for r in successful_results]
        subtasks = [r.num_subtasks for r in successful_results]
        parallel_tasks = [r.parallel_tasks for r in successful_results]
        execution_times = [r.execution_time for r in self.results]
        llm_calls = [r.llm_calls for r in successful_results]
        quality_scores = [r.quality_score for r in successful_results]

        # Parallelism ratio
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
            mean_quality_score=statistics.mean(quality_scores),
            std_quality_score=statistics.stdev(quality_scores) if len(quality_scores) > 1 else 0.0,
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
                'planner_version': 'htdag_v1.0_llm',
                'llm_model': 'claude-haiku-4-5'
            },
            'aggregated_metrics': aggregated.to_dict(),
            'individual_results': [r.to_dict() for r in self.results]
        }

        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)

        logger.info(f"LLM baseline results saved to {output_path}")

    def print_summary(self):
        """Print summary of baseline metrics to console."""
        aggregated = self.aggregate_metrics()

        print("\n" + "="*70)
        print("HTDAG LLM-ENHANCED BASELINE METRICS SUMMARY")
        print("="*70)
        print(f"Total Tasks:          {aggregated.total_tasks}")
        print(f"Success Rate:         {aggregated.success_rate*100:.1f}%")
        print(f"Mean Depth:           {aggregated.mean_depth:.2f} ± {aggregated.std_depth:.2f}")
        print(f"Mean Subtasks:        {aggregated.mean_subtasks:.1f} ± {aggregated.std_subtasks:.1f}")
        print(f"Mean Parallel Tasks:  {aggregated.mean_parallel_tasks:.1f}")
        print(f"Parallelism Ratio:    {aggregated.parallelism_ratio*100:.1f}%")
        print(f"Mean Execution Time:  {aggregated.mean_execution_time:.2f}s ± {aggregated.std_execution_time:.2f}s")
        print(f"Mean LLM Calls:       {aggregated.mean_llm_calls:.1f} ± {aggregated.std_llm_calls:.1f}")
        print(f"Mean Quality Score:   {aggregated.mean_quality_score:.2f} ± {aggregated.std_quality_score:.2f}")
        print(f"Cycle Error Rate:     {aggregated.cycle_error_rate*100:.1f}%")
        print("="*70 + "\n")


def load_benchmark_tasks(limit: Optional[int] = None) -> List[str]:
    """Load benchmark tasks from previous collection."""
    benchmark_path = '/home/genesis/genesis-rebuild/data/htdag_benchmarks/benchmark_tasks.json'
    with open(benchmark_path) as f:
        data = json.load(f)
        tasks = data['tasks']
        if limit:
            tasks = tasks[:limit]
        return tasks


async def main():
    """Main entry point for LLM-enhanced baseline collection."""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    logger.info("HTDAG LLM-Enhanced Baseline Collection Script")
    logger.info("="*70)

    # Initialize LLM client (Claude Haiku 4.5 for cost efficiency)
    llm_client = AnthropicClient(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        model=LLMProvider.CLAUDE_HAIKU_4_5.value
    )
    logger.info(f"Initialized LLM client: {LLMProvider.CLAUDE_HAIKU_4_5.value}")

    # Initialize HTDAG planner with LLM
    planner = HTDAGPlanner(llm_client=llm_client)
    planner._llm_call_count = 0  # Track LLM calls

    # Load benchmark tasks (limit to 10 for testing, then scale to 100)
    task_limit = int(os.getenv("HTDAG_BASELINE_LIMIT", "10"))
    benchmark_tasks = load_benchmark_tasks(limit=task_limit)
    logger.info(f"Loaded {len(benchmark_tasks)} benchmark tasks (limit={task_limit})")

    # Initialize collector
    collector = HTDAGLLMBaselineCollector(planner, benchmark_tasks)

    # Collect baseline metrics with LLM
    results = await collector.collect_all()

    # Print summary
    collector.print_summary()

    # Save results
    output_path = '/home/genesis/genesis-rebuild/data/htdag_benchmarks/baseline_results_llm.json'
    collector.save_results(output_path)

    logger.info("LLM-enhanced baseline collection complete!")
    logger.info(f"Results saved to: {output_path}")

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
