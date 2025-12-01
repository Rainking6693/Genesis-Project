# src/integrations/acontext_client.py
"""
Acontext Client - Interface for Genesis to interact with Acontext memory system.

Acontext provides:
- Spaces: Isolated namespaces for organizing content
- Blocks: Versioned content units (prompts, summaries, RL logs)
- Search: Semantic search across blocks

Enhanced with SQLite persistence for local fallback to ensure training state
persists across sessions when the Docker Acontext service is unavailable.
"""

import os
import json
import logging
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime
from pathlib import Path

import httpx

logger = logging.getLogger("acontext_client")


class AcontextClient:
    """
    Client for interacting with Acontext API.

    Acontext is used to:
    - Store and version Genesis prompts
    - Log RL training insights
    - Persist evaluation patterns
    - Track training summaries
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        db_path: Optional[str] = None,
    ):
        """
        Initialize Acontext client.

        Args:
            base_url: Acontext API base URL (default from env ACONTEXT_BASE_URL)
            api_key: API key for authentication (default from env ACONTEXT_API_KEY)
            timeout: Request timeout in seconds
            db_path: SQLite database path for local fallback (default: data/acontext_local.db)
        """
        self.base_url = base_url or os.getenv("ACONTEXT_BASE_URL", "http://localhost:8000")
        self.api_key = api_key or os.getenv("ACONTEXT_API_KEY", "")
        self.timeout = timeout
        self._client: Optional[httpx.Client] = None

        # Local fallback with SQLite persistence (replaces in-memory dict)
        self.db_path = db_path or os.path.join("data", "acontext_local.db")
        self._db_conn: Optional[sqlite3.Connection] = None
        self._use_local_fallback = False

        # Ensure data directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        # Initialize SQLite database
        self._init_db()

        logger.info(
            f"AcontextClient initialized with base_url={self.base_url}, "
            f"local_db={self.db_path}"
        )

    @property
    def client(self) -> httpx.Client:
        """Lazy-initialize HTTP client."""
        if self._client is None:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            headers["Content-Type"] = "application/json"

            self._client = httpx.Client(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
            )
        return self._client

    def _init_db(self):
        """Initialize SQLite database for local fallback"""
        try:
            self._db_conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._db_conn.row_factory = sqlite3.Row

            cursor = self._db_conn.cursor()

            # Create spaces table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS spaces (
                    space TEXT PRIMARY KEY,
                    metadata TEXT,
                    created_at TEXT
                )
            """)

            # Create blocks table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS blocks (
                    space TEXT,
                    path TEXT,
                    content TEXT,
                    metadata TEXT,
                    version INTEGER,
                    created_at TEXT,
                    updated_at TEXT,
                    PRIMARY KEY (space, path)
                )
            """)

            # Create indexes for search
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_blocks_space ON blocks(space)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_blocks_path ON blocks(path)
            """)

            self._db_conn.commit()
            logger.info(f"SQLite database initialized at {self.db_path}")

        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {e}")
            # Fallback to in-memory storage if DB fails
            self._db_conn = None

    def health_check(self) -> bool:
        """
        Check if Acontext service is healthy.

        Returns:
            True if service is reachable and healthy
        """
        try:
            response = self.client.get("/health")
            if response.status_code == 200:
                self._use_local_fallback = False
                return True
        except Exception as e:
            logger.warning(f"Acontext health check failed: {e}")

        self._use_local_fallback = True
        logger.info("Using local fallback storage for Acontext operations")
        return False

    def create_space(self, space: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new Acontext space.

        Args:
            space: Space name/identifier
            metadata: Optional metadata for the space

        Returns:
            Space creation response
        """
        if self._use_local_fallback:
            return self._create_space_local(space, metadata)

        try:
            response = self.client.post(
                "/spaces",
                json={"name": space, "metadata": metadata or {}},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to create space {space}: {e}")
            return {"space": space, "created": False, "error": str(e)}

    def _create_space_local(self, space: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create space in local SQLite database"""
        if self._db_conn is None:
            return {"space": space, "created": True, "local": True, "in_memory": True}

        try:
            cursor = self._db_conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO spaces (space, metadata, created_at) VALUES (?, ?, ?)",
                (space, json.dumps(metadata or {}), datetime.utcnow().isoformat())
            )
            self._db_conn.commit()
            logger.info(f"[LOCAL-DB] Created space {space}")
            return {"space": space, "created": True, "local": True}
        except Exception as e:
            logger.error(f"Failed to create space in local DB: {e}")
            return {"space": space, "created": False, "error": str(e)}

    def create_block(
        self,
        space: str,
        path: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create or update a block in Acontext.

        Args:
            space: Space to create block in
            path: Block path (e.g., "/prompts/genesis/day1_rl_optimized.md")
            content: Block content
            metadata: Optional metadata for the block

        Returns:
            Block creation response
        """
        if self._use_local_fallback:
            return self._create_block_local(space, path, content, metadata)

        try:
            response = self.client.post(
                f"/spaces/{space}/blocks",
                json={
                    "path": path,
                    "content": content,
                    "metadata": metadata or {},
                },
            )
            response.raise_for_status()
            logger.info(f"Created block {path} in space {space}")
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to create block {path}: {e}, using local fallback")
            self._use_local_fallback = True
            return self.create_block(space, path, content, metadata)

    def _create_block_local(
        self,
        space: str,
        path: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create or update block in local SQLite database"""
        if self._db_conn is None:
            # Fallback to in-memory if DB unavailable
            return {
                "space": space,
                "path": path,
                "content": content,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat(),
                "version": 1,
                "in_memory": True
            }

        try:
            cursor = self._db_conn.cursor()

            # Get existing version
            cursor.execute(
                "SELECT version FROM blocks WHERE space = ? AND path = ?",
                (space, path)
            )
            row = cursor.fetchone()
            version = (row[0] + 1) if row else 1

            now = datetime.utcnow().isoformat()

            # Insert or update block
            cursor.execute("""
                INSERT OR REPLACE INTO blocks
                (space, path, content, metadata, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?,
                    COALESCE((SELECT created_at FROM blocks WHERE space = ? AND path = ?), ?),
                    ?)
            """, (
                space, path, content, json.dumps(metadata or {}), version,
                space, path, now, now
            ))

            self._db_conn.commit()

            logger.info(f"[LOCAL-DB] Created block {path} in space {space} (v{version})")

            return {
                "space": space,
                "path": path,
                "content": content,
                "metadata": metadata or {},
                "version": version,
                "created_at": now,
                "updated_at": now,
                "local": True
            }

        except Exception as e:
            logger.error(f"Failed to create block in local DB: {e}")
            return {
                "space": space,
                "path": path,
                "error": str(e),
                "created": False
            }

    def get_block(self, space: str, path: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a block from Acontext.

        Args:
            space: Space containing the block
            path: Block path

        Returns:
            Block data or None if not found
        """
        if self._use_local_fallback:
            return self._get_block_local(space, path)

        try:
            response = self.client.get(f"/spaces/{space}/blocks/{path}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to get block {path}: {e}")
            return None

    def _get_block_local(self, space: str, path: str) -> Optional[Dict[str, Any]]:
        """Retrieve block from local SQLite database"""
        if self._db_conn is None:
            return None

        try:
            cursor = self._db_conn.cursor()
            cursor.execute(
                "SELECT space, path, content, metadata, version, created_at, updated_at "
                "FROM blocks WHERE space = ? AND path = ?",
                (space, path)
            )
            row = cursor.fetchone()

            if row is None:
                return None

            return {
                "space": row["space"],
                "path": row["path"],
                "content": row["content"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                "version": row["version"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "local": True
            }

        except Exception as e:
            logger.error(f"Failed to get block from local DB: {e}")
            return None

    def list_blocks(self, space: str, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List blocks in a space.

        Args:
            space: Space to list blocks from
            prefix: Optional path prefix filter

        Returns:
            List of block metadata
        """
        if self._use_local_fallback:
            return self._list_blocks_local(space, prefix)

        try:
            params = {"prefix": prefix} if prefix else {}
            response = self.client.get(f"/spaces/{space}/blocks", params=params)
            response.raise_for_status()
            return response.json().get("blocks", [])
        except Exception as e:
            logger.warning(f"Failed to list blocks: {e}")
            return []

    def _list_blocks_local(self, space: str, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        """List blocks from local SQLite database"""
        if self._db_conn is None:
            return []

        try:
            cursor = self._db_conn.cursor()

            if prefix:
                cursor.execute(
                    "SELECT space, path, metadata, version, created_at, updated_at "
                    "FROM blocks WHERE space = ? AND path LIKE ? "
                    "ORDER BY path",
                    (space, f"{prefix}%")
                )
            else:
                cursor.execute(
                    "SELECT space, path, metadata, version, created_at, updated_at "
                    "FROM blocks WHERE space = ? "
                    "ORDER BY path",
                    (space,)
                )

            blocks = []
            for row in cursor.fetchall():
                blocks.append({
                    "space": row["space"],
                    "path": row["path"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "version": row["version"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "local": True
                })

            return blocks

        except Exception as e:
            logger.error(f"Failed to list blocks from local DB: {e}")
            return []

    def search(
        self,
        space: str,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search across blocks in a space.

        Args:
            space: Space to search in
            query: Search query
            limit: Maximum results to return

        Returns:
            List of matching blocks with scores
        """
        if self._use_local_fallback:
            return self._search_local(space, query, limit)

        try:
            response = self.client.post(
                f"/spaces/{space}/search",
                json={"query": query, "limit": limit},
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except Exception as e:
            logger.warning(f"Search failed: {e}")
            return []

    def _search_local(self, space: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Simple substring search in local SQLite database"""
        if self._db_conn is None:
            return []

        try:
            cursor = self._db_conn.cursor()
            query_lower = query.lower()

            # Simple substring search (SQLite FTS would be better but requires setup)
            cursor.execute(
                "SELECT space, path, content, metadata, version, created_at, updated_at "
                "FROM blocks WHERE space = ? AND LOWER(content) LIKE ? "
                "ORDER BY updated_at DESC LIMIT ?",
                (space, f"%{query_lower}%", limit)
            )

            results = []
            for row in cursor.fetchall():
                results.append({
                    "space": row["space"],
                    "path": row["path"],
                    "content": row["content"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "version": row["version"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "score": 1.0,  # Simple match, no semantic scoring
                    "local": True
                })

            return results

        except Exception as e:
            logger.error(f"Failed to search in local DB: {e}")
            return []

    def log_rl_iteration(
        self,
        space: str,
        iteration: int,
        metrics: Dict[str, Any],
        insights: List[str],
        prefix: str = "/rl/genesis/day1/",
    ) -> Dict[str, Any]:
        """
        Log an RL training iteration to Acontext.

        Args:
            space: Space to log to
            iteration: Iteration number
            metrics: Training metrics
            insights: Insights from this iteration
            prefix: Block path prefix

        Returns:
            Created block response
        """
        content = f"""# RL Iteration {iteration}

## Metrics
```json
{json.dumps(metrics, indent=2)}
```

## Insights
{chr(10).join(f'- {insight}' for insight in insights)}

## Timestamp
{datetime.utcnow().isoformat()}
"""
        return self.create_block(
            space=space,
            path=f"{prefix}iteration_{iteration}.md",
            content=content,
            metadata={
                "type": "rl_iteration",
                "iteration": iteration,
                "metrics": metrics,
            },
        )

    def close(self):
        """Close the HTTP client and database connection."""
        if self._client:
            self._client.close()
            self._client = None

        if self._db_conn:
            self._db_conn.close()
            self._db_conn = None
            logger.info("SQLite database connection closed")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
