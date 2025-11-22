import json
from collections import defaultdict
from datetime import datetime

import pytest

from agents.pricing_agent import PricingAgent
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


def make_agent(monkeypatch, monthly_limit: float = 1000.0) -> PricingAgent:
    agent = PricingAgent.__new__(PricingAgent)
    agent.business_id = "acme"
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None  # pylint: disable=protected-access
    agent._ap2_thread = None  # pylint: disable=protected-access
    agent._budget_config = AP2BudgetConfig(monthly_limit=monthly_limit, per_transaction_alert=300.0, require_manual_above=500.0)  # pylint: disable=protected-access
    agent._monthly_spend = 0.0  # pylint: disable=protected-access
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-pricing"  # pylint: disable=protected-access
    agent.pricing_audit = []
    agent.pricing_alerts = []
    return agent


def test_purchase_dataset_auto_approval(monkeypatch):
    agent = make_agent(monkeypatch)
    record = json.loads(agent.purchase_dataset("Tealbook", 60.0, records=5000))
    assert record["ap2_approval"]["auto_approval"] is True


def test_elasticity_manual_review(monkeypatch):
    agent = make_agent(monkeypatch)
    experiment = json.loads(agent.run_elasticity_experiment("exp-1", cloud_hours=50.0))
    assert experiment["ap2_approval"]["manual_review"] is True
    assert agent.pricing_alerts


def test_budget_limit(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=100.0)
    agent.purchase_dataset("Provider", 80.0, 1000)
    with pytest.raises(ValueError):
        agent.deploy_pricing_update("ads", 50.0, "high")


def test_ap2_failure(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        agent.purchase_dataset("Provider", 40.0, 2000)


def test_pricing_audit_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.deploy_pricing_update("sms", 45.0, "low")
    assert agent.pricing_audit
    assert "signature" in agent.pricing_audit[-1]


def test_pricing_cycle_collects_receipts(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=5000.0)
    cycle = agent.run_pricing_cycle("Provider", 120.0, 10000, cloud_hours=10.0, deployment_spend=150.0)
    assert len(cycle["ap2_receipts"]) == 4

