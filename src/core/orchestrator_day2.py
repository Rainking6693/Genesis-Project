from typing import Dict, Any, List
import json
from pathlib import Path
import yaml

from integrations.acontext_client import AcontextClient
from integrations.openhands_client import OpenHandsClient
from core.genesis_meta import GenesisMetaAgent

# AgentRegistry is assumed to exist per blueprint; import guarded to avoid failures if absent.
try:
    from core.agents_registry import AgentRegistry  # type: ignore
except Exception:  # pragma: no cover
    AgentRegistry = None  # type: ignore

from rl.r1.r1_reward_functions import compute_total_reward
from rl.lightning.lightning_reward_functions import score_prompt_candidate


class Day2CoreAgentsBootcamp:
    def __init__(
        self,
        genesis: GenesisMetaAgent,
        acontext: AcontextClient,
        openhands: OpenHandsClient,
        agent_registry: Any,
        rl_config: Dict[str, Any],
    ):
        self.genesis = genesis
        self.acontext = acontext
        self.openhands = openhands
        self.agent_registry = agent_registry
        self.rl_config = rl_config
        self.space = rl_config["logging"]["acontext_space"]
        self.llm_client = getattr(genesis, "llm_client", None)

        # Load dev tasks curriculum
        dev_task_path = Path("config/dev_tasks.json")
        if dev_task_path.exists():
            with dev_task_path.open(encoding="utf-8") as f:
                self.dev_tasks = json.load(f).get("tasks", [])
        else:
            self.dev_tasks: List[Dict[str, Any]] = []

    # ---------- Single-agent drills ----------
    def run_single_agent_drills(self) -> Dict[str, Dict[str, Any]]:
        roles = [
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

        metrics_by_agent: Dict[str, Dict[str, Any]] = {}

        for role in roles:
            # Genesis designs training scenarios
            scenarios = getattr(self.genesis, "design_training_scenarios", lambda: [])()

            # Ask agent (via registry) to act; fall back to LLM synthesis
            artifacts = []
            agent = None
            if self.agent_registry and hasattr(self.agent_registry, "get_agent"):
                try:
                    agent = self.agent_registry.get_agent(role)
                except Exception:
                    agent = None
            if agent and hasattr(agent, "route_task"):
                try:
                    artifacts.append(agent.route_task({"scenario": scenarios}))
                except Exception:
                    artifacts = []
            if not artifacts:
                for scenario in scenarios or ["generic_scenario"]:
                    artifacts.append(self._llm_generate_artifact(role, scenario, quality="good"))
                    artifacts.append(self._llm_generate_artifact(role, scenario, quality="bad"))

            # Genesis evaluates
            eval_fn = getattr(self.genesis, "evaluate_artifacts", None)
            eval_metrics = eval_fn(artifacts) if callable(eval_fn) else {}
            if isinstance(eval_metrics, list):
                agg = {}
                for res in eval_metrics:
                    for k, v in res.items():
                        agg[k] = agg.get(k, 0.0) + float(v)
                eval_metrics = {k: v / len(eval_metrics) for k, v in agg.items()}

            metrics_by_agent[role] = eval_metrics

            path = self.rl_config["logging"]["single_agent_path"] + role + ".json"
            self.acontext.create_block(
                space=self.space,
                path=path,
                content=json.dumps({"metrics": eval_metrics, "scenarios": scenarios}, indent=2),
                metadata={"type": "single_agent_metrics", "role": role, "phase": "day2"},
            )

        return metrics_by_agent

    # ---------- Squad drills (multi-agent) ----------
    def run_squad_drills(self) -> Dict[str, Dict[str, Any]]:
        squads = {
            "growth_squad": [
                "analyst_agent",
                "marketing_agent",
                "seo_agent",
                "se_darwin_agent",
            ],
            "delivery_squad": [
                "builder_agent_enhanced",
                "deploy_agent",
                "emergency_error_specialist_agent",
                "qa_agent",
            ],
            "customer_squad": [
                "onboarding_agent",
                "support_agent",
                "billing_agent",
            ],
        }

        squad_metrics: Dict[str, Dict[str, Any]] = {}

        for squad_name, roles in squads.items():
            scenario = getattr(self.genesis, "design_training_scenarios", lambda: [])()
            metrics = self._llm_score(
                f"Assess coordination for squad {squad_name} with roles {roles}. Scenario: {scenario}"
            )
            squad_metrics[squad_name] = metrics

            path = self.rl_config["logging"]["squad_path"] + squad_name + ".json"
            self.acontext.create_block(
                space=self.space,
                path=path,
                content=json.dumps({"metrics": metrics, "roles": roles, "scenario": scenario}, indent=2),
                metadata={"type": "squad_metrics", "squad": squad_name, "phase": "day2"},
            )

        return squad_metrics

    # ---------- Dev / OpenHands drills ----------
    def run_dev_drills(self) -> Dict[str, Dict[str, Any]]:
        dev_roles = [
            "builder_agent_enhanced",
            "deploy_agent",
            "emergency_error_specialist_agent",
            "se_darwin_agent",
        ]

        dev_metrics: Dict[str, Dict[str, Any]] = {}

        for role in dev_roles:
            tasks = self.get_dev_tasks_for_role(role, max_tasks=2)
            repo_path = str(Path("burnoutbot").resolve())
            results = []
            for task in tasks:
                res = self.openhands.run_task(
                    repo_path=repo_path,
                    instruction=task.get("instruction", ""),
                )
                results.append({"task": task, "result": res})
            metrics = {
                "tasks_executed": len(results),
                "had_errors": any(r["result"].get("errors") for r in results),
            }
            dev_metrics[role] = metrics

            path = self.rl_config["logging"]["dev_path"] + role + ".json"
            self.acontext.create_block(
                space=self.space,
                path=path,
                content=json.dumps({"results": results, "metrics": metrics}, indent=2),
                metadata={"type": "dev_drill_result", "role": role, "phase": "day2"},
            )

        return dev_metrics

    # ---------- RL: R1 (reward + insights) ----------
    def run_r1_training_for_agents(
        self,
        metrics_by_agent: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        summaries: Dict[str, Dict[str, Any]] = {}

        for role, metrics in metrics_by_agent.items():
            agent_cfg = self.rl_config["agents"].get(role, {})
            if not agent_cfg.get("r1_enabled", False):
                continue

            profile_name = agent_cfg["reward_profile"]
            weights = self.rl_config["reward_profiles"][profile_name]

            reward = compute_total_reward(metrics, weights)

            insight_prompt = (
                f"Genesis evaluated {role} with metrics {metrics}. "
                "Provide two concise RL insights to improve rubric alignment and stability."
            )
            summaries[role] = {
                "reward": reward,
                "insights": self._llm_insights(insight_prompt),
            }

            path = f"/rl/day2/{role}/r1_summary.json"
            self.acontext.create_block(
                space=self.space,
                path=path,
                content=json.dumps(summaries[role], indent=2),
                metadata={"type": "r1_summary", "role": role, "day": 2},
            )

        return summaries

    # ---------- RL: Lightning (prompt optimization) ----------
    def run_lightning_prompt_optimization(
        self,
        metrics_by_agent: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        summaries: Dict[str, Dict[str, Any]] = {}

        for role, metrics in metrics_by_agent.items():
            agent_cfg = self.rl_config["agents"].get(role, {})
            if not agent_cfg.get("lightning_enabled", False):
                continue

            candidate_metrics = {
                "rubric_alignment": metrics.get("correctness_score", 0.0),
                "score_stability": metrics.get("stability_score", 0.0),
                "feedback_quality": metrics.get("clarity_score", 0.0),
                "brevity_without_loss": metrics.get("efficiency_score", 0.0),
            }

            score = score_prompt_candidate(candidate_metrics)

            insight_prompt = (
                f"Genesis evaluation for {role}: {candidate_metrics}. "
                "Suggest two prompt improvements to increase stability and rubric alignment."
            )

            summaries[role] = {
                "score": score,
                "insights": self._llm_insights(insight_prompt),
            }

            path = f"/rl/day2/{role}/lightning_summary.json"
            self.acontext.create_block(
                space=self.space,
                path=path,
                content=json.dumps(summaries[role], indent=2),
                metadata={"type": "lightning_summary", "role": role, "day": 2},
            )

        return summaries

    # ---------- Prompt updates for agents ----------
    def update_agent_prompts(
        self,
        r1_summaries: Dict[str, Dict[str, Any]],
        lightning_summaries: Dict[str, Dict[str, Any]],
    ):
        if not self.agent_registry:
            return

        for role in self.rl_config["agents"].keys():
            insights: List[str] = []
            if role in r1_summaries:
                insights += r1_summaries[role].get("insights", [])
            if role in lightning_summaries:
                insights += lightning_summaries[role].get("insights", [])

            if not insights:
                continue

            old_prompt = self.agent_registry.get_agent_prompt(role)
            improved_prompt = (
                (old_prompt or "").rstrip()
                + "\n\n### Day 2 RL Improvements\n"
                + "\n".join(f"- {ins}" for ins in insights)
            )

            self.agent_registry.update_agent_prompt(role, improved_prompt)

            self.acontext.create_block(
                space=self.space,
                path=f"/prompts/agents/day2/{role}.md",
                content=improved_prompt,
                metadata={"type": "agent_prompt", "role": role, "source": "rl_day2"},
            )

    def get_dev_tasks_for_role(self, role: str, max_tasks: int = 2) -> List[Dict[str, Any]]:
        tasks = [t for t in self.dev_tasks if t.get("role") == role]
        return tasks[:max_tasks]

    # ---------- Internal helpers ----------
    def _llm_insights(self, prompt: str) -> List[str]:
        client = self.llm_client
        if not client:
            return ["Clarify rubric instructions.", "Keep scores consistent across scenarios."]
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
            return lines[:2] if lines else ["Clarify rubric instructions.", "Keep scores consistent."]
        except Exception:
            return ["Clarify rubric instructions.", "Keep scores consistent."]

    def _llm_generate_artifact(self, role: str, scenario: str, quality: str = "good") -> str:
        prompt = (
            f"Role: {role}. Scenario: {scenario}. "
            f"Produce a {quality} quality artifact/output the agent would create."
        )
        client = self.llm_client
        if not client:
            return f"{role}-{quality}-artifact"
        try:
            if hasattr(client, "complete"):
                return str(client.complete(prompt))
            if hasattr(client, "generate"):
                return str(client.generate(prompt))
            if hasattr(client, "chat"):
                res = client.chat([{"role": "user", "content": prompt}])
                return str(getattr(res, "content", res))
        except Exception:
            return f"{role}-{quality}-artifact"
        return f"{role}-{quality}-artifact"

    def _llm_score(self, prompt: str) -> Dict[str, float]:
        client = self.llm_client
        text = ""
        if client:
            try:
                if hasattr(client, "complete"):
                    text = client.complete(prompt)
                elif hasattr(client, "generate"):
                    text = client.generate(prompt)
                elif hasattr(client, "chat"):
                    res = client.chat([{"role": "user", "content": prompt}])
                    text = getattr(res, "content", res)
            except Exception:
                text = ""
        if not text:
            return {"coordination_score": 0.7, "handoff_clarity": 0.7, "coverage": 0.7}
        # Very light parsing for numeric values
        scores = {}
        for key in ["coordination", "handoff", "coverage"]:
            for part in str(text).split():
                try:
                    val = float(part)
                    if 0 <= val <= 1:
                        scores[f"{key}_score" if key != "handoff" else "handoff_clarity"] = val
                        break
                except Exception:
                    continue
        return {
            "coordination_score": scores.get("coordination_score", 0.7),
            "handoff_clarity": scores.get("handoff_clarity", 0.7),
            "coverage": scores.get("coverage", 0.7),
        }


def load_rl_config(path: str = "config/rl_day2.yaml") -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)
