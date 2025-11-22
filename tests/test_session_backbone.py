from pathlib import Path

import pytest

from infrastructure.memory.memori_client import MemoriClient
from infrastructure.memory.memori_tool import MemoriMemoryToolset
from infrastructure.memory.session_memori_bridge import SessionMemoriBridge
from infrastructure.session_store import SessionCompactor, SessionStore


@pytest.mark.parametrize("event_count", [12])
def test_session_backbone_upgrade(tmp_path, monkeypatch, event_count):
    session_db = tmp_path / "sessions.db"
    memori_db = tmp_path / "memori.db"
    monkeypatch.setenv("MEMORI_DB_PATH", str(memori_db))

    store = SessionStore(db_path=session_db, default_ttl_hours=24, extend_ttl_on_write=False)
    user_id = "tester"
    session_id = store.start_session(user_id=user_id, session_id="session-123", ttl_hours=4)

    for idx in range(event_count):
        store.append_event(
            user_id=user_id,
            session_id=session_id,
            role="user" if idx % 2 == 0 else "assistant",
            content=f"Message {idx}",
            payload={"idx": idx},
        )

    data = store.get_session(user_id=user_id, session_id=session_id)
    sequences = [evt["sequence"] for evt in data["events"]]
    assert sequences == sorted(sequences), "Events should have deterministic order"

    compactor = SessionCompactor(store, max_events=4, window=2)
    compaction_result = compactor.maybe_compact(user_id, session_id)
    assert compaction_result is not None, "Compaction should trigger when event cap exceeded"

    with store._conn:
        chunk_count = store._conn.execute("SELECT COUNT(*) FROM compaction_chunks").fetchone()[0]
    assert chunk_count >= 1, "Compaction should record summary chunks"

    memori_client = MemoriClient(str(memori_db))
    toolset = MemoriMemoryToolset(client=memori_client, namespace="session_summary_test")
    bridge = SessionMemoriBridge(store, memori_toolset=toolset, max_events=3, ttl_hours=12)
    sync_result = bridge.sync_session(user_id=user_id, session_id=session_id)
    assert sync_result is not None

    record = memori_client.get_memory("session_summary_test", user_id, f"session::{session_id}")
    assert record is not None, "Memori should contain session summary"
    metadata = record.metadata
    assert metadata.get("scope") == "session"
    assert metadata.get("provenance") == "session_memori_bridge"
    assert metadata.get("last_sequence") == sync_result["last_sequence"]

    # TTL enforcement
    with store._conn:
        store._conn.execute(
            "UPDATE sessions SET expires_at = ? WHERE session_id = ?",
            ("2000-01-01T00:00:00+00:00", session_id),
        )
    removed = store.purge_expired_sessions(batch_size=10)
    assert removed == 1

