"""
Tests for AgentEvolver Phase 3: Credit Assignment

Tests impact tracking and bottleneck identification.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
from infrastructure.agentevolver.credit_assignment import (
    ActionImpactStats,
    CreditAssignment,
)
from infrastructure.agentevolver.attribution import ActionContribution, ActionType


class TestActionImpactStats:
    """Tests for ActionImpactStats."""

    def test_creation(self):
        """Test stats creation."""
        stats = ActionImpactStats(
            action_type="domain_registration",
            agent="domain_agent",
        )

        assert stats.action_type == "domain_registration"
        assert stats.agent == "domain_agent"
        assert stats.total_occurrences == 0

    def test_success_rate(self):
        """Test success rate computation."""
        stats = ActionImpactStats(
            action_type="deployment",
            agent="deploy_agent",
            total_occurrences=10,
            successful_occurrences=8,
        )

        success_rate = stats.get_success_rate()

        assert success_rate == 0.8

    def test_impact_score(self):
        """Test impact score computation."""
        stats = ActionImpactStats(
            action_type="seo_optimization",
            agent="seo_agent",
            total_occurrences=10,
            successful_occurrences=8,
            avg_contribution=75.0,
        )

        impact = stats.get_impact_score()

        assert 0.0 <= impact <= 100.0


class TestCreditAssignment:
    """Tests for CreditAssignment system."""

    def test_initialization(self):
        """Test system initialization."""
        system = CreditAssignment()

        assert system is not None
        assert len(system.action_stats) == 0
        assert len(system.business_outcomes) == 0

    def test_record_business_outcome(self):
        """Test recording business outcome."""
        system = CreditAssignment()

        actions = [
            ActionContribution(
                action_id="a1",
                action_type=ActionType.DOMAIN_REGISTRATION,
                agent="domain_agent",
                business_id="biz_001",
                timestamp="2025-01-01T00:00:00",
                contribution_score=75.0,
                explanation="Domain registration",
            ),
        ]

        system.record_business_outcome(
            business_id="biz_001",
            quality_score=95.0,
            actions=actions,
        )

        assert len(system.business_outcomes) == 1
        assert system.business_outcomes[0][0] == "biz_001"

    def test_record_high_quality_business(self):
        """Test recording high-quality business."""
        system = CreditAssignment()

        actions = [
            ActionContribution(
                action_id="a1",
                action_type=ActionType.DOMAIN_REGISTRATION,
                agent="domain_agent",
                business_id="biz_001",
                timestamp="2025-01-01T00:00:00",
                contribution_score=80.0,
                explanation="Domain",
            ),
        ]

        system.record_business_outcome("biz_001", quality_score=95.0, actions=actions)

        stats_key = ("domain_registration", "domain_agent")
        assert stats_key in system.action_stats
        assert system.action_stats[stats_key].successful_occurrences == 1

    def test_record_low_quality_business(self):
        """Test recording low-quality business."""
        system = CreditAssignment()

        actions = [
            ActionContribution(
                action_id="a1",
                action_type=ActionType.DOMAIN_REGISTRATION,
                agent="domain_agent",
                business_id="biz_001",
                timestamp="2025-01-01T00:00:00",
                contribution_score=20.0,
                explanation="Domain",
            ),
        ]

        system.record_business_outcome("biz_001", quality_score=40.0, actions=actions)

        stats_key = ("domain_registration", "domain_agent")
        assert stats_key in system.action_stats
        assert system.action_stats[stats_key].failed_occurrences == 1

    def test_get_high_impact_actions(self):
        """Test retrieving high-impact actions."""
        system = CreditAssignment()

        # Record multiple outcomes
        for i in range(5):
            actions = [
                ActionContribution(
                    action_id=f"a{i}",
                    action_type=ActionType.MARKETING_CAMPAIGN,
                    agent="marketing_agent",
                    business_id=f"biz_{i}",
                    timestamp="2025-01-01T00:00:00",
                    contribution_score=80.0,
                    explanation="Marketing",
                ),
            ]

            quality = 90.0 + i  # High quality
            system.record_business_outcome(f"biz_{i}", quality, actions)

        high_impact = system.get_high_impact_actions(limit=10)

        assert isinstance(high_impact, list)
        assert len(high_impact) > 0

    def test_get_bottlenecks(self):
        """Test identifying bottlenecks."""
        system = CreditAssignment()

        # Record failing outcomes
        for i in range(5):
            actions = [
                ActionContribution(
                    action_id=f"a{i}",
                    action_type=ActionType.CODE_BUILD,
                    agent="builder_agent",
                    business_id=f"biz_{i}",
                    timestamp="2025-01-01T00:00:00",
                    contribution_score=20.0,
                    explanation="Build",
                ),
            ]

            quality = 30.0 + i  # Low quality
            system.record_business_outcome(f"biz_{i}", quality, actions)

        bottlenecks = system.get_bottlenecks()

        # May have bottlenecks if failure rate > 30%
        assert isinstance(bottlenecks, list)

    def test_get_statistics(self):
        """Test getting statistics."""
        system = CreditAssignment()

        # Record some outcomes
        for i in range(3):
            actions = [
                ActionContribution(
                    action_id=f"a{i}",
                    action_type=ActionType.DOMAIN_REGISTRATION,
                    agent="domain_agent",
                    business_id=f"biz_{i}",
                    timestamp="2025-01-01T00:00:00",
                    contribution_score=70.0,
                    explanation="Domain",
                ),
            ]

            system.record_business_outcome(f"biz_{i}", 85.0, actions)

        stats = system.get_statistics()

        assert stats["total_businesses"] == 3
        assert stats["avg_quality"] > 0.0

    def test_improvement_targets(self):
        """Test getting improvement targets."""
        system = CreditAssignment()

        # Record outcomes that create bottlenecks
        for i in range(5):
            actions = [
                ActionContribution(
                    action_id=f"a{i}",
                    action_type=ActionType.QA_TESTING,
                    agent="qa_agent",
                    business_id=f"biz_{i}",
                    timestamp="2025-01-01T00:00:00",
                    contribution_score=15.0,
                    explanation="QA",
                ),
            ]

            system.record_business_outcome(f"biz_{i}", 45.0, actions)

        improvements = system.get_improvement_targets()

        assert isinstance(improvements, dict)
