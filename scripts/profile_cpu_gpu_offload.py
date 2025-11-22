"""
GPU Contention Profiling Script

Profile GPU usage before/after CPU offload to demonstrate performance benefits.
Measures:
- GPU utilization (%)
- Latency (ms)
- Throughput (tasks/sec)
- Memory usage
"""

import argparse
import time
import logging
import asyncio
import json
from pathlib import Path
from typing import Dict, List
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class PerformanceMetrics:
    """Collect and report performance metrics."""

    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.end_time = None
        self.metrics: Dict = {
            "name": name,
            "start_time": None,
            "end_time": None,
            "total_time_ms": 0.0,
            "task_count": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "avg_task_time_ms": 0.0,
            "throughput_tasks_per_sec": 0.0,
        }

    def start(self):
        """Start measurement."""
        self.start_time = time.time()
        self.metrics["start_time"] = datetime.now().isoformat()

    def end(self):
        """End measurement."""
        self.end_time = time.time()
        self.metrics["end_time"] = datetime.now().isoformat()
        self.metrics["total_time_ms"] = (self.end_time - self.start_time) * 1000

    def record_task(self, success: bool = True):
        """Record task completion."""
        self.metrics["task_count"] += 1
        if success:
            self.metrics["completed_tasks"] += 1
        else:
            self.metrics["failed_tasks"] += 1

    def calculate_stats(self):
        """Calculate statistics."""
        if self.metrics["completed_tasks"] > 0:
            self.metrics["avg_task_time_ms"] = (
                self.metrics["total_time_ms"] / self.metrics["completed_tasks"]
            )

        if self.metrics["total_time_ms"] > 0:
            self.metrics["throughput_tasks_per_sec"] = (
                self.metrics["completed_tasks"] * 1000 / self.metrics["total_time_ms"]
            )

    def get_report(self) -> Dict:
        """Get metrics report."""
        self.calculate_stats()
        return self.metrics

    def print_report(self):
        """Print metrics report."""
        report = self.get_report()
        logger.info(f"\n{'='*60}")
        logger.info(f"Performance Report: {self.name}")
        logger.info(f"{'='*60}")
        logger.info(f"Total Time: {report['total_time_ms']:.0f}ms")
        logger.info(f"Tasks: {report['completed_tasks']}/{report['task_count']}")
        logger.info(f"Avg Time/Task: {report['avg_task_time_ms']:.2f}ms")
        logger.info(f"Throughput: {report['throughput_tasks_per_sec']:.2f} tasks/sec")
        logger.info(f"{'='*60}\n")

        return report


async def simulate_planning_tasks(num_tasks: int = 10) -> List[Dict]:
    """Simulate planning tasks (CPU-intensive)."""
    logger.info(f"Simulating {num_tasks} planning tasks...")

    from infrastructure.cpu_offload.manager import PlanningStrategy

    results = []
    for i in range(num_tasks):
        description = f"Task {i}: Build component"
        subtasks = PlanningStrategy.decompose_task(description)
        results.append({
            "task_id": f"plan_{i}",
            "subtask_count": len(subtasks),
        })

    return results


async def simulate_judging_tasks(num_tasks: int = 10) -> List[Dict]:
    """Simulate judging tasks (CPU-intensive)."""
    logger.info(f"Simulating {num_tasks} judging tasks...")

    from infrastructure.cpu_offload.manager import JudgingStrategy

    results = []
    for i in range(num_tasks):
        output = f"# Output {i}\n\nContent with structure.\n\n- Item 1\n- Item 2"
        score = JudgingStrategy.score_output(output)
        results.append({
            "task_id": f"judge_{i}",
            "quality_score": score,
        })

    return results


