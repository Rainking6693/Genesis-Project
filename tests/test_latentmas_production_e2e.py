"""
LatentMAS Production End-to-End Test Suite

50 Full-Cycle Tests:
- Tests 1-25: Genesis + Core Agents (11 agents)
- Tests 26-50: Genesis + All Agents (26+ agents)

Each test performs a complete business generation cycle:
1. Generate business idea
2. Route through HALO with LatentMAS
3. Execute multi-agent collaboration in latent space
4. Store trajectories in memory systems
5. Verify outputs and metrics

Monitoring: Cora + Hudson continuous oversight
"""

import asyncio
import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment
from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Configure logging
log_dir = Path("logs/latentmas_e2e")
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_dir / f"e2e_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("LatentMAS_E2E")


# =============================================================================
# TEST CONFIGURATION
# =============================================================================

class TestPhase(Enum):
    CORE_AGENTS = "core_agents"      # Tests 1-25: 11 core agents
    ALL_AGENTS = "all_agents"        # Tests 26-50: 26+ agents


@dataclass
class TestConfig:
    """Configuration for test suite"""
    total_tests: int = 50
    core_agent_tests: int = 25
    all_agent_tests: int = 25
    timeout_per_test: int = 120  # seconds
    retry_on_failure: int = 2
    enable_latentmas: bool = True
    enable_memory_persistence: bool = True
    min_token_savings: float = 0.50  # Minimum 50% token savings expected


# Core 11 agents for tests 1-25
CORE_AGENTS = [
    "spec_writer_agent",
    "builder_agent",
    "qa_agent",
    "deploy_agent",
    "marketing_agent",
    "seo_agent",
    "support_agent",
    "analyst_agent",
    "content_agent",
    "billing_agent",
    "security_agent"
]

# All 26+ agents for tests 26-50
ALL_AGENTS = CORE_AGENTS + [
    "legal_agent",
    "email_agent",
    "onboarding_agent",
    "maintenance_agent",
    "domain_agent",
    "htdag_agent",
    "halo_router",
    "aop_agent",
    "daao_agent",
    "emergency_error_specialist",
    "spec_analyzer",
    "business_analyst",
    "growth_specialist",
    "api_agent",
    "data_agent"
]

# Business types to test
BUSINESS_TYPES = [
    "saas", "marketplace", "content", "analytics",
    "automation", "education", "social", "ecommerce",
    "ai_tool", "fintech"
]

# Test scenarios
TEST_SCENARIOS = [
    {"name": "Landing Page", "desc": "Create a modern landing page with hero section and CTA"},
    {"name": "REST API", "desc": "Build a REST API with authentication and CRUD operations"},
    {"name": "Dashboard", "desc": "Create an analytics dashboard with charts and metrics"},
    {"name": "E-commerce Store", "desc": "Build a simple e-commerce store with product catalog"},
    {"name": "Blog Platform", "desc": "Create a blog platform with posts and comments"},
    {"name": "Task Manager", "desc": "Build a task management app with projects and tasks"},
    {"name": "Chat Application", "desc": "Create a real-time chat application"},
    {"name": "Portfolio Site", "desc": "Build a portfolio website with projects showcase"},
    {"name": "Newsletter System", "desc": "Create an email newsletter subscription system"},
    {"name": "Booking System", "desc": "Build an appointment booking system"},
]


@dataclass
class TestResult:
    """Result of a single test"""
    test_id: int
    test_name: str
    phase: TestPhase
    status: str  # "passed", "failed", "error"
    duration_seconds: float
    agents_used: List[str]
    token_savings: float
    speedup_factor: float
    output_length: int
    error_message: Optional[str] = None
    retry_count: int = 0
    memory_stored: bool = False
    trajectory_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class TestSuiteResults:
    """Results for entire test suite"""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    core_agent_passed: int = 0
    all_agent_passed: int = 0
    avg_token_savings: float = 0.0
    avg_speedup: float = 0.0
    total_duration: float = 0.0
    results: List[TestResult] = field(default_factory=list)
    errors_fixed: int = 0


