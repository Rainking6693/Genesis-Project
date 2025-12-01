import asyncio

import pytest

from infrastructure.langgraph_store import (
    LangGraphStore,
    GenesisLangGraphStore,
    get_store,
)


def test_aliases_resolve():
    store = get_store()
    assert isinstance(store, LangGraphStore)
    alias = GenesisLangGraphStore(dict)
    assert isinstance(alias, LangGraphStore)


@pytest.mark.asyncio
async def test_store_runs_simple_graph():
    store = get_store(dict)
    graph = store.graph

    def start(state):
        state["value"] = state.get("value", 0) + 1
        return state

    graph.add_node("start", start)
    graph.set_entry_point("start")
    graph.add_edge("start", "__end__")

    store.compile()
    result = await store._compiled.ainvoke(
        {"value": 1},
        config={"configurable": {"thread_id": "test-thread"}},
    )
    assert result["value"] == 2
