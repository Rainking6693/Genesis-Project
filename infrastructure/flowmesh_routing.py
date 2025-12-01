"""
FlowMesh Routing - Intelligent task routing and flow optimization.

Advanced routing system that:
- Optimizes task flow across agents
- Balances load and latency
- Adapts routing based on performance
- Provides flow visualization
"""

import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import random

logger = logging.getLogger(__name__)


class RouteStrategy(Enum):
    """Routing strategies."""
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    FASTEST = "fastest"
    QUALITY_FIRST = "quality_first"
    COST_OPTIMIZED = "cost_optimized"
    ADAPTIVE = "adaptive"


@dataclass
class RouteNode:
    """A node in the routing mesh."""
    node_id: str
    agent_id: str
    capabilities: List[str] = field(default_factory=list)
    current_load: float = 0.0
    avg_latency_ms: float = 100.0
    success_rate: float = 1.0
    cost_per_task: float = 0.0
    is_available: bool = True


@dataclass
class RouteDecision:
    """Result of a routing decision."""
    route_id: str
    selected_node: str
    strategy_used: RouteStrategy
    alternatives: List[str] = field(default_factory=list)
    estimated_latency_ms: float = 0.0
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FlowMetrics:
    """Metrics for flow analysis."""
    total_routes: int = 0
    successful_routes: int = 0
    failed_routes: int = 0
    avg_latency_ms: float = 0.0
    throughput_per_second: float = 0.0


