"""
Quick batch test - test first 3 scenarios from website_batch1_main_agents.json
"""

import json
import subprocess
from pathlib import Path

SCENARIO_PATH = Path("tests/agents/website_batch1_main_agents.json")
OUTPUT_PATH = Path("tests/agents/quick_batch_results.json")
COMMAND_TEMPLATE = 'python -m core.agent_entry --agent {agent} --task "{task}"'

def run_command(cmd: str) -> dict:
    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            check=False,
            capture_output=True,
            text=True,
            timeout=60
        )
        return {
            "cmd": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout[-500:] if len(proc.stdout) > 500 else proc.stdout,
            "stderr": proc.stderr[-500:] if len(proc.stderr) > 500 else proc.stderr,
        }
    except subprocess.TimeoutExpired:
        return {"cmd": cmd, "error": "timeout after 60s"}
    except Exception as exc:
        return {"cmd": cmd, "error": str(exc)}

def main():
    data = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios", [])[:3]  # First 3 scenarios only
    results = []

    print(f"Running {len(scenarios)} scenarios...")

    for i, scenario in enumerate(scenarios):
        scenario_id = scenario.get("id")
        task = scenario.get("task")
        agents = scenario.get("primary_agents", [])

        print(f"\n[{i+1}/{len(scenarios)}] Scenario: {scenario_id}")
        print(f"  Task: {task}")
        print(f"  Agents: {agents}")

        scenario_result = {"id": scenario_id, "task": task, "agents": []}
        for agent in agents[:1]:  # Test only first agent per scenario for speed
            print(f"    Testing agent: {agent}...")
            cmd = COMMAND_TEMPLATE.format(agent=agent, task=task)
            res = run_command(cmd)

            # Check for success
            is_success = res.get("returncode") == 0 and "status: success" in res.get("stdout", "").lower()
            is_stub = "'status': 'stub'" in res.get("stdout", "")

            print(f"      Success: {is_success}, Stub: {is_stub}")
            scenario_result["agents"].append({
                "agent": agent,
                "success": is_success,
                "is_stub": is_stub,
                **res
            })

        results.append(scenario_result)

    # Summary
    total_agents = sum(len(s["agents"]) for s in results)
    successful = sum(1 for s in results for a in s["agents"] if a.get("success"))
    stubs = sum(1 for s in results for a in s["agents"] if a.get("is_stub"))

    print(f"\n{'='*50}")
    print(f"SUMMARY: {successful}/{total_agents} agents succeeded")
    print(f"         {stubs} returned stub responses")
    print(f"{'='*50}")

    OUTPUT_PATH.write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
    print(f"\nResults saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
