import asyncio
import json
from collections import defaultdict
from datetime import datetime

import pytest

from agents.deploy_agent import DeployAgent, DeploymentConfig


class StubAP2Service:
    def __init__(self):
        self.calls = []

    async def request_purchase(self, agent_name, user_id, service_name, price, categories=None, metadata=None):
        payload = {
            "agent_name": agent_name,
            "user_id": user_id,
            "service_name": service_name,
            "price": price,
            "categories": categories or [],
        }
        self.calls.append(payload)
        return {"status": "approved", "service": service_name, "price": price}


def make_agent() -> DeployAgent:
    agent = DeployAgent.__new__(DeployAgent)  # bypass heavy __init__
    agent.business_id = "acme"
    agent.ap2_service = StubAP2Service()
    agent.total_cost = 0.0
    agent.use_learning = False
    agent.use_reflection = False
    agent.use_api = True
    agent.vercel_api = None
    agent.computer_use = None
    agent.hopx_adapter = type("Adapter", (), {"enabled": False})()
    agent.infra_alerts = []
    agent.infra_audit = []
    agent.platform_spend = defaultdict(float)
    agent._db_plan_history = {}  # pylint: disable=protected-access
    agent.deployments_attempted = 0
    agent.deployments_successful = 0
    agent._infra_monthly_limit = 1000.0  # pylint: disable=protected-access
    agent._infra_monthly_spend = 0.0  # pylint: disable=protected-access
    agent._infra_monthly_window = datetime.utcnow().strftime("%Y-%m")  # pylint: disable=protected-access
    agent._ap2_secret = "test-deploy-secret"  # pylint: disable=protected-access
    return agent


@pytest.mark.asyncio
async def test_ensure_infra_budget_requests_purchase():
    agent = make_agent()
    approval = await agent._ensure_infra_budget("Vercel Pro Plan", 20.0, {"platform": "vercel"})  # pylint: disable=protected-access
    assert approval["service"] == "Vercel Pro Plan"
    assert agent.total_cost == 20.0
    assert agent.ap2_service.calls[0]["agent_name"] == "deploy_agent"
    assert "signature" in approval
    assert agent.infra_audit
    assert approval["auto_approval"] is True


@pytest.mark.asyncio
async def test_ensure_infra_budget_respects_monthly_limit():
    agent = make_agent()
    with pytest.raises(ValueError):
        await agent._ensure_infra_budget("Expensive Plan", 1500.0)  # pylint: disable=protected-access


@pytest.mark.asyncio
async def test_deploy_to_railway_includes_ap2_data():
    agent = make_agent()
    output = await agent.deploy_to_railway(
        repo_name="demo-app",
        github_url="https://github.com/example/demo-app",
        monthly_cost=60.0,
    )
    data = json.loads(output)
    assert data["platform"] == "railway"
    assert data["ap2_approval"]["service"] == "Railway Hosting"


@pytest.mark.asyncio
async def test_infra_alert_triggered_for_large_spend():
    agent = make_agent()
    await agent._ensure_infra_budget("Vercel Functions Burst", 250.0)  # pylint: disable=protected-access
    assert agent.infra_alerts


@pytest.mark.asyncio
async def test_infra_budget_blocks_when_exceeded():
    agent = make_agent()
    agent._infra_monthly_limit = 150  # pylint: disable=protected-access
    await agent._ensure_infra_budget("Vercel Pro Plan", 100.0)  # pylint: disable=protected-access
    with pytest.raises(ValueError):
        await agent._ensure_infra_budget("Vercel Pro Plan", 60.0)  # pylint: disable=protected-access


@pytest.mark.asyncio
async def test_platform_spend_tracking():
    agent = make_agent()
    await agent._ensure_infra_budget("Vercel Pro Plan", 100.0)  # pylint: disable=protected-access
    await agent._ensure_infra_budget("Railway Hosting", 50.0)  # pylint: disable=protected-access
    assert agent.platform_spend["Vercel Pro Plan"] == 100.0
    assert agent.platform_spend["Railway Hosting"] == 50.0


@pytest.mark.asyncio
async def test_infra_ap2_failure_raises():
    agent = make_agent()
    agent.ap2_service = None
    with pytest.raises(RuntimeError):
        await agent._ensure_infra_budget("Netlify Plan", 50.0)  # pylint: disable=protected-access


@pytest.mark.asyncio
async def test_manual_review_flag_for_large_spend():
    agent = make_agent()
    approval = await agent._ensure_infra_budget("Vercel Enterprise", 600.0)  # pylint: disable=protected-access
    assert approval["manual_review"] is True


@pytest.mark.asyncio
async def test_database_cost_spike_detection():
    agent = make_agent()
    await agent.setup_database(provider="MongoDB", plan="M10", monthly_cost=40.0)
    result = json.loads(await agent.setup_database(provider="MongoDB", plan="M10", monthly_cost=120.0))
    assert "cost_spike" in result


