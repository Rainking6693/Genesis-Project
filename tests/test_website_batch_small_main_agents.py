"""
Smoke test for the first batch of website-building scenarios.

For this small batch we only validate the scenario file structure and that
primary agents are present; we are not executing full agent flows here.
"""

import json
from pathlib import Path

import pytest


SCENARIO_PATH = Path("tests/agents/website_batch_small_main_agents.json")


def test_scenario_file_exists():
    assert SCENARIO_PATH.exists(), "Scenario batch file is missing"


def test_scenarios_are_well_formed():
    data = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios", [])
    assert len(scenarios) == 8
    for s in scenarios:
        assert "id" in s and "difficulty" in s and "task" in s
        assert isinstance(s.get("primary_agents"), list) and len(s["primary_agents"]) == 3
        expected = s.get("expected", {})
        assert "deliverables" in expected
        assert isinstance(expected.get("checks", []), list)


@pytest.mark.parametrize("difficulty,count", [("easy", 2), ("intermediate", 2), ("hard", 2), ("harder", 2)])
def test_each_difficulty_present(difficulty, count):
    data = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios", [])
    matches = [s for s in scenarios if s.get("difficulty") == difficulty]
    assert len(matches) == count
