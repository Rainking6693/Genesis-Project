import json
from pathlib import Path

import pytest

from infrastructure.auditor.continuous_auditor import ContinuousAuditor


class DummyMonitor:
    def __init__(self):
        self.records = []

    def record_policy_audit(self, agent_name, verdict):
        self.records.append((agent_name, verdict))


@pytest.fixture
def policy_file(tmp_path):
    path = tmp_path / "policies.json"
    path.write_text(
        json.dumps(
            {
                "default": {
                    "rules": [
                        {"type": "must_include", "token": "summary", "description": "Need summary"},
                        {"type": "must_not_contain", "token": "secret", "description": "No secrets"},
                    ]
                }
            }
        ),
        encoding="utf-8",
    )
    return path


def test_continuous_auditor_detects_violation(monkeypatch, policy_file):
    dummy = DummyMonitor()
    monkeypatch.setattr(
        "infrastructure.auditor.continuous_auditor.get_monitor", lambda: dummy
    )

    auditor = ContinuousAuditor(policy_path=policy_file)
    verdict = auditor.evaluate("qa_agent", "This contains secret data without summary")

    assert verdict["status"] == "violation"
    assert dummy.records


def test_continuous_auditor_passes_compliant_output(monkeypatch, policy_file):
    dummy = DummyMonitor()
    monkeypatch.setattr(
        "infrastructure.auditor.continuous_auditor.get_monitor", lambda: dummy
    )

    auditor = ContinuousAuditor(policy_path=policy_file)
    verdict = auditor.evaluate("support_agent", "summary provided with no forbidden tokens")

    assert verdict["status"] == "ok"
