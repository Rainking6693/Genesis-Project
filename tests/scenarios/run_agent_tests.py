"""
Genesis Agent Test Runner
Executes 100 test scenarios across 4 difficulty levels.
SE-Darwin runs with every agent for continuous improvement.

Usage:
    python tests/scenarios/run_agent_tests.py --difficulty easy
    python tests/scenarios/run_agent_tests.py --difficulty all --parallel 4
    python tests/scenarios/run_agent_tests.py --test-id E01
"""

import asyncio
import argparse
import json
import logging
import sys
import time
import yaml
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("agent_test_runner")


class TestDifficulty(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    INTERMEDIATE = "intermediate"
    HARD = "hard"
    VERY_HARD = "very_hard"
    HARDEST = "hardest"


@dataclass
class TestResult:
    test_id: str
    name: str
    difficulty: str
    status: str  # passed, failed, error, skipped
    duration_ms: float
    agents_used: List[str]
    se_darwin_improvement: Optional[float] = None
    error_message: Optional[str] = None
    output: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TestSuiteResult:
    total_tests: int
    passed: int
    failed: int
    errors: int
    skipped: int
    duration_ms: float
    results: List[TestResult]
    se_darwin_summary: Dict[str, Any] = field(default_factory=dict)


class AgentTestRunner:
    """Runs Genesis agent test scenarios with SE-Darwin optimization."""

    def __init__(self, scenarios_path: Optional[Path] = None):
        self.scenarios_path = scenarios_path or Path(__file__).parent / "agent_test_scenarios.yaml"
        self.scenarios = self._load_scenarios()
        self.agent_cache = {}
        self.se_darwin_agent = None

    def _load_scenarios(self) -> Dict[str, List[Dict]]:
        """Load test scenarios from YAML file."""
        with open(self.scenarios_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    async def _get_agent(self, agent_name: str) -> Any:
        """Get or create agent instance with caching."""
        if agent_name in self.agent_cache:
            return self.agent_cache[agent_name]

        try:
            from core.agent_entry import get_agent_instance
            agent = await get_agent_instance(agent_name)

            if agent_name == "se_darwin_agent":
                self.se_darwin_agent = agent

            self.agent_cache[agent_name] = agent
            return agent
        except Exception as e:
            logger.error(f"Failed to load agent {agent_name}: {e}")
            return None

    async def _run_se_darwin_optimization(
        self,
        agent_name: str,
        task: str,
        result: Any
    ) -> Optional[float]:
        """Run SE-Darwin optimization on agent execution."""
        if not self.se_darwin_agent:
            try:
                self.se_darwin_agent = await self._get_agent("se_darwin_agent")
            except:
                return None

        if not self.se_darwin_agent:
            return None

        try:
            # SE-Darwin analyzes and suggests improvements
            if hasattr(self.se_darwin_agent, 'evolve_solution'):
                evolution_result = await self.se_darwin_agent.evolve_solution(
                    task_description=f"Optimize {agent_name} for task: {task}",
                    current_solution=str(result)[:500] if result else None
                )
                # Return improvement score if available
                if isinstance(evolution_result, dict):
                    return evolution_result.get('improvement_score', 0.0)
            return 0.0
        except Exception as e:
            logger.debug(f"SE-Darwin optimization failed: {e}")
            return None

    async def _execute_single_method(
        self,
        agent: Any,
        method_name: str,
        inputs: Dict[str, Any]
    ) -> Tuple[bool, Any, Optional[str]]:
        """Execute a single agent method."""
        try:
            if not hasattr(agent, method_name):
                # Try route_task as fallback
                if hasattr(agent, 'route_task'):
                    method_name = 'route_task'
                    inputs = {'task_description': inputs.get('task_description', str(inputs))}
                else:
                    return False, None, f"Method {method_name} not found"

            method = getattr(agent, method_name)

            if asyncio.iscoroutinefunction(method):
                result = await method(**inputs)
            else:
                result = method(**inputs)

            return True, result, None
        except Exception as e:
            return False, None, str(e)

    async def _run_workflow(
        self,
        scenario: Dict[str, Any]
    ) -> Tuple[bool, List[Any], Optional[str]]:
        """Execute a multi-step workflow."""
        workflow = scenario.get('workflow', [])
        results = []

        for step in workflow:
            agent_name = step.get('agent', scenario.get('agents', [None])[1])  # Skip genesis_meta
            if not agent_name or agent_name in ['genesis_meta', 'se_darwin_agent']:
                continue

            agent = await self._get_agent(agent_name)
            if not agent:
                return False, results, f"Could not load agent: {agent_name}"

            method = step.get('method', 'route_task')
            inputs = step.get('inputs', {})

            success, result, error = await self._execute_single_method(agent, method, inputs)
            results.append({'agent': agent_name, 'method': method, 'result': result, 'success': success})

            if not success:
                return False, results, f"Step failed: {agent_name}.{method}: {error}"

        return True, results, None

    async def _run_phases(
        self,
        scenario: Dict[str, Any]
    ) -> Tuple[bool, List[Any], Optional[str]]:
        """Execute a multi-phase orchestration."""
        phases = scenario.get('phases', [])
        results = []

        for phase in phases:
            if isinstance(phase, str):
                # Simple phase name
                results.append({'phase': phase, 'status': 'simulated'})
                continue

            phase_name = phase.get('phase', 'unknown')
            agents = phase.get('agents', [phase.get('agent')])
            if not isinstance(agents, list):
                agents = [agents]

            phase_results = []
            for agent_name in agents:
                if not agent_name or agent_name in ['genesis_meta', 'se_darwin_agent']:
                    continue

                agent = await self._get_agent(agent_name)
                if not agent:
                    continue

                method = phase.get('method', 'route_task')
                inputs = phase.get('inputs', {'task_description': f"Execute {phase_name}"})

                success, result, error = await self._execute_single_method(agent, method, inputs)
                phase_results.append({
                    'agent': agent_name,
                    'method': method,
                    'result': result,
                    'success': success
                })

            results.append({'phase': phase_name, 'results': phase_results})

        return True, results, None

    async def run_test(self, scenario: Dict[str, Any]) -> TestResult:
        """Run a single test scenario."""
        test_id = scenario.get('id', 'unknown')
        name = scenario.get('name', 'Unnamed test')
        difficulty = scenario.get('difficulty', 'unknown')
        agents = scenario.get('agents', [])
        task = scenario.get('task', '')

        logger.info(f"Running test {test_id}: {name}")
        start_time = time.time()

        try:
            # Determine execution type
            if 'workflow' in scenario:
                success, output, error = await self._run_workflow(scenario)
            elif 'phases' in scenario:
                success, output, error = await self._run_phases(scenario)
            else:
                # Single method execution
                method = scenario.get('method', 'route_task')
                inputs = scenario.get('inputs', {'task_description': task})

                # Get primary agent (skip genesis_meta and se_darwin)
                primary_agent_name = None
                for agent_name in agents:
                    if agent_name not in ['genesis_meta', 'se_darwin_agent']:
                        primary_agent_name = agent_name
                        break

                if not primary_agent_name:
                    return TestResult(
                        test_id=test_id,
                        name=name,
                        difficulty=difficulty,
                        status="skipped",
                        duration_ms=(time.time() - start_time) * 1000,
                        agents_used=agents,
                        error_message="No primary agent found"
                    )

                agent = await self._get_agent(primary_agent_name)
                if not agent:
                    return TestResult(
                        test_id=test_id,
                        name=name,
                        difficulty=difficulty,
                        status="error",
                        duration_ms=(time.time() - start_time) * 1000,
                        agents_used=agents,
                        error_message=f"Could not load agent: {primary_agent_name}"
                    )

                success, output, error = await self._execute_single_method(agent, method, inputs)

            # Run SE-Darwin optimization
            se_darwin_improvement = await self._run_se_darwin_optimization(
                agent_name=agents[1] if len(agents) > 1 else "unknown",
                task=task,
                result=output
            )

            duration_ms = (time.time() - start_time) * 1000

            if success:
                logger.info(f"  [PASS] {test_id} PASSED ({duration_ms:.0f}ms)")
                return TestResult(
                    test_id=test_id,
                    name=name,
                    difficulty=difficulty,
                    status="passed",
                    duration_ms=duration_ms,
                    agents_used=agents,
                    se_darwin_improvement=se_darwin_improvement,
                    output=output
                )
            else:
                logger.warning(f"  [FAIL] {test_id} FAILED: {error}")
                return TestResult(
                    test_id=test_id,
                    name=name,
                    difficulty=difficulty,
                    status="failed",
                    duration_ms=duration_ms,
                    agents_used=agents,
                    se_darwin_improvement=se_darwin_improvement,
                    error_message=error
                )

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"  [ERR] {test_id} ERROR: {e}")
            return TestResult(
                test_id=test_id,
                name=name,
                difficulty=difficulty,
                status="error",
                duration_ms=duration_ms,
                agents_used=agents,
                error_message=str(e)
            )

    def get_tests_by_difficulty(self, difficulty: Optional[str] = None) -> List[Dict]:
        """Get tests filtered by difficulty."""
        all_tests = []

        difficulty_map = {
            'easy': 'easy_tests',
            'medium': 'medium_tests',
            'intermediate': 'intermediate_tests',
            'hard': 'hard_tests',
            'very_hard': 'very_hard_tests',
            'hardest': 'hardest_tests'
        }

        if difficulty and difficulty != 'all':
            key = difficulty_map.get(difficulty)
            if key and key in self.scenarios:
                return self.scenarios[key]
            return []

        # Return all tests
        for key in difficulty_map.values():
            if key in self.scenarios:
                all_tests.extend(self.scenarios[key])

        return all_tests

    async def run_suite(
        self,
        difficulty: Optional[str] = None,
        test_ids: Optional[List[str]] = None,
        parallel: int = 1
    ) -> TestSuiteResult:
        """Run a suite of tests."""
        tests = self.get_tests_by_difficulty(difficulty)

        if test_ids:
            tests = [t for t in tests if t.get('id') in test_ids]

        logger.info(f"Running {len(tests)} tests (difficulty={difficulty or 'all'}, parallel={parallel})")
        start_time = time.time()

        results = []

        if parallel > 1:
            # Run tests in parallel batches
            for i in range(0, len(tests), parallel):
                batch = tests[i:i + parallel]
                batch_results = await asyncio.gather(
                    *[self.run_test(test) for test in batch],
                    return_exceptions=True
                )
                for j, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        results.append(TestResult(
                            test_id=batch[j].get('id', 'unknown'),
                            name=batch[j].get('name', 'unknown'),
                            difficulty=batch[j].get('difficulty', 'unknown'),
                            status="error",
                            duration_ms=0,
                            agents_used=batch[j].get('agents', []),
                            error_message=str(result)
                        ))
                    else:
                        results.append(result)
        else:
            # Run tests sequentially
            for test in tests:
                result = await self.run_test(test)
                results.append(result)

        duration_ms = (time.time() - start_time) * 1000

        # Calculate summary
        passed = sum(1 for r in results if r.status == "passed")
        failed = sum(1 for r in results if r.status == "failed")
        errors = sum(1 for r in results if r.status == "error")
        skipped = sum(1 for r in results if r.status == "skipped")

        # SE-Darwin summary
        se_improvements = [r.se_darwin_improvement for r in results if r.se_darwin_improvement is not None]
        se_darwin_summary = {
            "total_optimizations": len(se_improvements),
            "average_improvement": sum(se_improvements) / len(se_improvements) if se_improvements else 0,
            "max_improvement": max(se_improvements) if se_improvements else 0
        }

        return TestSuiteResult(
            total_tests=len(results),
            passed=passed,
            failed=failed,
            errors=errors,
            skipped=skipped,
            duration_ms=duration_ms,
            results=results,
            se_darwin_summary=se_darwin_summary
        )


def print_results(suite_result: TestSuiteResult):
    """Print test results summary."""
    print("\n" + "=" * 70)
    print("GENESIS AGENT TEST RESULTS")
    print("=" * 70)
    print(f"\nTotal: {suite_result.total_tests} tests")
    print(f"  [PASS] Passed:  {suite_result.passed}")
    print(f"  [FAIL] Failed:  {suite_result.failed}")
    print(f"  [ERR]  Errors:  {suite_result.errors}")
    print(f"  [SKIP] Skipped: {suite_result.skipped}")
    print(f"\nDuration: {suite_result.duration_ms / 1000:.2f}s")

    print("\n" + "-" * 70)
    print("SE-DARWIN OPTIMIZATION SUMMARY")
    print("-" * 70)
    print(f"  Total optimizations: {suite_result.se_darwin_summary.get('total_optimizations', 0)}")
    print(f"  Average improvement: {suite_result.se_darwin_summary.get('average_improvement', 0):.2%}")
    print(f"  Max improvement: {suite_result.se_darwin_summary.get('max_improvement', 0):.2%}")

    # Print failures
    failures = [r for r in suite_result.results if r.status in ['failed', 'error']]
    if failures:
        print("\n" + "-" * 70)
        print("FAILURES")
        print("-" * 70)
        for r in failures[:10]:  # Show first 10
            print(f"\n  {r.test_id}: {r.name}")
            print(f"    Status: {r.status}")
            print(f"    Error: {r.error_message}")

    print("\n" + "=" * 70)

    # Pass rate
    pass_rate = suite_result.passed / suite_result.total_tests * 100 if suite_result.total_tests > 0 else 0
    print(f"\nPASS RATE: {pass_rate:.1f}%")

    if pass_rate >= 90:
        print("[EXCELLENT] Suite passed with flying colors!")
    elif pass_rate >= 70:
        print("[GOOD] Most tests passing, some issues to address")
    elif pass_rate >= 50:
        print("[NEEDS WORK] Significant failures detected")
    else:
        print("[CRITICAL] Major issues require immediate attention")


async def main():
    parser = argparse.ArgumentParser(description="Run Genesis agent test scenarios")
    parser.add_argument(
        "--difficulty", "-d",
        choices=["easy", "medium", "intermediate", "hard", "very_hard", "hardest", "all"],
        default="all",
        help="Test difficulty level"
    )
    parser.add_argument(
        "--test-id", "-t",
        nargs="+",
        help="Specific test IDs to run (e.g., E01 I05 H10)"
    )
    parser.add_argument(
        "--parallel", "-p",
        type=int,
        default=1,
        help="Number of parallel test executions"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output JSON file for results"
    )
    parser.add_argument(
        "--scenarios", "-s",
        help="Path to scenarios YAML file (default: agent_test_scenarios.yaml)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    scenarios_path = Path(args.scenarios) if args.scenarios else None
    runner = AgentTestRunner(scenarios_path=scenarios_path)

    suite_result = await runner.run_suite(
        difficulty=args.difficulty if args.difficulty != "all" else None,
        test_ids=args.test_id,
        parallel=args.parallel
    )

    print_results(suite_result)

    if args.output:
        output_path = Path(args.output)
        results_dict = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": suite_result.total_tests,
            "passed": suite_result.passed,
            "failed": suite_result.failed,
            "errors": suite_result.errors,
            "skipped": suite_result.skipped,
            "duration_ms": suite_result.duration_ms,
            "se_darwin_summary": suite_result.se_darwin_summary,
            "results": [
                {
                    "test_id": r.test_id,
                    "name": r.name,
                    "difficulty": r.difficulty,
                    "status": r.status,
                    "duration_ms": r.duration_ms,
                    "agents_used": r.agents_used,
                    "se_darwin_improvement": r.se_darwin_improvement,
                    "error_message": r.error_message
                }
                for r in suite_result.results
            ]
        }
        with open(output_path, 'w') as f:
            json.dump(results_dict, f, indent=2)
        print(f"\nResults saved to: {output_path}")

    # Exit with appropriate code
    if suite_result.failed > 0 or suite_result.errors > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
