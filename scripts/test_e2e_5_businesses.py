"""
End-to-End Test: 5 Businesses Through Full Pipeline

Tests all 8 pipeline stages with Netlify deployment:
1. RESEARCH (85+ score threshold)
2. DESIGN
3. BUILD
4. TEST
5. DEPLOY (Netlify - static sites with CDN)
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
        logging.FileHandler(f'logs/e2e_5biz_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class EmilyOrchestrator:
    """Emily - The Orchestrator Agent (Netlify deployment version)"""

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
        prefix = "[Emily/Orchestrator]"
        if level == "error":
            logger.error(f"{prefix} {message}")
        elif level == "warning":
            logger.warning(f"{prefix} {message}")
        else:
            logger.info(f"{prefix} {message}")

    def detect_issue(self, stage: str, error: str, business_name: str) -> Dict:
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
        remediations = {
            "RESEARCH": ["Re-run with different business type", "Lower market competition requirements"],
            "DESIGN": ["Simplify UI requirements", "Use template-based design"],
            "BUILD": ["Use fallback code generator", "Simplify tech stack"],
            "TEST": ["Skip flaky tests", "Run critical path only"],
            "DEPLOY": ["Verify Netlify API connectivity", "Check NETLIFY_ACCESS_TOKEN env var", "Review deployment logs"],
            "VERIFY": ["Skip non-critical checks", "Retry verification"],
            "AUTOMATE": ["Run marketing in dry-run mode", "Skip paid integrations"],
            "EVOLVE": ["Store trajectory for later", "Skip evolution this run"]
        }
        return remediations.get(stage, ["Retry the stage"])[0]

    def record_result(self, business_name: str, result: Dict):
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
        success_rate = (self.metrics["businesses_successful"] /
                       max(self.metrics["businesses_attempted"], 1)) * 100

        summary = f"""
{'='*60}
EMILY'S ORCHESTRATION SUMMARY (PIKU-ONLY DEPLOYMENT)
{'='*60}

OVERALL METRICS:
- Businesses Attempted: {self.metrics['businesses_attempted']}
- Successful: {self.metrics['businesses_successful']}
- Failed: {self.metrics['businesses_failed']}
- Success Rate: {success_rate:.1f}%
- Total Duration: {self.metrics['total_duration']:.1f}s

DEPLOYMENT PLATFORM: Netlify (static sites with CDN)

ISSUES DETECTED: {len(self.issues_detected)}
"""

        if self.issues_detected:
            summary += "\nISSUE BREAKDOWN:\n"
            stage_issues = {}
            for issue in self.issues_detected:
                stage = issue['stage']
                stage_issues[stage] = stage_issues.get(stage, 0) + 1
            for stage, count in sorted(stage_issues.items()):
                summary += f"  - {stage}: {count} issues\n"

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

    business_name = f"genesis-netlify-{business_num}-{business_type[:4]}"
    emily.log(f"Starting business {business_num}/5: {business_name} ({business_type} for {target_market})")

    start_time = time.time()
    stages_completed = {}

    try:
        run = await pipeline.run(
            business_type=business_type,
            target_market=target_market,
            name=business_name
        )

        duration = time.time() - start_time

        for stage, output in run.stage_outputs.items():
            stages_completed[stage.name] = {
                "success": output.success,
                "score": output.score,
                "duration": output.duration_seconds,
                "errors": output.errors
            }

            if not output.success:
                error_msg = "; ".join(output.errors) if output.errors else "Stage failed"
                emily.detect_issue(stage.name, error_msg, business_name)

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
    """Main test runner - 5 businesses"""

    print("""
+==============================================================+
|     GENESIS E2E TEST: 5 BUSINESSES (NETLIFY)                 |
|     Orchestrator: Emily (watching & logging issues)          |
|     Deployment: Netlify - Static sites with CDN              |
+==============================================================+
    """)

    emily = EmilyOrchestrator()
    emily.log("Emily online. Beginning Netlify pipeline orchestration.")
    emily.log("Deployment platform: Netlify (static sites with CDN)")
    emily.log("Direct deploy API - no git required.")

    # 5 diverse business types
    test_configs = [
        ("saas", "small businesses"),
        ("marketplace", "freelancers"),
        ("analytics", "marketing teams"),
        ("automation", "developers"),
        ("education", "students"),
    ]

    emily.log("Initializing pipeline with strict gates...")
    pipeline = GenesisPipeline(
        enable_agui=False,
        enable_evolution=True,
        enable_n8n=True,
        strict_gates=True,
        skip_deploy_verification=False
    )
    emily.log("Pipeline initialized successfully.")

    emily.log(f"Starting {len(test_configs)} business runs...")

    results = []
    for i, (business_type, target_market) in enumerate(test_configs, 1):
        emily.log(f"\n{'='*40}")
        emily.log(f"BUSINESS {i}/5")
        emily.log(f"{'='*40}")

        result = await run_single_business(
            pipeline=pipeline,
            emily=emily,
            business_type=business_type,
            target_market=target_market,
            business_num=i
        )
        results.append(result)

        if i < len(test_configs):
            emily.log("Pausing 2s before next business...")
            await asyncio.sleep(2)

    print(emily.get_summary())

    # Save results
    results_file = Path("logs") / f"e2e_5biz_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    results_file.parent.mkdir(exist_ok=True)
    with open(results_file, 'w') as f:
        json.dump({
            "metrics": emily.metrics,
            "issues": emily.issues_detected,
            "results": emily.business_results,
            "deployment_platform": "netlify"
        }, f, indent=2, default=str)

    emily.log(f"Results saved to: {results_file}")

    success_rate = emily.metrics["businesses_successful"] / max(emily.metrics["businesses_attempted"], 1)
    if success_rate >= 0.6:  # 60% for 5 businesses
        emily.log("TEST PASSED: >= 60% success rate")
        return 0
    else:
        emily.log("TEST FAILED: < 60% success rate", "error")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
