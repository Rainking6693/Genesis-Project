import json
from collections import defaultdict
from datetime import datetime

import pytest

from agents.support_agent import SupportAgent
from infrastructure.ap2_service import AP2BudgetConfig


class StubAP2Service:
    def __init__(self):
        self.calls = []

    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        return {"status": "approved", "price": kwargs.get("price")}


class DenyAP2Service(StubAP2Service):
    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        return {"status": "denied", "price": kwargs.get("price")}


def make_agent(monkeypatch, monthly_limit: float = 500.0) -> SupportAgent:
    agent = SupportAgent.__new__(SupportAgent)  # bypass heavy init
    agent.business_id = "acme"
    agent.agent = None
    agent.router = None
    agent.termination = None
    agent.refinement_history = []
    agent.ocr_compressor = None
    agent.self_correcting = None
    agent.browser_env = None
    agent.env_agent = None
    agent.memory = None
    agent.memori_toolset = None
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None  # pylint: disable=protected-access
    agent._ap2_thread = None  # pylint: disable=protected-access
    agent._budget_config = AP2BudgetConfig(monthly_limit=monthly_limit, per_transaction_alert=100.0, require_manual_above=150.0)  # pylint: disable=protected-access
    agent._monthly_spend = 0.0  # pylint: disable=protected-access
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-support-secret"  # pylint: disable=protected-access
    agent.support_audit = []
    agent.support_alerts = []
    agent.channel_spend = defaultdict(float)
    return agent


def test_create_ticket_records_ap2_receipt(monkeypatch):
    agent = make_agent(monkeypatch)
    ticket = json.loads(agent.create_ticket("user-1", "Login broken", "high", seat_cost=30.0))
    assert ticket["ap2_approval"]["auto_approval"] is True


def test_voice_minutes_trigger_manual_alert(monkeypatch):
    agent = make_agent(monkeypatch)
    response = json.loads(
        agent.respond_to_ticket(
            ticket_id="T1",
            response="Calling customer",
            resolution_type="pending",
            voice_minutes=150.0,
        )
    )
    receipt = response["ap2_approvals"][0]
    assert receipt["manual_review"] is True
    assert agent.support_alerts


def test_escalate_ticket_records_incident(monkeypatch):
    agent = make_agent(monkeypatch)
    escalation = json.loads(agent.escalate_ticket("T1", "Needs SRE", "Tier-2", incident_cost=80.0))
    assert escalation["ap2_approval"]["service"].startswith("PagerDuty")


def test_generate_report_has_receipt(monkeypatch):
    agent = make_agent(monkeypatch)
    report = json.loads(agent.generate_support_report("2025-01-01", "2025-01-31"))
    assert report["ap2_approval"]["service"] == "Support analytics add-on"


def test_monthly_budget_limit(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=60.0)
    agent.create_ticket("user-1", "Issue", "low", seat_cost=40.0)
    with pytest.raises(ValueError):
        agent.create_ticket("user-2", "Another issue", "low", seat_cost=30.0)


def test_ap2_failure_raises(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        agent.create_ticket("user-1", "Issue", "high")


def test_support_audit_contains_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.create_ticket("user-1", "Issue", "high")
    assert agent.support_audit
    assert "signature" in agent.support_audit[-1]


def test_handle_workflow_collects_receipts(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=1000.0)
    workflow = agent.handle_ticket_workflow(
        user_id="user-1",
        issue_description="Login broken",
        priority="high",
        voice_minutes=60.0,
        qa_review_cost=40.0,
        incident_cost=120.0,
    )
    assert len(workflow["ap2_receipts"]) >= 4

