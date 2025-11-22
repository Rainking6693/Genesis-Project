import json

import pytest

from agents.marketing_agent import MarketingAgent


class StubAP2Service:
    def __init__(self):
        self.calls = []

    async def request_purchase(
        self,
        agent_name: str,
        user_id: str,
        service_name: str,
        price: float,
        categories=None,
        metadata=None,
    ):
        payload = {
            "agent_name": agent_name,
            "user_id": user_id,
            "service_name": service_name,
            "price": price,
            "categories": categories or [],
        }
        self.calls.append(payload)
        return {
            "status": "approved" if price <= 1000 else "pending",
            "service": service_name,
            "price": price,
        }


class FailingAP2Service(StubAP2Service):
    async def request_purchase(
        self,
        agent_name: str,
        user_id: str,
        service_name: str,
        price: float,
        categories=None,
        metadata=None,
    ):
        raise RuntimeError("ap2-down")


def _make_agent() -> MarketingAgent:
    service = StubAP2Service()
    agent = MarketingAgent(business_id="biz-123", ap2_service=service)
    return agent


def test_create_strategy_attaches_ap2_metadata():
    agent = _make_agent()
    try:
        output = agent.create_strategy("Acme", "Founders", 1500)
        data = json.loads(output)
        assert "ap2_approval" in data
        assert data["ap2_approval"]["service"] == "Marketing Strategy Budget"
    finally:
        agent.shutdown()


def test_create_strategy_rejects_over_threshold_budget():
    agent = _make_agent()
    try:
        with pytest.raises(ValueError):
            agent.create_strategy("Acme", "Founders", 6000)
    finally:
        agent.shutdown()


def test_generate_social_content_requests_tool_subscription():
    agent = _make_agent()
    try:
        response = agent.generate_social_content(
            business_name="Acme",
            value_proposition="AI Copilot",
            days=7,
            automation_tool="Buffer",
            tool_cost=40,
        )
        data = json.loads(response)
        assert data["ap2_approval"]["service"] == "Buffer subscription"
    finally:
        agent.shutdown()


def test_write_blog_post_requests_research_tool_subscription():
    agent = _make_agent()
    try:
        response = agent.write_blog_post(
            topic="Startup Marketing",
            keywords=["startup", "growth"],
            research_tool="Ahrefs",
            subscription_cost=199,
        )
        data = json.loads(response)
        assert data["ap2_approval"]["service"] == "Ahrefs subscription"
    finally:
        agent.shutdown()


def test_create_email_sequence_requests_platform_subscription():
    agent = _make_agent()
    try:
        response = agent.create_email_sequence(
            sequence_type="onboarding",
            business_name="Acme",
            email_platform="SendGrid",
            platform_cost=120,
        )
        data = json.loads(response)
        assert data["ap2_approval"]["service"] == "SendGrid subscription"
    finally:
        agent.shutdown()


def test_build_launch_plan_requests_dual_approvals():
    agent = _make_agent()
    try:
        response = agent.build_launch_plan(
            business_name="Acme",
            launch_date="2025-12-01",
            product_hunt_fee=299,
            influencer_payment=750,
        )
        data = json.loads(response)
        approvals = data["ap2_approvals"]
        assert approvals["product_hunt"]["service"] == "Product Hunt submission"
        assert approvals["influencer"]["service"] == "Influencer partnership"
    finally:
        agent.shutdown()


def test_subscribe_analytics_tool_requests_approval():
    agent = _make_agent()
    try:
        response = agent.subscribe_analytics_tool("Mixpanel", 80.0)
        data = json.loads(response)
        assert data["ap2_approval"]["service"] == "Mixpanel analytics"
    finally:
        agent.shutdown()


def test_marketing_cost_alert_triggers_for_large_spend():
    agent = _make_agent()
    try:
        agent.create_strategy("Acme", "Founders", 1500)
        assert agent.cost_alerts
    finally:
        agent.shutdown()


def test_monthly_budget_tracking_blocks_over_limit():
    agent = _make_agent()
    agent._marketing_monthly_limit = 200  # pylint: disable=protected-access
    try:
        agent.subscribe_analytics_tool("Mixpanel", 80)
        agent.subscribe_analytics_tool("Amplitude", 90)
        with pytest.raises(ValueError):
            agent.subscribe_analytics_tool("Heap", 50)
    finally:
        agent.shutdown()


