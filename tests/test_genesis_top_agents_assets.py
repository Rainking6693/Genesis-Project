"""
Sanity checks focused on Genesis and the top production agents.

These tests avoid hitting external services and instead verify that
core training assets and agent modules are present and importable.
"""

from pathlib import Path
import importlib
import json

import pytest
import yaml


TOP_AGENTS = [
    "genesis_meta",
    "analyst_agent",
    "builder_agent_enhanced",
    "deploy_agent",
    "billing_agent",
    "emergency_error_specialist_agent",
    "marketing_agent",
    "support_agent",
    "onboarding_agent",
    "qa_agent",
    "se_darwin_agent",
    "seo_agent",
]

ASSET_ROOT = Path("training")


def test_genesis_meta_prompt_helpers():
    """GenesisMetaAgent should expose prompt getters/setters without side effects."""
    from infrastructure.genesis_meta_agent import GenesisMetaAgent

    agent = GenesisMetaAgent()
    base = agent.get_base_prompt()
    assert isinstance(base, str)
    # set and confirm override works
    new_prompt = base + "\n# test override"
    agent.set_active_prompt(new_prompt)
    assert new_prompt.endswith("test override")


@pytest.mark.parametrize("module_name", TOP_AGENTS[1:])  # skip genesis_meta which is tested above
def test_top_agent_modules_import(module_name):
    """Each top agent module should be importable without raising."""
    importlib.import_module(f"agents.{module_name}")


def test_training_assets_exist_for_all_agents():
    """Better Agents and AgentMark assets should exist for every top agent."""
    missing = []
    for agent in TOP_AGENTS:
        ba_files = [
            ASSET_ROOT / "better_agents" / agent / "AGENTS.md",
            ASSET_ROOT / "better_agents" / agent / "prompts" / f"{agent}.yaml",
            ASSET_ROOT / "better_agents" / agent / "tests" / "scenarios" / f"{agent}.scenario.test.ts",
        ]
        am_files = [
            ASSET_ROOT / "agentmark" / agent / f"{agent}.prompt.mdx",
            ASSET_ROOT / "agentmark" / agent / f"{agent}.dataset.jsonl",
        ]
        for path in ba_files + am_files:
            if not path.exists():
                missing.append(str(path))
    assert not missing, f"Missing training assets: {missing}"


def test_rl_day2_config_covers_top_agents():
    """rl_day2.yaml should list all top agents with reward profiles."""
    config_path = Path("config/rl_day2.yaml")
    assert config_path.exists()
    data = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    agents_cfg = data.get("agents", {})
    missing = [a for a in TOP_AGENTS if a not in agents_cfg]
    assert not missing, f"Agents missing in rl_day2.yaml: {missing}"


def test_dev_tasks_has_dev_roles():
    """dev_tasks.json should define work for key dev-focused agents."""
    path = Path("config/dev_tasks.json")
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    roles = {task["role"] for task in data.get("tasks", [])}
    needed = {"builder_agent_enhanced", "deploy_agent", "emergency_error_specialist_agent", "se_darwin_agent"}
    assert needed.issubset(roles), f"Dev tasks missing roles: {needed - roles}"
