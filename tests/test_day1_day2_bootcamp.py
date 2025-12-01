import sys
from pathlib import Path
from typing import Dict, Any

import pytest

# Ensure repo root and src/ are on path
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
for p in (ROOT, SRC):
    if str(p) not in sys.path:
        sys.path.append(str(p))

from rl.r1.r1_reward_functions import compute_total_reward
from rl.lightning.lightning_reward_functions import score_prompt_candidate
from rl.policy_update import PolicyUpdater


# ---------- Fakes / Mocks ----------
class FakeAcontext:
    def __init__(self):
        self.blocks = []

    def create_block(self, space: str, path: str, content: str, metadata: Dict[str, Any]):
        self.blocks.append({"space": space, "path": path, "content": content, "metadata": metadata})
        return {"path": path}

    def upload_file(self, session_id, filename, content, metadata=None):
        self.blocks.append({"upload": True, "filename": filename, "content": content, "metadata": metadata})
        return {"filename": filename}


class FakeGenesis:
    def __init__(self):
        self._prompt = "BASE_PROMPT"

    def design_training_scenarios(self):
        return ["scenario1", "scenario2"]

    def evaluate_artifacts(self, artifacts):
        return {
            "correctness_score": 0.8,
            "rubric_coverage_score": 0.75,
            "clarity_score": 0.8,
            "structure_score": 0.75,
            "stability_score": 0.7,
            "efficiency_score": 0.6,
        }

    def get_base_prompt(self):
        return self._prompt

    def set_active_prompt(self, prompt: str):
        self._prompt = prompt


class FakeOpenHands:
    def run_task(self, repo_path: str, instruction: str):
        return {"tests_passed": 1, "tests_failed": 0, "errors": []}


class FakeAgentRegistry:
    def __init__(self):
        self.prompts = {}

    def get_agent_prompt(self, role: str) -> str:
        return self.prompts.get(role, "PROMPT_" + role)

    def update_agent_prompt(self, role: str, new_prompt: str) -> None:
        self.prompts[role] = new_prompt


# ---------- Tests ----------
def test_configs_load():
    import yaml
    cfg1 = yaml.safe_load((ROOT / "config" / "rl_day1.yaml").read_text(encoding="utf-8"))
    cfg2 = yaml.safe_load((ROOT / "config" / "rl_day2.yaml").read_text(encoding="utf-8"))
    assert "r1" in cfg1 and "lightning" in cfg1
    assert "agents" in cfg2 and "reward_profiles" in cfg2


def test_reward_functions_include_oph():
    metrics = {
        "correctness_score": 0.9,
        "clarity_score": 0.5,
        "structure_score": 0.5,
        "stability_score": 0.5,
        "efficiency_score": 0.5,
        "oph_result": {"tests_passed": 1, "errors": [], "runtime_ms": 5000},
    }
    weights = {
        "correctness": 1.0,
        "clarity": 0.5,
        "structure": 0.5,
        "stability": 0.5,
        "efficiency": 0.5,
        "execution_success": 1.0,
        "runtime_efficiency": 1.0,
        "error_free": 1.0,
    }
    reward = compute_total_reward(metrics, weights)
    # Should be > 1 because multiple components add up
    assert reward > 1.0


def test_lightning_score():
    metrics = {
        "rubric_alignment": 0.8,
        "score_stability": 0.9,
        "feedback_quality": 0.7,
        "brevity_without_loss": 0.6,
    }
    score = score_prompt_candidate(metrics)
    assert 0 < score < 4  # upper bound based on weights


def test_policy_updater_updates_prompt_and_logs():
    acontext = FakeAcontext()
    genesis = FakeGenesis()
    updater = PolicyUpdater(acontext=acontext, genesis=genesis)
    new_prompt = updater.update_genesis_prompt(
        rl_summary={"insights": ["insight1", "insight2"]},
        eval_patterns=["pattern1", "pattern2"],
    )
    assert "insight1" in new_prompt
    assert any("/prompts/genesis/day1_rl_optimized.md" in b["path"] for b in acontext.blocks)
    assert genesis.get_base_prompt() == new_prompt


def test_day1_graph_runs_with_stubs():
    try:
        from core.orchestrator_day1 import Day1GenesisBootcamp, load_rl_config as load_day1_cfg
        from langgraph_flows.day1_genesis_bootcamp_graph import build_day1_graph
    except Exception:
        pytest.skip("LangGraph or Day1 orchestrator import failed.")

    genesis = FakeGenesis()
    acontext = FakeAcontext()
    bootcamp = Day1GenesisBootcamp(genesis=genesis, acontext=acontext, rl_config=load_day1_cfg(), openhands_client=FakeOpenHands())
    graph = build_day1_graph(bootcamp)
    graph.run({"iteration": 0})
    assert any("prompts/genesis" in b.get("path", "") for b in acontext.blocks)


def test_day2_drills_and_rl_summaries():
    try:
        from core.orchestrator_day2 import Day2CoreAgentsBootcamp, load_rl_config as load_day2_cfg
    except Exception:
        pytest.skip("Day2 orchestrator import failed.")

    genesis = FakeGenesis()
    acontext = FakeAcontext()
    openhands = FakeOpenHands()
    agent_registry = FakeAgentRegistry()
    bootcamp = Day2CoreAgentsBootcamp(
        genesis=genesis,
        acontext=acontext,
        openhands=openhands,
        agent_registry=agent_registry,
        rl_config=load_day2_cfg(),
    )

    single_metrics = bootcamp.run_single_agent_drills()
    assert "analyst_agent" in single_metrics

    dev_metrics = bootcamp.run_dev_drills()
    assert "builder_agent_enhanced" in dev_metrics

    r1_summaries = bootcamp.run_r1_training_for_agents(single_metrics)
    lightning_summaries = bootcamp.run_lightning_prompt_optimization(single_metrics)
    bootcamp.update_agent_prompts(r1_summaries, lightning_summaries)

    assert agent_registry.prompts, "Agent prompts should be updated"
    assert acontext.blocks, "Acontext logging should occur"


def test_day2_graph_runs_with_stubs():
    try:
        from core.orchestrator_day2 import Day2CoreAgentsBootcamp, load_rl_config as load_day2_cfg
        from langgraph_flows.day2_core_agents_graph import build_day2_graph
    except Exception:
        pytest.skip("LangGraph or Day2 orchestrator import failed.")

    genesis = FakeGenesis()
    acontext = FakeAcontext()
    openhands = FakeOpenHands()
    agent_registry = FakeAgentRegistry()
    bootcamp = Day2CoreAgentsBootcamp(
        genesis=genesis,
        acontext=acontext,
        openhands=openhands,
        agent_registry=agent_registry,
        rl_config=load_day2_cfg(),
    )
    graph = build_day2_graph(bootcamp)
    graph.run({"iteration": 0})
    assert acontext.blocks, "Should have logged to Acontext during graph run"
