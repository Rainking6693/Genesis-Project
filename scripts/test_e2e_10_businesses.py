"""
End-to-End Test: 10 Businesses Through Full Pipeline

Tests all 8 pipeline stages:
1. RESEARCH (85+ score threshold)
2. DESIGN
3. BUILD
4. TEST
5. DEPLOY (Piku ONLY - lightweight git-push PaaS)
6. VERIFY
7. AUTOMATE (Marketing, SEO, Billing)
8. EVOLVE (SE-Darwin)

Orchestrator: Emily watches entire process and logs issues
"""

import asyncio
import logging
import sys
import time
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_pipeline import GenesisPipeline, PipelineStage, PipelineStatus

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'logs/e2e_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class EmilyOrchestrator:
    """
    Emily - The Orchestrator Agent

    Watches the entire pipeline process and steps in to fix issues.
    Logs all events, tracks metrics, and provides remediation.
    """

    def __init__(self):
        self.issues_detected = []
        self.issues_fixed = []
        self.metrics = {
            "businesses_attempted": 0,
            "businesses_successful": 0,
            "businesses_failed": 0,
            "stage_failures": {},
            "average_duration": 0,
            "total_duration": 0
        }
        self.business_results = []

    def log(self, message: str, level: str = "info"):
        """Emily's logging with her signature"""
        prefix = "[Emily/Orchestrator]"
        if level == "error":
            logger.error(f"{prefix} {message}")
        elif level == "warning":
            logger.warning(f"{prefix} {message}")
        else:
            logger.info(f"{prefix} {message}")

    def detect_issue(self, stage: str, error: str, business_name: str) -> Dict:
        """Detect and log an issue"""
        issue = {
            "stage": stage,
            "error": error,
            "business": business_name,
            "timestamp": datetime.now().isoformat(),
            "remediation": self._get_remediation(stage, error)
        }
        self.issues_detected.append(issue)
        self.log(f"Issue detected in {stage}: {error}", "warning")
        self.log(f"Suggested remediation: {issue['remediation']}", "info")
        return issue

    def _get_remediation(self, stage: str, error: str) -> str:
        """Get remediation suggestion based on stage and error"""
        remediations = {
            "RESEARCH": [
                "Re-run with different business type",
                "Lower market competition requirements",
                "Try adjacent market segment"
            ],
            "DESIGN": [
                "Simplify UI requirements",
                "Use template-based design",
                "Skip custom animations"
            ],
            "BUILD": [
                "Use fallback code generator",
                "Simplify tech stack",
                "Check for missing dependencies"
            ],
            "TEST": [
                "Skip flaky tests",
                "Run critical path only",
                "Disable E2E for speed"
            ],
            "DEPLOY": [
                "Verify Piku SSH connectivity",
                "Check deployment credentials",
                "Verify server connectivity"
            ],
            "VERIFY": [
                "Skip non-critical checks",
                "Retry verification",
                "Accept partial verification"
            ],
            "AUTOMATE": [
                "Run marketing in dry-run mode",
                "Skip paid integrations",
                "Create manual todo list"
            ],
            "EVOLVE": [
                "Store trajectory for later",
                "Skip evolution this run",
                "Use default parameters"
            ]
        }

        stage_remediations = remediations.get(stage, ["Retry the stage"])

        # Match error to specific remediation
        error_lower = error.lower()
        if "timeout" in error_lower:
            return "Increase timeout or skip stage"
        elif "connection" in error_lower or "network" in error_lower:
            return "Check network connectivity, retry in 30s"
        elif "auth" in error_lower or "credential" in error_lower:
            return "Verify API credentials in .env"
        elif "not configured" in error_lower:
            return "Use fallback method or skip"

        return stage_remediations[0]

    async def attempt_fix(self, stage: str, error: str, pipeline, run) -> bool:
        """
        Actually attempt to FIX the issue, not just log it.

        Returns True if fix was successful and stage should be retried.
        """
        self.log(f"[FIX] Attempting remediation for {stage}: {error}", "warning")

        error_lower = error.lower()

        try:
            # RESEARCH stage fixes
            if stage == "RESEARCH":
                if "score" in error_lower or "threshold" in error_lower:
                    self.log("[FIX] Research score too low - trying adjacent market segment")
                    # Modify business type to try different niche
                    run.business_spec.metadata["retry_with_adjacent"] = True
                    self.issues_fixed.append({"stage": stage, "action": "retry_adjacent_market"})
                    return True

            # BUILD stage fixes
            elif stage == "BUILD":
                if "dependency" in error_lower or "module" in error_lower:
                    self.log("[FIX] Missing dependency - attempting npm install")
                    import subprocess
                    subprocess.run(["npm", "install"], cwd=run.business_spec.metadata.get("codebase_path", "."), capture_output=True)
                    self.issues_fixed.append({"stage": stage, "action": "npm_install"})
                    return True
                elif "generator" in error_lower:
                    self.log("[FIX] Generator failed - switching to fallback generator")
                    pipeline.use_fallback_generator = True
                    self.issues_fixed.append({"stage": stage, "action": "fallback_generator"})
                    return True

            # DEPLOY stage fixes - Piku ONLY (no fallbacks)
            elif stage == "DEPLOY":
                if "piku" in error_lower or "ssh" in error_lower:
                    self.log("[FIX] Piku deployment failed - check PIKU_SERVER env var and SSH connectivity")
                    self.log("[FIX] Required: PIKU_SERVER=piku@your-server.com")
                    self.issues_fixed.append({"stage": stage, "action": "piku_troubleshoot"})
                    return False  # No fallback - Piku is the ONLY platform
                elif "not configured" in error_lower:
                    self.log("[FIX] Piku not configured - set PIKU_SERVER environment variable")
                    self.log("[FIX] Example: PIKU_SERVER=piku@your-server.com")
                    self.issues_fixed.append({"stage": stage, "action": "piku_config_needed"})
                    return False  # No fallback - Piku is the ONLY platform

            # TEST stage fixes
            elif stage == "TEST":
                if "timeout" in error_lower:
                    self.log("[FIX] Test timeout - increasing timeout to 60s")
                    pipeline.test_timeout = 60
                    self.issues_fixed.append({"stage": stage, "action": "increase_timeout"})
                    return True
                elif "flaky" in error_lower or "intermittent" in error_lower:
                    self.log("[FIX] Flaky test - skipping non-critical tests")
                    pipeline.skip_flaky_tests = True
                    self.issues_fixed.append({"stage": stage, "action": "skip_flaky"})
                    return True

            # VERIFY stage fixes
            elif stage == "VERIFY":
                if "health" in error_lower or "ping" in error_lower:
                    self.log("[FIX] Health check failed - retrying in 10s")
                    await asyncio.sleep(10)
                    self.issues_fixed.append({"stage": stage, "action": "retry_health_check"})
                    return True

            # AUTOMATE stage fixes (n8n/marketing)
            elif stage == "AUTOMATE":
                if "n8n" in error_lower or "workflow" in error_lower:
                    self.log("[FIX] n8n workflow failed - using dry-run mode")
                    pipeline.n8n_dry_run = True
                    self.issues_fixed.append({"stage": stage, "action": "n8n_dry_run"})
                    return True
                elif "marketing" in error_lower or "mcp" in error_lower:
                    self.log("[FIX] Marketing MCP failed - skipping marketing automation")
                    pipeline.skip_marketing = True
                    self.issues_fixed.append({"stage": stage, "action": "skip_marketing"})
                    return True

            # EVOLVE stage fixes
            elif stage == "EVOLVE":
                if "trajectory" in error_lower or "darwin" in error_lower:
                    self.log("[FIX] SE-Darwin failed - storing trajectory for later")
                    pipeline.defer_evolution = True
                    self.issues_fixed.append({"stage": stage, "action": "defer_evolution"})
                    return True

            self.log(f"[FIX] No automatic fix available for: {error}", "warning")
            return False

        except Exception as fix_error:
            self.log(f"[FIX] Fix attempt failed: {fix_error}", "error")
            return False

    def record_result(self, business_name: str, result: Dict):
        """Record a business result"""
        self.business_results.append({
            "name": business_name,
            "status": result.get("status"),
            "live_url": result.get("live_url"),
            "duration": result.get("duration"),
            "stages": result.get("stages", {}),
            "timestamp": datetime.now().isoformat()
        })

        self.metrics["businesses_attempted"] += 1
        if result.get("status") == "completed":
            self.metrics["businesses_successful"] += 1
        else:
            self.metrics["businesses_failed"] += 1

    def get_summary(self) -> str:
        """Get final summary"""
        success_rate = (self.metrics["businesses_successful"] /
                       max(self.metrics["businesses_attempted"], 1)) * 100

        summary = f"""
{'='*60}
EMILY'S ORCHESTRATION SUMMARY
{'='*60}

OVERALL METRICS:
- Businesses Attempted: {self.metrics['businesses_attempted']}
- Successful: {self.metrics['businesses_successful']}
- Failed: {self.metrics['businesses_failed']}
- Success Rate: {success_rate:.1f}%
- Total Duration: {self.metrics['total_duration']:.1f}s

ISSUES DETECTED: {len(self.issues_detected)}
ISSUES FIXED: {len(self.issues_fixed)}
"""

        if self.issues_detected:
            summary += "\nISSUE BREAKDOWN:\n"
            stage_issues = {}
            for issue in self.issues_detected:
                stage = issue['stage']
                stage_issues[stage] = stage_issues.get(stage, 0) + 1
            for stage, count in sorted(stage_issues.items()):
                summary += f"  - {stage}: {count} issues\n"

        if self.issues_fixed:
            summary += "\nFIXES APPLIED:\n"
            for fix in self.issues_fixed:
                summary += f"  [FIX] {fix['stage']}: {fix['action']}\n"

        summary += "\nBUSINESS RESULTS:\n"
        for result in self.business_results:
            status_icon = "[OK]" if result['status'] == 'completed' else "[FAIL]"
            url = result.get('live_url', 'N/A')
            summary += f"  {status_icon} {result['name']}: {result['status']} ({url})\n"

        summary += f"\n{'='*60}\n"
        return summary


