"""
Memory Router - Intelligent routing for memory operations.

Routes memory queries to the most appropriate memory backend based on:
- Query type (semantic, exact, temporal, graph)
- Performance requirements (latency, accuracy)
- Cost constraints
- Data characteristics

Integrates with multiple memory backends:
- LangGraph Store (persistent state)
- Memento (episodic memory)
- CaseBank (case-based reasoning)
- ReasoningBank (reasoning patterns)
- TrajectoryPool (execution trajectories)
- Redis (fast cache)

Provides unified memory interface with intelligent backend selection.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set, Tuple
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class MemoryBackend(Enum):
    """Available memory backends"""
    LANGGRAPH_STORE = "langgraph_store"
    MEMENTO = "memento"
    CASEBANK = "casebank"
    REASONING_BANK = "reasoning_bank"
    TRAJECTORY_POOL = "trajectory_pool"
    REDIS_CACHE = "redis_cache"
    MONGODB = "mongodb"


class QueryType(Enum):
    """Types of memory queries"""
    SEMANTIC = "semantic"          # Semantic similarity search
    EXACT = "exact"                # Exact key lookup
    TEMPORAL = "temporal"          # Time-based queries
    GRAPH = "graph"                # Graph traversal
    PATTERN = "pattern"            # Pattern matching
    AGGREGATION = "aggregation"    # Aggregation queries


@dataclass
class MemoryQuery:
    """Memory query specification"""
    query_id: str
    query_type: QueryType
    content: Any
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: int = 10
    min_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryResult:
    """Memory query result"""
    result_id: str
    query_id: str
    backend: MemoryBackend
    results: List[Dict[str, Any]]
    count: int
    latency: float
    cost_estimate: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BackendCapabilities:
    """Capabilities of a memory backend"""
    backend: MemoryBackend
    supported_query_types: Set[QueryType]
    avg_latency_ms: float
    cost_per_query: float
    max_results: int
    supports_filters: bool
    supports_scoring: bool


class MemoryRouter:
    """
    Intelligent memory router for multi-backend memory systems.

    Routes queries to optimal backend based on:
    - Query type compatibility
    - Performance requirements
    - Cost constraints
    - Backend availability
    """

    def __init__(self):
        """Initialize memory router"""
        self.backends: Dict[MemoryBackend, Any] = {}
        self.capabilities: Dict[MemoryBackend, BackendCapabilities] = {}
        self.routing_stats: Dict[MemoryBackend, int] = {}

        self._initialize_capabilities()
        self._lazy_load_backends()

        logger.info("Memory router initialized")

    def _initialize_capabilities(self) -> None:
        """Initialize backend capabilities"""

        # LangGraph Store - persistent state
        self.capabilities[MemoryBackend.LANGGRAPH_STORE] = BackendCapabilities(
            backend=MemoryBackend.LANGGRAPH_STORE,
            supported_query_types={QueryType.EXACT, QueryType.TEMPORAL},
            avg_latency_ms=50.0,
            cost_per_query=0.0001,
            max_results=1000,
            supports_filters=True,
            supports_scoring=False
        )

        # Memento - episodic memory
        self.capabilities[MemoryBackend.MEMENTO] = BackendCapabilities(
            backend=MemoryBackend.MEMENTO,
            supported_query_types={QueryType.SEMANTIC, QueryType.TEMPORAL, QueryType.PATTERN},
            avg_latency_ms=100.0,
            cost_per_query=0.0005,
            max_results=100,
            supports_filters=True,
            supports_scoring=True
        )

        # CaseBank - case-based reasoning
        self.capabilities[MemoryBackend.CASEBANK] = BackendCapabilities(
            backend=MemoryBackend.CASEBANK,
            supported_query_types={QueryType.SEMANTIC, QueryType.PATTERN},
            avg_latency_ms=80.0,
            cost_per_query=0.0003,
            max_results=50,
            supports_filters=True,
            supports_scoring=True
        )

        # ReasoningBank - reasoning patterns
        self.capabilities[MemoryBackend.REASONING_BANK] = BackendCapabilities(
            backend=MemoryBackend.REASONING_BANK,
            supported_query_types={QueryType.SEMANTIC, QueryType.PATTERN},
            avg_latency_ms=90.0,
            cost_per_query=0.0004,
            max_results=100,
            supports_filters=True,
            supports_scoring=True
        )

        # TrajectoryPool - execution trajectories
        self.capabilities[MemoryBackend.TRAJECTORY_POOL] = BackendCapabilities(
            backend=MemoryBackend.TRAJECTORY_POOL,
            supported_query_types={QueryType.TEMPORAL, QueryType.AGGREGATION},
            avg_latency_ms=60.0,
            cost_per_query=0.0002,
            max_results=500,
            supports_filters=True,
            supports_scoring=False
        )

        # Redis - fast cache
        self.capabilities[MemoryBackend.REDIS_CACHE] = BackendCapabilities(
            backend=MemoryBackend.REDIS_CACHE,
            supported_query_types={QueryType.EXACT},
            avg_latency_ms=5.0,
            cost_per_query=0.00001,
            max_results=1,
            supports_filters=False,
            supports_scoring=False
        )

    def _lazy_load_backends(self) -> None:
        """Lazy load memory backends"""
        # Backends are loaded on first use
        pass

    def _get_backend(self, backend_type: MemoryBackend) -> Optional[Any]:
        """Get or load backend"""
        if backend_type in self.backends:
            return self.backends[backend_type]

        # Lazy load backend
        try:
            if backend_type == MemoryBackend.LANGGRAPH_STORE:
                from infrastructure.langgraph_store import get_langgraph_store
                self.backends[backend_type] = get_langgraph_store()

            elif backend_type == MemoryBackend.MEMENTO:
                from infrastructure.memento_agent import MementoAgent
                self.backends[backend_type] = MementoAgent()

            elif backend_type == MemoryBackend.CASEBANK:
                from infrastructure.casebank import get_casebank
                self.backends[backend_type] = get_casebank()

            elif backend_type == MemoryBackend.REASONING_BANK:
                from infrastructure.reasoning_bank import get_reasoning_bank
                self.backends[backend_type] = get_reasoning_bank()

            elif backend_type == MemoryBackend.REDIS_CACHE:
                from infrastructure.redis_cache import get_redis_cache
                self.backends[backend_type] = get_redis_cache()

            logger.debug(f"Loaded backend: {backend_type.value}")
            return self.backends[backend_type]

        except Exception as e:
            logger.warning(f"Failed to load backend {backend_type.value}: {e}")
            return None

    def route_query(self, query: MemoryQuery) -> MemoryBackend:
        """
        Route query to optimal backend.

        Args:
            query: Memory query

        Returns:
            Best backend for this query
        """
        # Get compatible backends
        compatible = [
            backend for backend, caps in self.capabilities.items()
            if query.query_type in caps.supported_query_types
        ]

        if not compatible:
            logger.warning(f"No compatible backends for query type: {query.query_type.value}")
            return MemoryBackend.LANGGRAPH_STORE  # Fallback

        # Special case: exact queries with small result sets -> Redis
        if query.query_type == QueryType.EXACT and query.limit == 1:
            if MemoryBackend.REDIS_CACHE in compatible:
                return MemoryBackend.REDIS_CACHE

        # Score backends by latency and cost
        scores = {}
        for backend in compatible:
            caps = self.capabilities[backend]

            # Latency score (lower is better)
            latency_score = 1.0 / (1.0 + caps.avg_latency_ms / 100.0)

            # Cost score (lower is better)
            cost_score = 1.0 / (1.0 + caps.cost_per_query * 10000)

            # Capacity score
            capacity_score = 1.0 if query.limit <= caps.max_results else 0.5

            # Combined score (weighted)
            score = (
                0.5 * latency_score +
                0.3 * cost_score +
                0.2 * capacity_score
            )

            scores[backend] = score

        # Select best backend
        best_backend = max(scores.items(), key=lambda x: x[1])[0]

        logger.debug(
            f"Routed {query.query_type.value} query to {best_backend.value} "
            f"(score: {scores[best_backend]:.3f})"
        )

        return best_backend

    async def query(
        self,
        query: MemoryQuery,
        preferred_backend: Optional[MemoryBackend] = None
    ) -> MemoryResult:
        """
        Execute memory query with automatic routing.

        Args:
            query: Memory query
            preferred_backend: Optional backend override

        Returns:
            Query results
        """
        start_time = time.time()

        # Route to backend
        backend = preferred_backend or self.route_query(query)

        # Get backend instance
        backend_instance = self._get_backend(backend)

        if not backend_instance:
            logger.error(f"Backend {backend.value} not available")
            return MemoryResult(
                result_id=f"result_{query.query_id}",
                query_id=query.query_id,
                backend=backend,
                results=[],
                count=0,
                latency=0.0
            )

        # Execute query
        try:
            results = await self._execute_query(backend, backend_instance, query)
            latency = time.time() - start_time

            # Track routing stats
            self.routing_stats[backend] = self.routing_stats.get(backend, 0) + 1

            return MemoryResult(
                result_id=f"result_{query.query_id}",
                query_id=query.query_id,
                backend=backend,
                results=results,
                count=len(results),
                latency=latency,
                cost_estimate=self.capabilities[backend].cost_per_query
            )

        except Exception as e:
            logger.error(f"Query execution failed on {backend.value}: {e}")
            return MemoryResult(
                result_id=f"result_{query.query_id}",
                query_id=query.query_id,
                backend=backend,
                results=[],
                count=0,
                latency=time.time() - start_time,
                metadata={"error": str(e)}
            )

    async def _execute_query(
        self,
        backend: MemoryBackend,
        backend_instance: Any,
        query: MemoryQuery
    ) -> List[Dict[str, Any]]:
        """Execute query on specific backend"""

        # Route to appropriate backend method
        if query.query_type == QueryType.EXACT:
            return await self._execute_exact_query(backend_instance, query)
        elif query.query_type == QueryType.SEMANTIC:
            return await self._execute_semantic_query(backend_instance, query)
        elif query.query_type == QueryType.TEMPORAL:
            return await self._execute_temporal_query(backend_instance, query)
        else:
            # Generic query
            return await self._execute_generic_query(backend_instance, query)

    async def _execute_exact_query(
        self,
        backend: Any,
        query: MemoryQuery
    ) -> List[Dict[str, Any]]:
        """Execute exact key lookup"""
        # Placeholder - actual implementation depends on backend
        return []

    async def _execute_semantic_query(
        self,
        backend: Any,
        query: MemoryQuery
    ) -> List[Dict[str, Any]]:
        """Execute semantic similarity search"""
        # Placeholder - actual implementation depends on backend
        return []

    async def _execute_temporal_query(
        self,
        backend: Any,
        query: MemoryQuery
    ) -> List[Dict[str, Any]]:
        """Execute temporal query"""
        # Placeholder - actual implementation depends on backend
        return []

    async def _execute_generic_query(
        self,
        backend: Any,
        query: MemoryQuery
    ) -> List[Dict[str, Any]]:
        """Execute generic query"""
        # Placeholder - actual implementation depends on backend
        return []

    def get_routing_stats(self) -> Dict[str, int]:
        """Get routing statistics"""
        return {
            backend.value: count
            for backend, count in self.routing_stats.items()
        }

    def get_backend_status(self) -> Dict[str, bool]:
        """Get status of all backends"""
        status = {}

        for backend in MemoryBackend:
            instance = self._get_backend(backend)
            status[backend.value] = instance is not None

        return status


# Global instance
_memory_router = None


def get_memory_router() -> MemoryRouter:
    """
    Get global memory router instance.

    Returns:
        MemoryRouter instance
    """
    global _memory_router
    if _memory_router is None:
        _memory_router = MemoryRouter()
    return _memory_router


async def memory_query(
    query_type: QueryType,
    content: Any,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None
) -> MemoryResult:
    """
    Convenience function for memory queries.

    Args:
        query_type: Type of query
        content: Query content
        limit: Maximum results
        filters: Optional filters

    Returns:
        Query results
    """
    router = get_memory_router()

    query = MemoryQuery(
        query_id=f"query_{int(time.time() * 1000)}",
        query_type=query_type,
        content=content,
        filters=filters or {},
        limit=limit
    )

    return await router.query(query)
