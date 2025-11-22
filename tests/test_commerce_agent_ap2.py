import json
from datetime import datetime

import pytest

from agents.commerce_agent import CommerceAgent
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


def make_agent(monkeypatch, monthly_limit: float = 2000.0) -> CommerceAgent:
    _ = monkeypatch
    agent = CommerceAgent.__new__(CommerceAgent)
    agent.business_id = "acme"
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None  # pylint: disable=protected-access
    agent._ap2_thread = None  # pylint: disable=protected-access
    agent._budget_config = AP2BudgetConfig(monthly_limit=monthly_limit, per_transaction_alert=400.0, require_manual_above=600.0)  # pylint: disable=protected-access
    agent._monthly_spend = 0.0  # pylint: disable=protected-access
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-commerce"  # pylint: disable=protected-access
    agent.commerce_audit = []
    agent.commerce_alerts = []
    return agent


def test_register_domain_auto(monkeypatch):
    agent = make_agent(monkeypatch)
    domain = json.loads(agent.register_domain("example.com", registration_cost=12.0))
    assert domain["ap2_approval"]["auto_approval"] is True


def test_gateway_manual(monkeypatch):
    agent = make_agent(monkeypatch)
    gateway = json.loads(agent.activate_payment_gateway("Stripe", 800.0))
    assert gateway["ap2_approval"]["manual_review"] is True
    assert agent.commerce_alerts


def test_budget_limit(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=100.0)
    agent.register_domain("example.com", registration_cost=60.0)
    with pytest.raises(ValueError):
        agent.configure_tax_engine("Avalara", 90.0)


def test_ap2_failure(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        agent.register_domain("example.com", 30.0)


def test_commerce_audit_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.configure_tax_engine("Avalara", 120.0)
    assert agent.commerce_audit
    assert "signature" in agent.commerce_audit[-1]


def test_launch_stack_receipts(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=5000.0)
    stack = agent.launch_commerce_stack("example.com", 20.0, 500.0, 150.0, fulfillment_orders=10)
    assert len(stack["ap2_receipts"]) == 4

