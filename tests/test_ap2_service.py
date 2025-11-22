import os

import pytest

from infrastructure.ap2_service import AP2BudgetConfig, AP2Service
from infrastructure.ap2_circuit_breaker import CircuitState
from tests.fixtures.ap2_harness import assert_audit_logged


class DummyMonitor:
    def __init__(self):
        self.events = []
        self.budgets = None

    def record_ap2_event(self, agent_name, payload):
        self.events.append((agent_name, payload))

    def register_ap2_budgets(self, configs):
        self.budgets = configs


@pytest.fixture(autouse=True)
def set_ap2_secret(monkeypatch):
    monkeypatch.setenv("AP2_SIGNING_SECRET", "test-secret")
    yield


@pytest.mark.asyncio
async def test_ap2_service_records_events(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()
    assert dummy.budgets is not None

    result = await service.request_purchase(
        agent_name="marketing_agent",
        user_id="user123",
        service_name="google_ads",
        price=15.0,
        categories=["ads"]
    )

    assert result["status"] in {"pending", "approved"}
    assert_audit_logged(dummy.events, "cart_created")


@pytest.mark.asyncio
async def test_ap2_service_auto_approves_when_flag_enabled(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setenv("AP2_AUTO_APPROVE", "true")
    monkeypatch.setenv("AP2_AUTO_APPROVE_LIMIT", "1000")
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    result = await service.request_purchase(
        agent_name="content_agent",
        user_id="userABC",
        service_name="stock_images",
        price=20.0,
        categories=["content"]
    )

    assert result["status"] == "approved"
    assert_audit_logged(dummy.events, "cart_created", status="approved")


@pytest.mark.asyncio
async def test_request_purchase_includes_batch_metadata(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    budgets = {"marketing_agent": AP2BudgetConfig(200, 50, 100)}
    service = AP2Service(budgets=budgets)

    result = await service.request_purchase(
        agent_name="marketing_agent",
        user_id="userXYZ",
        service_name="brand_ads",
        price=25.0,
        categories=["ads"],
    )

    assert "batch_approval" in result
    assert result["batch_approval"]["auto_approved"] is True
    assert_audit_logged(dummy.events, "cart_created", status=result["status"])


@pytest.mark.asyncio
async def test_batch_manager_blocks_when_budget_depleted(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    budgets = {"marketing_agent": AP2BudgetConfig(60, 20, 30)}
    service = AP2Service(budgets=budgets)

    await service.request_purchase(
        agent_name="marketing_agent",
        user_id="userXYZ",
        service_name="brand_ads",
        price=50.0,
        categories=["ads"],
    )

    with pytest.raises(ValueError):
        await service.request_purchase(
            agent_name="marketing_agent",
            user_id="userXYZ",
            service_name="followup_ads",
            price=20.0,
            categories=["ads"],
        )


@pytest.mark.asyncio
async def test_circuit_breaker_blocks_after_failures(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)

    class FailingConnector:
        def __init__(self):
            self.calls = 0

        async def create_intent_mandate(self, *args, **kwargs):
            raise RuntimeError("connector down")

    service = AP2Service(connector=FailingConnector())

    for _ in range(3):
        with pytest.raises(RuntimeError):
            await service.safe_request_purchase(
                agent_name="marketing_agent",
                user_id="userXYZ",
                service_name="ads",
                price=10.0,
            )

    breaker_state = service.circuit_registry.get("marketing_agent").metrics().state
    assert breaker_state == CircuitState.OPEN


# ============================================================================
# MISSING TEST GROUP 1: Auto-Approval with Threshold Logic
# ============================================================================

@pytest.mark.asyncio
async def test_auto_approval_below_50_dollar_threshold(monkeypatch):
    """Test that purchases under $50 are auto-approved when flag enabled."""
    dummy = DummyMonitor()
    monkeypatch.setenv("AP2_AUTO_APPROVE", "true")
    monkeypatch.setenv("AP2_AUTO_APPROVE_LIMIT", "50")
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    result = await service.request_purchase(
        agent_name="content_agent",
        user_id="user456",
        service_name="stock_image_subscription",
        price=25.0,
        categories=["content"]
    )

    assert result["status"] == "approved"
    assert_audit_logged(dummy.events, "cart_created", status="approved")


@pytest.mark.asyncio
async def test_manual_approval_above_50_dollar_threshold(monkeypatch):
    """Test that purchases over $50 require manual approval even with flag enabled."""
    dummy = DummyMonitor()
    monkeypatch.setenv("AP2_AUTO_APPROVE", "true")
    monkeypatch.setenv("AP2_AUTO_APPROVE_LIMIT", "50")
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    result = await service.request_purchase(
        agent_name="deploy_agent",
        user_id="user789",
        service_name="premium_hosting",
        price=75.0,
        categories=["deploy"]
    )

    assert result["status"] == "pending"
    assert_audit_logged(dummy.events, "cart_created", status="pending")


# ============================================================================
# MISSING TEST GROUP 2: Budget Exhaustion and Alerts
# ============================================================================

@pytest.mark.asyncio
async def test_budget_exhaustion_prevents_purchase(monkeypatch):
    """Test that purchases are blocked when monthly budget is exhausted."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    budgets = {"marketing_agent": AP2BudgetConfig(100, 50, 80)}
    service = AP2Service(budgets=budgets)

    # First purchase uses 80 of budget
    await service.request_purchase(
        agent_name="marketing_agent",
        user_id="user100",
        service_name="first_ads",
        price=80.0,
        categories=["ads"],
    )

    # Second purchase of 30 should fail (would exceed 100 limit)
    with pytest.raises(ValueError, match="batch mandate exhausted"):
        await service.request_purchase(
            agent_name="marketing_agent",
            user_id="user100",
            service_name="second_ads",
            price=30.0,
            categories=["ads"],
        )


@pytest.mark.asyncio
async def test_budget_alert_at_80_percent_threshold(monkeypatch):
    """Test that budget warning is triggered at 80% usage."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    budgets = {"marketing_agent": AP2BudgetConfig(100, 50, 80)}
    service = AP2Service(budgets=budgets)

    # First purchase uses 85 of 100 budget (85% > 80% threshold)
    result = await service.request_purchase(
        agent_name="marketing_agent",
        user_id="user200",
        service_name="budget_warning_test",
        price=85.0,
        categories=["ads"],
    )

    # Check that warning was triggered
    assert "batch_approval" in result
    decision = result["batch_approval"]
    assert decision["warning_triggered"] is True


@pytest.mark.asyncio
async def test_monitor_integration_logs_ap2_event(monkeypatch):
    """Test that monitor.record_ap2_event is called with correct payload."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    result = await service.request_purchase(
        agent_name="seo_agent",
        user_id="seo_user_1",
        service_name="keyword_research",
        price=35.0,
        categories=["seo"]
    )

    # Verify events were logged (intent_created + cart_created)
    assert len(dummy.events) >= 2

    # Check intent_created event (first)
    agent_name1, payload1 = dummy.events[0]
    assert agent_name1 == "seo_agent"
    assert payload1["event_type"] == "intent_created"
    assert payload1["status"] == "pending"

    # Check cart_created event (second) - this has the actual price
    agent_name2, payload2 = dummy.events[1]
    assert agent_name2 == "seo_agent"
    assert payload2["event_type"] == "cart_created"
    assert payload2["status"] in ["pending", "approved"]
    assert payload2["cost"] == 35.0


# ============================================================================
# MISSING TEST GROUP 3: Multi-Agent Budget Tracking
# ============================================================================

@pytest.mark.asyncio
async def test_multi_agent_budget_tracking(monkeypatch):
    """Test that each agent maintains independent budget tracking."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)

    budgets = {
        "marketing_agent": AP2BudgetConfig(200, 100, 150),
        "deploy_agent": AP2BudgetConfig(150, 75, 100),
    }
    service = AP2Service(budgets=budgets)

    # Marketing uses 100
    result1 = await service.request_purchase(
        agent_name="marketing_agent",
        user_id="multi_user",
        service_name="ads",
        price=100.0,
        categories=["ads"],
    )
    assert result1["status"] in ["pending", "approved"]

    # Deploy uses 75 (independent budget)
    result2 = await service.request_purchase(
        agent_name="deploy_agent",
        user_id="multi_user",
        service_name="hosting",
        price=75.0,
        categories=["deploy"],
    )
    assert result2["status"] in ["pending", "approved"]

    # Marketing can still use remaining 100
    result3 = await service.request_purchase(
        agent_name="marketing_agent",
        user_id="multi_user",
        service_name="followup_ads",
        price=50.0,
        categories=["ads"],
    )
    assert result3["status"] in ["pending", "approved"]


# ============================================================================
# MISSING TEST GROUP 4: Budget Registry and Initialization
# ============================================================================

@pytest.mark.asyncio
async def test_budget_registry_initialization(monkeypatch):
    """Test that budget registry is properly initialized with default budgets."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    # Check that monitor was called with budgets
    assert dummy.budgets is not None
    assert "marketing_agent" in dummy.budgets
    assert "deploy_agent" in dummy.budgets
    assert "content_agent" in dummy.budgets


@pytest.mark.asyncio
async def test_budget_registry_custom_initialization(monkeypatch):
    """Test that custom budgets override defaults."""
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)

    custom_budgets = {
        "test_agent": AP2BudgetConfig(1000, 500, 800),
    }
    service = AP2Service(budgets=custom_budgets)

    # Verify custom budget is set
    assert service.budgets["test_agent"].monthly_limit == 1000


# ============================================================================
# MISSING TEST GROUP 5: Error Handling and Validation
# ============================================================================

@pytest.mark.asyncio
async def test_request_purchase_error_handling(monkeypatch):
    """Test that request_purchase properly handles connector errors."""
    dummy = DummyMonitor()

    class ErrorConnector:
        async def create_intent_mandate(self, *args, **kwargs):
            raise RuntimeError("Connector error")

    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service(connector=ErrorConnector())

    with pytest.raises(RuntimeError):
        await service.safe_request_purchase(
            agent_name="marketing_agent",
            user_id="error_user",
            service_name="test",
            price=10.0,
        )


@pytest.mark.asyncio
async def test_concurrent_purchase_requests(monkeypatch):
    """Test that concurrent purchases from different agents work correctly."""
    import asyncio
    dummy = DummyMonitor()
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    # Create concurrent purchase requests
    tasks = [
        service.request_purchase(
            agent_name="marketing_agent",
            user_id="concurrent_user",
            service_name=f"ads_{i}",
            price=10.0 + i,
            categories=["ads"],
        )
        for i in range(3)
    ]

    results = await asyncio.gather(*tasks)
    assert len(results) == 3
    assert all(r["status"] in ["pending", "approved"] for r in results)


@pytest.mark.asyncio
async def test_request_purchase_blocked_when_globally_disabled(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setenv("AP2_DISABLE_ALL", "true")
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    with pytest.raises(RuntimeError):
        await service.request_purchase(
            agent_name="marketing_agent",
            user_id="global_user",
            service_name="global_ads",
            price=10.0,
        )


@pytest.mark.asyncio
async def test_request_purchase_blocked_for_specific_agent_flag(monkeypatch):
    dummy = DummyMonitor()
    monkeypatch.setenv("ENABLE_AP2_ANALYST_AGENT", "false")
    monkeypatch.setattr("infrastructure.ap2_service.get_monitor", lambda: dummy)
    service = AP2Service()

    with pytest.raises(RuntimeError):
        await service.request_purchase(
            agent_name="analyst_agent",
            user_id="analyst_user",
            service_name="insights_tool",
            price=15.0,
        )
