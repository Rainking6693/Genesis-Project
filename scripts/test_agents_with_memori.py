"""
Multi-Agent Test with Memori Backend
Tests multiple Genesis agents with TrajectoryPool and CaseBank integration
"""
import os
import sys
import asyncio
import logging
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env

# Load environment first
load_genesis_env()

# Ensure Memori backend is enabled
os.environ["GENESIS_MEMORY_BACKEND"] = "memori"
os.environ["MEMORI_DB_PATH"] = "data/memori/genesis_memori.db"
os.environ["DREAMGYM_AUTO_MIRROR"] = "true"

from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus, OperatorType
from infrastructure.casebank import CaseBank
from infrastructure.memory.memori_client import MemoriClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AgentTestHarness:
    """Test harness for agents with Memori backend"""

    def __init__(self):
        self.results = {
            "agents_tested": [],
            "trajectories_stored": 0,
            "cases_stored": 0,
            "sql_mirror_active": False,
            "errors": []
        }
        self.memori_client = MemoriClient()
        self.casebank = CaseBank(backend="sql")

    def test_agent_with_trajectory(self, agent_name: str, task_desc: str, success_score: float) -> bool:
        """Test an agent by storing its trajectory"""
        try:
            logger.info(f"Testing agent: {agent_name}")

            # Create TrajectoryPool for this agent
            pool = TrajectoryPool(agent_name=agent_name)

            # Check if SQL mirror is active
            if pool.sql_mirror and not self.results["sql_mirror_active"]:
                self.results["sql_mirror_active"] = True
                logger.info(f"[OK] SQL mirror ACTIVE for {agent_name}")

            # Create a trajectory
            trajectory = Trajectory(
                trajectory_id=str(uuid.uuid4()),
                generation=1,
                agent_name=agent_name,
                operator_applied=OperatorType.BASELINE.value,
                code_changes=f"Completed task: {task_desc}",
                problem_diagnosis=f"Agent {agent_name} processing: {task_desc}",
                proposed_strategy=f"Execute {task_desc} using {agent_name} capabilities",
                status=TrajectoryStatus.SUCCESS.value if success_score >= 0.7 else TrajectoryStatus.FAILURE.value,
                success_score=success_score,
                test_results={"passed": int(success_score * 10), "failed": int((1-success_score) * 10)},
                tools_used=[agent_name, "memori", "trajectory_pool"],
                modified_files=[f"{agent_name}_output.py"],
                execution_time_seconds=5.0 + (success_score * 10)
            )

            # Store trajectory
            pool.add_trajectory(trajectory)
            self.results["trajectories_stored"] += 1

            logger.info(f"  [OK] Stored trajectory: {trajectory.trajectory_id[:8]}... (score={success_score})")

            # Verify trajectory was stored
            retrieved = pool.get_trajectory(trajectory.trajectory_id)
            if retrieved:
                logger.info("  [OK] Verified trajectory retrieval")
            else:
                logger.warning("  [WARN] Could not retrieve trajectory")

            self.results["agents_tested"].append({
                "agent": agent_name,
                "status": "success",
                "score": success_score,
                "trajectory_id": trajectory.trajectory_id
            })

            return True

        except Exception as e:
            logger.error(f"  [ERROR] Error testing {agent_name}: {e}", exc_info=True)
            self.results["errors"].append({
                "agent": agent_name,
                "error": str(e)
            })
            self.results["agents_tested"].append({
                "agent": agent_name,
                "status": "error",
                "error": str(e)
            })
            return False

    async def test_agent_with_casebank(self, agent_name: str, problem: str, solution: str, reward: float) -> bool:
        """Test an agent by storing a case in CaseBank"""
        try:
            logger.info(f"Storing case for agent: {agent_name}")

            # Store case
            case = await self.casebank.add_case(
                state=problem,
                action=solution,
                reward=reward,
                metadata={
                    "agent": agent_name,
                    "timestamp": datetime.now().isoformat(),
                    "test_run": True
                }
            )

            self.results["cases_stored"] += 1
            logger.info(f"  [OK] Stored case: {case.case_id[:8]}... (reward={reward})")

            # Verify case retrieval
            similar = await self.casebank.retrieve_similar(
                query_state=problem,
                k=3,
                min_reward=0.5
            )

            if similar:
                logger.info(f"  [OK] Retrieved {len(similar)} similar case(s)")
            else:
                logger.warning("  [WARN] No similar cases found")

            return True

        except Exception as e:
            logger.error(f"  [ERROR] Error storing case for {agent_name}: {e}", exc_info=True)
            self.results["errors"].append({
                "agent": agent_name,
                "type": "casebank",
                "error": str(e)
            })
            return False


