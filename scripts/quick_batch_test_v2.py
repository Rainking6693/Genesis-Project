"""
Quick batch test v2 - test working agents only
"""

import json
import subprocess
from pathlib import Path

OUTPUT_PATH = Path("tests/agents/quick_batch_results_v2.json")
COMMAND_TEMPLATE = 'python -m core.agent_entry --agent {agent} --task "{task}"'

# Test these specific agents that we know work
TEST_CASES = [
    {"agent": "marketing_agent", "task": "Create a marketing strategy for a fitness app"},
    {"agent": "marketing_agent", "task": "Build a social media campaign for a SaaS product"},
    {"agent": "marketing_agent", "task": "Create landing page copy for a startup"},
]

def run_command(cmd: str) -> dict:
    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            check=False,
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "cmd": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout[-1000:] if len(proc.stdout) > 1000 else proc.stdout,
            "stderr": proc.stderr[-500:] if len(proc.stderr) > 500 else proc.stderr,
        }
    except subprocess.TimeoutExpired:
        return {"cmd": cmd, "error": "timeout after 120s"}
    except Exception as exc:
        return {"cmd": cmd, "error": str(exc)}

def main():
    results = []

    print(f"Running {len(TEST_CASES)} test cases...")

    for i, test in enumerate(TEST_CASES):
        agent = test["agent"]
        task = test["task"]

        print(f"\n[{i+1}/{len(TEST_CASES)}] Agent: {agent}")
        print(f"  Task: {task}")

        cmd = COMMAND_TEMPLATE.format(agent=agent, task=task)
        res = run_command(cmd)

        # Check for success - look for RoutingDecision in output
        stdout = res.get("stdout", "")
        is_success = res.get("returncode") == 0 and "Status: success" in stdout
        is_stub = "'status': 'stub'" in stdout
        has_real_result = "RoutingDecision" in stdout or "model=" in stdout

        print(f"      Success: {is_success}, Real Result: {has_real_result}, Stub: {is_stub}")

        # Extract the result line
        result_line = ""
        for line in stdout.split('\n'):
            if line.startswith("Result:"):
                result_line = line
                break

        results.append({
            "agent": agent,
            "task": task,
            "success": is_success,
            "has_real_result": has_real_result,
            "is_stub": is_stub,
            "result_line": result_line,
            **res
        })

    # Summary
    total = len(results)
    successful = sum(1 for r in results if r.get("success"))
    real_results = sum(1 for r in results if r.get("has_real_result"))
    stubs = sum(1 for r in results if r.get("is_stub"))

    print(f"\n{'='*60}")
    print(f"SUMMARY: {successful}/{total} succeeded")
    print(f"         {real_results}/{total} returned real LLM results")
    print(f"         {stubs}/{total} returned stub responses")
    print(f"{'='*60}")

    OUTPUT_PATH.write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
    print(f"\nResults saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
