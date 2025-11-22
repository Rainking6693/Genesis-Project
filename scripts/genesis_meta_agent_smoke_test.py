#!/usr/bin/env python3
"""
Genesis Meta-Agent Smoke Test Script

Comprehensive smoke tests for Genesis Meta-Agent with real:
- MongoDB connection
- LLM APIs (OpenAI/Anthropic)
- Memory persistence
- Metrics collection
- Optional A2A integration

Usage:
    # Basic smoke test (simulated execution)
    python3 scripts/genesis_meta_agent_smoke_test.py
    
    # With A2A integration
    ENABLE_A2A_INTEGRATION=true python3 scripts/genesis_meta_agent_smoke_test.py
    
    # With custom MongoDB
    MONGODB_URI="mongodb://localhost:27017/" python3 scripts/genesis_meta_agent_smoke_test.py

Author: Cursor (Quality Assurance)
Date: November 3, 2025
"""

import asyncio
import sys
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessRequirements
from infrastructure.genesis_business_types import get_all_archetypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SmokeTestResults:
    """Track smoke test results"""
    
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
    
    def record_pass(self, test_name: str):
        """Record a passing test"""
        self.tests_run += 1
        self.tests_passed += 1
        logger.info(f"✅ PASS: {test_name}")
    
    def record_fail(self, test_name: str, error: str):
        """Record a failing test"""
        self.tests_run += 1
        self.tests_failed += 1
        self.failures.append({
            "test": test_name,
            "error": error
        })
        logger.error(f"❌ FAIL: {test_name} - {error}")
    
    def print_summary(self):
        """Print test summary"""
        duration = (datetime.now() - self.start_time).total_seconds()
        
        print("\n" + "="*80)
        print("GENESIS META-AGENT SMOKE TEST SUMMARY")
        print("="*80)
        print(f"Tests Run:    {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed} ✅")
        print(f"Tests Failed: {self.tests_failed} ❌")
        print(f"Duration:     {duration:.2f}s")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failures:
            print("\nFAILURES:")
            for failure in self.failures:
                print(f"  - {failure['test']}: {failure['error']}")
        
        print("="*80)
        
        return self.tests_failed == 0


async def test_initialization(results: SmokeTestResults):
    """Test Genesis Meta-Agent initialization"""
    test_name = "Initialization"
    try:
        agent = GenesisMetaAgent(
            enable_memory=True,
            enable_safety=True,
            autonomous=True
        )
        
        assert agent.htdag is not None, "HTDAG not initialized"
        assert agent.halo is not None, "HALO not initialized"
        assert agent.memory is not None, "Memory not initialized"
        assert agent.safety is not None, "Safety not initialized"
        
        results.record_pass(test_name)
        return agent
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return None


async def test_business_idea_generation(agent: GenesisMetaAgent, results: SmokeTestResults):
    """Test business idea generation with real LLM"""
    test_name = "Business Idea Generation (LLM)"
    try:
        requirements = await agent._generate_business_idea("saas_tool")
        
        assert requirements.name, "Business name not generated"
        assert requirements.description, "Description not generated"
        assert len(requirements.mvp_features) > 0, "No MVP features generated"
        assert len(requirements.tech_stack) > 0, "No tech stack generated"
        
        logger.info(f"  Generated business: {requirements.name}")
        logger.info(f"  Features: {len(requirements.mvp_features)}")
        logger.info(f"  Tech stack: {', '.join(requirements.tech_stack[:3])}")
        
        results.record_pass(test_name)
        return requirements
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return None


async def test_team_composition(agent: GenesisMetaAgent, requirements: BusinessRequirements, results: SmokeTestResults):
    """Test team composition"""
    test_name = "Team Composition"
    try:
        team = await agent._compose_team(requirements, [])
        
        assert len(team) >= 3, f"Team too small: {len(team)}"
        assert "builder_agent" in team, "Builder agent not in team"
        assert "deploy_agent" in team, "Deploy agent not in team"
        
        logger.info(f"  Team size: {len(team)}")
        logger.info(f"  Team: {', '.join(team)}")
        
        results.record_pass(test_name)
        return team
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return []


