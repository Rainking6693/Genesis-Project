import wave

from infrastructure.memory.hybrid_memory import HybridMemoryStore
from infrastructure.memory.memori_client import MemoriClient
from infrastructure.memory.multimodal_ingestion import MultimodalMemoryPipeline

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01"
    b"\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00"
    b"\x90wS\xde"
    b"\x00\x00\x00\x0bIDAT\x08\xd7c`\x00\x00\x00\x02\x00\x01"
    b"\x0f\x1f\x02\xef"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _create_png(path):
    path.write_bytes(PNG_BYTES)


def _create_wav(path):
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(8000)
        frames = (0).to_bytes(2, "little") * 8000
        wf.writeframes(frames)


def test_multimodal_pipeline_ingests_and_stores(tmp_path):
    memori_db = tmp_path / "memori.db"
    vector_db = tmp_path / "vectors.db"
    client = MemoriClient(str(memori_db))
    store = HybridMemoryStore(memori_client=client, vector_db_path=vector_db)
    pipeline = MultimodalMemoryPipeline(store)

    image_path = tmp_path / "hero.png"
    audio_path = tmp_path / "voice.wav"
    _create_png(image_path)
    _create_wav(audio_path)

    image_result = pipeline.ingest_and_store(
        user_id="user-123",
        session_id="sess-001",
        asset_path=image_path,
        asset_type="image",
        labels=["hero", "marketing"],
    )
    assert "summary" in image_result
    memori_record = client.get_memory("multimodal_insight", "user-123", "sess-001:hero.png")
    assert memori_record is not None
    assert memori_record.metadata["source_uri"].endswith("hero.png")

    audio_result = pipeline.ingest_and_store(
        user_id="user-123",
        session_id="sess-001",
        asset_path=audio_path,
        asset_type="audio",
    )
    assert "summary" in audio_result

    assets = store.query_entities(
        entity_type="asset",
        filters={"user": "user-123", "asset_type": "audio"},
    )
    assert len(assets) == 1