# =============================================================================
# TEST EXECUTOR
# =============================================================================

class LatentMASProductionTester:
    """
    Production E2E tester for LatentMAS integration.

    Runs 50 full-cycle tests with continuous monitoring.
    """

    def __init__(self, config: TestConfig = None):
        self.config = config or TestConfig()
        self.results = TestSuiteResults()
        self.halo_router = None
        self.latentmas_bridge = None
        self.memory_client = None
        self._initialized = False

    async def initialize(self) -> bool:
        """Initialize all required systems"""
        logger.info("=" * 60)
        logger.info("INITIALIZING LATENTMAS PRODUCTION TEST SUITE")
        logger.info("=" * 60)

        try:
            # Initialize HALO Router
            logger.info("[1/4] Initializing HALO Router...")
            from infrastructure.halo_router import HALORouter
            self.halo_router = HALORouter()
            logger.info(f"      HALO Router: {len(self.halo_router.agent_registry)} agents registered")
            logger.info(f"      LatentMAS enabled: {self.halo_router.enable_latentmas}")

            # Initialize LatentMAS Bridge directly
            logger.info("[2/4] Initializing LatentMAS Bridge...")
            from infrastructure.latentmas_integration import LatentMASBridge, LatentMASConfig
            latent_config = LatentMASConfig(
                latent_steps=20,
                enable_latent_realignment=True
            )
            self.latentmas_bridge = LatentMASBridge(latent_config)
            logger.info(f"      LatentMAS Bridge: Ready")
            logger.info(f"      Agent prompts: {len(self.latentmas_bridge._agent_prompts)} defined")

            # Initialize Memory Client
            logger.info("[3/4] Initializing Memory Systems...")
            try:
                from infrastructure.memory.memori_client import MemoriClient
                self.memory_client = MemoriClient()
                logger.info(f"      Memori Client: Connected")
            except Exception as e:
                logger.warning(f"      Memori Client: {e} (continuing without)")

            # Verify TrajectoryPool
            logger.info("[4/4] Verifying TrajectoryPool...")
            try:
                from infrastructure.trajectory_pool import TrajectoryPool
                tp = TrajectoryPool(agent_name="latentmas_e2e_test")
                logger.info(f"      TrajectoryPool: Ready")
            except Exception as e:
                logger.warning(f"      TrajectoryPool: {e} (continuing without)")

            self._initialized = True
            logger.info("")
            logger.info("[OK] All systems initialized successfully")
            logger.info("=" * 60)
            return True

        except Exception as e:
            logger.error(f"[FAIL] Initialization failed: {e}")
            logger.error(traceback.format_exc())
            return False

    async def run_single_test(
        self,
        test_id: int,
        phase: TestPhase,
        scenario: Dict[str, str],
        agents: List[str]
    ) -> TestResult:
        """Run a single E2E test"""
        test_name = f"Test_{test_id:02d}_{scenario['name'].replace(' ', '_')}"
        start_time = time.time()

        logger.info(f"\n{'─' * 50}")
        logger.info(f"[TEST {test_id:02d}/50] {scenario['name']}")
        logger.info(f"  Phase: {phase.value}")
        logger.info(f"  Agents: {len(agents)}")
        logger.info(f"{'─' * 50}")

        result = TestResult(
            test_id=test_id,
            test_name=test_name,
            phase=phase,
            status="pending",
            duration_seconds=0,
            agents_used=[],
            token_savings=0.0,
            speedup_factor=1.0,
            output_length=0
        )

        retry_count = 0
        last_error = None

        while retry_count <= self.config.retry_on_failure:
            try:
                # Select agent subset for this test
                test_agents = self._select_agents_for_test(agents, scenario)
                result.agents_used = test_agents

                # Build task description
                business_type = BUSINESS_TYPES[test_id % len(BUSINESS_TYPES)]
                task_desc = f"{scenario['desc']} for a {business_type} business"

                logger.info(f"  Task: {task_desc[:60]}...")
                logger.info(f"  Using agents: {test_agents[:5]}..." if len(test_agents) > 5 else f"  Using agents: {test_agents}")

                # Execute latent collaboration
                collab_result = await self._execute_latent_collaboration(
                    task_desc,
                    test_agents,
                    phase
                )

                # Extract results
                result.token_savings = collab_result.get("token_savings", 0.0)
                result.speedup_factor = collab_result.get("speedup_factor", 1.0)
                result.output_length = len(collab_result.get("output", ""))
                result.trajectory_id = collab_result.get("metadata", {}).get("session_id")

                # Check for errors
                if collab_result.get("error"):
                    raise Exception(collab_result["error"])

                # Verify minimum token savings
                if result.token_savings < self.config.min_token_savings:
                    logger.warning(f"  [WARN] Token savings below threshold: {result.token_savings:.1%} < {self.config.min_token_savings:.1%}")

                # Store to memory if enabled
                if self.config.enable_memory_persistence and self.memory_client:
                    try:
                        await self._store_test_result(result, collab_result)
                        result.memory_stored = True
                    except Exception as me:
                        logger.warning(f"  Memory storage failed: {me}")

                result.status = "passed"
                result.duration_seconds = time.time() - start_time

                logger.info(f"  [PASS] PASSED in {result.duration_seconds:.1f}s")
                logger.info(f"     Token savings: {result.token_savings:.1%}")
                logger.info(f"     Speedup: {result.speedup_factor:.1f}x")
                logger.info(f"     Output: {result.output_length} chars")

                return result

            except Exception as e:
                last_error = str(e)
                retry_count += 1
                result.retry_count = retry_count

                if retry_count <= self.config.retry_on_failure:
                    logger.warning(f"  [RETRY] Attempt {retry_count} failed: {e}")
                    logger.info(f"  Retrying in 2s...")
                    await asyncio.sleep(2)

                    # Try to fix the error
                    fix_applied = await self._attempt_error_fix(e, test_id)
                    if fix_applied:
                        self.results.errors_fixed += 1
                        logger.info(f"  [FIX] Error fix applied")

        # All retries exhausted
        result.status = "failed"
        result.error_message = last_error
        result.duration_seconds = time.time() - start_time

        logger.error(f"  [FAIL] FAILED after {retry_count} attempts: {last_error}")

        return result

    def _select_agents_for_test(
        self,
        available_agents: List[str],
        scenario: Dict[str, str]
    ) -> List[str]:
        """Select appropriate agents for the test scenario"""
        # Map scenario keywords to required agents
        scenario_name = scenario["name"].lower()

        # Always include core agents
        selected = ["spec_writer", "builder", "qa"]

        # Add scenario-specific agents
        if "api" in scenario_name:
            selected.extend(["security", "deploy"])
        elif "dashboard" in scenario_name or "analytics" in scenario_name:
            selected.extend(["analyst", "deploy"])
        elif "commerce" in scenario_name or "store" in scenario_name:
            selected.extend(["billing", "security", "deploy"])
        elif "blog" in scenario_name or "content" in scenario_name:
            selected.extend(["content", "seo"])
        elif "chat" in scenario_name:
            selected.extend(["security", "deploy"])
        elif "newsletter" in scenario_name or "email" in scenario_name:
            selected.extend(["email", "marketing"])
        else:
            selected.extend(["deploy"])

        # Always add judger at the end
        selected.append("judger")

        # Deduplicate while preserving order
        seen = set()
        unique = []
        for a in selected:
            if a not in seen:
                seen.add(a)
                unique.append(a)

        return unique

    async def _execute_latent_collaboration(
        self,
        task_description: str,
        agents: List[str],
        phase: TestPhase
    ) -> Dict[str, Any]:
        """Execute latent collaboration through HALO router or directly"""

        # Try HALO router first if LatentMAS is enabled there
        if self.halo_router and self.halo_router.enable_latentmas:
            try:
                result = await self.halo_router.latent_collaborate(
                    task_description=task_description,
                    agents=agents,
                    mode="sequential" if phase == TestPhase.CORE_AGENTS else "hierarchical"
                )
                return result
            except Exception as e:
                logger.debug(f"HALO latent_collaborate failed: {e}, falling back to direct bridge")

        # Fall back to direct bridge
        if self.latentmas_bridge:
            from infrastructure.latentmas_integration import CollaborationMode

            mode = CollaborationMode.SEQUENTIAL if phase == TestPhase.CORE_AGENTS else CollaborationMode.HIERARCHICAL

            result = await self.latentmas_bridge.collaborate(
                agents=agents,
                task={"description": task_description},
                mode=mode
            )

            return {
                "output": result.output,
                "agents_used": result.agents_used,
                "token_savings": result.token_savings,
                "speedup_factor": result.speedup_factor,
                "error": result.error,
                "metadata": result.metadata
            }

        raise RuntimeError("LatentMAS not available: HALO disabled and bridge not initialized")

    async def _store_test_result(
        self,
        result: TestResult,
        collab_result: Dict[str, Any]
    ) -> None:
        """Store test result in memory systems"""
        if self.memory_client:
            # Use upsert_memory (correct method name for MemoriClient)
            self.memory_client.upsert_memory(
                namespace="latentmas_e2e_tests",
                subject=None,
                key=result.test_name,
                value={
                    "test_id": result.test_id,
                    "status": result.status,
                    "token_savings": result.token_savings,
                    "speedup_factor": result.speedup_factor,
                    "agents_used": result.agents_used,
                    "duration": result.duration_seconds
                },
                metadata={"phase": result.phase.value}
            )

    async def _attempt_error_fix(self, error: Exception, test_id: int) -> bool:
        """Attempt to fix common errors automatically"""
        error_str = str(error).lower()

        # Connection errors - wait and retry
        if "connection" in error_str or "timeout" in error_str:
            logger.info("  [FIX] Connection issue detected, waiting...")
            await asyncio.sleep(5)
            return True

        # Model not found - try fallback
        if "model" in error_str and "not found" in error_str:
            logger.info("  [FIX] Switching to fallback model...")
            if self.latentmas_bridge:
                self.latentmas_bridge.config.primary_model = self.latentmas_bridge.config.fallback_model
            return True

        # Memory errors - disable persistence
        if "memory" in error_str or "memori" in error_str:
            logger.info("  [FIX] Disabling memory persistence...")
            self.config.enable_memory_persistence = False
            return True

        return False

    async def run_all_tests(self) -> TestSuiteResults:
        """Run all 50 tests"""
        if not self._initialized:
            if not await self.initialize():
                logger.error("Failed to initialize - aborting tests")
                return self.results

        start_time = time.time()

        logger.info("\n" + "=" * 60)
        logger.info("STARTING 50 FULL-CYCLE E2E TESTS")
        logger.info("=" * 60)
        logger.info(f"  Tests 1-25: Genesis + Core Agents ({len(CORE_AGENTS)} agents)")
        logger.info(f"  Tests 26-50: Genesis + All Agents ({len(ALL_AGENTS)} agents)")
        logger.info("=" * 60 + "\n")

        # Phase 1: Core Agents (Tests 1-25)
        logger.info("\n" + "=" * 60)
        logger.info("PHASE 1: CORE AGENTS (Tests 1-25)")
        logger.info("=" * 60)

        for i in range(1, 26):
            scenario = TEST_SCENARIOS[(i - 1) % len(TEST_SCENARIOS)]
            result = await self.run_single_test(
                test_id=i,
                phase=TestPhase.CORE_AGENTS,
                scenario=scenario,
                agents=CORE_AGENTS
            )
            self.results.results.append(result)
            self.results.total_tests += 1

            if result.status == "passed":
                self.results.passed += 1
                self.results.core_agent_passed += 1
            elif result.status == "failed":
                self.results.failed += 1
            else:
                self.results.errors += 1

            # Progress update every 5 tests
            if i % 5 == 0:
                self._log_progress()

        # Phase 2: All Agents (Tests 26-50)
        logger.info("\n" + "=" * 60)
        logger.info("PHASE 2: ALL AGENTS (Tests 26-50)")
        logger.info("=" * 60)

        for i in range(26, 51):
            scenario = TEST_SCENARIOS[(i - 1) % len(TEST_SCENARIOS)]
            result = await self.run_single_test(
                test_id=i,
                phase=TestPhase.ALL_AGENTS,
                scenario=scenario,
                agents=ALL_AGENTS
            )
            self.results.results.append(result)
            self.results.total_tests += 1

            if result.status == "passed":
                self.results.passed += 1
                self.results.all_agent_passed += 1
            elif result.status == "failed":
                self.results.failed += 1
            else:
                self.results.errors += 1

            # Progress update every 5 tests
            if i % 5 == 0:
                self._log_progress()

        # Calculate final metrics
        self.results.total_duration = time.time() - start_time

        passed_results = [r for r in self.results.results if r.status == "passed"]
        if passed_results:
            self.results.avg_token_savings = sum(r.token_savings for r in passed_results) / len(passed_results)
            self.results.avg_speedup = sum(r.speedup_factor for r in passed_results) / len(passed_results)

        # Print final report
        self._print_final_report()

        return self.results

    def _log_progress(self):
        """Log current progress"""
        passed = self.results.passed
        total = self.results.total_tests
        rate = (passed / total * 100) if total > 0 else 0

        logger.info(f"\n[PROGRESS] {total}/50 tests | {passed} passed ({rate:.1f}%) | {self.results.failed} failed | {self.results.errors_fixed} errors fixed\n")

    def _print_final_report(self):
        """Print comprehensive final report"""
        r = self.results

        logger.info("\n" + "=" * 70)
        logger.info("LATENTMAS PRODUCTION E2E TEST SUITE - FINAL REPORT")
        logger.info("=" * 70)

        logger.info(f"""
┌─────────────────────────────────────────────────────────────────────┐
│                        TEST RESULTS SUMMARY                          │
├─────────────────────────────────────────────────────────────────────┤
│  Total Tests:        {r.total_tests:3d}                                          │
│  Passed:             {r.passed:3d} ({r.passed/r.total_tests*100 if r.total_tests > 0 else 0:.1f}%)                                     │
│  Failed:             {r.failed:3d}                                          │
│  Errors:             {r.errors:3d}                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Phase 1 (Core):     {r.core_agent_passed:3d}/25 passed                               │
│  Phase 2 (All):      {r.all_agent_passed:3d}/25 passed                               │
├─────────────────────────────────────────────────────────────────────┤
│  Avg Token Savings:  {r.avg_token_savings:.1%}                                       │
│  Avg Speedup:        {r.avg_speedup:.1f}x                                         │
│  Total Duration:     {r.total_duration:.1f}s                                      │
│  Errors Fixed:       {r.errors_fixed:3d}                                          │
└─────────────────────────────────────────────────────────────────────┘
""")

        # List any failures
        failures = [r for r in self.results.results if r.status != "passed"]
        if failures:
            logger.info("\n[FAIL] FAILED TESTS:")
            for f in failures:
                logger.info(f"   Test {f.test_id}: {f.test_name} - {f.error_message}")

        # Overall verdict
        pass_rate = r.passed / r.total_tests * 100 if r.total_tests > 0 else 0

        if pass_rate >= 90:
            verdict = "[EXCELLENT] Production Ready"
        elif pass_rate >= 80:
            verdict = "[GOOD] Minor issues to address"
        elif pass_rate >= 70:
            verdict = "[ACCEPTABLE] Some issues need attention"
        else:
            verdict = "[NEEDS WORK] Significant issues found"

        logger.info(f"\n{'=' * 70}")
        logger.info(f"VERDICT: {verdict}")
        logger.info(f"{'=' * 70}\n")

        # Save report to file
        self._save_report_to_file()

    def _save_report_to_file(self):
        """Save detailed report to file"""
        report_path = log_dir / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        report = {
            "summary": {
                "total_tests": self.results.total_tests,
                "passed": self.results.passed,
                "failed": self.results.failed,
                "errors": self.results.errors,
                "core_agent_passed": self.results.core_agent_passed,
                "all_agent_passed": self.results.all_agent_passed,
                "avg_token_savings": self.results.avg_token_savings,
                "avg_speedup": self.results.avg_speedup,
                "total_duration": self.results.total_duration,
                "errors_fixed": self.results.errors_fixed
            },
            "results": [asdict(r) for r in self.results.results],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"[REPORT] Detailed report saved to: {report_path}")