class FlowMeshRouter:
    """
    Intelligent routing mesh for task distribution.

    Features:
    - Multiple routing strategies
    - Load balancing
    - Latency optimization
    - Adaptive routing based on feedback
    - Circuit breaker pattern
    """

    def __init__(self, default_strategy: RouteStrategy = RouteStrategy.ADAPTIVE):
        """
        Initialize FlowMesh Router.

        Args:
            default_strategy: Default routing strategy
        """
        self.default_strategy = default_strategy
        self._nodes: Dict[str, RouteNode] = {}
        self._route_history: List[RouteDecision] = []
        self._route_counter = 0
        self._metrics = FlowMetrics()
        self._circuit_breakers: Dict[str, Dict[str, Any]] = {}

        # Strategy weights for adaptive routing
        self._strategy_weights = {
            RouteStrategy.LEAST_LOADED: 0.3,
            RouteStrategy.FASTEST: 0.3,
            RouteStrategy.QUALITY_FIRST: 0.4,
        }

    def register_node(self, node: RouteNode):
        """
        Register a routing node.

        Args:
            node: Route node to register
        """
        self._nodes[node.node_id] = node
        self._circuit_breakers[node.node_id] = {
            "failures": 0,
            "last_failure": 0,
            "is_open": False
        }
        logger.info(f"Registered routing node: {node.node_id} ({node.agent_id})")

    def unregister_node(self, node_id: str):
        """
        Unregister a routing node.

        Args:
            node_id: Node ID to remove
        """
        if node_id in self._nodes:
            del self._nodes[node_id]
            del self._circuit_breakers[node_id]
            logger.info(f"Unregistered routing node: {node_id}")

    def route(
        self,
        task_type: str,
        requirements: Optional[Dict[str, Any]] = None,
        strategy: Optional[RouteStrategy] = None
    ) -> RouteDecision:
        """
        Route a task to the best available node.

        Args:
            task_type: Type of task to route
            requirements: Task requirements
            strategy: Override routing strategy

        Returns:
            RouteDecision with selected node
        """
        strategy = strategy or self.default_strategy
        requirements = requirements or {}

        self._route_counter += 1
        route_id = f"ROUTE-{self._route_counter:06d}"

        # Get eligible nodes
        eligible = self._get_eligible_nodes(task_type, requirements)

        if not eligible:
            logger.warning(f"No eligible nodes for task type: {task_type}")
            return RouteDecision(
                route_id=route_id,
                selected_node="",
                strategy_used=strategy,
                confidence=0.0,
                metadata={"error": "No eligible nodes"}
            )

        # Apply routing strategy
        if strategy == RouteStrategy.ROUND_ROBIN:
            selected = self._round_robin_select(eligible)
        elif strategy == RouteStrategy.LEAST_LOADED:
            selected = self._least_loaded_select(eligible)
        elif strategy == RouteStrategy.FASTEST:
            selected = self._fastest_select(eligible)
        elif strategy == RouteStrategy.QUALITY_FIRST:
            selected = self._quality_first_select(eligible)
        elif strategy == RouteStrategy.COST_OPTIMIZED:
            selected = self._cost_optimized_select(eligible)
        elif strategy == RouteStrategy.ADAPTIVE:
            selected = self._adaptive_select(eligible, requirements)
        else:
            selected = eligible[0]

        # Build alternatives list
        alternatives = [n.node_id for n in eligible if n.node_id != selected.node_id][:3]

        decision = RouteDecision(
            route_id=route_id,
            selected_node=selected.node_id,
            strategy_used=strategy,
            alternatives=alternatives,
            estimated_latency_ms=selected.avg_latency_ms,
            confidence=selected.success_rate
        )

        self._route_history.append(decision)
        self._metrics.total_routes += 1

        logger.debug(f"Routed {task_type} to {selected.node_id} via {strategy.value}")
        return decision

    def optimize_route(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimize routing for a task.

        Args:
            task_description: Description of the task
            context: Additional context

        Returns:
            Dict with optimization suggestions
        """
        context = context or {}

        # Analyze task requirements
        inferred_type = self._infer_task_type(task_description)
        complexity = context.get("complexity", 0.5)

        # Choose strategy based on context
        if complexity > 0.8:
            recommended_strategy = RouteStrategy.QUALITY_FIRST
        elif context.get("time_sensitive"):
            recommended_strategy = RouteStrategy.FASTEST
        elif context.get("budget_constrained"):
            recommended_strategy = RouteStrategy.COST_OPTIMIZED
        else:
            recommended_strategy = RouteStrategy.ADAPTIVE

        # Get route recommendation
        decision = self.route(
            task_type=inferred_type,
            requirements=context,
            strategy=recommended_strategy
        )

        return {
            "recommended_node": decision.selected_node,
            "strategy": recommended_strategy.value,
            "alternatives": decision.alternatives,
            "estimated_latency_ms": decision.estimated_latency_ms,
            "confidence": decision.confidence,
            "inferred_task_type": inferred_type
        }

    def _get_eligible_nodes(
        self,
        task_type: str,
        requirements: Dict[str, Any]
    ) -> List[RouteNode]:
        """Get nodes eligible for a task."""
        eligible = []

        for node in self._nodes.values():
            # Check availability
            if not node.is_available:
                continue

            # Check circuit breaker
            if self._is_circuit_open(node.node_id):
                continue

            # Check capabilities (if specified)
            required_caps = requirements.get("capabilities", [])
            if required_caps:
                if not all(cap in node.capabilities for cap in required_caps):
                    continue

            eligible.append(node)

        return eligible

    def _round_robin_select(self, nodes: List[RouteNode]) -> RouteNode:
        """Round robin selection."""
        idx = self._route_counter % len(nodes)
        return nodes[idx]

    def _least_loaded_select(self, nodes: List[RouteNode]) -> RouteNode:
        """Select least loaded node."""
        return min(nodes, key=lambda n: n.current_load)

    def _fastest_select(self, nodes: List[RouteNode]) -> RouteNode:
        """Select fastest node."""
        return min(nodes, key=lambda n: n.avg_latency_ms)

    def _quality_first_select(self, nodes: List[RouteNode]) -> RouteNode:
        """Select highest quality node."""
        return max(nodes, key=lambda n: n.success_rate)

    def _cost_optimized_select(self, nodes: List[RouteNode]) -> RouteNode:
        """Select most cost-effective node."""
        return min(nodes, key=lambda n: n.cost_per_task)

    def _adaptive_select(
        self,
        nodes: List[RouteNode],
        requirements: Dict[str, Any]
    ) -> RouteNode:
        """Adaptive selection combining multiple factors."""
        scored_nodes = []

        for node in nodes:
            # Calculate composite score
            load_score = 1 - node.current_load
            latency_score = 1 / (1 + node.avg_latency_ms / 1000)
            quality_score = node.success_rate

            # Weighted combination
            composite = (
                self._strategy_weights[RouteStrategy.LEAST_LOADED] * load_score +
                self._strategy_weights[RouteStrategy.FASTEST] * latency_score +
                self._strategy_weights[RouteStrategy.QUALITY_FIRST] * quality_score
            )

            scored_nodes.append((node, composite))

        # Select best scoring node with some randomization
        scored_nodes.sort(key=lambda x: x[1], reverse=True)

        # 80% chance to pick the best, 20% chance for second best (exploration)
        if len(scored_nodes) > 1 and random.random() > 0.8:
            return scored_nodes[1][0]

        return scored_nodes[0][0]

    def _infer_task_type(self, description: str) -> str:
        """Infer task type from description."""
        description_lower = description.lower()

        if any(w in description_lower for w in ["generate", "create", "build"]):
            return "generation"
        elif any(w in description_lower for w in ["analyze", "review", "check"]):
            return "analysis"
        elif any(w in description_lower for w in ["deploy", "release", "publish"]):
            return "deployment"
        elif any(w in description_lower for w in ["fix", "debug", "repair"]):
            return "maintenance"
        else:
            return "general"

    def _is_circuit_open(self, node_id: str) -> bool:
        """Check if circuit breaker is open for a node."""
        cb = self._circuit_breakers.get(node_id, {})
        if cb.get("is_open"):
            # Check if cooldown has passed (30 seconds)
            if time.time() - cb.get("last_failure", 0) > 30:
                cb["is_open"] = False
                cb["failures"] = 0
                return False
            return True
        return False

    def record_result(self, route_id: str, success: bool, latency_ms: float):
        """
        Record result of a routed task.

        Args:
            route_id: Route ID
            success: Whether task succeeded
            latency_ms: Actual latency
        """
        # Find the route decision
        decision = next(
            (d for d in self._route_history if d.route_id == route_id),
            None
        )

        if not decision:
            return

        node_id = decision.selected_node
        node = self._nodes.get(node_id)

        if node:
            # Update node metrics
            if success:
                self._metrics.successful_routes += 1
                node.success_rate = (node.success_rate * 0.9) + (1.0 * 0.1)
            else:
                self._metrics.failed_routes += 1
                node.success_rate = (node.success_rate * 0.9) + (0.0 * 0.1)

                # Update circuit breaker
                cb = self._circuit_breakers[node_id]
                cb["failures"] += 1
                cb["last_failure"] = time.time()
                if cb["failures"] >= 5:
                    cb["is_open"] = True
                    logger.warning(f"Circuit breaker opened for node: {node_id}")

            # Update latency (exponential moving average)
            node.avg_latency_ms = (node.avg_latency_ms * 0.8) + (latency_ms * 0.2)

    def update_node_load(self, node_id: str, load: float):
        """
        Update a node's current load.

        Args:
            node_id: Node ID
            load: Current load (0-1)
        """
        if node_id in self._nodes:
            self._nodes[node_id].current_load = max(0, min(1, load))

    def get_mesh_status(self) -> Dict[str, Any]:
        """
        Get current mesh status.

        Returns:
            Dict with mesh status
        """
        available_nodes = sum(1 for n in self._nodes.values() if n.is_available)
        open_circuits = sum(1 for cb in self._circuit_breakers.values() if cb.get("is_open"))

        return {
            "total_nodes": len(self._nodes),
            "available_nodes": available_nodes,
            "open_circuits": open_circuits,
            "total_routes": self._metrics.total_routes,
            "success_rate": (
                self._metrics.successful_routes / self._metrics.total_routes
                if self._metrics.total_routes > 0 else 1.0
            ),
            "nodes": [
                {
                    "id": n.node_id,
                    "agent": n.agent_id,
                    "load": n.current_load,
                    "latency_ms": n.avg_latency_ms,
                    "success_rate": n.success_rate,
                    "available": n.is_available
                }
                for n in self._nodes.values()
            ]
        }


# Module-level factory function
def get_flowmesh_router(strategy: RouteStrategy = RouteStrategy.ADAPTIVE) -> FlowMeshRouter:
    """Get a FlowMesh Router instance."""
    return FlowMeshRouter(default_strategy=strategy)
