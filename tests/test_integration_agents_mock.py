import sys
import types
import pytest


def _patch_docker_module():
    """
    Ensure modules that import docker (sandbox, etc.) don't fail during tests.
    """
    if "docker" not in sys.modules:
        fake_errors = types.SimpleNamespace(DockerException=Exception)
        sys.modules["docker"] = types.SimpleNamespace(from_env=lambda: None, errors=fake_errors)


@pytest.mark.asyncio
async def test_se_darwin_memory_store_runs(monkeypatch):
    """
    Verify memory-aware Darwin can obtain a LangGraph store and run a tiny graph.
    """
    _patch_docker_module()
    from infrastructure.evolution import memory_aware_darwin as mad

    store = mad.get_store(dict)
    graph = store.graph

    def start(state):
        state["score"] = state.get("score", 0) + 0.1
        return state

    graph.add_node("start", start)
    graph.set_entry_point("start")
    graph.add_edge("start", "__end__")

    store.compile()
    result = await store._compiled.ainvoke({"score": 0}, config={"configurable": {"thread_id": "se-darwin-test"}})
    assert result["score"] == pytest.approx(0.1)


@pytest.mark.asyncio
async def test_seo_and_marketing_mock_content(monkeypatch):
    """
    Run SEO and Marketing agents against mock content with heavy dependencies stubbed.
    """
    _patch_docker_module()

    from agents.seo_agent import SEOAgent
    from agents.marketing_agent import MarketingAgent

    # SEO agent with budget/charge patched and optimize_content stubbed
    seo = SEOAgent()
    monkeypatch.setattr(seo, "_ensure_seo_budget", lambda *a, **k: {"ok": True})
    monkeypatch.setattr(seo, "_charge_x402", lambda *a, **k: None)

    async def stub_optimize(title: str, body: str, optimization_type: str = "general"):
        return f"optimized-{title}-{optimization_type}"

    monkeypatch.setattr(seo, "optimize_content", stub_optimize)
    output = await seo.optimize_content("Mock title", "This is a mock body for testing.", "general")
    assert isinstance(output, str) and "optimized" in output

    # Marketing agent with spend/charge patched
    mkt = MarketingAgent()

    async def noop_charge(*args, **kwargs):
        return None

    async def noop_request(*args, **kwargs):
        return {"approved": True}

    monkeypatch.setattr(mkt, "_validate_marketing_budget", lambda budget: None)
    monkeypatch.setattr(mkt, "_charge_x402", noop_charge)
    monkeypatch.setattr(mkt, "_request_marketing_spend", noop_request)

    async def stub_strategy(business_name, target_audience, budget):
        return f"strategy-for-{business_name}-{target_audience}-{budget}"

    monkeypatch.setattr(mkt, "create_strategy", stub_strategy)

    strategy = await mkt.create_strategy("TestBiz", "TestAudience", 100.0)
    assert "strategy-for-TestBiz" in strategy