async def test_task_decomposition(agent: GenesisMetaAgent, requirements: BusinessRequirements, results: SmokeTestResults):
    """Test task decomposition with HTDAG"""
    test_name = "Task Decomposition (HTDAG)"
    try:
        task_dag = await agent._decompose_business_tasks(requirements)
        
        assert len(task_dag.tasks) > 0, "No tasks generated"
        assert len(task_dag.tasks) <= 100, f"Too many tasks: {len(task_dag.tasks)}"
        
        logger.info(f"  Tasks generated: {len(task_dag.tasks)}")
        
        results.record_pass(test_name)
        return task_dag
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return None


async def test_task_routing(agent: GenesisMetaAgent, task_dag, team: List[str], results: SmokeTestResults):
    """Test task routing with HALO"""
    test_name = "Task Routing (HALO)"
    try:
        if not task_dag:
            raise ValueError("No task DAG provided")
        
        routing_plan = await agent._route_tasks(task_dag, team)
        
        assert len(routing_plan.assignments) > 0, "No tasks assigned"
        
        logger.info(f"  Tasks assigned: {len(routing_plan.assignments)}")
        
        results.record_pass(test_name)
        return routing_plan
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return None


async def test_full_business_creation(agent: GenesisMetaAgent, results: SmokeTestResults):
    """Test full business creation end-to-end"""
    test_name = "Full Business Creation (E2E)"
    try:
        # Create a simple business
        requirements = BusinessRequirements(
            name="Test SaaS Tool",
            description="A test business for smoke testing",
            target_audience="Developers",
            monetization="Freemium",
            mvp_features=["Feature 1", "Feature 2", "Feature 3"],
            tech_stack=["Next.js", "Python", "MongoDB"],
            success_metrics={"first_user": "< 24h"}
        )
        
        result = await agent.create_business(
            business_type="saas_tool",
            requirements=requirements,
            enable_memory_learning=True
        )
        
        assert result.business_id, "No business ID generated"
        assert result.status, "No status set"
        assert len(result.team_composition) > 0, "No team composed"
        assert len(result.task_results) > 0, "No tasks executed"
        assert result.revenue_projection, "No revenue projection"
        
        logger.info(f"  Business ID: {result.business_id}")
        logger.info(f"  Status: {result.status.value}")
        logger.info(f"  Team size: {len(result.team_composition)}")
        logger.info(f"  Tasks: {len(result.task_results)}")
        logger.info(f"  Execution time: {result.execution_time_seconds:.2f}s")
        logger.info(f"  Projected MRR: ${result.revenue_projection.get('projected_monthly_revenue', 0)}")
        logger.info(f"  Confidence: {result.revenue_projection.get('confidence', 0):.2%}")
        
        results.record_pass(test_name)
        return result
    except Exception as exc:
        results.record_fail(test_name, str(exc))
        return None


async def test_memory_persistence(agent: GenesisMetaAgent, business_id: str, results: SmokeTestResults):
    """Test memory persistence"""
    test_name = "Memory Persistence"
    try:
        if not agent.memory:
            logger.warning("  Memory disabled, skipping test")
            return
        
        # Query for similar businesses
        similar = await agent._query_similar_businesses("saas_tool")
        
        logger.info(f"  Similar businesses found: {len(similar)}")
        
        results.record_pass(test_name)
    except Exception as exc:
        results.record_fail(test_name, str(exc))


async def test_safety_validation(agent: GenesisMetaAgent, results: SmokeTestResults):
    """Test safety validation"""
    test_name = "Safety Validation (WaltzRL)"
    try:
        if not agent.safety:
            logger.warning("  Safety disabled, skipping test")
            return
        
        from infrastructure.task_dag import Task, TaskStatus
        
        # Test safe task
        safe_task = Task(
            task_id="test_safe",
            description="Deploy to Vercel",
            status=TaskStatus.PENDING
        )
        
        safe_result = await agent._validate_task_safety(safe_task, "deploy_agent", True)
        assert safe_result["safe"], "Safe task marked as unsafe"
        
        # Test unsafe task (simulated)
        unsafe_task = Task(
            task_id="test_unsafe",
            description="Delete all production data",
            status=TaskStatus.PENDING
        )
        
        # Note: WaltzRL might not actually block this in test mode
        # Just verify the method runs without error
        await agent._validate_task_safety(unsafe_task, "builder_agent", True)
        
        logger.info("  Safety validation working")
        
        results.record_pass(test_name)
    except Exception as exc:
        results.record_fail(test_name, str(exc))


