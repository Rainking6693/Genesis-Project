"""
Test Multi-Agent Curriculum Coordination

Tests the multi-agent curriculum coordinator system that analyzes
all 21 Genesis agents and generates coordinated training curricula.

This validates:
- Global skill gap analysis across all agents
- Coordinated curriculum generation
- Collaborative task creation
- Load balancing across agents
"""
import asyncio
import sys
import os
import logging
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.evolution_strategies.multi_agent_curriculum import (
    MultiAgentCurriculumCoordinator,
    AgentSkillProfile,
    GlobalSkillMatrix
)
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus
from infrastructure.casebank import CaseBank

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def setup_test_data(trajectory_pool: TrajectoryPool):
    """
    Setup test trajectory data for multiple agents

    Creates sample trajectories showing:
    - Different skill levels across agents
    - Strong skills for some agents
    - Weak skills requiring improvement
    """
    logger.info("Setting up test trajectory data...")

    # Sample agents and their performance patterns
    # Key: Create overlap in weak/strong skills for collaboration opportunities
    test_data = [
        # Builder agent - strong in code generation, weak in testing
        {
            "agent_id": "builder_agent",
            "trajectories": [
                ("code_generation:backend_api", 90.0),
                ("code_generation:frontend_ui", 85.0),
                ("code_generation:database_schema", 88.0),
                ("code_generation:api_design", 87.0),
                ("testing:unit_tests", 55.0),
                ("testing:integration_tests", 50.0),
                ("testing:e2e_tests", 48.0),
            ]
        },
        # QA agent - strong in testing, weak in code generation
        {
            "agent_id": "qa_agent",
            "trajectories": [
                ("testing:unit_tests", 95.0),
                ("testing:integration_tests", 92.0),
                ("testing:e2e_tests", 88.0),
                ("testing:performance_tests", 90.0),
                ("code_generation:test_fixtures", 58.0),
                ("code_generation:backend_api", 52.0),
                ("debugging:performance_issues", 55.0),
            ]
        },
        # Deploy agent - strong in deployment, weak in security
        {
            "agent_id": "deploy_agent",
            "trajectories": [
                ("deployment:cloud_infrastructure", 93.0),
                ("deployment:ci_cd_pipeline", 90.0),
                ("deployment:kubernetes", 89.0),
                ("monitoring:system_health", 87.0),
                ("security:vulnerability_scanning", 55.0),
                ("security:access_control", 50.0),
                ("security:encryption", 52.0),
            ]
        },
        # Security agent - strong in security, weak in deployment
        {
            "agent_id": "security_agent",
            "trajectories": [
                ("security:vulnerability_scanning", 95.0),
                ("security:penetration_testing", 92.0),
                ("security:compliance_audit", 90.0),
                ("security:encryption", 88.0),
                ("deployment:infrastructure_setup", 58.0),
                ("deployment:configuration", 52.0),
                ("deployment:cloud_infrastructure", 50.0),
            ]
        },
        # Content agent - strong in writing, weak in SEO
        {
            "agent_id": "content_agent",
            "trajectories": [
                ("content_creation:blog_posts", 94.0),
                ("content_creation:documentation", 91.0),
                ("content_creation:marketing_copy", 89.0),
                ("content_creation:technical_writing", 87.0),
                ("seo:keyword_optimization", 55.0),
                ("seo:meta_tags", 50.0),
                ("seo:link_building", 48.0),
            ]
        },
        # SEO agent - strong in SEO, weak in content creation
        {
            "agent_id": "seo_agent",
            "trajectories": [
                ("seo:keyword_optimization", 96.0),
                ("seo:meta_tags", 93.0),
                ("seo:link_building", 90.0),
                ("seo:analytics", 88.0),
                ("content_creation:blog_posts", 55.0),
                ("content_creation:technical_writing", 52.0),
                ("content_creation:documentation", 50.0),
            ]
        },
    ]

    for agent_data in test_data:
        agent_id = agent_data["agent_id"]

        for idx, (task, quality_score) in enumerate(agent_data["trajectories"]):
            trajectory = Trajectory(
                trajectory_id=f"{agent_id}_{idx}",
                generation=idx + 1,
                agent_name=agent_id,
                task_type=task.split(":")[0],
                task_description=task,
                focus_area=task.split(":")[0],
                code_changes=f"Completed {task}",
                problem_diagnosis=f"Skill gap: {task}",
                proposed_strategy="Execute curriculum step",
                status=TrajectoryStatus.SUCCESS.value if quality_score >= 60 else TrajectoryStatus.FAILURE.value,
                success_score=quality_score / 100.0,
                metrics={"quality_score": quality_score},
                metadata={"test_data": True}
            )

            trajectory_pool.add_trajectory(trajectory)

    logger.info(f"✅ Added test data for {len(test_data)} agents")


