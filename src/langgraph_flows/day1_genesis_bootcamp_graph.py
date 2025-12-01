import asyncio

from langgraph.graph import StateGraph, END


class _GraphRunner:
    """Simple wrapper to provide .run() API on top of the compiled graph."""

    def __init__(self, compiled):
        self._compiled = compiled

    def run(self, initial_state):
        return self._compiled.invoke(initial_state)


def build_day1_graph(bootcamp: "Day1GenesisBootcamp"):

    # LangGraph requires a state schema; use a plain dict for our simple state.
    graph = StateGraph(dict)

    def design_scenarios(state):
        state["metrics"] = bootcamp.run_basic_training()
        return state

    def rl_parallel(state):
        metrics = state["metrics"]
        # Keep execution synchronous to avoid event-loop issues during tests.
        state["r1_summary"] = bootcamp.run_r1_training_with_oph(metrics)
        state["lightning_summary"] = bootcamp.run_lightning_training_with_oph()
        return state

    def update_policy(state):
        bootcamp.policy_updater.update_genesis_prompt(
            rl_summary={
                "insights": state["r1_summary"].get("insights", [])
                + state["lightning_summary"].get("insights", [])
            },
            eval_patterns=[
                "Tie feedback directly to rubric criteria.",
                "Maintain consistent scoring ranges across similar artifacts.",
            ],
        )
        return state

    graph.add_node("design_scenarios", design_scenarios)
    graph.add_node("rl_parallel", rl_parallel)
    graph.add_node("update_policy", update_policy)

    graph.add_edge("design_scenarios", "rl_parallel")
    graph.add_edge("rl_parallel", "update_policy")
    graph.add_edge("update_policy", END)

    graph.set_entry_point("design_scenarios")

    compiled = graph.compile()
    return _GraphRunner(compiled)
