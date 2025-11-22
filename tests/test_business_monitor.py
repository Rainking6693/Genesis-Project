import json
from pathlib import Path

import pytest

import infrastructure.business_monitor as bm
from infrastructure.business_monitor import BusinessMonitor
from infrastructure.ap2_service import AP2BudgetConfig


def test_record_rubric_report_updates_stats(tmp_path, monkeypatch):
    monkeypatch.setattr(bm, "PROMETHEUS_AVAILABLE", False)
    monitor = BusinessMonitor(log_dir=tmp_path, prometheus_port=9001)

    report = {
        "overall_score": 0.55,
        "coverage_ratio": 0.4,
        "total_weight": 3.0,
        "task_reports": {"foo": {"criteria": []}},
    }
    monitor.record_rubric_report("Acme", "saas", report)

    dashboard = monitor.get_dashboard_data()
    assert dashboard["global_stats"]["rubric_audits"] == 1
    assert dashboard["global_stats"]["rubric_alerts"] == 1
    assert dashboard["rubric_reports"][0]["status"] == "alert"

    events_file = tmp_path / "events.jsonl"
    assert events_file.exists()
    with events_file.open() as fh:
        events = [json.loads(line) for line in fh if line.strip()]
    assert any(event["event_type"] == "rubric_report" for event in events)


def test_record_hallucination_event_tracks_rate(tmp_path, monkeypatch):
    monkeypatch.setattr(bm, "PROMETHEUS_AVAILABLE", False)
    monitor = BusinessMonitor(log_dir=tmp_path, prometheus_port=9002)

    monitor.record_hallucination_event(
        agent_name="analyst_agent",
        result={"reward": 1.0, "coverage": 0.42, "status": "supported", "supporting_docs": []},
    )
    monitor.record_hallucination_event(
        agent_name="analyst_agent",
        result={"reward": 0.0, "coverage": 0.1, "status": "unsupported", "supporting_docs": []},
    )

    stats = monitor.get_global_stats()
    assert stats["hallucination_checks"] == 2
    assert stats["hallucination_failures"] == 1
    assert pytest.approx(stats["hallucination_rate"]) == 0.5


def test_record_policy_audit_logs_event(tmp_path, monkeypatch):
    monkeypatch.setattr(bm, "PROMETHEUS_AVAILABLE", False)
    monitor = BusinessMonitor(log_dir=tmp_path, prometheus_port=9003)

    monitor.record_policy_audit(
        agent_name="qa_agent",
        verdict={"status": "violation", "violations": ["Missing test steps"]},
    )

    stats = monitor.get_global_stats()
    assert stats["policy_audits"] == 1
    assert stats["policy_alerts"] == 1
    assert monitor.policy_events


def test_record_ap2_event_updates_stats(tmp_path, monkeypatch):
    monkeypatch.setattr(bm, "PROMETHEUS_AVAILABLE", False)
    monitor = BusinessMonitor(log_dir=tmp_path, prometheus_port=9004)

    monitor.record_ap2_event(
        agent_name="marketing_agent",
        payload={"event_type": "cart_created", "status": "pending", "cost": 120.0, "extra": {}},
    )

    stats = monitor.get_global_stats()
    assert stats["ap2_events"] == 1
    assert stats["ap2_spend"] == pytest.approx(120.0)
    assert stats["ap2_failures"] == 1
    assert monitor.ap2_events


def test_register_ap2_budgets_updates_dashboard(tmp_path, monkeypatch):
    monkeypatch.setattr(bm, "PROMETHEUS_AVAILABLE", False)
    monitor = BusinessMonitor(log_dir=tmp_path, prometheus_port=9005)

    config = {"marketing_agent": AP2BudgetConfig(1000.0, 200.0, 500.0)}
    monitor.register_ap2_budgets(config)

    dashboard = monitor.get_dashboard_data()
    assert "marketing_agent" in dashboard["ap2_budgets"]
    assert dashboard["ap2_budgets"]["marketing_agent"]["monthly_limit"] == 1000.0