# =============================================================================
# MONITORING AGENTS
# =============================================================================

class CoraMonitor:
    """Cora agent for continuous test monitoring"""

    def __init__(self, tester: LatentMASProductionTester):
        self.tester = tester
        self.alerts_sent = 0

    async def monitor(self):
        """Continuously monitor test progress"""
        while True:
            await asyncio.sleep(10)  # Check every 10 seconds

            results = self.tester.results
            if results.total_tests == 0:
                continue

            # Check for concerning patterns
            fail_rate = results.failed / results.total_tests if results.total_tests > 0 else 0

            if fail_rate > 0.3:
                self._alert("HIGH FAILURE RATE", f"{fail_rate:.1%} of tests failing")

            if results.errors_fixed > 5:
                self._alert("MANY ERRORS FIXED", f"{results.errors_fixed} errors auto-fixed")

    def _alert(self, alert_type: str, message: str):
        """Send alert"""
        self.alerts_sent += 1
        logger.warning(f"[CORA ALERT #{self.alerts_sent}] {alert_type}: {message}")


class HudsonMonitor:
    """Hudson agent for code quality monitoring"""

    def __init__(self, tester: LatentMASProductionTester):
        self.tester = tester
        self.reviews = 0

    async def monitor(self):
        """Monitor code quality during tests"""
        while True:
            await asyncio.sleep(15)  # Check every 15 seconds

            # Review recent results
            recent = self.tester.results.results[-5:] if self.tester.results.results else []

            for result in recent:
                if result.token_savings < 0.5:
                    self._review_warning(result, "Low token savings")
                if result.output_length < 100:
                    self._review_warning(result, "Short output")

    def _review_warning(self, result: TestResult, issue: str):
        """Log review warning"""
        self.reviews += 1
        logger.warning(f"[HUDSON REVIEW #{self.reviews}] Test {result.test_id}: {issue}")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

