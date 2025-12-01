from langgraph.graph import StateGraph, END


class _GraphRunner:
    """Simple wrapper to provide .run() API on top of the compiled graph."""

    def __init__(self, compiled):
        self._compiled = compiled

    def run(self, initial_state):
        return self._compiled.invoke(initial_state)


def build_day2_graph(bootcamp: "Day2CoreAgentsBootcamp"):
    g = StateGraph()

    @g.node
    def single_agent_drills(state):
        state["single_metrics"] = bootcamp.run_single_agent_drills()
        return state

    @g.node
    def squad_drills(state):
        state["squad_metrics"] = bootcamp.run_squad_drills()
        return state

    @g.node
    def dev_drills(state):
        state["dev_metrics"] = bootcamp.run_dev_drills()
        return state

    @g.node
    def r1_training(state):
        state["r1_summaries"] = bootcamp.run_r1_training_for_agents(
            state.get("single_metrics", {})
        )
        return state

    @g.node
    def lightning_training(state):
        state["lightning_summaries"] = bootcamp.run_lightning_prompt_optimization(
            state.get("single_metrics", {})
        )
        return state

    @g.node
    def update_prompts_and_summary(state):
        bootcamp.update_agent_prompts(
            state.get("r1_summaries", {}),
            state.get("lightning_summaries", {}),
        )
        # IMPLEMENT: write a Day 2 summary block if desired
        return state

    g.add_edge("single_agent_drills", "squad_drills")
    g.add_edge("squad_drills", "dev_drills")
    g.add_edge("dev_drills", "r1_training")
    g.add_edge("r1_training", "lightning_training")
    g.add_edge("lightning_training", "update_prompts_and_summary")
    g.add_edge("update_prompts_and_summary", END)

    g.set_entry_point("single_agent_drills")

    compiled = g.compile()
    return _GraphRunner(compiled)
