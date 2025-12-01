// Auto-generated scenario for pricing_agent
// Uses the Better Agents scenario pattern: describe, act, assert.
import assert from "assert";

interface AgentResult {
  success: boolean;
  reasoning: string;
  output: string;
}

async function runAgent(task: string): Promise<AgentResult> {
  // Hook up your real agent entrypoint here (HTTP, CLI, or local call).
  const { execSync } = await import("child_process");
  const output = execSync(`python -m core.agent_entry --agent pricing_agent "${task}"`, { encoding: "utf-8" });
  return { success: true, reasoning: "Executed agent", output };
}

describe("pricing_agent scenario regression", () => {
  test("easy: handles a happy-path request", async () => {
    const res = await runAgent("Summarize today's top risk for the product team in 2 bullets.");
    assert.ok(res.output.length > 0, "should return content");
  });

  test("intermediate: structured response with rubric", async () => {
    const res = await runAgent("Provide a 3-step plan with owner, ETA, and risk score (1-5).");
    assert.ok(/owner/i.test(res.output), "should include owner");
    assert.ok(/risk/i.test(res.output), "should include risk");
  });

  test("hard: edge-case with missing data", async () => {
    const res = await runAgent("The inputs are incomplete; propose safe defaults and call out gaps.");
    assert.ok(/gap/i.test(res.output), "should call out gaps");
  });
});
