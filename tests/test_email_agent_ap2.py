"""
Email Agent AP2 Integration Tests
===================================

Comprehensive test suite for Email Agent AP2 payment integration.
Tests cover: send_email, validate_emails, setup_automation with budget tracking,
approval workflows, audit trail, and cost alerts.

12 tests total covering all critical AP2 functionality.
"""

import json
from collections import defaultdict
from datetime import datetime

import pytest

from agents.email_agent import EmailAgent


class StubAP2Service:
    """Stub AP2Service for testing without real payments"""

    def __init__(self):
        self.calls = []

    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        status = kwargs.get("metadata", {}).get("status_override", "approved")
        return {"status": status, "price": kwargs.get("price")}


class DenyAP2Service(StubAP2Service):
    """AP2Service that denies all requests"""

    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        return {"status": "denied", "price": kwargs.get("price")}


def make_agent(monkeypatch, monthly_limit: float = 200.0) -> EmailAgent:
    """Create a test Email Agent with stubbed dependencies"""
    agent = EmailAgent.__new__(EmailAgent)  # Bypass heavy __init__
    agent.business_id = "acme"
    agent.agent = None
    agent.router = None
    agent.termination = None
    agent.refinement_history = []
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None
    agent._ap2_thread = None
    agent._monthly_limit = monthly_limit
    agent._current_monthly_spend = 0.0
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")
    agent._ap2_secret = "test-email-secret"
    agent.email_alerts = []
    agent.email_audit_log = []
    agent.tool_spend = defaultdict(float)
    return agent


class TestEmailSendWithAP2:
    """Tests for send_email with AP2 integration"""

    def test_send_email_requests_tool_approvals(self, monkeypatch):
        """Test that send_email requests AP2 approvals for services"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.send_email("CAMP-001", ["a@b.com"] * 2000, True, sendgrid_cost=15.0))
        services = [ap["service"] for ap in output["ap2_approvals"]]
        assert "SendGrid subscription" in services

    def test_send_email_small_batch_free(self, monkeypatch):
        """Test that small batches use free Mailgun"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.send_email("CAMP-002", ["a@b.com", "b@c.com"], True))
        assert output["total_cost"] == 0.0
        assert len(output["ap2_approvals"]) == 0

    def test_send_email_manual_review_flag(self, monkeypatch):
        """Test that high-cost sends trigger manual review"""
        agent = make_agent(monkeypatch)
        result = json.loads(agent.send_email("CAMP-003", ["x@y.com"] * 2000, True, sendgrid_cost=25.0))
        sendgrid = result["ap2_approvals"][0]
        assert sendgrid["manual_review"] is True
        assert sendgrid["auto_approval"] is False

    def test_send_email_auto_approval_low_cost(self, monkeypatch):
        """Test that low-cost sends auto-approve"""
        agent = make_agent(monkeypatch)
        result = json.loads(agent.send_email("CAMP-004", ["x@y.com"] * 2000, True, sendgrid_cost=10.0))
        sendgrid = result["ap2_approvals"][0]
        assert sendgrid["auto_approval"] is True
        assert sendgrid["manual_review"] is False

    def test_send_email_high_cost_alert(self, monkeypatch):
        """Test that high total cost generates alert"""
        agent = make_agent(monkeypatch, monthly_limit=1000.0)
        agent.send_email("CAMP-005", ["x@y.com"] * 2000, True, sendgrid_cost=60.0)
        assert len(agent.email_alerts) > 0
        assert agent.email_alerts[0]["type"] == "high_cost_alert"

    def test_send_email_monthly_budget_enforced(self, monkeypatch):
        """Test that monthly budget limit is enforced"""
        agent = make_agent(monkeypatch, monthly_limit=50.0)
        # First call: spend $30 out of $50 budget
        agent.send_email("CAMP-006", ["x@y.com"] * 2000, True, sendgrid_cost=30.0)
        # Second call: try to spend $30 more (would exceed budget)
        with pytest.raises(ValueError):
            agent.send_email("CAMP-007", ["x@y.com"] * 2000, True, sendgrid_cost=30.0)


class TestEmailValidation:
    """Tests for validate_emails with AP2 integration"""

    def test_validate_emails_requests_approval(self, monkeypatch):
        """Test that validate_emails requests AP2 approval"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.validate_emails(["a@b.com"] * 100))
        approvals = output["ap2_approvals"]
        assert len(approvals) > 0
        assert "ZeroBounce email validation" in approvals[0]["service"]

    def test_validate_emails_cost_calculation(self, monkeypatch):
        """Test correct cost calculation for email validation"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.validate_emails(["a@b.com"] * 1000))
        # 1000 emails * $0.004 = $4.00
        assert output["total_cost"] == pytest.approx(4.0, rel=0.01)

    def test_validate_emails_auto_approval_low_cost(self, monkeypatch):
        """Test that low-cost validation auto-approves"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.validate_emails(["a@b.com"] * 100))
        approval = output["ap2_approvals"][0]
        assert approval["auto_approval"] is True

    def test_validate_emails_manual_review_high_cost(self, monkeypatch):
        """Test that high-cost validation requires manual review"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.validate_emails(["a@b.com"] * 5000))
        # 5000 * $0.004 = $20, should trigger manual review
        approval = output["ap2_approvals"][0]
        assert approval["manual_review"] is True

    def test_validate_emails_budget_limit(self, monkeypatch):
        """Test that validation respects monthly budget"""
        agent = make_agent(monkeypatch, monthly_limit=10.0)
        agent.validate_emails(["a@b.com"] * 1000)  # $4
        with pytest.raises(ValueError):
            agent.validate_emails(["a@b.com"] * 2000)  # Would be $8 total = $12 over limit


