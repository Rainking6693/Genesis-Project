"""
Execute the 100 website-building scenarios for Genesis + main agents.

This runner:
- Loads tests/agents/website_batch1_main_agents.json
- For each scenario, invokes the requested agents via a simple Python entrypoint
  (assumes `python -m core.agent_entry --agent <name> "<task>"` is supported)
- Captures stdout/stderr and writes a summary JSON for inspection

Requirements:
- LLM keys already set in your environment (e.g., DEEPSEEK_API_KEY, GROQ_API_KEY)
- core.agent_entry should accept --agent and task text; adjust COMMAND_TEMPLATE if needed
"""

import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List

SCENARIO_PATH = Path("tests/agents/website_batch1_main_agents.json")
OUTPUT_PATH = Path("tests/agents/website_batch1_main_agents_results.json")

# Uses the new core.agent_entry module to run agents.
COMMAND_TEMPLATE = 'python -m core.agent_entry --agent {agent} "{task}"'


def run_command(cmd: str) -> Dict[str, Any]:
    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            check=False,
            capture_output=True,
            text=True,
        )
        return {
            "cmd": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }
    except Exception as exc:  # pragma: no cover
        return {"cmd": cmd, "error": str(exc)}


def main() -> None:
    data = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
    scenarios: List[Dict[str, Any]] = data.get("scenarios", [])
    results: List[Dict[str, Any]] = []

    for scenario in scenarios:
        scenario_id = scenario.get("id")
        task = scenario.get("task")
        agents = scenario.get("primary_agents", [])

        scenario_result = {"id": scenario_id, "task": task, "agents": []}
        for agent in agents:
            cmd = COMMAND_TEMPLATE.format(agent=agent, task=task)
            res = run_command(cmd)
            scenario_result["agents"].append({"agent": agent, **res})

        results.append(scenario_result)

    OUTPUT_PATH.write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
    print(f"Wrote results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