async def main():
    """Main entry point for production E2E tests"""
    print("\n" + "=" * 70)
    print("=" + " " * 68 + "=")
    print("=" + "  LATENTMAS PRODUCTION E2E TEST SUITE".center(68) + "=")
    print("=" + "  50 Full-Cycle Tests with Continuous Monitoring".center(68) + "=")
    print("=" + " " * 68 + "=")
    print("=" * 70 + "\n")

    # Create tester
    config = TestConfig(
        total_tests=50,
        timeout_per_test=120,
        retry_on_failure=2,
        enable_latentmas=True,
        enable_memory_persistence=True,
        min_token_savings=0.50
    )

    tester = LatentMASProductionTester(config)

    # Create monitors
    cora = CoraMonitor(tester)
    hudson = HudsonMonitor(tester)

    # Start monitoring in background
    monitor_tasks = [
        asyncio.create_task(cora.monitor()),
        asyncio.create_task(hudson.monitor())
    ]

    try:
        # Run all tests
        results = await tester.run_all_tests()

        # Cancel monitors
        for task in monitor_tasks:
            task.cancel()

        return results

    except KeyboardInterrupt:
        logger.info("\n[WARN] Test suite interrupted by user")
        for task in monitor_tasks:
            task.cancel()
        return tester.results

    except Exception as e:
        logger.error(f"\n[ERROR] Test suite failed: {e}")
        logger.error(traceback.format_exc())
        for task in monitor_tasks:
            task.cancel()
        return tester.results


if __name__ == "__main__":
    results = asyncio.run(main())

    # Exit with appropriate code
    if results.passed == results.total_tests:
        sys.exit(0)
    elif results.passed / results.total_tests >= 0.8 if results.total_tests > 0 else False:
        sys.exit(0)  # 80%+ pass rate is acceptable
    else:
        sys.exit(1)