class TestEmailAutomation:
    """Tests for setup_automation with AP2 integration"""

    def test_setup_automation_requests_approval(self, monkeypatch):
        """Test that setup_automation requests AP2 approval"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.setup_automation("welcome_sequence", "on_signup", 3))
        approvals = output["ap2_approvals"]
        assert len(approvals) > 0
        assert "Customer.io automation platform" in approvals[0]["service"]

    def test_setup_automation_manual_review_always(self, monkeypatch):
        """Test that automation setup always requires manual review"""
        agent = make_agent(monkeypatch)
        output = json.loads(agent.setup_automation("welcome_sequence", "on_signup", 3))
        approval = output["ap2_approvals"][0]
        assert approval["manual_review"] is True
        assert approval["auto_approval"] is False

    def test_setup_automation_cost_tracking(self, monkeypatch):
        """Test that automation cost is properly tracked"""
        agent = make_agent(monkeypatch)
        agent.setup_automation("welcome_sequence", "on_signup", 3)
        assert agent.tool_spend["Customer.io automation platform"] == 99.0

    def test_setup_automation_budget_enforcement(self, monkeypatch):
        """Test that automation respects budget limits"""
        agent = make_agent(monkeypatch, monthly_limit=50.0)
        # Automation costs $99, which exceeds the $50 budget
        with pytest.raises(ValueError):
            agent.setup_automation("welcome_sequence", "on_signup", 3)


class TestAuditTrailAndSignatures:
    """Tests for audit trail and signature verification"""

    def test_send_email_audit_log_contains_signature(self, monkeypatch):
        """Test that audit log entries contain valid signatures"""
        agent = make_agent(monkeypatch)
        agent.send_email("CAMP-008", ["x@y.com"] * 2000, True, sendgrid_cost=15.0)
        assert len(agent.email_audit_log) > 0
        entry = agent.email_audit_log[-1]
        assert "signature" in entry
        assert entry["signature"] != ""

    def test_validate_emails_audit_log(self, monkeypatch):
        """Test that validate_emails creates audit entries"""
        agent = make_agent(monkeypatch)
        agent.validate_emails(["a@b.com"] * 100)
        assert len(agent.email_audit_log) > 0
        entry = agent.email_audit_log[-1]
        assert entry["action"] == "validate_emails"
        assert "signature" in entry

    def test_multi_tool_spend_tracking(self, monkeypatch):
        """Test tracking spend across multiple tools"""
        agent = make_agent(monkeypatch, monthly_limit=1000.0)
        agent.send_email("CAMP-009", ["x@y.com"] * 2000, True, sendgrid_cost=15.0)
        agent.validate_emails(["a@b.com"] * 500)
        assert agent.tool_spend["SendGrid subscription"] > 0
        assert agent.tool_spend["ZeroBounce email validation"] > 0


class TestBudgetWindow:
    """Tests for monthly budget window management"""

    def test_budget_window_reset_next_month(self, monkeypatch):
        """Test that budget resets when month changes"""
        agent = make_agent(monkeypatch, monthly_limit=50.0)
        agent.send_email("CAMP-010", ["x@y.com"] * 2000, True, sendgrid_cost=30.0)
        initial_spend = agent._current_monthly_spend
        assert initial_spend == 30.0

        # Simulate month change
        agent._budget_window = "2025-12"
        agent._check_monthly_budget(40.0)  # Should succeed since budget resets
        # Current spend resets to 0 at start of new month, then check passes
        # (this is checked inside _check_monthly_budget)
        # Verify that next call works without raising
        agent.send_email("CAMP-011", ["x@y.com"] * 2000, True, sendgrid_cost=25.0)
        assert agent._current_monthly_spend == 25.0  # New month so only has 25

    def test_current_spend_accumulation(self, monkeypatch):
        """Test that spending accumulates within budget window"""
        agent = make_agent(monkeypatch, monthly_limit=500.0)
        agent.send_email("CAMP-012", ["x@y.com"] * 2000, True, sendgrid_cost=10.0)
        spend_after_first = agent._current_monthly_spend
        assert spend_after_first == 10.0

        agent.send_email("CAMP-013", ["x@y.com"] * 2000, True, sendgrid_cost=15.0)
        spend_after_second = agent._current_monthly_spend
        assert spend_after_second == 25.0

        assert spend_after_second > spend_after_first


# End-to-End Integration Test
class TestEndToEndEmailWorkflow:
    """Full workflow tests combining multiple operations"""

    def test_full_email_campaign_with_validation_and_automation(self, monkeypatch):
        """Test complete email campaign: create, validate, automate"""
        agent = make_agent(monkeypatch, monthly_limit=500.0)

        # Step 1: Validate recipient list
        val_result = json.loads(agent.validate_emails(["user1@example.com", "user2@example.com"] * 100))
        assert val_result["valid_rate"] > 0

        # Step 2: Send campaign
        send_result = json.loads(agent.send_email("CAMP-FULL", ["user1@example.com"] * 2000, True, sendgrid_cost=15.0))
        assert send_result["recipients_count"] > 0
        assert len(send_result["ap2_approvals"]) > 0

        # Step 3: Setup automation
        auto_result = json.loads(agent.setup_automation("follow_up", "on_no_response", 2))
        assert auto_result["status"] == "pending_setup"

        # Verify all operations logged
        assert len(agent.email_audit_log) >= 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
