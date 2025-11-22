#!/usr/bin/env python3
"""
OSWorld & LangMem Metrics Export Script

Exports metrics from OSWorld benchmark and LangMem memory management
to Prometheus format for monitoring dashboard integration.

Usage:
    python scripts/export_osworld_langmem_metrics.py
    python scripts/export_osworld_langmem_metrics.py --output metrics.prom
    python scripts/export_osworld_langmem_metrics.py --run-tests

Features:
- Automatically collects metrics from recent test runs
- Exports in Prometheus text format
- Validates metric definitions against observability registry
- Supports continuous metric collection
"""

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from infrastructure.observability import (
    get_metric_registry,
    get_observability_manager,
    register_all_metrics,
)

logger = logging.getLogger(__name__)


class MetricsExporter:
    """
    Exports OSWorld and LangMem metrics to Prometheus format
    """

    def __init__(self, output_file: str = "metrics.prom"):
        self.output_file = Path(output_file)
        self.registry = get_metric_registry()
        self.obs_manager = get_observability_manager()

        # Register all metrics
        register_all_metrics()

        # Storage for collected metrics
        self.metrics_data: Dict[str, List[Dict[str, Any]]] = {
            "osworld": [],
            "langmem": [],
        }

    def collect_osworld_metrics(self) -> Dict[str, Any]:
        """
        Collect OSWorld benchmark metrics from recent test runs

        Returns:
            Dictionary with OSWorld metrics
        """
        metrics = {
            "osworld_benchmark_success_rate": {},
            "osworld_task_duration_seconds": [],
            "osworld_tasks_total": {},
            "osworld_tasks_failed": {},
            "osworld_steps_per_task": [],
            "osworld_mock_vs_real": {},
        }

        # Find recent OSWorld benchmark results
        benchmark_dir = Path(__file__).resolve().parent.parent / "benchmark_results"
        if not benchmark_dir.exists():
            logger.warning(f"Benchmark results directory not found: {benchmark_dir}")
            return metrics

        # Load latest OSWorld results
        osworld_files = sorted(
            benchmark_dir.glob("osworld_results_*.json"), key=lambda f: f.stat().st_mtime, reverse=True
        )

        if not osworld_files:
            logger.warning("No OSWorld benchmark results found")
            return metrics

        # Load most recent result
        with open(osworld_files[0], "r") as f:
            data = json.load(f)

        # Extract metrics
        if "tasks" in data:
            tasks = data["tasks"]
            total_tasks = len(tasks)
            successful_tasks = sum(1 for t in tasks if t.get("success", False))

            # Success rate by category
            categories = {}
            for task in tasks:
                category = task.get("category", "unknown")
                if category not in categories:
                    categories[category] = {"total": 0, "success": 0}
                categories[category]["total"] += 1
                if task.get("success", False):
                    categories[category]["success"] += 1

            for category, stats in categories.items():
                success_rate = (stats["success"] / stats["total"] * 100) if stats["total"] > 0 else 0
                metrics["osworld_benchmark_success_rate"][category] = success_rate
                metrics["osworld_tasks_total"][category] = stats["total"]
                metrics["osworld_tasks_failed"][category] = stats["total"] - stats["success"]

            # Task durations and steps
            for task in tasks:
                category = task.get("category", "unknown")
                status = "success" if task.get("success", False) else "failed"

                if "duration" in task:
                    metrics["osworld_task_duration_seconds"].append({
                        "category": category,
                        "status": status,
                        "value": task["duration"],
                    })

                if "steps_taken" in task:
                    metrics["osworld_steps_per_task"].append({
                        "category": category,
                        "value": task["steps_taken"],
                    })

            # Mock vs real ratio
            mock_count = sum(1 for t in tasks if t.get("backend") == "mock")
            real_count = total_tasks - mock_count
            metrics["osworld_mock_vs_real"] = {
                "mock": (mock_count / total_tasks * 100) if total_tasks > 0 else 0,
                "real": (real_count / total_tasks * 100) if total_tasks > 0 else 0,
            }

        logger.info(f"Collected OSWorld metrics from {osworld_files[0].name}")
        return metrics

    def collect_langmem_metrics(self) -> Dict[str, Any]:
        """
        Collect LangMem memory management metrics from logs/stats

        Returns:
            Dictionary with LangMem metrics
        """
        metrics = {
            "langmem_ttl_deleted_total": {},
            "langmem_ttl_cleanup_duration_seconds": [],
            "langmem_dedup_rate": {},
            "langmem_dedup_exact_duplicates": {},
            "langmem_dedup_semantic_duplicates": {},
            "langmem_cache_evictions_total": {},
            "langmem_memory_usage_bytes": {},
        }

        # Parse LangMem log files for metrics
        logs_dir = Path(__file__).resolve().parent.parent / "logs"
        if not logs_dir.exists():
            logger.warning(f"Logs directory not found: {logs_dir}")
            return metrics

        # Parse TTL logs
        ttl_log = logs_dir / "infrastructure_memory_langmem_ttl.log"
        if ttl_log.exists():
            with open(ttl_log, "r") as f:
                lines = f.readlines()
                for line in lines[-100:]:  # Last 100 lines
                    if "deleted_count" in line:
                        try:
                            # Extract namespace and count
                            parts = line.split()
                            namespace = "default"
                            count = 0
                            for i, part in enumerate(parts):
                                if "namespace" in part and i + 1 < len(parts):
                                    namespace = parts[i + 1].strip("',:")
                                if "deleted_count" in part and i + 1 < len(parts):
                                    count = int(parts[i + 1].strip("',"))
                            metrics["langmem_ttl_deleted_total"][namespace] = count
                        except Exception as e:
                            logger.debug(f"Error parsing TTL log line: {e}")

        # Parse dedup logs
        dedup_log = logs_dir / "infrastructure_memory_langmem_dedup.log"
        if dedup_log.exists():
            with open(dedup_log, "r") as f:
                lines = f.readlines()
                for line in lines[-100:]:  # Last 100 lines
                    if "dedup_rate" in line:
                        try:
                            # Extract dedup rate
                            parts = line.split()
                            namespace = "default"
                            rate = 0.0
                            for i, part in enumerate(parts):
                                if "namespace" in part and i + 1 < len(parts):
                                    namespace = parts[i + 1].strip("',:")
                                if "dedup_rate" in part and i + 1 < len(parts):
                                    rate = float(parts[i + 1].strip("',%"))
                            metrics["langmem_dedup_rate"][namespace] = rate
                        except Exception as e:
                            logger.debug(f"Error parsing dedup log line: {e}")

        logger.info("Collected LangMem metrics from logs")
        return metrics

    def export_to_prometheus(self, osworld_metrics: Dict, langmem_metrics: Dict) -> str:
        """
        Export metrics to Prometheus text format

        Args:
            osworld_metrics: OSWorld metrics dictionary
            langmem_metrics: LangMem metrics dictionary

        Returns:
            Prometheus-formatted text
        """
        lines = [
            "# Prometheus metrics export for OSWorld and LangMem",
            f"# Generated at {datetime.now(timezone.utc).isoformat()}",
            "",
        ]

        # OSWorld metrics
        lines.append("# OSWorld Benchmark Metrics")

        # Success rate
        metric_def = self.registry.get_metric("osworld_benchmark_success_rate")
        if metric_def:
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for category, rate in osworld_metrics.get("osworld_benchmark_success_rate", {}).items():
                lines.append(f'osworld_benchmark_success_rate{{category="{category}"}} {rate:.2f}')

        # Tasks total
        metric_def = self.registry.get_metric("osworld_tasks_total")
        if metric_def:
            lines.append("")
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for category, count in osworld_metrics.get("osworld_tasks_total", {}).items():
                lines.append(f'osworld_tasks_total{{category="{category}"}} {count}')

        # Tasks failed
        metric_def = self.registry.get_metric("osworld_tasks_failed")
        if metric_def:
            lines.append("")
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for category, count in osworld_metrics.get("osworld_tasks_failed", {}).items():
                lines.append(f'osworld_tasks_failed{{category="{category}",failure_reason="unknown"}} {count}')

        # Mock vs real
        metric_def = self.registry.get_metric("osworld_mock_vs_real")
        if metric_def:
            lines.append("")
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for backend_type, percentage in osworld_metrics.get("osworld_mock_vs_real", {}).items():
                lines.append(f'osworld_mock_vs_real{{backend_type="{backend_type}"}} {percentage:.2f}')

        # LangMem metrics
        lines.append("")
        lines.append("# LangMem Memory Management Metrics")

        # TTL deleted total
        metric_def = self.registry.get_metric("langmem_ttl_deleted_total")
        if metric_def:
            lines.append("")
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for namespace, count in langmem_metrics.get("langmem_ttl_deleted_total", {}).items():
                lines.append(f'langmem_ttl_deleted_total{{namespace="{namespace}",memory_type="unknown"}} {count}')

        # Dedup rate
        metric_def = self.registry.get_metric("langmem_dedup_rate")
        if metric_def:
            lines.append("")
            lines.append(metric_def.to_prometheus_help())
            lines.append(metric_def.to_prometheus_type())
            for namespace, rate in langmem_metrics.get("langmem_dedup_rate", {}).items():
                lines.append(f'langmem_dedup_rate{{namespace="{namespace}",dedup_type="combined"}} {rate:.2f}')

        lines.append("")
        return "\n".join(lines)

    def export(self):
        """
        Run full export process
        """
        logger.info("Starting metrics export...")

        # Collect metrics
        osworld_metrics = self.collect_osworld_metrics()
        langmem_metrics = self.collect_langmem_metrics()

        # Export to Prometheus format
        prom_text = self.export_to_prometheus(osworld_metrics, langmem_metrics)

        # Write to file
        with open(self.output_file, "w") as f:
            f.write(prom_text)

        logger.info(f"Metrics exported to {self.output_file}")
        print(f"✅ Metrics exported successfully to {self.output_file}")
        print(f"   OSWorld metrics: {len(osworld_metrics)} types")
        print(f"   LangMem metrics: {len(langmem_metrics)} types")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Export OSWorld and LangMem metrics")
    parser.add_argument(
        "--output",
        "-o",
        default="metrics.prom",
        help="Output file for Prometheus metrics (default: metrics.prom)",
    )
    parser.add_argument(
        "--run-tests",
        action="store_true",
        help="Run tests before exporting metrics",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run tests if requested
    if args.run_tests:
        print("🧪 Running tests to generate fresh metrics...")
        import subprocess

        result = subprocess.run(
            ["pytest", "tests/test_osworld_benchmark.py", "tests/test_langmem_ttl_dedup.py", "-v"],
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        if result.returncode != 0:
            print("⚠️  Tests failed, exporting existing metrics anyway...")

    # Export metrics
    exporter = MetricsExporter(output_file=args.output)
    exporter.export()


if __name__ == "__main__":
    main()