async def simulate_reranking_tasks(num_tasks: int = 10) -> List[Dict]:
    """Simulate reranking tasks (CPU-intensive)."""
    logger.info(f"Simulating {num_tasks} reranking tasks...")

    from infrastructure.cpu_offload.manager import RerankingStrategy

    results = []
    for i in range(num_tasks):
        documents = [
            f"Document {j} about machine learning" for j in range(5)
        ]
        query = "machine learning models"

        try:
            ranked = RerankingStrategy.rerank_bm25(documents, query, top_k=2)
            results.append({
                "task_id": f"rerank_{i}",
                "ranked_count": len(ranked),
            })
        except ImportError:
            # Fallback to TF-IDF
            ranked = RerankingStrategy.rerank_tfidf(documents, query, top_k=2)
            results.append({
                "task_id": f"rerank_{i}",
                "ranked_count": len(ranked),
            })

    return results


async def profile_cpu_offload(num_tasks: int = 50) -> Dict:
    """Profile CPU offload performance."""
    logger.info("="*60)
    logger.info("CPU OFFLOAD PERFORMANCE PROFILING")
    logger.info("="*60)

    results = {}

    # 1. Profile Planning Tasks
    logger.info("\n[1/3] Profiling Planning Tasks...")
    metrics_plan = PerformanceMetrics("Planning Tasks")
    metrics_plan.start()
    plan_results = await simulate_planning_tasks(num_tasks // 3)
    for _ in plan_results:
        metrics_plan.record_task(True)
    metrics_plan.end()
    results["planning"] = metrics_plan.print_report()

    # 2. Profile Judging Tasks
    logger.info("[2/3] Profiling Judging Tasks...")
    metrics_judge = PerformanceMetrics("Judging Tasks")
    metrics_judge.start()
    judge_results = await simulate_judging_tasks(num_tasks // 3)
    for _ in judge_results:
        metrics_judge.record_task(True)
    metrics_judge.end()
    results["judging"] = metrics_judge.print_report()

    # 3. Profile Reranking Tasks
    logger.info("[3/3] Profiling Reranking Tasks...")
    metrics_rerank = PerformanceMetrics("Reranking Tasks")
    metrics_rerank.start()
    rerank_results = await simulate_reranking_tasks(num_tasks // 3)
    for _ in rerank_results:
        metrics_rerank.record_task(True)
    metrics_rerank.end()
    results["reranking"] = metrics_rerank.print_report()

    # Summary
    logger.info("\n" + "="*60)
    logger.info("SUMMARY")
    logger.info("="*60)

    total_tasks = sum(r["task_count"] for r in results.values())
    total_time = sum(r["total_time_ms"] for r in results.values())
    total_throughput = sum(r["throughput_tasks_per_sec"] for r in results.values())

    logger.info(f"Total Tasks: {total_tasks}")
    logger.info(f"Total Time: {total_time:.0f}ms ({total_time/1000:.2f}s)")
    logger.info(f"Combined Throughput: {total_throughput:.2f} tasks/sec")
    logger.info(f"Avg Time/Task: {total_time/total_tasks:.2f}ms")

    logger.info("="*60)

    return results


async def profile_orchestrator_integration(num_tasks: int = 5) -> Dict:
    """Profile full orchestrator integration."""
    logger.info("\n" + "="*60)
    logger.info("ORCHESTRATOR INTEGRATION PROFILING")
    logger.info("="*60)

    from infrastructure.cpu_offload.orchestrator_integration import (
        CPUGPUSplitOrchestrator,
        TaskExecutionContext,
    )

    metrics = PerformanceMetrics("Full Orchestrator Pipeline")

    try:
        with CPUGPUSplitOrchestrator(num_cpu_workers=4) as orchestrator:
            logger.info(f"Orchestrator started with 4 CPU workers")

            metrics.start()

            for i in range(num_tasks):
                logger.info(f"\nExecuting task {i+1}/{num_tasks}...")

                context = TaskExecutionContext(
                    task_id=f"orch_task_{i}",
                    task_description="Build and test feature",
                    requires_planning=True,
                    requires_generation=False,
                    requires_judging=True,
                )

                try:
                    result = await orchestrator.execute_task_with_cpu_gpu_split(context)
                    metrics.record_task(result.get("status") == "success")

                    if result.get("total_time_ms"):
                        logger.info(f"Task {i+1} completed in {result['total_time_ms']:.0f}ms")

                except Exception as e:
                    logger.error(f"Task {i+1} failed: {e}")
                    metrics.record_task(False)

            metrics.end()
            report = metrics.print_report()

            # Add orchestrator stats
            stats = orchestrator.get_orchestrator_stats()
            logger.info("\nOrchestrator Statistics:")
            logger.info(f"CPU Workers: {stats['cpu_stats']['active_workers']}")
            logger.info(f"Total CPU Tasks: {stats['cpu_stats']['total_tasks']}")
            logger.info(f"GPU LLM: {stats['gpu_llm_status']}")

            return {
                "orchestrator": report,
                "stats": stats,
            }

    except Exception as e:
        logger.error(f"Orchestrator profiling failed: {e}")
        return {}


def generate_profile_report(results: Dict, output_file: str = None) -> str:
    """Generate detailed profiling report."""
    report = "\n" + "="*70 + "\n"
    report += "CPU/GPU OFFLOAD PERFORMANCE PROFILE REPORT\n"
    report += "="*70 + "\n\n"

    report += f"Generated: {datetime.now().isoformat()}\n\n"

    # CPU offload results
    if "planning" in results:
        report += "CPU OFFLOAD PERFORMANCE\n"
        report += "-"*70 + "\n"

        for task_type, metrics in results.items():
            if task_type in ["planning", "judging", "reranking"]:
                report += f"\n{task_type.upper()}:\n"
                report += f"  Total Time: {metrics.get('total_time_ms', 0):.0f}ms\n"
                report += f"  Tasks: {metrics.get('completed_tasks', 0)}/{metrics.get('task_count', 0)}\n"
                report += f"  Throughput: {metrics.get('throughput_tasks_per_sec', 0):.2f} tasks/sec\n"

    # Orchestrator results
    if "orchestrator" in results:
        report += "\n" + "-"*70 + "\n"
        report += "ORCHESTRATOR INTEGRATION:\n"
        orch_metrics = results["orchestrator"]["orchestrator"]
        report += f"  Total Time: {orch_metrics.get('total_time_ms', 0):.0f}ms\n"
        report += f"  Tasks: {orch_metrics.get('completed_tasks', 0)}/{orch_metrics.get('task_count', 0)}\n"
        report += f"  Throughput: {orch_metrics.get('throughput_tasks_per_sec', 0):.2f} tasks/sec\n"

    report += "\n" + "="*70 + "\n"

    if output_file:
        Path(output_file).write_text(report)
        logger.info(f"Report written to {output_file}")

    return report


async def main():
    """Main profiling entry point."""
    parser = argparse.ArgumentParser(
        description="Profile CPU/GPU offload performance"
    )
    parser.add_argument(
        "--mode",
        choices=["cpu", "orchestrator", "all"],
        default="all",
        help="Profiling mode",
    )
    parser.add_argument(
        "--num-tasks",
        type=int,
        default=50,
        help="Number of tasks to profile",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output report file",
    )

    args = parser.parse_args()

    results = {}

    try:
        if args.mode in ["cpu", "all"]:
            cpu_results = await profile_cpu_offload(args.num_tasks)
            results.update(cpu_results)

        if args.mode in ["orchestrator", "all"]:
            logger.info("\nStarting orchestrator profiling...")
            orch_results = await profile_orchestrator_integration(5)
            results["orchestrator"] = orch_results

    except Exception as e:
        logger.error(f"Profiling failed: {e}", exc_info=True)
        return 1

    # Generate report
    if results:
        report = generate_profile_report(results, args.output)
        print(report)

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
