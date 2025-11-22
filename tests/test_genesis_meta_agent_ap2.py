from collections import defaultdict
from datetime import datetime
from pathlib import Path

import pytest

from infrastructure import genesis_meta_agent as gma
import agents.deploy_agent as deploy_module
from agents.deploy_agent import DeploymentResult
from infrastructure.genesis_meta_agent import (
    BusinessGenerationResult,
    BusinessSpec,
    GenesisMetaAgent,
)
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


def make_agent(monkeypatch, monthly_limit=200.0):
    agent = GenesisMetaAgent.__new__(GenesisMetaAgent)
    agent.ap2_service = StubAP2Service()
    agent.business_templates = {"saas": {"components": ["dashboard", "api", "billing"]}}
    agent._llm_budget_window = datetime.utcnow().strftime("%Y-%m")
    agent._projected_llm_spend = 0.0
    agent._actual_llm_spend = 0.0
    agent._analytics_spend = 0.0
    agent._llm_budget_warned = False
    agent._daily_spend = defaultdict(float)
    agent.daily_cost_alerts = []
    agent.business_costs = {}
    agent.generation_audit = []
    agent.generation_alerts = []
    agent._ap2_secret = "test-genesis-secret"
    agent.monitor = None
    agent.router = type("Router", (), {"use_vertex_ai": False})()

    monkeypatch.setitem(
        gma.DEFAULT_BUDGETS,
        "genesis_meta_agent",
        AP2BudgetConfig(monthly_limit=monthly_limit, per_transaction_alert=50.0, require_manual_above=75.0),
    )
    return agent


def test_estimate_generation_cost_scales_with_components(monkeypatch):
    agent = make_agent(monkeypatch)
    spec = BusinessSpec(
        name="Acme",
        business_type="saas",
        description="Test business",
        components=["dashboard", "api"],
        output_dir=Path("tmp"),
    )
    estimate = agent._estimate_generation_cost(spec)
    assert estimate > 0


@pytest.mark.asyncio
async def test_ensure_generation_budget_tracks_projection(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=120.0)
    await agent._ensure_generation_budget("Acme", 40.0)
    assert agent._projected_llm_spend == pytest.approx(40.0)
    assert agent.ap2_service.calls[-1]["price"] == 40.0
    with pytest.raises(RuntimeError):
        await agent._ensure_generation_budget("Acme", 100.0)


def test_record_actual_generation_cost_respects_limit(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=60.0)
    agent._record_actual_generation_cost(30.0)
    assert agent._actual_llm_spend == pytest.approx(30.0)
    with pytest.raises(RuntimeError):
        agent._record_actual_generation_cost(40.0)


@pytest.mark.asyncio
async def test_monitor_business_requests_analytics_budget(monkeypatch):
    agent = make_agent(monkeypatch)
    approval = await agent.monitor_business("Acme", analytics_tool="Amplitude", monthly_cost=80.0)
    assert approval is not None
    assert any(call["service_name"].startswith("Amplitude") for call in agent.ap2_service.calls)


@pytest.mark.asyncio
async def test_database_budget_request(monkeypatch):
    agent = make_agent(monkeypatch)
    approval = await agent._ensure_database_budget("Acme", "MongoDB Atlas", "M20", 120.0)  # pylint: disable=protected-access
    assert approval["price"] == 120.0
    assert agent.ap2_service.calls[-1]["service_name"] == "MongoDB Atlas M20"


@pytest.mark.asyncio
async def test_storage_budget_request(monkeypatch):
    agent = make_agent(monkeypatch)
    approval = await agent._ensure_storage_budget("Acme", "GCS", "Multi-Regional", 45.0)  # pylint: disable=protected-access
    assert approval["price"] == 45.0
    assert agent.ap2_service.calls[-1]["service_name"] == "GCS Multi-Regional"


@pytest.mark.asyncio
async def test_post_generation_automation_includes_deploy_ap2(monkeypatch, tmp_path):
    agent = make_agent(monkeypatch)
    output_dir = tmp_path / "biz"
    (output_dir / "pages").mkdir(parents=True, exist_ok=True)
    critical_file = output_dir / "pages" / "_app.tsx"
    critical_file.write_text("export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }", encoding="utf-8")

    business_spec = BusinessSpec(
        name="Acme",
        business_type="saas",
        description="Test biz",
        components=["dashboard"],
        output_dir=output_dir,
    )
    generation_result = BusinessGenerationResult(
        business_name="Acme",
        success=True,
        components_generated=["dashboard"],
        tasks_completed=1,
        tasks_failed=0,
        generation_time_seconds=1.0,
        output_directory=output_dir.as_posix(),
        generated_files=[critical_file.as_posix()],
        errors=[],
    )

    class StubDeployAgent:
        async def full_deployment_workflow(self, config, business_data):
            return DeploymentResult(
                success=True,
                deployment_url="https://demo.vercel.app",
                github_url="https://github.com/example/demo",
                platform="vercel",
                duration_seconds=1.0,
                metadata={"ap2": {"vercel_plan": {"status": "approved"}}},
            )

    async def fake_get_deploy_agent(*args, **kwargs):
        return StubDeployAgent()

    monkeypatch.setattr(deploy_module, "get_deploy_agent", fake_get_deploy_agent)

    automation = await agent.post_generation_automation(
        business_spec,
        generation_result,
        auto_deploy=True,
        setup_billing=False,
    )
    assert automation["ap2_deployment"]["vercel_plan"]["status"] == "approved"


def test_daily_cost_alert_trigger(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=5000.0)
    agent._record_actual_generation_cost(800.0)  # pylint: disable=protected-access
    agent._record_actual_generation_cost(300.0)  # pylint: disable=protected-access
    assert agent.daily_cost_alerts


def test_business_cost_tracking(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=1000.0)
    spec = BusinessSpec(
        name="Acme",
        business_type="saas",
        description="Test",
        components=["dashboard"],
        output_dir=Path("tmp"),
    )
    agent.business_costs = {"Acme": 200.0, "Orbit": 150.0}
    report = agent.get_cost_per_business_report()
    assert report["total_spend"] == pytest.approx(350.0)
    assert report["business_count"] == 2


@pytest.mark.asyncio
async def test_generation_audit_signature(monkeypatch):
    agent = make_agent(monkeypatch)
    receipt = await agent._ensure_generation_budget("Acme", 120.0, {"estimated_tokens": 9999})
    assert "signature" in receipt
    assert agent.generation_audit


@pytest.mark.asyncio
async def test_token_prediction_metadata_passed(monkeypatch):
    agent = make_agent(monkeypatch)
    await agent._ensure_generation_budget("Acme", 80.0, {"estimated_tokens": 54321})
    assert agent.ap2_service.calls[-1]["metadata"]["estimated_tokens"] == 54321


@pytest.mark.asyncio
async def test_generation_ap2_failure_halts(monkeypatch):
    agent = make_agent(monkeypatch)
    agent.ap2_service = DenyAP2Service()
    with pytest.raises(RuntimeError):
        await agent._ensure_generation_budget("Acme", 600.0)


@pytest.mark.asyncio
async def test_generation_auto_and_manual_flags(monkeypatch):
    agent = make_agent(monkeypatch, monthly_limit=2000.0)
    small = await agent._ensure_generation_budget("Acme", 200.0)
    large = await agent._ensure_generation_budget("Acme", 1200.0)
    assert small["auto_approval"] is True
    assert large["manual_review"] is True
    assert agent.generation_alerts

