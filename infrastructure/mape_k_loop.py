"""
MAPE-K Loop - Monitor, Analyze, Plan, Execute with Knowledge.

Autonomic computing control loop for self-managing systems:
- Monitor: Collect system state and metrics
- Analyze: Detect issues and opportunities
- Plan: Create adaptation strategies
- Execute: Apply changes
- Knowledge: Shared understanding base
"""

import logging
import time
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class AdaptationType(Enum):
    """Types of adaptations."""
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    RECONFIGURE = "reconfigure"
    HEAL = "heal"
    OPTIMIZE = "optimize"
    MIGRATE = "migrate"


@dataclass
class MonitorEvent:
    """An event from monitoring."""
    event_id: str
    event_type: str
    source: str
    timestamp: float
    metrics: Dict[str, Any] = field(default_factory=dict)
    severity: str = "info"  # info, warning, error, critical


@dataclass
class AnalysisResult:
    """Result of analysis phase."""
    analysis_id: str
    issues_detected: List[Dict[str, Any]] = field(default_factory=list)
    opportunities: List[Dict[str, Any]] = field(default_factory=list)
    risk_level: float = 0.0
    recommendations: List[str] = field(default_factory=list)


@dataclass
class AdaptationPlan:
    """A plan for system adaptation."""
    plan_id: str
    adaptation_type: AdaptationType
    target: str
    actions: List[Dict[str, Any]] = field(default_factory=list)
    estimated_impact: float = 0.0
    priority: int = 1
    rollback_plan: Optional[Dict[str, Any]] = None


@dataclass
class ExecutionResult:
    """Result of plan execution."""
    plan_id: str
    success: bool
    actions_completed: int = 0
    actions_failed: int = 0
    duration_ms: float = 0.0
    error: Optional[str] = None