def test_auto_and_manual_flags_exposed():
    agent = _make_agent()
    try:
        social = json.loads(
            agent.generate_social_content(
                business_name="Acme",
                value_proposition="AI Copilot",
                days=3,
                automation_tool="Buffer",
                tool_cost=40,
            )
        )
        assert social["ap2_approval"]["auto_approval"] is True
        strategy = json.loads(agent.create_strategy("Acme", "Founders", 1500))
        assert strategy["ap2_approval"]["manual_review"] is True
    finally:
        agent.shutdown()


def test_ap2_failure_handled():
    failing_agent = MarketingAgent(business_id="biz-err", ap2_service=FailingAP2Service())
    try:
        with pytest.raises(RuntimeError):
            failing_agent.generate_social_content(
                business_name="Acme",
                value_proposition="AI Copilot",
                days=7,
                automation_tool="Buffer",
                tool_cost=40,
            )
    finally:
        failing_agent.shutdown()


def test_audit_log_contains_signature():
    agent = _make_agent()
    try:
        agent.subscribe_analytics_tool("Mixpanel", 80)
        assert agent.audit_log
        assert "signature" in agent.audit_log[-1]
    finally:
        agent.shutdown()


def test_end_to_end_launch_records_campaign_spend():
    agent = _make_agent()
    try:
        agent.create_strategy("Acme", "Founders", 1500)
        agent.generate_social_content("Acme", "AI Copilot", days=5, automation_tool="Buffer", tool_cost=40)
        agent.create_email_sequence("launch", "Acme", num_emails=3, email_platform="SendGrid", platform_cost=120)
        agent.subscribe_analytics_tool("Mixpanel", 80)
        agent.build_launch_plan("Acme", "2025-12-01", product_hunt_fee=199, influencer_payment=750)
        spend = agent.get_campaign_spend()
        assert spend["Marketing Strategy Budget"] == 1500
        assert spend["Product Hunt submission"] == 199
        assert spend["Influencer partnership"] == 750
    finally:
        agent.shutdown()


def test_subscribe_analytics_tool_requests_approval():
    agent = _make_agent()
    try:
        response = agent.subscribe_analytics_tool("Mixpanel", 80.0)
        data = json.loads(response)
        assert data["ap2_approval"]["service"] == "Mixpanel analytics"
    finally:
        agent.shutdown()


def test_marketing_cost_alert_triggers_for_large_spend():
    agent = _make_agent()
    try:
        agent.create_strategy("Acme", "Founders", 1500)
        assert len(agent.cost_alerts) == 1
        assert agent.cost_alerts[0]["service"] == "Marketing Strategy Budget"
    finally:
        agent.shutdown()


def test_monthly_budget_tracking_blocks_over_limit():
    agent = _make_agent()
    agent._marketing_monthly_limit = 200  # pylint: disable=protected-access
    try:
        agent.subscribe_analytics_tool("Mixpanel", 80.0)
        agent.subscribe_analytics_tool("Amplitude", 90.0)
        with pytest.raises(ValueError):
            agent.subscribe_analytics_tool("Heap", 50.0)
    finally:
        agent.shutdown()


def test_auto_and_manual_flags_exposed():
    agent = _make_agent()
    try:
        social = json.loads(
            agent.generate_social_content(
                business_name="Acme",
                value_proposition="AI Copilot",
                days=3,
                automation_tool="Buffer",
                tool_cost=40,
            )
        )
        assert social["ap2_approval"]["auto_approval"] is True
        strategy = json.loads(agent.create_strategy("Acme", "Founders", 1500))
        assert strategy["ap2_approval"]["manual_review"] is True
    finally:
        agent.shutdown()


def test_ap2_failure_handled():
    failing_agent = MarketingAgent(business_id="biz-err", ap2_service=FailingAP2Service())
    try:
        with pytest.raises(RuntimeError):
            failing_agent.generate_social_content(
                business_name="Acme",
                value_proposition="AI Copilot",
                days=7,
                automation_tool="Buffer",
                tool_cost=40,
            )
    finally:
        failing_agent.shutdown()

