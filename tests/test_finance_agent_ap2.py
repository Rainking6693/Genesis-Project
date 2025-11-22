import json
from datetime import datetime

import pytest

from agents.finance_agent import FinanceAgent
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


def make_agent(monkeypatch, monthly_limit: float = 20000.0) -> FinanceAgent:
    agent = FinanceAgent.__new__(FinanceAgent)
    agent.business_id = "acme"
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None  # pylint: disable=protected-access
    agent._ap2_thread = None  # pylint: disable=protected-access
    agent._budget_config = AP2BudgetConfig(monthly_limit=monthly_limit, per_transaction_alert=2500.0, require_manual_above=5000.0)  # pylint: disable=protected-access
    agent._monthly_spend = 0.0  # pylint: disable=protected-access
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-finance"  # pylint: disable=protected-access
    agent.finance_audit = []
    agent.finance_alerts = []
    return agent


def test_payroll_auto_flag(monkeypatch):
    agent = make_agent(monkeypatch)
    payroll = json.loads(agent.run_payroll_batch(employee_count=5, cost_per_employee=40.0))
    assert payroll["ap2_approval"]["auto_approval"] is True


def test_vendor_manual_review(monkeypatch):
    agent = make_agent(monkeypatch)
    vendor = json.loads(agent.process_vendor_invoice("Snowflake", 6000.0, "data"))
    assert vendor["ap2_approval"]["manual_review"] is True
    assert agent.finance_alerts


def test_finance_budget_limit(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=500.0)
    agent.run_payroll_batch(5, 50.0)
    with pytest.raises(ValueError):
        agent.process_vendor_invoice("Vendor", 400.0, "ops")


def test_finance_ap2_failure(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        agent.run_payroll_batch(2, 30.0)


def test_finance_audit_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.sync_bank_fees("operating", 120.0)
    assert agent.finance_audit
    assert "signature" in agent.finance_audit[-1]


def test_finance_close_receipts(monkeypatch):
    agent = make_agent(monkeypatch)
    data = agent.run_finance_close(3, 30.0, 400.0, "license", 50.0)
    assert len(data["ap2_receipts"]) == 4

