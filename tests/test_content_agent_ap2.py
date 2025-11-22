import json
from datetime import datetime

import pytest

from agents.content_agent import ContentAgent


class StubAP2Service:
    def __init__(self):
        self.calls = []

    async def request_purchase(self, agent_name, user_id, service_name, price, categories=None, metadata=None):
        _ = metadata
        self.calls.append(
            {
                "agent_name": agent_name,
                "user_id": user_id,
                "service_name": service_name,
                "price": price,
                "categories": categories or [],
            }
        )
        return {"status": "approved", "service": service_name, "price": price}


class FailingAP2Service(StubAP2Service):
    async def request_purchase(self, *args, **kwargs):  # noqa: D401
        raise RuntimeError("ap2-down")


def make_agent() -> ContentAgent:
    service = StubAP2Service()
    agent = ContentAgent.__new__(ContentAgent)  # bypass heavy init
    agent.business_id = "biz-123"
    agent.agent = None
    agent.router = None
    agent.termination = None
    agent.refinement_history = []
    agent.memory = None
    agent.webvoyager = None
    agent.binary_rar = None
    agent.monitor = None
    agent.ap2_service = service
    setattr(agent, "_ap2_loop", None)
    setattr(agent, "_ap2_thread", None)
    agent.total_content_spend = 0.0
    agent.content_alerts = []
    agent.content_audit = []
    agent._content_monthly_limit = 500.0  # pylint: disable=protected-access
    agent._content_monthly_spend = 0.0  # pylint: disable=protected-access
    agent._content_monthly_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-content-secret"  # pylint: disable=protected-access
    return agent


def test_write_blog_post_adds_ap2_metadata():
    agent = make_agent()
    output = agent.write_blog_post(
        title="AI Trends",
        keywords=["ai", "trends", "2025"],
        research_tool="Ahrefs",
        subscription_cost=150.0,
    )
    data = json.loads(output)
    assert data["ap2_approval"]["service"] == "Ahrefs subscription"
    assert agent.total_content_spend == pytest.approx(150.0)


def test_subscribe_stock_images_requests_budget():
    agent = make_agent()
    response = agent.subscribe_stock_images(provider="Shutterstock", monthly_cost=40.0)
    data = json.loads(response)
    assert data["ap2_approval"]["service"] == "Shutterstock subscription"
    assert "signature" in data["ap2_approval"]
    assert data["ap2_approval"]["auto_approval"] is True
    assert agent.content_audit


def test_content_budget_threshold_enforced():
    agent = make_agent()
    with pytest.raises(ValueError):
        agent.subscribe_video_platform(platform="PremiumHost", monthly_cost=600.0)


def test_content_alert_and_monthly_limit():
    agent = make_agent()
    agent.subscribe_stock_images(provider="Getty", monthly_cost=150.0)
    assert agent.content_alerts
    agent._content_monthly_limit = 200  # pylint: disable=protected-access
    agent.subscribe_translation_api(provider="DeepL", monthly_cost=40.0)
    with pytest.raises(ValueError):
        agent.subscribe_proofreading_tool(provider="Grammarly", monthly_cost=30.0)


def test_content_ap2_failure_raises():
    agent = make_agent()
    agent.ap2_service = FailingAP2Service()
    with pytest.raises(RuntimeError):
        agent.subscribe_stock_images(provider="Getty", monthly_cost=40.0)


def test_content_manual_flag_for_high_cost():
    agent = make_agent()
    response = agent.subscribe_video_platform(platform="PremiumHost", monthly_cost=150.0)
    data = json.loads(response)
    assert data["ap2_approval"]["manual_review"] is True


def test_generate_campaign_package_collects_receipts():
    agent = make_agent()
    package = agent.generate_campaign_package(project_name="LaunchPad", image_budget=40.0, video_budget=80.0, translation_budget=30.0)
    receipts = package["ap2_receipts"]
    assert len(receipts) == 3
    assert all("signature" in receipt for receipt in receipts)


# ============================================================================
# MISSING TEST GROUP: Content Agent AP2 Additional Tests
# ============================================================================

def test_stock_image_subscription_approval():
    """Test that stock image subscriptions request AP2 approval."""
    agent = make_agent()
    response = agent.subscribe_stock_images(provider="Unsplash Pro", monthly_cost=10.0)
    data = json.loads(response)
    assert data["ap2_approval"]["service"] == "Unsplash Pro subscription"
    assert data["ap2_approval"]["auto_approval"] is True
    assert agent.total_content_spend == 10.0
    # Verify AP2 was called
    assert len(agent.ap2_service.calls) == 1
    assert agent.ap2_service.calls[0]["service_name"] == "Unsplash Pro subscription"


def test_video_hosting_plan_approval():
    """Test that video hosting plan requests AP2 approval."""
    agent = make_agent()
    response = agent.subscribe_video_platform(platform="Vimeo", monthly_cost=50.0)
    data = json.loads(response)
    assert data["ap2_approval"]["service"] == "Vimeo subscription"
    assert data["ap2_approval"]["auto_approval"] is True
    assert agent.total_content_spend == 50.0


def test_translation_api_usage_approval():
    """Test that translation API approvals work correctly."""
    agent = make_agent()
    response = agent.subscribe_translation_api(provider="Google Translate API", monthly_cost=20.0)
    data = json.loads(response)
    assert data["ap2_approval"]["service"] == "Google Translate API subscription"
    assert data["ap2_approval"]["auto_approval"] is True
    assert "signature" in data["ap2_approval"]


def test_grammar_tool_subscription_approval():
    """Test that grammar tool subscriptions request AP2 approval."""
    agent = make_agent()
    response = agent.subscribe_proofreading_tool(provider="ProWritingAid", monthly_cost=35.0)
    data = json.loads(response)
    assert data["ap2_approval"]["service"] == "ProWritingAid subscription"
    assert data["ap2_approval"]["auto_approval"] is True
    assert agent.total_content_spend == 35.0


def test_content_signature_verification():
    """Test that AP2 approval signatures are properly generated."""
    agent = make_agent()
    response = agent.subscribe_stock_images(provider="Pexels Pro", monthly_cost=15.0)
    data = json.loads(response)
    # Verify signature exists and is a non-empty string
    assert "signature" in data["ap2_approval"]
    assert isinstance(data["ap2_approval"]["signature"], str)
    assert len(data["ap2_approval"]["signature"]) > 0


def test_auto_approval_for_under_50_content_subscriptions():
    """Test that content subscriptions under $50 are auto-approved."""
    agent = make_agent()
    response = agent.subscribe_stock_images(provider="iStock", monthly_cost=25.0)
    data = json.loads(response)
    assert data["ap2_approval"]["auto_approval"] is True
    assert data["ap2_approval"]["manual_review"] is False

