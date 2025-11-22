import pytest

from infrastructure.memory.memori_client import MemoriClient
from infrastructure.memory.memori_tool import MemoriMemoryToolset


def test_memori_toolset_scope_and_provenance(tmp_path):
    db_path = tmp_path / "memori.db"
    client = MemoriClient(str(db_path))
    toolset = MemoriMemoryToolset(client=client, namespace="qa_scope")

    record = toolset.store_user_fact(
        user_id="user-1",
        fact_key="pref_seat",
        fact_value="Window seat preferred",
        scope="session",
        provenance="unit_test",
        metadata={"labels": ["preference"]},
    )
    assert record["metadata"]["scope"] == "session"
    assert record["metadata"]["provenance"] == "unit_test"
    assert record["metadata"]["namespace"] == "qa_scope"

    fetched = toolset.retrieve_user_fact("user-1", "pref_seat")
    assert fetched is not None
    assert fetched["metadata"]["scope"] == "session"

    results = toolset.search_user_facts("user-1", scope="session")
    assert len(results) == 1
    results_no_match = toolset.search_user_facts("user-1", scope="app")
    assert results_no_match == []

    spec = toolset.get_tool_spec()
    assert spec["name"] == "memori_memory_toolset"
    fn_names = {fn["name"] for fn in spec["functions"]}
    assert {"store_user_fact", "retrieve_user_fact", "search_user_facts", "clear_user_fact"}.issubset(fn_names)

