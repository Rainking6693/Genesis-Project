"""
Integration Tests for AgentEvolver

Tests interactions between components across all phases.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
import asyncio
from infrastructure.agentevolver.self_questioning import get_self_questioning_module
from infrastructure.agentevolver.experience_buffer import get_experience_buffer
from infrastructure.agentevolver.hybrid_policy import get_hybrid_policy
from infrastructure.agentevolver.multi_agent_sharing import get_multi_agent_sharing
from infrastructure.agentevolver.attribution import get_attribution_engine
from infrastructure.agentevolver.credit_assignment import get_credit_assignment
from infrastructure.agentevolver.coverage_tracker import get_coverage_tracker
from infrastructure.agentevolver.ingestion_pipeline import get_ingestion_pipeline
from infrastructure.agentevolver.quality_filter import get_quality_filter


class TestPhaseIntegration:
    """Tests for integration between phases."""

    def test_all_components_instantiate(self):
        """Test that all components can be instantiated."""
        # Phase 1
        questioning = get_self_questioning_module()
        coverage = get_coverage_tracker()

        # Phase 2
        buffer = get_experience_buffer()
        policy = get_hybrid_policy()
        sharing = get_multi_agent_sharing()

        # Phase 3
        attribution = get_attribution_engine()
        credit = get_credit_assignment()

        # Phase 4
        pipeline = get_ingestion_pipeline()
        quality = get_quality_filter()

        assert questioning is not None
        assert coverage is not None
        assert buffer is not None
        assert policy is not None
        assert sharing is not None
        assert attribution is not None
        assert credit is not None
        assert pipeline is not None
        assert quality is not None

    def test_coverage_and_questioning(self):
        """Test integration between coverage tracker and self-questioning."""
        coverage = get_coverage_tracker()
        questioning = get_self_questioning_module()

        # Record some exploration
        coverage.record_exploration("saas", "healthcare", quality_score=85.0)

        # Check coverage increased
        cov = coverage.get_coverage()
        assert cov > 0.0

    def test_attribution_and_credit_assignment(self):
        """Test integration between attribution and credit assignment."""
        from infrastructure.agentevolver.attribution import ActionContribution, ActionType

        attribution = get_attribution_engine()
        credit = get_credit_assignment()

        # Compute attribution
        actions = [
            {
                "type": "domain_registration",
                "agent": "domain_agent",
                "result": {},
                "features": [],
            },
        ]

        attr = attribution.compute_attribution(
            business_id="biz_001",
            final_quality_score=95.0,
            actions=actions,
        )

        # Record in credit assignment
        credit.record_business_outcome(
            business_id="biz_001",
            quality_score=95.0,
            actions=attr.action_contributions,
        )

        # Check credit assignment recorded it
        stats = credit.get_statistics()
        assert stats["total_businesses"] == 1

    def test_buffer_and_policy(self):
        """Test integration between experience buffer and hybrid policy."""
        from infrastructure.agentevolver.experience_buffer import Experience

        buffer = get_experience_buffer(max_size=10)
        policy = get_hybrid_policy()

        # Add experience to buffer
        exp = Experience(
            experience_id="exp_001",
            task_type="deployment",
            description="Deploy to Railway",
            state={},
            actions=[],
            outcome={},
            quality_score=95.0,
        )

        buffer.add_experience(exp)

        # Buffer should have experience
        assert buffer.get_experience("exp_001") is not None

    def test_quality_filter_validation(self):
        """Test quality filter validation."""
        quality_filter = get_quality_filter()

        # Good scenario
        good_scenario = {
            "scenario_id": "s1",
            "task_type": "deployment",
            "description": "Deploy application to production server",
            "quality_score": 85.0,
            "diversity_score": 80.0,
            "difficulty_level": 5,
        }

        assert quality_filter.validate_scenario(good_scenario) == True

        # Bad scenario (low quality)
        bad_scenario = {
            "scenario_id": "s2",
            "task_type": "deployment",
            "description": "test",
            "quality_score": 30.0,
            "diversity_score": 50.0,
            "difficulty_level": 5,
        }

        assert quality_filter.validate_scenario(bad_scenario) == False

    def test_ingestion_pipeline_conversion(self):
        """Test scenario ingestion and conversion."""
        pipeline = get_ingestion_pipeline()

        scenario = {
            "scenario_id": "s_001",
            "task_type": "deployment",
            "domain": "general",
            "description": "Deploy app to Railway",
            "problem_description": "Need to deploy",
            "strategy": "Use Railway",
            "expected_output": "Running app",
            "quality_score": 80.0,
            "diversity_score": 75.0,
            "difficulty_level": 5,
            "outcome": {"status": "success"},
            "created_at": "2025-01-01T00:00:00",
        }

        result = pipeline.convert_scenario_to_trajectory(scenario)

        assert result.success == True
        assert result.trajectory_id is not None

    def test_end_to_end_flow(self):
        """Test simplified end-to-end flow."""
        # Phase 1: Generate idea (simplified)
        coverage = get_coverage_tracker()

        # Record exploration
        coverage.record_exploration("saas", "healthcare", quality_score=85.0)

        # Phase 2: Store experience
        buffer = get_experience_buffer()

        from infrastructure.agentevolver.experience_buffer import Experience

        exp = Experience(
            experience_id="exp_e2e",
            task_type="saas_healthcare",
            description="SaaS app for healthcare",
            state={},
            actions=[],
            outcome={"status": "success"},
            quality_score=85.0,
        )

        buffer.add_experience(exp)

        # Phase 3: Record attribution
        attribution = get_attribution_engine()

        attr = attribution.compute_attribution(
            business_id="biz_e2e",
            final_quality_score=85.0,
            actions=[
                {
                    "type": "code_build",
                    "agent": "builder_agent",
                    "result": {},
                    "features": [],
                }
            ],
        )

        # Verify all components worked together
        assert coverage.get_coverage() > 0.0
        assert buffer.get_experience("exp_e2e") is not None
        assert attr is not None


class TestComponentConsistency:
    """Tests for consistency across components."""

    def test_config_coverage_target(self):
        """Test that coverage tracker respects config."""
        from infrastructure.agentevolver.config import BUSINESS_COVERAGE_TARGET

        coverage = get_coverage_tracker()
        status = coverage.get_coverage_status()

        assert status["coverage_target"] == BUSINESS_COVERAGE_TARGET

    def test_buffer_size_limit(self):
        """Test that buffer respects size limits."""
        from infrastructure.agentevolver.config import EXPERIENCE_BUFFER_SIZE

        buffer = get_experience_buffer()

        assert buffer.max_size == EXPERIENCE_BUFFER_SIZE

    def test_policy_ratios(self):
        """Test that policy respects ratios."""
        from infrastructure.agentevolver.config import EXPLOIT_RATIO, EXPLORE_RATIO

        policy = get_hybrid_policy()

        assert policy.exploit_ratio == EXPLOIT_RATIO
        assert policy.explore_ratio == EXPLORE_RATIO
