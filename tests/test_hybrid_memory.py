import json

from infrastructure.memory.hybrid_memory import HybridMemoryStore
from infrastructure.memory.memori_client import MemoriClient


def test_hybrid_memory_store_semantic_and_entity_queries(tmp_path):
    memori_db = tmp_path / "memori.db"
    vector_db = tmp_path / "vectors.db"

    client = MemoriClient(str(memori_db))
    store = HybridMemoryStore(memori_client=client, vector_db_path=vector_db)

    value = {"description": "Trip to Paris in spring"}
    metadata = {
        "entity": {
            "type": "trip",
            "id": "trip_paris_2025",
            "attributes": {
                "user": "user-789",
                "city": "Paris",
            },
        }
    }
    store.upsert_memory(
        namespace="user",
        subject="user-789",
        key="trip_paris_2025",
        value=value,
        metadata=metadata,
    )

    query_text = json.dumps(value, sort_keys=True, ensure_ascii=False)
    semantic_results = store.search_semantic(
        namespace="user",
        subject="user-789",
        query=query_text,
        limit=1,
    )
    assert semantic_results, "Semantic search should return stored memory"
    assert semantic_results[0]["key"] == "trip_paris_2025"

    entity_results = store.query_entities(
        entity_type="trip",
        filters={"user": "user-789", "city": "Paris"},
    )
    assert len(entity_results) == 1
    assert entity_results[0]["key"] == "trip_paris_2025"

    # Rehydrate store to ensure entity cache persists via SQLite
    store_again = HybridMemoryStore(memori_client=client, vector_db_path=vector_db)
    entity_results_again = store_again.query_entities(
        entity_type="trip",
        filters={"user": "user-789", "city": "Paris"},
    )
    assert len(entity_results_again) == 1

