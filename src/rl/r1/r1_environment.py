# src/rl/r1/r1_environment.py

from typing import Dict, Any

try:
    from openhands import OpenHandsClient  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    OpenHandsClient = None  # type: ignore


class R1GenesisEnvironment:
    """
    Wraps OpenHands as the execution backend for RL tasks.
    Genesis generates scenarios and rubrics; Dev/QA agents attempt tasks; OpenHands executes them.
    """

    def __init__(self, openhands: "OpenHandsClient"):
        self.oph = openhands

    def run_task(self, agent_instructions: str) -> Dict[str, Any]:
        """
        Execute the agent's output (code, commands) using OpenHands.
        Returns: execution logs, pass/fail, test results, errors.
        """
        # Accept either an OpenHandsClient (execute) or a simple fake (run_task).
        if hasattr(self.oph, "execute"):
            result = self.oph.execute(agent_instructions)
        elif hasattr(self.oph, "run_task"):
            result = self.oph.run_task(repo_path="", instruction=agent_instructions)
        else:  # pragma: no cover - defensive fallback
            return {"output": None, "errors": ["OpenHands not available"], "tests_passed": 0, "runtime_ms": None}
        return {
            "output": getattr(result, "output", None),
            "errors": getattr(result, "errors", None),
            "tests_passed": getattr(result, "tests_passed", 0),
            "runtime_ms": getattr(result, "runtime_ms", None),
        }
