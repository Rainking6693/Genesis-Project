"""
Structural validation for the full 100-scenario website batch (Genesis + main agents).

This checks counts and shape; it does not execute the agents.
"""

import json
from pathlib import Path

import pytest


SCENARIO_PATH = Path("tests/agents/website_batch1_main_agents.json")


def test_batch_file_exists():
    assert SCENARIO_PATH.exists(), "Scenario batch file missing"


def _load():
    return json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))


def test_total_count():
    data = _load()
    assert len(data.get("scenarios", [])) == 100


@pytest.mark.parametrize("difficulty,count", [("easy", 25), ("intermediate", 25), ("hard", 25), ("harder", 25)])
def test_difficulty_counts(difficulty, count):
    data = _load()
    scenarios = data.get("scenarios", [])
    matches = [s for s in scenarios if s.get("difficulty") == difficulty]
    assert len(matches) == count


def test_each_scenario_has_agents_and_expectations():
    data = _load()
    for s in data.get("scenarios", []):
        assert "id" in s and "task" in s and "difficulty" in s
        agents = s.get("primary_agents")
        assert isinstance(agents, list) and len(agents) == 3
        expected = s.get("expected", {})
        assert "deliverables" in expected
        assert isinstance(expected.get("checks", []), list)