@pytest.mark.asyncio
async def test_full_workflow_records_ap2_metadata(tmp_path):
    agent = make_agent()

    def fake_prepare(business_name, code_files, framework="nextjs"):
        return json.dumps({"success": True, "deploy_dir": str(tmp_path), "framework": framework})

    def fake_push(deploy_dir, repo_name, branch="main"):
        return json.dumps({"success": True, "github_url": f"https://github.com/example/{repo_name}"})

    async def fake_deploy(repo_name, github_url, environment="production"):
        approval = await agent._ensure_infra_budget("Vercel Hosting (Starter)", 40.0)  # pylint: disable=protected-access
        return json.dumps(
            {
                "success": True,
                "deployment_url": "https://demo.vercel.app",
                "platform": "vercel",
                "ap2_approvals": {"ap2_approval": approval},
            }
        )

    def fake_verify(url, expected_status=200):  # pylint: disable=unused-argument
        return json.dumps({"success": True, "status_code": 200})

    agent.prepare_deployment_files = fake_prepare  # type: ignore[assignment]
    agent.push_to_github = fake_push  # type: ignore[assignment]
    agent.deploy_to_vercel = fake_deploy  # type: ignore[assignment]
    agent.verify_deployment = fake_verify  # type: ignore[assignment]

    config = DeploymentConfig(repo_name="demo-app", platform="vercel", framework="nextjs")
    business_data = {"code_files": {"pages/index.tsx": "export default function Page() { return <div/>; }"}}
    result = await agent.full_deployment_workflow(config, business_data)
    assert result.metadata["ap2"]["ap2_approval"]["auto_approval"] is True
    assert result.metadata["ap2"]["ap2_approval"]["service"].startswith("Vercel")


# ============================================================================
# MISSING TEST GROUP: Deploy Agent AP2 Additional Tests
# ============================================================================

@pytest.mark.asyncio
async def test_vercel_hosting_approval_workflow():
    """Test that Vercel hosting deployment requests AP2 approval."""
    agent = make_agent()
    approval = await agent._ensure_infra_budget("Vercel Hobby Plan", 0.99)  # Minimal cost
    assert approval["service"] == "Vercel Hobby Plan"
    assert approval["auto_approval"] is True
    assert "signature" in approval


@pytest.mark.asyncio
async def test_railway_deployment_approval():
    """Test that Railway deployment requests AP2 approval with correct cost."""
    agent = make_agent()
    approval = await agent._ensure_infra_budget("Railway Starter Plan", 5.0)
    assert approval["service"] == "Railway Starter Plan"
    assert approval["auto_approval"] is True
    # Verify AP2 service was called
    assert len(agent.ap2_service.calls) > 0
    assert agent.ap2_service.calls[0]["service_name"] == "Railway Starter Plan"
    assert agent.ap2_service.calls[0]["price"] == 5.0


@pytest.mark.asyncio
async def test_database_plan_upgrade_approval():
    """Test database plan upgrade requests AP2 approval."""
    agent = make_agent()
    # First plan
    approval1 = await agent._ensure_infra_budget("MongoDB Atlas M0 (Free)", 1.0)
    assert approval1["auto_approval"] is True

    # Upgrade to paid plan
    approval2 = await agent._ensure_infra_budget("MongoDB Atlas M10 (Paid)", 57.0)
    assert approval2["service"] == "MongoDB Atlas M10 (Paid)"
    # Verify the upgrade was tracked
    assert agent.total_cost == 58.0


@pytest.mark.asyncio
async def test_cdn_subscription_approval():
    """Test CDN subscription requests AP2 approval."""
    agent = make_agent()
    approval = await agent._ensure_infra_budget("CloudFlare Pro CDN", 20.0)
    assert approval["service"] == "CloudFlare Pro CDN"
    assert approval["auto_approval"] is True
    assert agent.total_cost == 20.0


@pytest.mark.asyncio
async def test_auto_approval_for_under_50_deployments():
    """Test that deployments under $50 are auto-approved."""
    agent = make_agent()
    approval = await agent._ensure_infra_budget("Vercel Pro", 25.0)
    assert approval["auto_approval"] is True
    assert approval["manual_review"] is False


@pytest.mark.asyncio
async def test_recurring_cost_tracking_monthly_hosting():
    """Test that monthly hosting costs are tracked correctly."""
    agent = make_agent()

    # First month
    approval1 = await agent._ensure_infra_budget("Railway Monthly Hosting", 50.0)
    assert agent.total_cost == 50.0

    # Additional service same month
    approval2 = await agent._ensure_infra_budget("Database Backup Service", 15.0)
    assert agent.total_cost == 65.0
    assert agent.platform_spend["Railway Monthly Hosting"] == 50.0
    assert agent.platform_spend["Database Backup Service"] == 15.0


@pytest.mark.asyncio
async def test_end_to_end_deployment_with_ap2():
    """Test complete deployment workflow with AP2 approvals."""
    agent = make_agent()

    # Step 1: Infrastructure approval
    infra_approval = await agent._ensure_infra_budget("Vercel Deployment", 25.0)
    assert infra_approval["status"] is not None or "service" in infra_approval

    # Step 2: Database approval (if needed)
    db_approval = await agent._ensure_infra_budget("PostgreSQL Database", 15.0)
    assert db_approval["service"] == "PostgreSQL Database"

    # Step 3: Verify total spending
    assert agent.total_cost == 40.0

    # Step 4: Verify AP2 was called for each
    assert len(agent.ap2_service.calls) == 2
    assert agent.ap2_service.calls[0]["service_name"] == "Vercel Deployment"
    assert agent.ap2_service.calls[1]["service_name"] == "PostgreSQL Database"

