import logging
from typing import Any, Dict, Optional

# LangGraph import can fail on platforms where langchain/pydantic versions clash.
# Fall back to light stubs so modules can import without blowing up.
try:  # pragma: no cover - exercised indirectly via se_darwin imports
    from langgraph.checkpoint.memory import MemorySaver
    from langgraph.graph import StateGraph
    _LANGGRAPH_AVAILABLE = True
except Exception as exc:  # pragma: no cover - defensive path
    _LANGGRAPH_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("LangGraph unavailable, using stubbed MemorySaver/StateGraph: %s", exc)

    class MemorySaver:  # type: ignore
        def __init__(self, *_, **__): ...

    class StateGraph:  # type: ignore
        def __init__(self, *_args, **_kwargs): ...
        def compile(self, *_, **__): return self
        async def ainvoke(self, state, config=None): return state

logger = logging.getLogger(__name__)


class LangGraphStore:
    """
    Thin convenience wrapper around LangGraph graph + in-memory checkpointing.
    This is intentionally minimal: agents can build state graphs and run them
    while benefiting from built-in checkpointing (or swap the saver).
    """

    def __init__(self, state_type: Any) -> None:
        self.state_type = state_type
        self._graph = StateGraph(state_type)
        self._saver = MemorySaver()
        self._compiled = None

    @property
    def graph(self) -> StateGraph:
        return self._graph

    @property
    def saver(self) -> MemorySaver:
        return self._saver

    def compile(self) -> Any:
        """Compile the graph with the current saver."""
        self._compiled = self._graph.compile(checkpointer=self._saver)
        return self._compiled

    async def run(self, initial_state: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> Any:
        """
        Execute the compiled graph. Call compile() first or let this lazily compile.
        """
        if self._compiled is None:
            self.compile()
        return await self._compiled.ainvoke(initial_state, config=config or {})


# Backwards-compatible aliases expected by SE-Darwin and other modules.
class GenesisLangGraphStore(LangGraphStore):
    """Alias for LangGraphStore to satisfy existing imports."""


def get_store(state_type: Any = dict) -> LangGraphStore:
    """
    Convenience factory for callers expecting get_store().
    Defaults to a dict-based state schema.
    """
    return LangGraphStore(state_type)