class MAPEKLoop:
    """
    MAPE-K autonomic control loop implementation.

    Features:
    - Continuous monitoring
    - Pattern-based analysis
    - Adaptive planning
    - Safe execution with rollback
    - Knowledge persistence
    """

    def __init__(self, knowledge_base: Optional[Dict[str, Any]] = None):
        """
        Initialize MAPE-K Loop.

        Args:
            knowledge_base: Initial knowledge base
        """
        self._knowledge = knowledge_base or {}
        self._event_buffer: List[MonitorEvent] = []
        self._analysis_history: List[AnalysisResult] = []
        self._plan_history: List[AdaptationPlan] = []
        self._execution_history: List[ExecutionResult] = []

        self._event_counter = 0
        self._analysis_counter = 0
        self._plan_counter = 0

        # Thresholds for analysis
        self._thresholds = {
            "cpu_high": 80.0,
            "memory_high": 85.0,
            "error_rate_high": 0.05,
            "latency_high_ms": 1000,
            "queue_depth_high": 100
        }

        # Registered handlers
        self._analysis_rules: List[Callable] = []
        self._execution_handlers: Dict[AdaptationType, Callable] = {}

    def monitor(
        self,
        event_type: str,
        source: str,
        metrics: Optional[Dict[str, Any]] = None,
        severity: str = "info"
    ) -> MonitorEvent:
        """
        Record a monitoring event.

        Args:
            event_type: Type of event
            source: Event source
            metrics: Associated metrics
            severity: Event severity

        Returns:
            MonitorEvent created
        """
        self._event_counter += 1
        event = MonitorEvent(
            event_id=f"EVT-{self._event_counter:06d}",
            event_type=event_type,
            source=source,
            timestamp=time.time(),
            metrics=metrics or {},
            severity=severity
        )

        self._event_buffer.append(event)

        # Keep buffer size manageable
        if len(self._event_buffer) > 1000:
            self._event_buffer = self._event_buffer[-500:]

        # Update knowledge
        self._update_knowledge_from_event(event)

        logger.debug(f"Monitor event: {event_type} from {source}")
        return event

    def analyze(
        self,
        window_seconds: float = 60.0
    ) -> AnalysisResult:
        """
        Analyze recent events to detect issues.

        Args:
            window_seconds: Time window for analysis

        Returns:
            AnalysisResult with findings
        """
        self._analysis_counter += 1
        result = AnalysisResult(
            analysis_id=f"ANA-{self._analysis_counter:05d}"
        )

        cutoff = time.time() - window_seconds
        recent_events = [e for e in self._event_buffer if e.timestamp >= cutoff]

        # Check for high severity events
        error_events = [e for e in recent_events if e.severity in ["error", "critical"]]
        if error_events:
            result.issues_detected.append({
                "type": "high_severity_events",
                "count": len(error_events),
                "sources": list(set(e.source for e in error_events))
            })
            result.risk_level += 0.3

        # Check metric thresholds
        for event in recent_events:
            metrics = event.metrics

            # CPU check
            cpu = metrics.get("cpu_percent", 0)
            if cpu > self._thresholds["cpu_high"]:
                result.issues_detected.append({
                    "type": "high_cpu",
                    "value": cpu,
                    "source": event.source
                })
                result.risk_level += 0.2

            # Memory check
            memory = metrics.get("memory_percent", 0)
            if memory > self._thresholds["memory_high"]:
                result.issues_detected.append({
                    "type": "high_memory",
                    "value": memory,
                    "source": event.source
                })
                result.risk_level += 0.2

            # Latency check
            latency = metrics.get("latency_ms", 0)
            if latency > self._thresholds["latency_high_ms"]:
                result.issues_detected.append({
                    "type": "high_latency",
                    "value": latency,
                    "source": event.source
                })
                result.risk_level += 0.1

        # Apply custom analysis rules
        for rule in self._analysis_rules:
            try:
                rule_result = rule(recent_events, self._knowledge)
                if rule_result:
                    result.issues_detected.extend(rule_result.get("issues", []))
                    result.opportunities.extend(rule_result.get("opportunities", []))
            except Exception as e:
                logger.warning(f"Analysis rule failed: {e}")

        # Generate recommendations
        result.recommendations = self._generate_recommendations(result)
        result.risk_level = min(result.risk_level, 1.0)

        self._analysis_history.append(result)
        logger.info(f"Analysis complete: {len(result.issues_detected)} issues, risk={result.risk_level:.2f}")

        return result

    def plan(self, analysis: AnalysisResult) -> List[AdaptationPlan]:
        """
        Create adaptation plans based on analysis.

        Args:
            analysis: Analysis result to plan for

        Returns:
            List of adaptation plans
        """
        plans = []

        for issue in analysis.issues_detected:
            plan = self._create_plan_for_issue(issue)
            if plan:
                plans.append(plan)
                self._plan_history.append(plan)

        for opportunity in analysis.opportunities:
            plan = self._create_plan_for_opportunity(opportunity)
            if plan:
                plans.append(plan)
                self._plan_history.append(plan)

        # Sort by priority
        plans.sort(key=lambda p: p.priority)

        logger.info(f"Created {len(plans)} adaptation plans")
        return plans

    def execute(self, plan: AdaptationPlan) -> ExecutionResult:
        """
        Execute an adaptation plan.

        Args:
            plan: Plan to execute

        Returns:
            ExecutionResult
        """
        start_time = time.time()
        result = ExecutionResult(plan_id=plan.plan_id, success=True)

        try:
            # Check for registered handler
            handler = self._execution_handlers.get(plan.adaptation_type)

            if handler:
                handler_result = handler(plan)
                result.success = handler_result.get("success", True)
                result.actions_completed = handler_result.get("completed", len(plan.actions))
                result.actions_failed = handler_result.get("failed", 0)
            else:
                # Default execution: log actions
                for action in plan.actions:
                    logger.info(f"Executing action: {action}")
                    result.actions_completed += 1

            # Update knowledge
            self._update_knowledge_from_execution(plan, result)

        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Plan execution failed: {e}")

            # Attempt rollback if available
            if plan.rollback_plan:
                self._execute_rollback(plan.rollback_plan)

        result.duration_ms = (time.time() - start_time) * 1000
        self._execution_history.append(result)

        return result

    def _update_knowledge_from_event(self, event: MonitorEvent):
        """Update knowledge base from monitoring event."""
        source = event.source

        if source not in self._knowledge:
            self._knowledge[source] = {
                "last_seen": event.timestamp,
                "event_count": 0,
                "metrics_history": []
            }

        self._knowledge[source]["last_seen"] = event.timestamp
        self._knowledge[source]["event_count"] += 1

        if event.metrics:
            self._knowledge[source]["metrics_history"].append({
                "timestamp": event.timestamp,
                "metrics": event.metrics
            })
            # Keep limited history
            if len(self._knowledge[source]["metrics_history"]) > 100:
                self._knowledge[source]["metrics_history"] = \
                    self._knowledge[source]["metrics_history"][-50:]

    def _update_knowledge_from_execution(self, plan: AdaptationPlan, result: ExecutionResult):
        """Update knowledge from execution result."""
        if "adaptations" not in self._knowledge:
            self._knowledge["adaptations"] = []

        self._knowledge["adaptations"].append({
            "plan_id": plan.plan_id,
            "type": plan.adaptation_type.value,
            "success": result.success,
            "timestamp": time.time()
        })

    def _generate_recommendations(self, analysis: AnalysisResult) -> List[str]:
        """Generate recommendations from analysis."""
        recommendations = []

        issue_types = set(i["type"] for i in analysis.issues_detected)

        if "high_cpu" in issue_types:
            recommendations.append("Consider scaling up compute resources")
        if "high_memory" in issue_types:
            recommendations.append("Review memory usage and consider optimization")
        if "high_latency" in issue_types:
            recommendations.append("Investigate latency sources and optimize")
        if "high_severity_events" in issue_types:
            recommendations.append("Review and address error conditions")

        return recommendations

    def _create_plan_for_issue(self, issue: Dict[str, Any]) -> Optional[AdaptationPlan]:
        """Create adaptation plan for an issue."""
        self._plan_counter += 1
        plan_id = f"PLAN-{self._plan_counter:05d}"

        issue_type = issue.get("type")

        if issue_type == "high_cpu":
            return AdaptationPlan(
                plan_id=plan_id,
                adaptation_type=AdaptationType.SCALE_UP,
                target=issue.get("source", "unknown"),
                actions=[
                    {"action": "add_resource", "type": "cpu"},
                    {"action": "rebalance_load"}
                ],
                estimated_impact=0.3,
                priority=1
            )
        elif issue_type == "high_memory":
            return AdaptationPlan(
                plan_id=plan_id,
                adaptation_type=AdaptationType.OPTIMIZE,
                target=issue.get("source", "unknown"),
                actions=[
                    {"action": "clear_cache"},
                    {"action": "gc_collect"}
                ],
                estimated_impact=0.2,
                priority=2
            )
        elif issue_type == "high_severity_events":
            return AdaptationPlan(
                plan_id=plan_id,
                adaptation_type=AdaptationType.HEAL,
                target=issue.get("sources", ["unknown"])[0],
                actions=[
                    {"action": "restart_component"},
                    {"action": "verify_health"}
                ],
                estimated_impact=0.4,
                priority=1
            )

        return None

    def _create_plan_for_opportunity(self, opportunity: Dict[str, Any]) -> Optional[AdaptationPlan]:
        """Create adaptation plan for an opportunity."""
        # Opportunities could be scale-down, cost optimization, etc.
        return None

    def _execute_rollback(self, rollback_plan: Dict[str, Any]):
        """Execute a rollback plan."""
        logger.warning(f"Executing rollback: {rollback_plan}")
        # Rollback logic would go here

    def register_analysis_rule(self, rule: Callable):
        """
        Register a custom analysis rule.

        Args:
            rule: Function(events, knowledge) -> {issues: [], opportunities: []}
        """
        self._analysis_rules.append(rule)

    def register_execution_handler(
        self,
        adaptation_type: AdaptationType,
        handler: Callable
    ):
        """
        Register an execution handler for an adaptation type.

        Args:
            adaptation_type: Type of adaptation
            handler: Handler function(plan) -> {success: bool, ...}
        """
        self._execution_handlers[adaptation_type] = handler

    def get_knowledge(self, key: Optional[str] = None) -> Any:
        """
        Get knowledge base or specific key.

        Args:
            key: Optional key to get

        Returns:
            Knowledge data
        """
        if key:
            return self._knowledge.get(key)
        return self._knowledge.copy()

    def get_status(self) -> Dict[str, Any]:
        """
        Get MAPE-K loop status.

        Returns:
            Status dict
        """
        return {
            "events_buffered": len(self._event_buffer),
            "analyses_performed": len(self._analysis_history),
            "plans_created": len(self._plan_history),
            "executions_completed": len(self._execution_history),
            "knowledge_keys": list(self._knowledge.keys()),
            "analysis_rules": len(self._analysis_rules),
            "execution_handlers": list(self._execution_handlers.keys())
        }


# Module-level factory function
def get_mape_k_loop(knowledge_base: Optional[Dict[str, Any]] = None) -> MAPEKLoop:
    """Get a MAPE-K Loop instance."""
    return MAPEKLoop(knowledge_base=knowledge_base)