async def test_global_skill_analysis():
    """Test 1: Global skill gap analysis"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 1: Global Skill Analysis")
    logger.info("=" * 60)

    # Initialize components
    trajectory_pool = TrajectoryPool(agent_name="multi_agent")
    casebank = CaseBank()

    # Setup test data
    await setup_test_data(trajectory_pool)

    # Initialize coordinator
    coordinator = MultiAgentCurriculumCoordinator(
        trajectory_pool=trajectory_pool,
        casebank=casebank
    )

    # Run global skill analysis
    global_matrix = await coordinator.analyze_global_skills()

    # Validate results
    assert len(global_matrix.agent_profiles) > 0, "No agents analyzed"
    logger.info(f"✅ Analyzed {len(global_matrix.agent_profiles)} agents")

    # Check weak skills identified
    assert len(global_matrix.global_weak_skills) > 0, "No global weak skills identified"
    logger.info(f"✅ Identified {len(global_matrix.global_weak_skills)} global weak skills")

    # Check collaboration opportunities
    assert len(global_matrix.cross_agent_opportunities) > 0, "No collaboration opportunities found"
    logger.info(f"✅ Found {len(global_matrix.cross_agent_opportunities)} collaboration opportunities")

    # Log sample results
    logger.info("\nSample Agent Profile:")
    if global_matrix.agent_profiles:
        sample_agent_id = list(global_matrix.agent_profiles.keys())[0]
        sample_profile = global_matrix.agent_profiles[sample_agent_id]
        logger.info(f"  Agent: {sample_profile.agent_id}")
        logger.info(f"  Strong skills: {sample_profile.strong_skills}")
        logger.info(f"  Weak skills: {sample_profile.weak_skills}")
        logger.info(f"  Avg quality: {sample_profile.avg_quality:.1f}")

    logger.info("\nTop Global Weak Skills:")
    for skill in global_matrix.global_weak_skills[:3]:
        coverage = global_matrix.skill_coverage.get(skill, 0)
        logger.info(f"  - {skill}: {coverage*100:.1f}% proficiency")

    logger.info("\n✅ Test 1 PASSED")
    return global_matrix


async def test_coordinated_curriculum():
    """Test 2: Coordinated curriculum generation"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 2: Coordinated Curriculum Generation")
    logger.info("=" * 60)

    # Initialize components
    trajectory_pool = TrajectoryPool(agent_name="multi_agent")
    casebank = CaseBank()

    # Setup test data
    await setup_test_data(trajectory_pool)

    # Initialize coordinator
    coordinator = MultiAgentCurriculumCoordinator(
        trajectory_pool=trajectory_pool,
        casebank=casebank
    )

    # Get global skill matrix
    global_matrix = await coordinator.analyze_global_skills()

    # Generate coordinated curriculum
    curriculum = await coordinator.generate_coordinated_curriculum(
        global_matrix=global_matrix,
        num_tasks=30,
        include_collaborative=True
    )

    # Validate results
    assert len(curriculum) > 0, "No curriculum generated"
    logger.info(f"✅ Generated curriculum for {len(curriculum)} agents")

    total_tasks = sum(len(tasks) for tasks in curriculum.values())
    assert total_tasks > 0, "No tasks in curriculum"
    logger.info(f"✅ Total tasks generated: {total_tasks}")

    # Check task distribution
    logger.info("\nCurriculum Distribution:")
    for agent_id, tasks in sorted(curriculum.items(), key=lambda x: len(x[1]), reverse=True):
        task_types = set(task.task_type for task in tasks)
        logger.info(
            f"  {agent_id}: {len(tasks)} tasks "
            f"(types: {', '.join(sorted(task_types)[:3])})"
        )

    # Check for collaborative tasks
    collaborative_count = sum(
        1 for tasks in curriculum.values()
        for task in tasks
        if task.task_type == "collaborative_learning"
    )

    if collaborative_count > 0:
        logger.info(f"\n✅ Generated {collaborative_count} collaborative tasks")

    logger.info("\n✅ Test 2 PASSED")
    return curriculum


