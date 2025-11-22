"""
Tests for AgentEvolver Phase 2: Hybrid Policy

Tests exploit/explore routing and hit rate tracking.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
from infrastructure.agentevolver.hybrid_policy import (
    PolicyAction,
    PolicyDecision,
    HybridPolicy,
    HitMetrics,
)


class TestHitMetrics:
    """Tests for HitMetrics."""

    def test_initialization(self):
        """Test metrics initialization."""
        metrics = HitMetrics()

        assert metrics.total_tasks == 0
        assert metrics.exploit_tasks == 0
        assert metrics.explore_tasks == 0

    def test_get_hit_rate(self):
        """Test hit rate computation."""
        metrics = HitMetrics(
            total_tasks=10,
            exploit_tasks=8,
            successful_exploits=6,
        )

        hit_rate = metrics.get_hit_rate()

        assert 0.0 <= hit_rate <= 1.0
        assert hit_rate == 6 / 8

    def test_get_hit_rate_zero(self):
        """Test hit rate with no exploits."""
        metrics = HitMetrics(total_tasks=10, exploit_tasks=0)

        hit_rate = metrics.get_hit_rate()

        assert hit_rate == 0.0


class TestPolicyDecision:
    """Tests for PolicyDecision."""

    def test_creation_exploit(self):
        """Test exploit decision creation."""
        decision = PolicyDecision(
            action=PolicyAction.EXPLOIT,
            task_type="deployment",
            task_description="Deploy to Railway",
            similarity_score=0.85,
            rationale="Found similar experience",
        )

        assert decision.action == PolicyAction.EXPLOIT
        assert decision.task_type == "deployment"
        assert decision.similarity_score == 0.85

    def test_creation_explore(self):
        """Test explore decision creation."""
        decision = PolicyDecision(
            action=PolicyAction.EXPLORE,
            task_type="content",
            task_description="Generate blog post",
            rationale="No similar experiences found",
        )

        assert decision.action == PolicyAction.EXPLORE
        assert decision.matched_experience is None


class TestHybridPolicy:
    """Tests for HybridPolicy."""

    def test_initialization(self):
        """Test policy initialization."""
        policy = HybridPolicy(exploit_ratio=0.8, explore_ratio=0.2)

        assert policy is not None
        assert policy.exploit_ratio == 0.8
        assert policy.explore_ratio == 0.2

    def test_initialization_invalid_ratios(self):
        """Test policy rejects invalid ratios."""
        with pytest.raises(AssertionError):
            HybridPolicy(exploit_ratio=0.6, explore_ratio=0.6)

    @pytest.mark.asyncio
    async def test_decide(self):
        """Test policy decision."""
        policy = HybridPolicy()

        decision = await policy.decide(
            task_type="deployment",
            task_description="Deploy to Railway",
        )

        assert decision is not None
        assert decision.action in [PolicyAction.EXPLOIT, PolicyAction.EXPLORE]
        assert decision.task_type == "deployment"

    def test_record_exploit_success(self):
        """Test recording exploit success."""
        policy = HybridPolicy()

        policy.record_exploit_success("exp_001", success=True)

        metrics = policy.get_metrics()
        assert metrics.successful_exploits == 1

    def test_record_exploit_failure(self):
        """Test recording exploit failure."""
        policy = HybridPolicy()

        policy.record_exploit_success("exp_001", success=False)

        metrics = policy.get_metrics()
        assert metrics.successful_exploits == 0

    def test_record_explore_success(self):
        """Test recording explore success."""
        policy = HybridPolicy()

        policy.record_explore_success(success=True)

        metrics = policy.get_metrics()
        assert metrics.successful_explores == 1

    def test_update_similarity_metric(self):
        """Test updating similarity metric."""
        policy = HybridPolicy()

        policy.metrics.exploit_tasks = 1
        policy.update_similarity_metric(0.85)

        assert policy.metrics.average_similarity_used == 0.85

    def test_get_metrics(self):
        """Test getting metrics."""
        policy = HybridPolicy()

        # Simulate some activity
        policy.metrics.total_tasks = 100
        policy.metrics.exploit_tasks = 80
        policy.metrics.explore_tasks = 20
        policy.metrics.successful_exploits = 72
        policy.metrics.successful_explores = 18

        metrics = policy.get_metrics()

        assert metrics.total_tasks == 100
        assert metrics.get_hit_rate() == 72 / 80  # 0.9
        assert metrics.get_explore_rate() == 18 / 20  # 0.9