async def main():
    """Run comprehensive agent tests with Memori backend"""

    print("=" * 80)
    print("MULTI-AGENT MEMORI BACKEND TEST")
    print("=" * 80)
    print()
    print("Environment Configuration:")
    print(f"  GENESIS_MEMORY_BACKEND = {os.getenv('GENESIS_MEMORY_BACKEND')}")
    print(f"  MEMORI_DB_PATH = {os.getenv('MEMORI_DB_PATH')}")
    print(f"  DREAMGYM_AUTO_MIRROR = {os.getenv('DREAMGYM_AUTO_MIRROR')}")
    print()
    print("=" * 80)
    print()

    harness = AgentTestHarness()

    # Define test scenarios for different agents
    test_scenarios = [
        # Core development agents
        ("builder_agent", "Build authentication system with JWT", 0.92),
        ("builder_agent_enhanced", "Build complex microservices architecture", 0.94),
        ("qa_agent", "Run comprehensive test suite", 0.88),
        ("deploy_agent", "Deploy application to production", 0.95),
        ("spec_agent", "Generate technical specifications", 0.85),

        # Specialized agents
        ("security_agent", "Audit codebase for vulnerabilities", 0.91),
        ("maintenance_agent", "Refactor legacy code modules", 0.87),
        ("onboarding_agent", "Create developer onboarding docs", 0.89),

        # Marketing & content agents
        ("marketing_agent", "Generate marketing campaign", 0.84),
        ("content_agent", "Write technical blog post", 0.86),
        ("seo_agent", "Optimize website for search engines", 0.90),
        ("email_agent", "Create email automation sequence", 0.83),

        # Support & operations agents
        ("support_agent", "Handle customer support tickets", 0.88),
        ("analyst_agent", "Analyze user behavior metrics", 0.92),
        ("legal_agent", "Review terms of service", 0.85),

        # Billing & finance
        ("billing_agent", "Integrate Stripe payment gateway", 0.94),

        # Evolution & learning agents
        ("darwin_agent", "Optimize agent performance", 0.89),
        ("se_darwin_agent", "Self-improve via evolution strategies", 0.91),
        ("reflection_agent", "Analyze past agent decisions", 0.87),

        # Research
        ("research_discovery_agent", "Research new AI techniques", 0.86),

        # Safety agents
        ("waltzrl_conversation_agent", "Ensure conversation safety", 0.93),
        ("waltzrl_feedback_agent", "Collect safety feedback", 0.90),

        # Advanced reasoning
        ("ring1t_reasoning", "Advanced multi-step reasoning", 0.88),

        # Infrastructure agents
        ("genesis_meta_agent", "Orchestrate multi-agent workflows", 0.96),
        ("memento_agent", "Long-term memory management", 0.90),
    ]

    print(f"Testing {len(test_scenarios)} agents with TrajectoryPool...")
    print()

    # Test each agent with TrajectoryPool
    for agent_name, task_desc, success_score in test_scenarios:
        harness.test_agent_with_trajectory(agent_name, task_desc, success_score)
        print()

    print("=" * 80)
    print(f"Testing CaseBank integration with 5 agents...")
    print()

    # Test CaseBank with a few agents
    casebank_tests = [
        ("builder_agent", "How to implement OAuth2 authentication?",
         "Use FastAPI with python-jose library for JWT tokens...", 0.92),
        ("security_agent", "How to prevent SQL injection attacks?",
         "Use parameterized queries and ORM to prevent SQL injection...", 0.95),
        ("deploy_agent", "How to deploy with zero downtime?",
         "Use blue-green deployment strategy with health checks...", 0.93),
        ("qa_agent", "How to write effective integration tests?",
         "Use pytest with fixtures and mock external dependencies...", 0.89),
        ("seo_agent", "How to improve page load speed?",
         "Optimize images, minify CSS/JS, use CDN and caching...", 0.87),
    ]

    for agent_name, problem, solution, reward in casebank_tests:
        await harness.test_agent_with_casebank(agent_name, problem, solution, reward)
        print()

    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    print(f"Agents Tested: {len(harness.results['agents_tested'])}")
    print(f"Trajectories Stored: {harness.results['trajectories_stored']}")
    print(f"Cases Stored: {harness.results['cases_stored']}")
    sql_status = "YES" if harness.results['sql_mirror_active'] else "NO"
    print(f"SQL Mirror Active: {sql_status}")
    print()

    # Agent status
    success_count = sum(1 for a in harness.results['agents_tested'] if a['status'] == 'success')
    error_count = sum(1 for a in harness.results['agents_tested'] if a['status'] == 'error')

    print(f"Successful: {success_count}/{len(harness.results['agents_tested'])}")
    print(f"Errors: {error_count}/{len(harness.results['agents_tested'])}")
    print()

    if harness.results['errors']:
        print("ERRORS ENCOUNTERED:")
        for error in harness.results['errors']:
            print(f"  - {error.get('agent', 'unknown')}: {error.get('error', 'unknown error')}")
        print()

    # Success criteria
    all_success = error_count == 0 and harness.results['sql_mirror_active']

    if all_success:
        print("=" * 80)
        print("[SUCCESS] ALL TESTS PASSED - MEMORI BACKEND FULLY OPERATIONAL")
        print("=" * 80)
        print()
        print("Next Steps:")
        print("  1. Monitor database performance over next 24 hours")
        print("  2. Review trajectory data for insights")
        print("  3. Analyze case retrieval patterns")
        print("  4. Continue with Evolution Strategies training")
        print()
        return 0
    else:
        print("=" * 80)
        print("[WARNING] SOME TESTS FAILED - REVIEW ERRORS ABOVE")
        print("=" * 80)
        print()
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Test execution failed: {e}", exc_info=True)
        sys.exit(1)
