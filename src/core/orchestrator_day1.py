# src/core/orchestrator_day1.py
from typing import Any, Dict

import yaml

from integrations.acontext_client import AcontextClient
from core.genesis_meta import GenesisMetaAgent
from rl.r1.r1_reward_functions import compute_total_reward
from rl.policy_update import PolicyUpdater
from langgraph_flows.day1_genesis_bootcamp_graph import build_day1_graph
from rl.r1.r1_environment import R1GenesisEnvironment


class Day1GenesisBootcamp:
    def __init__(
        self,
        genesis: GenesisMetaAgent,
        acontext: AcontextClient,
        rl_config: Dict[str, Any],
        openhands_client: Any = None,
    ):
        self.genesis = genesis
        self.acontext = acontext
        self.rl_config = rl_config
        self.policy_updater = PolicyUpdater(
            acontext=self.acontext,
            genesis=self.genesis,
            space="Genesis-Training",
            prompt_block_path="/prompts/genesis/",
        )
        self.oph_env = R1GenesisEnvironment(openhands_client) if openhands_client else None

    def run_basic_training(self) -> Dict[str, Any]:
        """
        1) Genesis designs scenarios and stores them in Acontext.
        2) Genesis evaluates a set of bad/good artifacts and writes evaluation patterns.
        Return summary metrics to be used as RL feedback.
        """
        scenarios = []
        if hasattr(self.genesis, "design_training_scenarios"):
            try:
                scenarios = self.genesis.design_training_scenarios()
            except Exception:
                scenarios = []

        # Generate candidate artifacts via the agent/LLM (good + bad variants)
        artifacts = []
        try:
            prompt_good = "Create a high-quality artifact for the provided scenario."
            prompt_bad = "Create a poor-quality artifact for the provided scenario."
            for scenario in scenarios or ["generic_scenario"]:
                artifacts.append(self._llm_generate_artifact(prompt_good, scenario))
                artifacts.append(self._llm_generate_artifact(prompt_bad, scenario))
        except Exception:
            artifacts = ["fallback_good_artifact", "fallback_bad_artifact"]

        # Evaluate artifacts with the Genesis agent (relies on its LLM stack)
        metrics = {}
        if hasattr(self.genesis, "evaluate_artifacts"):
            eval_result = self.genesis.evaluate_artifacts(artifacts)
            if isinstance(eval_result, dict):
                metrics = eval_result
            elif isinstance(eval_result, list):
                # Average list of metric dicts if returned
                agg: Dict[str, float] = {}
                for res in eval_result:
                    for k, v in res.items():
                        agg[k] = agg.get(k, 0.0) + float(v)
                metrics = {k: v / len(eval_result) for k, v in agg.items()}

        # Persist the training batch to Acontext for traceability
        try:
            self.acontext.create_block(
                space="Genesis-Training",
                path="/day1/training_batch.json",
                content=str({"scenarios": scenarios, "artifacts": artifacts, "metrics": metrics}),
                metadata={"type": "day1_training_batch"},
            )
        except Exception:
            pass

        # Ensure required keys exist for downstream reward computation
        defaults = {
            "correctness_score": 0.0,
            "rubric_coverage_score": 0.0,
            "clarity_score": 0.0,
            "structure_score": 0.0,
            "stability_score": 0.0,
            "efficiency_score": 0.0,
            "oph_result": {},
        }
        defaults.update(metrics or {})
        return defaults

    def run_r1_training(self, base_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Wrap Genesis in an R1 environment and perform a number of RL episodes
        to refine its behavior. Use r1_reward_functions to compute reward.
        """
        weights = self.rl_config["r1"]["reward_weights"]
        base_reward = compute_total_reward(base_metrics, weights)

        insight_prompt = (
            "You are reviewing Genesis evaluation metrics. "
            "Provide two concise RL insights to improve rubric alignment and stability.\n"
            f"Metrics: {base_metrics}"
        )
        insights = self._llm_insights(insight_prompt)

        rl_summary = {
            "base_reward": base_reward,
            "insights": insights,
        }
        return rl_summary

    def run_r1_training_with_oph(self, base_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Same as run_r1_training but includes OpenHands execution signals.
        """
        metrics = dict(base_metrics)
        oph_result = {}
        if self.oph_env:
            scenario_text = (metrics.get("scenario") or "Improve rubric clarity and scoring stability.")
            oph_result = self.oph_env.run_task(agent_instructions=scenario_text)
            metrics["oph_result"] = oph_result

        weights = self.rl_config["r1"]["reward_weights"]
        base_reward = compute_total_reward(metrics, weights)
        insights = self._llm_insights(
            "Given the evaluation metrics and execution signals, provide two improvements for Genesis:\n"
            f"Metrics: {metrics}\nOpenHands: {oph_result}"
        )
        rl_summary = {
            "base_reward": base_reward,
            "oph_result": oph_result,
            "insights": insights,
        }
        return rl_summary

    def run_lightning_training(self) -> Dict[str, Any]:
        """
        Use Agent-Lightning to optimize Genesis's system prompt for stability,
        rubric alignment, and feedback quality.
        """
        prompt = (
            "Optimize Genesis prompt for stability, rubric alignment, and concise feedback. "
            "Return two short improvement bullets."
        )
        insights = self._llm_insights(prompt)
        return {"insights": insights}

    def run_lightning_training_with_oph(self) -> Dict[str, Any]:
        """
        Lightning prompt optimization using OpenHands execution feedback.
        """
        oph_result = {}
        if self.oph_env:
            oph_result = self.oph_env.run_task(agent_instructions="Optimize Genesis prompt for stability and clarity.")
        prompt = (
            "Use execution feedback to refine Genesis system prompt. "
            "Provide two concise improvements tied to rubric alignment and error reduction."
        )
        insights = self._llm_insights(prompt)
        return {"oph_result": oph_result, "insights": insights}

    def run_full_day(self, iterations: int = 3) -> None:
        """
        Orchestrate the full Day 1 meta-agent bootcamp via LangGraph:
          - basic training
          - R1 refinement
          - Lightning prompt optimization
          - final policy update
        """
        graph = build_day1_graph(self)

        for i in range(iterations):
            initial_state = {"iteration": i}
            _final_state = graph.run(initial_state)

    # --------- Internal helpers ----------
    def _llm_insights(self, prompt: str) -> list[str]:
        client = getattr(self.genesis, "llm_client", None)
        if not client:
            return ["Add explicit numeric scoring across evaluations.", "Tighten rubric alignment and structure."]
        try:
            if hasattr(client, "chat"):
                res = client.chat([{"role": "user", "content": prompt}])
                text = getattr(res, "content", res)
            elif hasattr(client, "complete"):
                text = client.complete(prompt)
            elif hasattr(client, "generate"):
                text = client.generate(prompt)
            else:
                text = ""
            if isinstance(text, list):
                text = " ".join(str(t) for t in text)
            lines = [ln.strip("- ").strip() for ln in str(text).split("\n") if ln.strip()]
            return lines[:2] if lines else ["Clarify scoring instructions.", "Reduce verbosity while keeping rubric ties."]
        except Exception:
            return ["Clarify scoring instructions.", "Reduce verbosity while keeping rubric ties."]

    def _llm_generate_artifact(self, base_prompt: str, scenario: str) -> str:
        client = getattr(self.genesis, "llm_client", None)
        prompt = f"{base_prompt}\nScenario: {scenario}"
        if not client:
            return f"{scenario}-artifact"
        try:
            if hasattr(client, "complete"):
                return str(client.complete(prompt))
            if hasattr(client, "generate"):
                return str(client.generate(prompt))
            if hasattr(client, "chat"):
                res = client.chat([{"role": "user", "content": prompt}])
                return str(getattr(res, "content", res))
        except Exception:
            return f"{scenario}-artifact"
        return f"{scenario}-artifact"


def load_rl_config(path: str = "config/rl_day1.yaml") -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


if __name__ == "__main__":
    # Minimal runnable entry point (requires valid AcontextClient and GenesisMetaAgent wiring)
    config = load_rl_config()
    acontext = AcontextClient()
    genesis = GenesisMetaAgent()
    bootcamp = Day1GenesisBootcamp(genesis=genesis, acontext=acontext, rl_config=config)
    bootcamp.run_full_day(iterations=1)
