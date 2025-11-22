from datetime import datetime, timedelta

import pytest

from infrastructure.ap2_batch_approval import AP2BatchApprovalManager
from infrastructure.ap2_service import AP2BudgetConfig


def make_manager(limit: float = 1000.0):
    budgets = {"marketing_agent": AP2BudgetConfig(limit, 100.0, 200.0)}
    return AP2BatchApprovalManager(budgets=budgets)


def test_create_monthly_mandates_generates_records():
    manager = make_manager()
    mandates = manager.create_monthly_mandates("userA")
    assert "marketing_agent" in mandates
    assert mandates["marketing_agent"].remaining == mandates["marketing_agent"].budget


def test_auto_approval_within_budget():
    manager = make_manager(limit=500.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 50.0)
    assert decision.auto_approved is True
    assert decision.manual_required is False


def test_manual_when_exceeds_remaining():
    manager = make_manager(limit=60.0)
    manager.record_purchase("marketing_agent", "userA", 50.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 30.0)
    assert decision.blocked is True
    assert decision.reason == "monthly_budget_exhausted"


def test_exceptional_purchase_requires_manual():
    manager = make_manager(limit=5000.0)
    # default exception threshold is $1,000
    decision = manager.evaluate_purchase("marketing_agent", "userA", 1200.0)
    assert decision.manual_required is True
    assert decision.reason == "over_single_transaction_limit"


def test_warning_triggered_at_threshold():
    manager = make_manager(limit=100.0)
    manager.record_purchase("marketing_agent", "userA", 70.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 15.0)
    assert decision.warning_triggered is True


def test_block_when_budget_exhausted():
    manager = make_manager(limit=100.0)
    manager.record_purchase("marketing_agent", "userA", 100.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 10.0)
    assert decision.blocked is True


def test_monthly_reset_restores_remaining_budget():
    manager = make_manager(limit=200.0)
    manager.record_purchase("marketing_agent", "userA", 150.0)
    manager.reset_monthly_budgets()
    decision = manager.evaluate_purchase("marketing_agent", "userA", 100.0)
    assert decision.auto_approved is True


def test_cumulative_tracking_updates_remaining():
    manager = make_manager(limit=100.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 40.0)
    manager.record_purchase("marketing_agent", "userA", 40.0)
    assert decision.auto_approved is True
    follow_up = manager.evaluate_purchase("marketing_agent", "userA", 30.0)
    assert follow_up.remaining_budget == pytest.approx(60.0)


def test_unusual_spending_pattern_triggers_manual():
    manager = make_manager(limit=1000.0)
    for _ in range(2):
        manager.record_purchase("marketing_agent", "userA", 250.0)
    decision = manager.evaluate_purchase("marketing_agent", "userA", 260.0)
    assert decision.manual_required is True
    assert decision.reason == "unusual_spending_pattern"


def test_batch_handles_long_purchase_sequences_without_extra_prompts():
    manager = make_manager(limit=2000.0)
    auto_count = 0
    for _ in range(30):
        decision = manager.evaluate_purchase("marketing_agent", "userA", 20.0)
        assert decision.blocked is False
        if decision.auto_approved:
            auto_count += 1
        manager.record_purchase("marketing_agent", "userA", 20.0)
    assert auto_count >= 1