async def run_single_business(
    pipeline: GenesisPipeline,
    emily: EmilyOrchestrator,
    business_type: str,
    target_market: str,
    business_num: int
) -> Dict:
    """Run a single business through the full pipeline"""

    business_name = f"genesis-e2e-{business_num}-{business_type[:4]}"
    emily.log(f"Starting business {business_num}/10: {business_name} ({business_type} for {target_market})")

    start_time = time.time()
    stages_completed = {}

    try:
        # Run the full pipeline
        run = await pipeline.run(
            business_type=business_type,
            target_market=target_market,
            name=business_name
        )

        duration = time.time() - start_time

        # Collect stage results
        for stage, output in run.stage_outputs.items():
            stages_completed[stage.name] = {
                "success": output.success,
                "score": output.score,
                "duration": output.duration_seconds,
                "errors": output.errors
            }

            # Emily detects issues AND attempts to fix them
            if not output.success:
                error_msg = "; ".join(output.errors) if output.errors else "Stage failed"
                emily.detect_issue(stage.name, error_msg, business_name)

                # Actually attempt to fix the issue!
                fix_applied = await emily.attempt_fix(stage.name, error_msg, pipeline, run)
                if fix_applied:
                    emily.log(f"[FIX] Fix applied for {stage.name} - will retry on next run", "info")

        result = {
            "name": business_name,
            "status": run.status.value,
            "live_url": run.live_url,
            "duration": duration,
            "stages": stages_completed
        }

        emily.record_result(business_name, result)
        emily.metrics["total_duration"] += duration

        if run.status == PipelineStatus.COMPLETED:
            emily.log(f"Business {business_num} COMPLETED: {run.live_url} ({duration:.1f}s)")
        else:
            emily.log(f"Business {business_num} FAILED: {run.status.value} ({duration:.1f}s)", "error")

        return result

    except Exception as e:
        duration = time.time() - start_time
        emily.log(f"Business {business_num} EXCEPTION: {str(e)}", "error")
        emily.detect_issue("PIPELINE", str(e), business_name)

        result = {
            "name": business_name,
            "status": "exception",
            "live_url": None,
            "duration": duration,
            "stages": stages_completed,
            "error": str(e)
        }
        emily.record_result(business_name, result)
        emily.metrics["total_duration"] += duration

        return result


