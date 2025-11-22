"""
Test suite for Domain Name Agent (Integration #73)
Author: Genesis AI
Date: November 14, 2025
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from agents.domain_name_agent import (
    DomainNameAgent,
    DomainCandidate,
    DomainRegistrationResult,
    get_domain_agent
)
from infrastructure.namecom_client import (
    DomainAvailability,
    DomainRegistration,
    NameComClient
)


class TestDomainCandidateGeneration:
    """Test domain name candidate generation"""

    def test_generate_saas_candidates(self):
        """Test generating candidates for SaaS business"""
        agent = DomainNameAgent()
        candidates = agent.generate_domain_candidates(
            business_name="TaskFlow Pro",
            business_type="saas",
            count=20
        )

        assert len(candidates) > 0
        assert len(candidates) <= 20
        assert all(isinstance(c, DomainCandidate) for c in candidates)

        # Check that candidates are sorted by score
        scores = [c.score for c in candidates]
        assert scores == sorted(scores, reverse=True)

        # Check that top candidate has reasonable score
        assert candidates[0].score >= 30.0

    def test_generate_ecommerce_candidates(self):
        """Test generating candidates for ecommerce business"""
        agent = DomainNameAgent()
        candidates = agent.generate_domain_candidates(
            business_name="Fashion Boutique",
            business_type="ecommerce",
            count=15
        )

        assert len(candidates) > 0
        # Should include ecommerce keywords like "shop", "store", "market"
        has_ecommerce_keyword = any(
            any(kw in c.domain for kw in ["shop", "store", "market"])
            for c in candidates
        )
        assert has_ecommerce_keyword

    def test_candidates_include_preferred_tlds(self):
        """Test that candidates use preferred TLDs"""
        agent = DomainNameAgent(preferred_tlds=[".com", ".ai", ".io"])
        candidates = agent.generate_domain_candidates(
            business_name="AI Assistant",
            business_type="ai",
            count=10
        )

        # All candidates should use preferred TLDs
        tlds = {c.tld for c in candidates}
        assert tlds.issubset({".com", ".ai", ".io"})

    def test_domain_scoring(self):
        """Test domain scoring algorithm"""
        agent = DomainNameAgent()

        # Test ideal domain (short, .com, pronounceable, brandable)
        ideal = agent._score_domain("taskflow.com", ["task", "flow"], ".com")
        assert ideal.score >= 80.0

        # Test mediocre domain (long, non-.com, has hyphens)
        mediocre = agent._score_domain("my-long-task-flow-app.io", ["task", "flow"], ".io")
        assert mediocre.score < ideal.score

    def test_pronounceable_check(self):
        """Test pronounceability detection"""
        agent = DomainNameAgent()

        # Pronounceable names
        assert agent._is_pronounceable("taskflow") is True
        assert agent._is_pronounceable("github") is True
        assert agent._is_pronounceable("shopify") is True

        # Unpronounceable names
        assert agent._is_pronounceable("xyzqwrt") is False
        assert agent._is_pronounceable("bcdfg") is False


class TestDomainAvailabilityChecking:
    """Test domain availability checking with mocked API"""

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_check_available_domain(self, mock_get_client):
        """Test checking available domain"""
        # Mock Name.com client
        mock_client = Mock(spec=NameComClient)
        mock_client.check_availability.return_value = DomainAvailability(
            domain="test-available.com",
            available=True,
            price=12.99,
            premium=False,
            purchasable=True
        )
        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client)

        result = agent.client.check_availability("test-available.com")
        assert result.available is True
        assert result.purchasable is True
        assert result.price == 12.99

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_check_unavailable_domain(self, mock_get_client):
        """Test checking unavailable domain"""
        mock_client = Mock(spec=NameComClient)
        mock_client.check_availability.return_value = DomainAvailability(
            domain="google.com",
            available=False,
            price=0.0,
            premium=False,
            purchasable=False
        )
        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client)

        result = agent.client.check_availability("google.com")
        assert result.available is False
        assert result.purchasable is False


class TestDomainRegistration:
    """Test domain registration workflow"""

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_select_and_register_success(self, mock_get_client):
        """Test successful domain selection and registration"""
        # Mock Name.com client
        mock_client = Mock(spec=NameComClient)

        # First candidate is available
        mock_client.check_availability.return_value = DomainAvailability(
            domain="taskflowpro.com",
            available=True,
            price=12.99,
            premium=False,
            purchasable=True
        )

        mock_client.register_domain.return_value = DomainRegistration(
            domain="taskflowpro.com",
            success=True,
            order_id="ORDER123",
            total_cost=12.99,
            expires_at="2026-11-14"
        )

        mock_client.configure_github_pages.return_value = True

        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client)

        result = agent.select_and_register_domain(
            business_name="TaskFlow Pro",
            business_type="saas",
            auto_register=True,
            configure_dns=True
        )

        assert result.registration_success is True
        assert result.dns_configured is True
        assert result.github_pages_ready is True
        assert result.selected_domain == "taskflowpro.com"
        assert result.total_cost == 12.99

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_no_available_domains(self, mock_get_client):
        """Test when no domains are available"""
        mock_client = Mock(spec=NameComClient)

        # All domains unavailable
        mock_client.check_availability.return_value = DomainAvailability(
            domain="test.com",
            available=False,
            price=0.0,
            premium=False,
            purchasable=False
        )

        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client)

        result = agent.select_and_register_domain(
            business_name="TaskFlow Pro",
            business_type="saas",
            auto_register=False
        )

        assert result.registration_success is False
        assert result.selected_domain == ""
        assert "No available domains found" in result.error

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_cost_alert_threshold(self, mock_get_client):
        """Test cost alert when threshold exceeded"""
        mock_client = Mock(spec=NameComClient)

        mock_client.check_availability.return_value = DomainAvailability(
            domain="expensive.com",
            available=True,
            price=150.0,  # Exceeds threshold
            premium=True,
            purchasable=True
        )

        mock_get_client.return_value = mock_client

        # Set low threshold
        agent = DomainNameAgent(namecom_client=mock_client, cost_alert_threshold=100.0)

        result = agent.select_and_register_domain(
            business_name="Expensive Business",
            business_type="saas",
            auto_register=True,
            max_cost=200.0  # Allow checking expensive domain
        )

        # Should fail due to cost alert
        assert result.registration_success is False
        assert "COST ALERT" in result.error


class TestCostTracking:
    """Test domain cost tracking"""

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_cost_summary(self, mock_get_client):
        """Test cost summary tracking"""
        mock_client = Mock(spec=NameComClient)
        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client, cost_alert_threshold=100.0)

        # Manually add domains to simulate registrations
        agent.registered_domains = [
            {"domain": "test1.com", "business_name": "Test1", "cost": 12.99},
            {"domain": "test2.com", "business_name": "Test2", "cost": 15.99}
        ]
        agent.total_monthly_cost = (12.99 + 15.99) / 12  # Amortized

        summary = agent.get_cost_summary()

        assert summary["total_domains"] == 2
        assert summary["cost_alert_threshold"] == 100.0
        assert summary["threshold_exceeded"] is False
        assert len(summary["domains"]) == 2

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_threshold_exceeded(self, mock_get_client):
        """Test threshold exceeded detection"""
        mock_client = Mock(spec=NameComClient)
        mock_get_client.return_value = mock_client

        agent = DomainNameAgent(namecom_client=mock_client, cost_alert_threshold=50.0)
        agent.total_monthly_cost = 75.0

        summary = agent.get_cost_summary()
        assert summary["threshold_exceeded"] is True


class TestFactoryFunction:
    """Test factory function"""

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_get_domain_agent_default(self, mock_get_client):
        """Test factory with default threshold"""
        mock_client = Mock(spec=NameComClient)
        mock_get_client.return_value = mock_client

        agent = get_domain_agent()

        assert isinstance(agent, DomainNameAgent)
        # Default from LARGE_BILL_THRESHOLD env var (currently 50.0 in .env)
        assert agent.cost_alert_threshold == 50.0

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_get_domain_agent_custom_threshold(self, mock_get_client):
        """Test factory with custom threshold"""
        mock_client = Mock(spec=NameComClient)
        mock_get_client.return_value = mock_client

        agent = get_domain_agent(cost_alert_threshold=200.0)

        assert agent.cost_alert_threshold == 200.0


class TestIntegrationWithHALO:
    """Test integration with HALO router"""

    @patch('agents.domain_name_agent.get_namecom_client')
    def test_agent_initialization_from_halo(self, mock_get_client):
        """Test that agent can be initialized via HALO router pattern"""
        mock_client = Mock(spec=NameComClient)
        mock_get_client.return_value = mock_client

        # Simulate HALO router calling get_domain_agent()
        agent = get_domain_agent()

        assert agent is not None
        assert hasattr(agent, 'select_and_register_domain')
        assert hasattr(agent, 'generate_domain_candidates')


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
