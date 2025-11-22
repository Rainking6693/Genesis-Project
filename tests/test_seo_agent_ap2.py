import json
from collections import defaultdict
from datetime import datetime

import pytest

from agents.seo_agent import SEOAgent


class StubAP2Service:
    def __init__(self):
        self.calls = []

    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        status = kwargs.get("metadata", {}).get("status_override", "approved")
        return {"status": status, "price": kwargs.get("price")}


class DenyAP2Service(StubAP2Service):
    async def request_purchase(self, **kwargs):
        self.calls.append(kwargs)
        return {"status": "denied", "price": kwargs.get("price")}


def make_agent(monkeypatch, monthly_limit: float = 500.0) -> SEOAgent:
    agent = SEOAgent.__new__(SEOAgent)  # bypass heavy __init__
    agent.business_id = "acme"
    agent.agent = None
    agent.router = None
    agent.termination = None
    agent.refinement_history = []
    agent.ap2_service = StubAP2Service()
    agent._ap2_loop = None  # pylint: disable=protected-access
    agent._ap2_thread = None  # pylint: disable=protected-access
    agent._monthly_limit = monthly_limit  # pylint: disable=protected-access
    agent._current_monthly_spend = 0.0  # pylint: disable=protected-access
    agent._budget_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-seo-secret"  # pylint: disable=protected-access
    agent.seo_alerts = []
    agent.seo_audit_log = []
    agent.tool_spend = defaultdict(float)
    return agent


def test_keyword_research_requests_tool_approvals(monkeypatch):
    agent = make_agent(monkeypatch)
    output = json.loads(agent.keyword_research("ai", "founders", 4))
    services = [receipt["service"] for receipt in output["ap2_approvals"]]
    assert "Ahrefs subscription" in services
    assert "SEMrush subscription" in services


def test_keyword_research_manual_flag(monkeypatch):
    agent = make_agent(monkeypatch)
    result = json.loads(agent.keyword_research("ai", "founders", 4, semrush_cost=150.0))
    semrush = next(rec for rec in result["ap2_approvals"] if rec["service"] == "SEMrush subscription")
    assert semrush["manual_review"] is True


def test_track_rankings_auto_approval(monkeypatch):
    agent = make_agent(monkeypatch)
    result = json.loads(agent.track_rankings("example.com", ["ai"], "google", tool_cost=40.0))
    assert result["ap2_approvals"][0]["auto_approval"] is True


def test_analyze_backlinks_triggers_cost_alert(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.analyze_backlinks("example.com", service_cost=250.0)
    assert agent.seo_alerts


def test_monthly_budget_limit_enforced(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=120.0)
    agent.keyword_research("ai", "founders", 3, ahrefs_cost=60.0, semrush_cost=40.0)
    with pytest.raises(ValueError):
        agent.track_rankings("example.com", ["kw"], "google", tool_cost=50.0)


def test_ap2_failure_raises(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        agent.keyword_research("ai", "founders", 3)


def test_seo_audit_log_contains_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.track_rankings("example.com", ["kw"], "google")
    assert agent.seo_audit_log
    assert "signature" in agent.seo_audit_log[-1]


def test_multi_tool_spend_tracking(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=1000.0)
    agent.keyword_research("ai", "founders", 3)
    agent.analyze_backlinks("example.com")
    assert agent.tool_spend["Ahrefs subscription"] > 0
    assert agent.tool_spend["Backlink monitoring service"] > 0


def test_end_to_end_seo_analysis_collects_receipts(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=1000.0)
    report = agent.run_full_seo_analysis("ai", "example.com", "founders", ["ai tool"])
    assert len(report["ap2_receipts"]) == 4