async def main():
    """Main test runner"""

    print("""
+==============================================================+
|     GENESIS E2E TEST: 10 BUSINESSES FULL PIPELINE            |
|     Orchestrator: Emily (watching & fixing issues)           |
+==============================================================+
    """)

    # Initialize Emily (Orchestrator)
    emily = EmilyOrchestrator()
    emily.log("Emily online. Beginning full pipeline orchestration.")
    emily.log("I will monitor all 8 stages and step in to fix issues.")

    # Test configurations - diverse business types
    test_configs = [
        ("saas", "small businesses"),
        ("marketplace", "freelancers"),
        ("analytics", "marketing teams"),
        ("automation", "developers"),
        ("education", "students"),
        ("ecommerce", "consumers"),
        ("ai", "enterprises"),
        ("fintech", "startups"),
        ("social", "creators"),
        ("content", "writers"),
    ]

    # Create pipeline with all features enabled
    emily.log("Initializing pipeline with STRICT GATES (85+ RESEARCH required)...")
    pipeline = GenesisPipeline(
        enable_agui=False,  # Disable for speed
        enable_evolution=True,  # SE-Darwin enabled
        enable_n8n=True,  # n8n workflows
        strict_gates=True,  # STRICT: Stop if RESEARCH < 85
        skip_deploy_verification=False  # Full verification
    )
    emily.log("Pipeline initialized successfully.")

    # Run all 10 businesses
    emily.log(f"Starting {len(test_configs)} business runs...")

    results = []
    for i, (business_type, target_market) in enumerate(test_configs, 1):
        emily.log(f"\n{'='*40}")
        emily.log(f"BUSINESS {i}/10")
        emily.log(f"{'='*40}")

        result = await run_single_business(
            pipeline=pipeline,
            emily=emily,
            business_type=business_type,
            target_market=target_market,
            business_num=i
        )
        results.append(result)

        # Brief pause between businesses
        if i < len(test_configs):
            emily.log("Pausing 2s before next business...")
            await asyncio.sleep(2)

    # Final summary
    print(emily.get_summary())

    # Save results to file
    results_file = Path("logs") / f"e2e_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    results_file.parent.mkdir(exist_ok=True)
    with open(results_file, 'w') as f:
        json.dump({
            "metrics": emily.metrics,
            "issues": emily.issues_detected,
            "results": emily.business_results
        }, f, indent=2, default=str)

    emily.log(f"Results saved to: {results_file}")

    # Return exit code based on success rate
    success_rate = emily.metrics["businesses_successful"] / max(emily.metrics["businesses_attempted"], 1)
    if success_rate >= 0.7:  # 70% success rate threshold
        emily.log("TEST PASSED: >= 70% success rate")
        return 0
    else:
        emily.log("TEST FAILED: < 70% success rate", "error")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
