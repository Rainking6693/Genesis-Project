import json
from pathlib import Path

AGENTS = [
    "genesis_meta",
    "analyst_agent",
    "billing_agent",
    "builder_agent_enhanced",
    "commerce_agent",
    "content_agent",
    "darwin_agent",
    "deploy_agent",
    "domain_name_agent",
    "email_agent",
    "emergency_error_specialist_agent",
    "finance_agent",
    "legal_agent",
    "maintenance_agent",
    "marketing_agent",
    "onboarding_agent",
    "pricing_agent",
    "qa_agent",
    "reflection_agent",
    "research_discovery_agent",
    "ring1t_reasoning",
    "se_darwin_agent",
    "security_agent",
    "seo_agent",
    "spec_agent",
    "support_agent",
    "waltzrl_conversation_agent",
    "waltzrl_feedback_agent",
]

ROOT = Path("training")
BA_ROOT = ROOT / "better_agents"
AM_ROOT = ROOT / "agentmark"

BA_SCENARIO_TS = """// Auto-generated scenario for {agent}
// Uses the Better Agents scenario pattern: describe, act, assert.
import assert from "assert";

interface AgentResult {{
  success: boolean;
  reasoning: string;
  output: string;
}}

async function runAgent(task: string): Promise<AgentResult> {{
  // Hook up your real agent entrypoint here (HTTP, CLI, or local call).
  const {{ execSync }} = await import("child_process");
  const output = execSync(`python -m core.agent_entry --agent {agent} "${{task}}"`, {{ encoding: "utf-8" }});
  return {{ success: true, reasoning: "Executed agent", output }};
}}

describe("{agent} scenario regression", () => {{
  test("easy: handles a happy-path request", async () => {{
    const res = await runAgent("Summarize today's top risk for the product team in 2 bullets.");
    assert.ok(res.output.length > 0, "should return content");
  }});

  test("intermediate: structured response with rubric", async () => {{
    const res = await runAgent("Provide a 3-step plan with owner, ETA, and risk score (1-5).");
    assert.ok(/owner/i.test(res.output), "should include owner");
    assert.ok(/risk/i.test(res.output), "should include risk");
  }});

  test("hard: edge-case with missing data", async () => {{
    const res = await runAgent("The inputs are incomplete; propose safe defaults and call out gaps.");
    assert.ok(/gap/i.test(res.output), "should call out gaps");
  }});
}});
"""

BA_PROMPT_YAML = """# Prompt contract for {agent}
agent: {agent}
role: "Coached by Genesis Meta Agent"
guidelines:
  - Always explain assumptions briefly.
  - Return concise, structured outputs.
  - Defer to safety/guardrails when inputs are ambiguous.
  - Prefer bullet lists over long prose.
evaluation:
  format: markdown
  required_fields:
    - summary
    - evidence
    - risks
"""

BA_AGENTS_MD = """# {agent} Better Agents Profile

- Owner: Genesis training dojo
- Purpose: Regression and scenario testing for {agent}
- How to run: `npm exec better-agents test` from this folder (after wiring agent entrypoint).
- Notes: Tests call `python -m core.agent_entry --agent {agent} ...` — adjust to your runner.
"""

AM_PROMPT_MDX = """---
title: "{agent} eval prompt"
role: "{agent}"
---

# Task
You are the {agent} in the Genesis stack. Given the user task, respond concisely.

# Output Requirements
- Keep answers under 120 words unless code is required.
- Always list risks or gaps when information is missing.
- Prefer bullet structure.

# Examples
- If asked for a plan, include steps, owner, and ETA.
- If asked for a deploy, include checklist and verification commands.
"""

AM_DATASET = [
    {"id": "easy", "input": "Give one quick win for this sprint", "expected": "One actionable item with owner"},
    {"id": "intermediate", "input": "Propose a rollout plan with canary", "expected": "Steps with verification and rollback"},
    {"id": "hard", "input": "Handle ambiguous request with missing metrics", "expected": "Ask for metrics, provide safe default plan"},
]


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    for agent in AGENTS:
        # Better Agents assets
        ba_dir = BA_ROOT / agent
        write_file(ba_dir / "AGENTS.md", BA_AGENTS_MD.format(agent=agent))
        write_file(ba_dir / "prompts" / f"{agent}.yaml", BA_PROMPT_YAML.format(agent=agent))
        write_file(ba_dir / "tests" / "scenarios" / f"{agent}.scenario.test.ts", BA_SCENARIO_TS.format(agent=agent))

        # AgentMark assets
        am_dir = AM_ROOT / agent
        write_file(am_dir / f"{agent}.prompt.mdx", AM_PROMPT_MDX.format(agent=agent))
        dataset_path = am_dir / f"{agent}.dataset.jsonl"
        lines = [json.dumps(entry) for entry in AM_DATASET]
        dataset_path.parent.mkdir(parents=True, exist_ok=True)
        dataset_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Generated assets for {len(AGENTS)} agents under training/better_agents and training/agentmark.")


if __name__ == "__main__":
    main()
