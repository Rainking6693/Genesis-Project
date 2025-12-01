"""
Policy Cards - Policy governance system for Genesis orchestration.

Provides declarative policy enforcement for task decomposition, agent routing,
validation, and optimization. Ensures all orchestration decisions comply with
organizational policies, security constraints, and business rules.

Features:
- Task-level policy enforcement
- Resource limit policies (budget, time, compute)
- Security and compliance policies
- Agent capability policies
- Dynamic policy evaluation
- Policy violation tracking
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable, Set
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class PolicyType(Enum):
    """Types of policies that can be enforced"""
    RESOURCE = "resource"          # Budget, time, compute limits
    SECURITY = "security"          # Security and access control
    COMPLIANCE = "compliance"      # Regulatory compliance
    QUALITY = "quality"            # Quality standards
    CAPABILITY = "capability"      # Agent capability requirements
    BUSINESS = "business"          # Business rules and constraints


class PolicySeverity(Enum):
    """Severity of policy violations"""
    INFO = "info"          # Informational, no action required
    WARNING = "warning"    # Warning, continue with logging
    ERROR = "error"        # Error, requires fallback
    FATAL = "fatal"        # Fatal, abort operation


@dataclass
class PolicyRule:
    """Individual policy rule definition"""
    rule_id: str
    name: str
    description: str
    policy_type: PolicyType
    severity: PolicySeverity
    condition: Callable[[Dict[str, Any]], bool]
    message: str
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PolicyViolation:
    """Record of a policy violation"""
    rule_id: str
    rule_name: str
    policy_type: PolicyType
    severity: PolicySeverity
    message: str
    context: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)


@dataclass
class PolicyCard:
    """Policy card containing multiple rules for a specific context"""
    card_id: str
    name: str
    description: str
    rules: List[PolicyRule]
    enabled: bool = True
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self, context: Dict[str, Any]) -> List[PolicyViolation]:
        """
        Evaluate all rules in this policy card against the given context.

        Args:
            context: Context to evaluate (task, agent, resources, etc.)

        Returns:
            List of policy violations (empty if all rules pass)
        """
        violations = []

        if not self.enabled:
            logger.debug(f"Policy card {self.card_id} is disabled, skipping")
            return violations

        for rule in self.rules:
            if not rule.enabled:
                continue

            try:
                # Evaluate the rule condition
                if not rule.condition(context):
                    violation = PolicyViolation(
                        rule_id=rule.rule_id,
                        rule_name=rule.name,
                        policy_type=rule.policy_type,
                        severity=rule.severity,
                        message=rule.message,
                        context=context
                    )
                    violations.append(violation)

                    logger.log(
                        logging.WARNING if rule.severity in [PolicySeverity.WARNING, PolicySeverity.INFO]
                        else logging.ERROR,
                        f"Policy violation [{rule.rule_id}]: {rule.message}"
                    )

            except Exception as e:
                logger.error(f"Error evaluating rule {rule.rule_id}: {e}")
                # Treat evaluation errors as violations for safety
                violations.append(PolicyViolation(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    policy_type=rule.policy_type,
                    severity=PolicySeverity.ERROR,
                    message=f"Policy evaluation failed: {str(e)}",
                    context=context
                ))

        return violations


class PolicyCardRegistry:
    """
    Registry for managing and enforcing policy cards across Genesis.

    Provides centralized policy management with support for:
    - Multiple policy cards per context
    - Dynamic policy loading
    - Violation tracking
    - Policy override capabilities
    """

    def __init__(self):
        self.cards: Dict[str, PolicyCard] = {}
        self.violations: List[PolicyViolation] = []
        self._initialize_default_policies()

    def _initialize_default_policies(self):
        """Initialize default Genesis policy cards"""

        # Resource Policy Card
        resource_card = PolicyCard(
            card_id="genesis.resource",
            name="Resource Limits",
            description="Enforce resource constraints (budget, time, compute)",
            rules=[
                PolicyRule(
                    rule_id="resource.budget",
                    name="Budget Limit",
                    description="Task budget must not exceed limit",
                    policy_type=PolicyType.RESOURCE,
                    severity=PolicySeverity.ERROR,
                    condition=lambda ctx: ctx.get("budget", 0) <= ctx.get("budget_limit", 1000),
                    message="Task budget exceeds allowed limit"
                ),
                PolicyRule(
                    rule_id="resource.time",
                    name="Time Limit",
                    description="Task duration must not exceed limit",
                    policy_type=PolicyType.RESOURCE,
                    severity=PolicySeverity.WARNING,
                    condition=lambda ctx: ctx.get("estimated_duration", 0) <= ctx.get("time_limit", 3600),
                    message="Task estimated duration exceeds time limit"
                ),
                PolicyRule(
                    rule_id="resource.approval",
                    name="High Cost Approval",
                    description="Costs over $100 require approval",
                    policy_type=PolicyType.RESOURCE,
                    severity=PolicySeverity.FATAL,
                    condition=lambda ctx: ctx.get("cost", 0) < 100 or ctx.get("approved", False),
                    message="Costs over $100 require human approval"
                ),
            ],
            tags={"resource", "budget", "core"}
        )

        # Security Policy Card
        security_card = PolicyCard(
            card_id="genesis.security",
            name="Security Policies",
            description="Enforce security and access control policies",
            rules=[
                PolicyRule(
                    rule_id="security.api_keys",
                    name="No Hardcoded Secrets",
                    description="API keys and secrets must not be hardcoded",
                    policy_type=PolicyType.SECURITY,
                    severity=PolicySeverity.FATAL,
                    condition=lambda ctx: not ctx.get("contains_hardcoded_secrets", False),
                    message="Hardcoded secrets detected - security violation"
                ),
                PolicyRule(
                    rule_id="security.sandboxed",
                    name="Sandboxed Execution",
                    description="High-risk operations must run in sandbox",
                    policy_type=PolicyType.SECURITY,
                    severity=PolicySeverity.ERROR,
                    condition=lambda ctx: not ctx.get("high_risk", False) or ctx.get("sandboxed", False),
                    message="High-risk operation must be sandboxed"
                ),
            ],
            tags={"security", "compliance", "core"}
        )

        # Quality Policy Card
        quality_card = PolicyCard(
            card_id="genesis.quality",
            name="Quality Standards",
            description="Enforce output quality standards",
            rules=[
                PolicyRule(
                    rule_id="quality.min_score",
                    name="Minimum Quality Score",
                    description="Output quality must meet minimum threshold",
                    policy_type=PolicyType.QUALITY,
                    severity=PolicySeverity.WARNING,
                    condition=lambda ctx: ctx.get("quality_score", 100) >= ctx.get("min_quality", 50),
                    message="Output quality below minimum threshold"
                ),
                PolicyRule(
                    rule_id="quality.testing",
                    name="Testing Required",
                    description="Deployments require testing",
                    policy_type=PolicyType.QUALITY,
                    severity=PolicySeverity.ERROR,
                    condition=lambda ctx: not ctx.get("is_deployment", False) or ctx.get("tests_passed", False),
                    message="Deployment requires passing tests"
                ),
            ],
            tags={"quality", "validation", "core"}
        )

        # Agent Capability Policy Card
        capability_card = PolicyCard(
            card_id="genesis.capability",
            name="Agent Capabilities",
            description="Ensure agents have required capabilities",
            rules=[
                PolicyRule(
                    rule_id="capability.required",
                    name="Required Capabilities",
                    description="Agent must have all required capabilities",
                    policy_type=PolicyType.CAPABILITY,
                    severity=PolicySeverity.ERROR,
                    condition=lambda ctx: all(
                        cap in ctx.get("agent_capabilities", set())
                        for cap in ctx.get("required_capabilities", set())
                    ),
                    message="Agent missing required capabilities"
                ),
            ],
            tags={"capability", "routing", "core"}
        )

        # Register default cards
        self.register_card(resource_card)
        self.register_card(security_card)
        self.register_card(quality_card)
        self.register_card(capability_card)

        logger.info("Initialized 4 default policy cards")

    def register_card(self, card: PolicyCard) -> None:
        """Register a policy card in the registry"""
        self.cards[card.card_id] = card
        logger.debug(f"Registered policy card: {card.card_id} ({len(card.rules)} rules)")

    def unregister_card(self, card_id: str) -> None:
        """Unregister a policy card"""
        if card_id in self.cards:
            del self.cards[card_id]
            logger.debug(f"Unregistered policy card: {card_id}")

    def evaluate(
        self,
        context: Dict[str, Any],
        card_ids: Optional[List[str]] = None,
        tags: Optional[Set[str]] = None
    ) -> List[PolicyViolation]:
        """
        Evaluate policies against the given context.

        Args:
            context: Context to evaluate
            card_ids: Specific card IDs to evaluate (None = all)
            tags: Filter by tags (None = no filtering)

        Returns:
            List of all policy violations
        """
        violations = []

        # Determine which cards to evaluate
        cards_to_eval = []

        if card_ids:
            cards_to_eval = [self.cards[cid] for cid in card_ids if cid in self.cards]
        elif tags:
            cards_to_eval = [card for card in self.cards.values() if card.tags & tags]
        else:
            cards_to_eval = list(self.cards.values())

        # Evaluate each card
        for card in cards_to_eval:
            card_violations = card.evaluate(context)
            violations.extend(card_violations)

        # Track violations
        self.violations.extend(violations)

        if violations:
            logger.warning(f"Policy evaluation found {len(violations)} violations")

        return violations

    def has_fatal_violations(self, violations: List[PolicyViolation]) -> bool:
        """Check if any violations are fatal"""
        return any(v.severity == PolicySeverity.FATAL for v in violations)

    def has_error_violations(self, violations: List[PolicyViolation]) -> bool:
        """Check if any violations are errors or fatal"""
        return any(v.severity in [PolicySeverity.ERROR, PolicySeverity.FATAL] for v in violations)

    def get_violation_summary(self) -> Dict[str, Any]:
        """Get summary of all violations"""
        if not self.violations:
            return {"total": 0, "by_severity": {}, "by_type": {}}

        by_severity = {}
        by_type = {}

        for violation in self.violations:
            # Count by severity
            sev = violation.severity.value
            by_severity[sev] = by_severity.get(sev, 0) + 1

            # Count by type
            ptype = violation.policy_type.value
            by_type[ptype] = by_type.get(ptype, 0) + 1

        return {
            "total": len(self.violations),
            "by_severity": by_severity,
            "by_type": by_type
        }

    def clear_violations(self) -> None:
        """Clear violation history"""
        self.violations.clear()


# Global registry instance
_registry = None


def get_policy_cards() -> PolicyCardRegistry:
    """
    Get the global policy card registry.

    Returns:
        PolicyCardRegistry instance
    """
    global _registry
    if _registry is None:
        _registry = PolicyCardRegistry()
    return _registry


def evaluate_policies(
    context: Dict[str, Any],
    card_ids: Optional[List[str]] = None,
    tags: Optional[Set[str]] = None,
    raise_on_fatal: bool = True
) -> List[PolicyViolation]:
    """
    Convenience function to evaluate policies.

    Args:
        context: Context to evaluate
        card_ids: Specific card IDs to evaluate
        tags: Filter by tags
        raise_on_fatal: Raise exception on fatal violations

    Returns:
        List of violations

    Raises:
        RuntimeError: If fatal violations found and raise_on_fatal=True
    """
    registry = get_policy_cards()
    violations = registry.evaluate(context, card_ids=card_ids, tags=tags)

    if raise_on_fatal and registry.has_fatal_violations(violations):
        fatal_msgs = [v.message for v in violations if v.severity == PolicySeverity.FATAL]
        raise RuntimeError(f"Fatal policy violations: {', '.join(fatal_msgs)}")

    return violations