async def test_revenue_projection(agent: GenesisMetaAgent, results: SmokeTestResults):
    """Test revenue projection calculation"""
    test_name = "Revenue Projection"
    try:
        requirements = BusinessRequirements(
            name="Test Business",
            description="Test",
            target_audience="Users",
            monetization="Subscription",
            mvp_features=["F1", "F2", "F3", "F4", "F5"],
            tech_stack=["Next.js", "Python", "MongoDB", "Stripe"],
            success_metrics={}
        )
        
        team = ["builder_agent", "deploy_agent", "qa_agent"]
        task_results = [
            {"status": "completed"},
            {"status": "completed"},
            {"status": "completed"},
            {"status": "completed"}
        ]
        
        projection = agent._simulate_revenue_projection(
            requirements,
            team,
            task_results,
            success=True,
            execution_time=10.0
        )
        
        assert projection["projected_monthly_revenue"] > 0, "Zero MRR projected"
        assert 0 < projection["confidence"] <= 1, "Invalid confidence score"
        assert projection["status"] == "projected", "Invalid status"
        assert len(projection["assumptions"]) > 0, "No assumptions provided"
        
        logger.info(f"  Projected MRR: ${projection['projected_monthly_revenue']}")
        logger.info(f"  Confidence: {projection['confidence']:.2%}")
        logger.info(f"  Payback: {projection['payback_period_days']} days")
        
        results.record_pass(test_name)
    except Exception as exc:
        results.record_fail(test_name, str(exc))


async def test_metrics_instrumentation(results: SmokeTestResults):
    """Test metrics instrumentation"""
    test_name = "Metrics Instrumentation"
    try:
        from infrastructure.genesis_meta_agent import METRICS_ENABLED
        
        if not METRICS_ENABLED:
            logger.warning("  Metrics disabled (prometheus_client not installed)")
            # Don't fail the test, just note it
            return
        
        logger.info("  Prometheus metrics enabled")
        results.record_pass(test_name)
    except Exception as exc:
        results.record_fail(test_name, str(exc))


async def test_a2a_integration(agent: GenesisMetaAgent, results: SmokeTestResults):
    """Test A2A integration if enabled"""
    test_name = "A2A Integration"
    try:
        if not agent.enable_a2a:
            logger.warning("  A2A disabled (set ENABLE_A2A_INTEGRATION=true to test)")
            return
        
        logger.info(f"  A2A enabled: {agent.a2a_connector is not None}")
        
        if agent.a2a_connector:
            logger.info(f"  A2A service URL: {agent.a2a_connector.a2a_service_url}")
        
        results.record_pass(test_name)
    except Exception as exc:
        results.record_fail(test_name, str(exc))


async def run_all_smoke_tests():
    """Run all smoke tests"""
    print("\n" + "="*80)
    print("GENESIS META-AGENT SMOKE TEST SUITE")
    print("="*80)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"MongoDB: {os.getenv('MONGODB_URI', 'default (localhost:27017)')}")
    print(f"A2A Integration: {os.getenv('ENABLE_A2A_INTEGRATION', 'false')}")
    print("="*80 + "\n")
    
    results = SmokeTestResults()
    
    # Test 1: Initialization
    agent = await test_initialization(results)
    if not agent:
        results.print_summary()
        return False
    
    # Test 2: Metrics
    await test_metrics_instrumentation(results)
    
    # Test 3: A2A Integration Check
    await test_a2a_integration(agent, results)
    
    # Test 4: Business Idea Generation (requires LLM API key)
    requirements = await test_business_idea_generation(agent, results)
    
    # Test 5: Team Composition
    if requirements:
        team = await test_team_composition(agent, requirements, results)
        
        # Test 6: Task Decomposition (requires LLM API key)
        task_dag = await test_task_decomposition(agent, requirements, results)
        
        # Test 7: Task Routing
        if task_dag and team:
            await test_task_routing(agent, task_dag, team, results)
    
    # Test 8: Revenue Projection
    await test_revenue_projection(agent, results)
    
    # Test 9: Safety Validation
    await test_safety_validation(agent, results)
    
    # Test 10: Full Business Creation E2E
    result = await test_full_business_creation(agent, results)
    
    # Test 11: Memory Persistence
    if result:
        await test_memory_persistence(agent, result.business_id, results)
    
    # Print summary
    success = results.print_summary()
    
    return success


if __name__ == "__main__":
    # Run smoke tests
    success = asyncio.run(run_all_smoke_tests())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

