from pathlib import Path

from infrastructure.memory.codebook_store import CodebookStore


def test_codebook_store_records_entries(tmp_path):
    store = CodebookStore(path=tmp_path / "codebooks.json", max_entries=3)
    store.record_entry("agent_a", "snippet 1", {"problem": "fail"}, "failure", 0.1)
    store.record_entry("agent_a", "snippet 2", {"problem": "pass"}, "success", 0.9)
    store.record_entry("agent_a", "snippet 3", {}, "failure", 0.2)
    store.record_entry("agent_a", "snippet 4", {}, "success", 0.8)

    recent = store.recent("agent_a")
    assert len(recent) == 3
    trend = store.failure_trend("agent_a", window=3)
    assert trend
    assert trend["window"] == 3
