import yaml

from core.orchestrator_day2 import Day2CoreAgentsBootcamp, load_rl_config
from core.genesis_meta import GenesisMetaAgent
from integrations.acontext_client import AcontextClient
from integrations.openhands_client import OpenHandsClient
from langgraph_flows.day2_core_agents_graph import build_day2_graph

try:
    from core.agents_registry import AgentRegistry  # type: ignore
except Exception:
    AgentRegistry = None  # type: ignore


if __name__ == "__main__":
    rl_config = load_rl_config()

    genesis = GenesisMetaAgent()
    acontext = AcontextClient()
    openhands = OpenHandsClient()
    agent_registry = AgentRegistry(acontext) if AgentRegistry else None

    bootcamp = Day2CoreAgentsBootcamp(
        genesis=genesis,
        acontext=acontext,
        openhands=openhands,
        agent_registry=agent_registry,
        rl_config=rl_config,
    )

    graph = build_day2_graph(bootcamp)

    iterations = 2
    for i in range(iterations):
        graph.run({"iteration": i})
