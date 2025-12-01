"""
Supabase + pgvector lightweight client (safe, optional).

- Attempts to initialize Supabase client if SUPABASE_URL and SUPABASE_ANON_KEY are set.
- Exposes upsert_embeddings() and search_embeddings() with pgvector-compatible payloads.
- Falls back to no-op stub when dependencies or config are missing.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


try:
    # Supabase-py client (optional dependency)
    from supabase import create_client  # type: ignore
    SUPABASE_AVAILABLE = True
except Exception as exc:  # pragma: no cover - optional path
    SUPABASE_AVAILABLE = False
    logger.warning(f"Supabase client not available: {exc}")


@dataclass
class EmbeddingRecord:
    id: str
    embedding: List[float]
    metadata: Dict[str, Any]


class SupabasePgVectorClient:
    """Thin wrapper around Supabase/pgvector."""

    def __init__(
        self,
        url: Optional[str],
        key: Optional[str],
        table: str = "embeddings",
        embedding_column: str = "embedding",
        metadata_column: str = "metadata",
    ) -> None:
        self.url = url
        self.key = key
        self.table = table
        self.embedding_column = embedding_column
        self.metadata_column = metadata_column
        self.client = None

        if SUPABASE_AVAILABLE and url and key:
            try:
                self.client = create_client(url, key)
                logger.info("SupabasePgVectorClient initialized")
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning(f"Supabase init failed, running in stub mode: {exc}")
                self.client = None
        else:
            logger.debug("SupabasePgVectorClient running in stub mode (missing deps or config)")

    @property
    def available(self) -> bool:
        return self.client is not None

    def upsert_embeddings(self, records: List[EmbeddingRecord]) -> bool:
        """Upsert embedding rows into pgvector table."""
        if not self.client:
            logger.debug("Supabase upsert skipped (stub mode)")
            return False

        try:
            payload = [
                {
                    "id": rec.id,
                    self.embedding_column: rec.embedding,
                    self.metadata_column: rec.metadata,
                }
                for rec in records
            ]
            self.client.table(self.table).upsert(payload).execute()
            return True
        except Exception as exc:
            logger.warning(f"Supabase upsert failed: {exc}")
            return False

    def search_embeddings(
        self,
        query_embedding: List[float],
        match_count: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Search embeddings using pgvector <-> operator (if available), else stub."""
        if not self.client:
            logger.debug("Supabase search skipped (stub mode)")
            return []

        try:
            query = (
                self.client.table(self.table)
                .select("*")
                .limit(match_count)
                .order(self.embedding_column, {"vector": query_embedding, "type": "cosine"})
            )
            if filter_metadata:
                for k, v in filter_metadata.items():
                    query = query.eq(f"{self.metadata_column}->{k}", v)
            result = query.execute()
            return getattr(result, "data", []) or []
        except Exception as exc:
            logger.warning(f"Supabase search failed: {exc}")
            return []


def get_supabase_pgvector_client() -> SupabasePgVectorClient:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    table = os.getenv("SUPABASE_VECTOR_TABLE", "embeddings")
    embedding_column = os.getenv("SUPABASE_EMBEDDING_COLUMN", "embedding")
    metadata_column = os.getenv("SUPABASE_METADATA_COLUMN", "metadata")
    return SupabasePgVectorClient(
        url=url,
        key=key,
        table=table,
        embedding_column=embedding_column,
        metadata_column=metadata_column,
    )
