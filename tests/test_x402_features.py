import asyncio
import json
from pathlib import Path
from datetime import datetime

import pytest

from infrastructure.x402_client import X402Client
from infrastructure.genesis_meta_agent import (
    GenesisMetaAgent,
    BusinessSpec,
    BusinessGenerationResult,
)


@pytest.fixture(autouse=True)
def fake_x402_env(monkeypatch):
    monkeypatch.setenv("X402_USE_FAKE", "true")
    monkeypatch.setenv("X402_AUTO_APPROVE_LIMIT", "50")
    monkeypatch.setenv("X402_META_MONTHLY_LIMIT", "500")
    yield
    # Cleanup ledger files created during tests
    ledger_dir = Path("data/x402")
    if ledger_dir.exists():
        for candidate in ["transactions.jsonl", "approval_log.jsonl", "spend_summary.jsonl"]:
            try:
                (ledger_dir / candidate).unlink()
            except FileNotFoundError:
                continue


def test_meta_agent_approval_log(tmp_path):
    agent = GenesisMetaAgent(use_local_llm=False)
    agent._approval_log_path = tmp_path / "approval_log.jsonl"
    decision = agent._review_x402_payment(
        {
            "agent_name": "qa_agent",
            "vendor": "safe_vendor",
            "amount": 25.0,
            "metadata": {"business_id": "biz123", "category": "qa"},
        }
    )
    assert decision["approved"] is True
    decision_denied = agent._review_x402_payment(
        {
            "agent_name": "qa_agent",
            "vendor": "blocked_vendor",
            "amount": 200.0,
            "metadata": {"business_id": "biz123", "category": "unknown"},
        }
    )
    assert decision_denied["approved"] is False
    log_lines = agent._approval_log_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(log_lines) == 2


def test_staged_payments(monkeypatch):
    client = X402Client()
    auth_id = client.authorize_payment(
        agent_name="deploy_agent",
        vendor="staged_vendor",
        amount=12.5,
        metadata={"business_id": "deploy123", "category": "deployment"},
    )
    assert auth_id.startswith("auth_")
    receipt = client.capture_payment(
        auth_id,
        metadata={"deployment_id": "dep123", "business_id": "deploy123"},
    )
    assert receipt.signature.startswith("fake-payment")
    with pytest.raises(ValueError):
        client.cancel_authorization(auth_id)


@pytest.mark.asyncio
async def test_x402_summary_dispatch(tmp_path, monkeypatch):
    agent = GenesisMetaAgent(use_local_llm=False)
    sent_payloads = []

    async def fake_send(webhook, payload):
        sent_payloads.append((webhook, payload))

    class StubDiscord:
        async def x402_spend_summary(self, business_id, business_name, summary):
            await fake_send("stub", {"business_id": business_id, "summary": summary})

    agent.discord = StubDiscord()

    spec = BusinessSpec(
        name="Test Venture",
        business_type="saas",
        description="",
        components=["api"],
        output_dir=tmp_path,
    )
    result = BusinessGenerationResult(
        business_name=spec.name,
        success=True,
        components_generated=["api"],
        tasks_completed=1,
        tasks_failed=0,
        generation_time_seconds=1.0,
        output_directory=str(tmp_path),
        metrics={"cost_usd": 10.0},
    )
    business_id = agent._hash_business_id(spec.name)
    ledger_path = Path("data/x402/transactions.jsonl")
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    ledger_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "vendor": "content_api",
        "amount_usdc": 12.0,
        "agent": "content_agent",
        "mode": "manual",
        "metadata": {"business_id": business_id, "agent_name": "content_agent"},
    }
    ledger_path.write_text(json.dumps(ledger_entry) + "\n", encoding="utf-8")

    await agent._publish_x402_summary(
        business_id=business_id,
        business_name=spec.name,
        spec=spec,
        result=result,
    )

    assert sent_payloads, "Discord summary should be dispatched"