async def test_skill_coverage():
    """Test 3: Skill coverage analysis"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 3: Skill Coverage Analysis")
    logger.info("=" * 60)

    # Initialize components
    trajectory_pool = TrajectoryPool(agent_name="multi_agent")
    casebank = CaseBank()

    # Setup test data
    await setup_test_data(trajectory_pool)

    # Initialize coordinator
    coordinator = MultiAgentCurriculumCoordinator(
        trajectory_pool=trajectory_pool,
        casebank=casebank
    )

    # Get global skill matrix
    global_matrix = await coordinator.analyze_global_skills()

    # Analyze skill coverage
    skill_coverage = global_matrix.skill_coverage

    logger.info(f"Total skills tracked: {len(skill_coverage)}")

    # High coverage skills (>80%)
    high_coverage = [
        (skill, coverage)
        for skill, coverage in skill_coverage.items()
        if coverage > 0.8
    ]
    logger.info(f"High coverage skills (>80%): {len(high_coverage)}")
    for skill, coverage in sorted(high_coverage, key=lambda x: x[1], reverse=True)[:3]:
        logger.info(f"  - {skill}: {coverage*100:.1f}%")

    # Low coverage skills (<50%)
    low_coverage = [
        (skill, coverage)
        for skill, coverage in skill_coverage.items()
        if coverage < 0.5
    ]
    logger.info(f"Low coverage skills (<50%): {len(low_coverage)}")
    for skill, coverage in sorted(low_coverage, key=lambda x: x[1])[:3]:
        logger.info(f"  - {skill}: {coverage*100:.1f}%")

    assert len(skill_coverage) > 0, "No skills tracked"
    logger.info("\n✅ Test 3 PASSED")


async def test_collaborative_opportunities():
    """Test 4: Cross-agent collaboration opportunities"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 4: Collaborative Opportunities")
    logger.info("=" * 60)

    # Initialize components
    trajectory_pool = TrajectoryPool(agent_name="multi_agent")
    casebank = CaseBank()

    # Setup test data
    await setup_test_data(trajectory_pool)

    # Initialize coordinator
    coordinator = MultiAgentCurriculumCoordinator(
        trajectory_pool=trajectory_pool,
        casebank=casebank
    )

    # Get global skill matrix
    global_matrix = await coordinator.analyze_global_skills()

    # Analyze collaboration opportunities
    opportunities = global_matrix.cross_agent_opportunities

    logger.info(f"Total collaboration opportunities: {len(opportunities)}")

    # Show top opportunities
    logger.info("\nTop Collaboration Opportunities:")
    for i, opp in enumerate(opportunities[:5], 1):
        logger.info(f"\n{i}. Skill: {opp['skill']}")
        logger.info(f"   Weak agents: {', '.join(opp['weak_agents'][:3])}")
        logger.info(f"   Strong agents: {', '.join(opp['strong_agents'][:2])}")
        logger.info(f"   Potential impact: {opp['potential']}")

    assert len(opportunities) > 0, "No collaboration opportunities found"
    logger.info("\n✅ Test 4 PASSED")


async def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("MULTI-AGENT CURRICULUM COORDINATION TEST SUITE")
    logger.info("=" * 60)

    try:
        # Test 1: Global skill analysis
        global_matrix = await test_global_skill_analysis()

        # Test 2: Coordinated curriculum
        curriculum = await test_coordinated_curriculum()

        # Test 3: Skill coverage
        await test_skill_coverage()

        # Test 4: Collaborative opportunities
        await test_collaborative_opportunities()

        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("ALL TESTS PASSED ✅")
        logger.info("=" * 60)
        logger.info(f"Agents analyzed: {len(global_matrix.agent_profiles)}")
        logger.info(f"Curriculum agents: {len(curriculum)}")
        logger.info(f"Total tasks: {sum(len(tasks) for tasks in curriculum.values())}")
        logger.info(f"Global weak skills: {len(global_matrix.global_weak_skills)}")
        logger.info(f"Collaboration opportunities: {len(global_matrix.cross_agent_opportunities)}")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
