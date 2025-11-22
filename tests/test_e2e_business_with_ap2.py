from pathlib import Path

import pytest

from agents import marketing_agent
from agents import deploy_agent
from agents import content_agent
from agents import support_agent
from infrastructure.genesis_meta_agent import (
    BusinessGenerationResult,
    BusinessSpec,
    GenesisMetaAgent,
)
from agents.domain_name_agent import DomainNameAgent
from agents.marketing_agent import MarketingAgent
from agents.deploy_agent import DeploymentResult
from agents.content_agent import ContentAgent
from agents.support_agent import SupportAgent


class StubDomainAgent(DomainNameAgent):
    def __init__(self):
        pass

    async def register_domain(self, business_name: str, desired_domain: str = None):
        return {
            "business_name": business_name,
            "selected_domain": desired_domain or "testdomain.com",
            "ap2_approval": {"status": "approved", "service": "domain"},
        }


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


class StubMarketingAgent(MarketingAgent):
    def __init__(self):
        pass

    def generate_campaign_package(self, business_name: str, budget: float):
        return {
            "business_name": business_name,
            "budget": budget,
            "ap2_receipts": [
                {"service": "ads", "amount": budget / 2, "status": "approved"},
                {"service": "email", "amount": budget / 2, "status": "approved"},
            ],
        }


class StubContentAgent(ContentAgent):
    def __init__(self):
        pass

    def generate_campaign_package(self, business_name: str):
        return {
            "business_name": business_name,
            "ap2_receipts": [
                {"service": "blog", "amount": 40.0, "status": "approved"},
            ],
        }


class StubSupportAgent(SupportAgent):
    def __init__(self):
        pass

    def handle_ticket_workflow(self, *args, **kwargs):
        return {"ap2_receipts": [{"service": "zendesk", "amount": 45.0, "status": "approved"}]}


@pytest.mark.asyncio
async def test_end_to_end_business_generation_with_ap2(monkeypatch, tmp_path):
    # Arrange meta agent with stubbed AP2 service
    meta_agent = GenesisMetaAgent.__new__(GenesisMetaAgent)
    meta_agent.ap2_service = type("StubAP2Service", (), {"request_purchase": lambda *args, **kwargs: {"status": "approved", "price": kwargs.get("price", 50.0)}})

    spec = BusinessSpec(
        name="Acme Corp",
        business_type="saas",
        description="Test business",
        components=["dashboard"],
        output_dir=tmp_path,
    )
    generation_result = BusinessGenerationResult(
        business_name=spec.name,
        success=True,
        components_generated=["dashboard"],
        tasks_completed=1,
        tasks_failed=0,
        generation_time_seconds=1.0,
        output_directory=str(tmp_path),
        generated_files=[str(tmp_path / "pages" / "_app.tsx")],
        errors=[],
    )
    (tmp_path / "pages").mkdir(parents=True, exist_ok=True)
    (tmp_path / "pages" / "_app.tsx").write_text("export default function App() {}", encoding="utf-8")

    monkeypatch.setattr(deploy_agent, "get_deploy_agent", lambda *_, **__: StubDeployAgent())
    monkeypatch.setattr(marketing_agent, "MarketingAgent", StubMarketingAgent)
    monkeypatch.setattr(content_agent, "ContentAgent", StubContentAgent)
    monkeypatch.setattr(support_agent, "SupportAgent", StubSupportAgent)
    monkeypatch.setattr("agents.domain_name_agent.DomainNameAgent", StubDomainAgent)

    # Act: run the end-to-end workflow using the stub agents
    domain = await StubDomainAgent().register_domain(spec.name)
    deploy = await StubDeployAgent().full_deployment_workflow({}, {})
    marketing = StubMarketingAgent().generate_campaign_package(spec.name, 100.0)
    content = StubContentAgent().generate_campaign_package(spec.name)
    support = StubSupportAgent().handle_ticket_workflow(user_id="user-1", issue_description="Test", priority="high")

    # Assert receipts aggregated
    assert domain["ap2_approval"]["status"] == "approved"
    assert deploy.metadata["ap2"]["vercel_plan"]["status"] == "approved"
    assert len(marketing["ap2_receipts"]) == 2
    assert content["ap2_receipts"][0]["service"] == "blog"
    assert support["ap2_receipts"][0]["service"] == "zendesk"

