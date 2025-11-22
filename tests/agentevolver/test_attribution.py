"""
Tests for AgentEvolver Phase 3: Attribution Engine

Tests contribution scoring and counterfactual reasoning.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
from infrastructure.agentevolver.attribution import (
    ActionContribution,
    ActionType,
    CounterfactualReasoner,
    AttributionEngine,
)


class TestActionContribution:
    """Tests for ActionContribution."""

    def test_creation(self):
        """Test action contribution creation."""
        contrib = ActionContribution(
            action_id="action_001",
            action_type=ActionType.DOMAIN_REGISTRATION,
            agent="domain_agent",
            business_id="biz_001",
            timestamp="2025-01-01T00:00:00",
            contribution_score=75.0,
            explanation="Domain registration contributes to business identity",
        )

        assert contrib.action_id == "action_001"
        assert contrib.contribution_score == 75.0
        assert contrib.agent == "domain_agent"

    def test_to_dict(self):
        """Test conversion to dict."""
        contrib = ActionContribution(
            action_id="action_001",
            action_type=ActionType.SEO_OPTIMIZATION,
            agent="seo_agent",
            business_id="biz_001",
            timestamp="2025-01-01T00:00:00",
            contribution_score=60.0,
            explanation="SEO improves visibility",
        )

        d = contrib.to_dict()

        assert isinstance(d, dict)
        assert d["action_id"] == "action_001"
        assert d["contribution_score"] == 60.0


class TestCounterfactualReasoner:
    """Tests for CounterfactualReasoner."""

    def test_initialization(self):
        """Test reasoner initialization."""
        reasoner = CounterfactualReasoner()

        assert reasoner is not None
        assert len(reasoner.similar_businesses) == 0

    def test_estimate_counterfactual_delta(self):
        """Test counterfactual delta estimation."""
        reasoner = CounterfactualReasoner()

        delta = reasoner.estimate_counterfactual_delta(
            action_type=ActionType.DOMAIN_REGISTRATION,
            business_quality=85.0,
            business_features=["responsive design", "SEO optimized"],
        )

        assert 0.0 <= delta <= 100.0

    def test_with_similar_businesses(self):
        """Test reasoning with similar businesses."""
        similar_biz = [
            {
                "features": ["responsive design", "SEO optimized"],
                "quality_score": 70.0,  # No domain registration
                "actions": [{"type": "seo_optimization"}],
            }
        ]

        reasoner = CounterfactualReasoner(similar_businesses=similar_biz)

        delta = reasoner.estimate_counterfactual_delta(
            action_type=ActionType.DOMAIN_REGISTRATION,
            business_quality=85.0,
            business_features=["responsive design", "SEO optimized"],
        )

        assert delta > 0.0


class TestAttributionEngine:
    """Tests for AttributionEngine."""

    def test_initialization(self):
        """Test engine initialization."""
        engine = AttributionEngine()

        assert engine is not None
        assert len(engine.attributions) == 0

    def test_compute_attribution(self):
        """Test computing attribution for actions."""
        engine = AttributionEngine()

        actions = [
            {
                "type": "domain_registration",
                "agent": "domain_agent",
                "result": {"status": "success"},
                "features": ["brand identity"],
            },
            {
                "type": "seo_optimization",
                "agent": "seo_agent",
                "result": {"status": "success"},
                "features": ["keyword optimization"],
            },
        ]

        attribution = engine.compute_attribution(
            business_id="biz_001",
            final_quality_score=85.0,
            actions=actions,
        )

        assert attribution is not None
        assert attribution.business_id == "biz_001"
        assert attribution.final_quality_score == 85.0
        assert len(attribution.action_contributions) == 2
        assert len(attribution.agent_contributions) > 0

    def test_action_contributions_normalized(self):
        """Test that action contributions are properly computed."""
        engine = AttributionEngine()

        actions = [
            {
                "type": "domain_registration",
                "agent": "domain_agent",
                "result": {"status": "success"},
                "features": [],
            },
        ]

        attribution = engine.compute_attribution(
            business_id="biz_001",
            final_quality_score=95.0,
            actions=actions,
        )

        assert len(attribution.action_contributions) == 1

        contrib = attribution.action_contributions[0]
        assert 0.0 <= contrib.contribution_score <= 100.0

    def test_get_high_impact_actions(self):
        """Test retrieving high-impact actions."""
        engine = AttributionEngine()

        # Add some attributions
        for i in range(3):
            actions = [
                {
                    "type": "domain_registration",
                    "agent": "domain_agent",
                    "result": {},
                    "features": [],
                },
            ]

            engine.compute_attribution(
                business_id=f"biz_{i}",
                final_quality_score=80.0 + (i * 5),
                actions=actions,
            )

        high_impact = engine.get_high_impact_actions(min_contribution=50.0)

        assert isinstance(high_impact, list)
        assert len(high_impact) > 0

    def test_get_low_impact_actions(self):
        """Test retrieving low-impact actions."""
        engine = AttributionEngine()

        # Add some attributions
        for i in range(3):
            actions = [
                {
                    "type": "monitoring",
                    "agent": "monitor_agent",
                    "result": {},
                    "features": [],
                },
            ]

            engine.compute_attribution(
                business_id=f"biz_{i}",
                final_quality_score=80.0 + (i * 5),
                actions=actions,
            )

        low_impact = engine.get_low_impact_actions(max_contribution=30.0)

        assert isinstance(low_impact, list)

    def test_export_attributions(self):
        """Test exporting attributions."""
        engine = AttributionEngine()

        actions = [
            {
                "type": "domain_registration",
                "agent": "domain_agent",
                "result": {},
                "features": [],
            },
        ]

        engine.compute_attribution(
            business_id="biz_001",
            final_quality_score=85.0,
            actions=actions,
        )

        exported = engine.export_attributions()

        assert isinstance(exported, list)
        assert len(exported) == 1
        assert exported[0]["business_id"] == "biz_001"
