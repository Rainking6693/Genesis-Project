#!/usr/bin/env python3
"""
Genesis Pipeline - 20 Test Runs with Monitoring

Runs 20 iterations of the pipeline, monitoring each stage closely
and fixing errors in real-time.

Each iteration discovers a unique target market during research.
"""

import asyncio
import logging
import sys
import time
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Fix Windows console encoding
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        pass

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_pipeline import (
    GenesisPipeline,
    PipelineStage,
    PipelineStatus,
    PipelineRun
)

# Configure logging
log_dir = project_root / "logs"
log_dir.mkdir(exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = log_dir / f"pipeline_test_20_{timestamp}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class PipelineTestRunner:
    """Runs and monitors 20 pipeline test iterations."""

    def __init__(self, num_runs: int = 20):
        self.num_runs = num_runs
        self.results: List[Dict[str, Any]] = []
        self.errors_found: List[Dict[str, Any]] = []
        self.start_time = None
        self.pipeline = None

        # Business types to cycle through
        self.business_types = [
            "saas", "marketplace", "content", "analytics", "automation",
            "education", "ecommerce", "ai", "fintech", "social"
        ]

    def print_banner(self):
        """Print test banner."""
        print("\n" + "=" * 70)
        print("       GENESIS PIPELINE - 20 TEST RUNS WITH MONITORING")
        print("=" * 70)
        print(f"  Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Log File: {log_file}")
        print(f"  Iterations: {self.num_runs}")
        print("=" * 70 + "\n")

    def print_run_header(self, run_num: int, business_type: str):
        """Print header for each run."""
        print("\n" + "-" * 70)
        print(f"  RUN {run_num}/{self.num_runs} | Type: {business_type.upper()}")
        print("-" * 70)

    def print_stage_result(self, stage: str, success: bool, score: float, duration: float, details: str = ""):
        """Print stage result."""
        icon = "[OK]" if success else "[FAIL]"
        print(f"  {icon} {stage:12} | Score: {score:5.1f} | Time: {duration:5.2f}s | {details[:40]}")

    def print_run_summary(self, run: PipelineRun, run_num: int):
        """Print summary for a single run."""
        status_icon = "[OK]" if run.status == PipelineStatus.COMPLETED else "[FAIL]"

        print(f"\n  {status_icon} Run {run_num} Summary:")
        print(f"     Business: {run.business_spec.name}")
        print(f"     Market: {run.business_spec.target_market[:50]}...")
        print(f"     Status: {run.status.value}")
        print(f"     Duration: {run.duration:.2f}s" if run.duration else "     Duration: N/A")

        if run.live_url:
            print(f"     URL: {run.live_url}")

        if run.errors:
            print(f"     Errors: {len(run.errors)}")
            for err in run.errors[:3]:
                print(f"       - {err[:60]}...")

    def print_final_report(self):
        """Print final test report."""
        total_time = time.time() - self.start_time

        successful = sum(1 for r in self.results if r["status"] == "completed")
        failed = sum(1 for r in self.results if r["status"] == "failed")

        print("\n" + "=" * 70)
        print("                    FINAL TEST REPORT")
        print("=" * 70)
        print(f"\n  Total Runs:     {self.num_runs}")
        print(f"  Successful:     {successful} ({successful/self.num_runs*100:.1f}%)")
        print(f"  Failed:         {failed} ({failed/self.num_runs*100:.1f}%)")
        print(f"  Total Time:     {total_time:.1f}s")
        print(f"  Avg per Run:    {total_time/self.num_runs:.1f}s")

        # Stage success rates
        print("\n  Stage Success Rates:")
        stage_stats = {}
        for result in self.results:
            for stage, data in result.get("stages", {}).items():
                if stage not in stage_stats:
                    stage_stats[stage] = {"success": 0, "total": 0, "scores": []}
                stage_stats[stage]["total"] += 1
                if data.get("success"):
                    stage_stats[stage]["success"] += 1
                stage_stats[stage]["scores"].append(data.get("score", 0))

        for stage, stats in stage_stats.items():
            rate = stats["success"] / stats["total"] * 100 if stats["total"] > 0 else 0
            avg_score = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
            print(f"    {stage:12}: {rate:5.1f}% success, avg score: {avg_score:.1f}")

        # Unique markets discovered
        markets = set(r.get("discovered_market", "") for r in self.results)
        print(f"\n  Unique Markets Discovered: {len(markets)}")

        # Errors summary
        if self.errors_found:
            print(f"\n  Errors Found: {len(self.errors_found)}")
            error_types = {}
            for err in self.errors_found:
                err_type = err.get("type", "unknown")
                error_types[err_type] = error_types.get(err_type, 0) + 1

            for err_type, count in sorted(error_types.items(), key=lambda x: -x[1]):
                print(f"    - {err_type}: {count}")

        print("\n" + "=" * 70)

        # Save results to JSON
        results_file = log_dir / f"pipeline_test_results_{timestamp}.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                "summary": {
                    "total_runs": self.num_runs,
                    "successful": successful,
                    "failed": failed,
                    "total_time": total_time,
                    "timestamp": timestamp
                },
                "results": self.results,
                "errors": self.errors_found
            }, f, indent=2, default=str)

        print(f"\n  Results saved to: {results_file}")

    async def run_single_iteration(self, run_num: int) -> Dict[str, Any]:
        """Run a single pipeline iteration."""
        # Cycle through business types
        business_type = self.business_types[(run_num - 1) % len(self.business_types)]

        self.print_run_header(run_num, business_type)

        result = {
            "run_num": run_num,
            "business_type": business_type,
            "start_time": datetime.now().isoformat(),
            "stages": {},
            "status": "pending",
            "errors": []
        }

        try:
            # Run the pipeline
            run = await self.pipeline.run(
                business_type=business_type,
                target_market="general",  # Will be refined during research
                name=None  # Will be generated
            )

            # Collect stage results
            for stage, output in run.stage_outputs.items():
                stage_name = stage.name
                result["stages"][stage_name] = {
                    "success": output.success,
                    "score": output.score,
                    "duration": output.duration_seconds,
                    "errors": output.errors
                }

                # Print stage result
                details = ""
                if stage == PipelineStage.RESEARCH:
                    discovered = output.data.get("discovered_market", {})
                    details = discovered.get("niche", "")[:40]
                elif stage == PipelineStage.BUILD:
                    details = output.data.get("codebase_path", "")[-40:]
                elif stage == PipelineStage.DEPLOY:
                    details = output.data.get("live_url", "")[-40:]

                self.print_stage_result(
                    stage_name,
                    output.success,
                    output.score,
                    output.duration_seconds,
                    details
                )

                # Track errors
                if output.errors:
                    for err in output.errors:
                        self.errors_found.append({
                            "run": run_num,
                            "stage": stage_name,
                            "type": self._classify_error(err),
                            "message": err
                        })

            # Final result
            result["status"] = run.status.value
            result["business_name"] = run.business_spec.name
            result["discovered_market"] = run.business_spec.target_market
            result["live_url"] = run.live_url
            result["duration"] = run.duration
            result["errors"] = run.errors

            self.print_run_summary(run, run_num)

        except Exception as e:
            logger.exception(f"Run {run_num} failed with exception")
            result["status"] = "exception"
            result["errors"] = [str(e)]
            self.errors_found.append({
                "run": run_num,
                "stage": "pipeline",
                "type": "exception",
                "message": str(e)
            })
            print(f"\n  [FAIL] Run {run_num} EXCEPTION: {e}")

        result["end_time"] = datetime.now().isoformat()
        return result

    def _classify_error(self, error_msg: str) -> str:
        """Classify error type for reporting."""
        error_lower = error_msg.lower()

        if "import" in error_lower or "module" in error_lower:
            return "import_error"
        elif "connection" in error_lower or "timeout" in error_lower:
            return "connection_error"
        elif "permission" in error_lower or "access" in error_lower:
            return "permission_error"
        elif "file" in error_lower or "path" in error_lower:
            return "file_error"
        elif "api" in error_lower or "request" in error_lower:
            return "api_error"
        elif "deploy" in error_lower:
            return "deployment_error"
        elif "test" in error_lower:
            return "test_error"
        else:
            return "unknown_error"

    async def run_all(self):
        """Run all test iterations."""
        self.print_banner()
        self.start_time = time.time()

        # Initialize pipeline once
        logger.info("Initializing pipeline...")
        self.pipeline = GenesisPipeline(
            enable_agui=False,  # Disable for faster testing
            enable_evolution=False,  # Disable evolution for testing
            enable_n8n=False,  # Disable n8n for testing
            strict_gates=False,  # Continue even on failures for testing
            skip_deploy_verification=True  # Skip 5-min verification timeout for testing
        )

        # Run iterations
        for i in range(1, self.num_runs + 1):
            try:
                result = await self.run_single_iteration(i)
                self.results.append(result)

                # Brief pause between runs
                if i < self.num_runs:
                    await asyncio.sleep(0.5)

            except KeyboardInterrupt:
                logger.warning(f"Test interrupted at run {i}")
                break

        # Print final report
        self.print_final_report()


async def main():
    """Main entry point."""
    runner = PipelineTestRunner(num_runs=20)
    await runner.run_all()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(130)
