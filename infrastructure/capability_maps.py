"""
Capability Maps - Agent skill matrix and capability registry.

Part of Layer 1 Orchestration:
- Maps agent capabilities to task requirements
- Enables intelligent agent selection
- Tracks capability evolution over time
"""

import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class CapabilityLevel(Enum):
    """Levels of capability proficiency."""
    NONE = 0
    BASIC = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4


@dataclass
class Capability:
    """A single capability definition."""
    name: str
    category: str
    description: str
    level: CapabilityLevel = CapabilityLevel.INTERMEDIATE
    prerequisites: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentCapabilityProfile:
    """Capability profile for an agent."""
    agent_id: str
    agent_name: str
    capabilities: Dict[str, CapabilityLevel] = field(default_factory=dict)
    specializations: List[str] = field(default_factory=list)
    performance_scores: Dict[str, float] = field(default_factory=dict)
    last_updated: float = 0.0


class CapabilityRegistry:
    """
    Registry for managing agent capabilities and skill matrices.

    Features:
    - Capability registration and lookup
    - Agent capability profiles
    - Capability-based agent matching
    - Skill gap analysis
    """

    def __init__(self):
        """Initialize the capability registry."""
        self._capabilities: Dict[str, Capability] = {}
        self._agent_profiles: Dict[str, AgentCapabilityProfile] = {}
        self._capability_categories: Dict[str, Set[str]] = {}

        # Register default capabilities
        self._register_default_capabilities()

    def _register_default_capabilities(self):
        """Register default Genesis capabilities."""
        defaults = [
            # Generation capabilities
            Capability("code_generation", "generation", "Generate code in various languages"),
            Capability("content_generation", "generation", "Generate written content"),
            Capability("design_generation", "generation", "Generate UI/UX designs"),
            Capability("api_generation", "generation", "Generate API definitions"),

            # Analysis capabilities
            Capability("code_analysis", "analysis", "Analyze code quality and patterns"),
            Capability("data_analysis", "analysis", "Analyze data and generate insights"),
            Capability("security_analysis", "analysis", "Identify security vulnerabilities"),
            Capability("performance_analysis", "analysis", "Analyze performance metrics"),

            # Deployment capabilities
            Capability("deployment", "deployment", "Deploy applications"),
            Capability("ci_cd", "deployment", "Configure CI/CD pipelines"),
            Capability("infrastructure", "deployment", "Manage infrastructure"),

            # Communication capabilities
            Capability("a2a_protocol", "communication", "Agent-to-agent communication"),
            Capability("api_integration", "communication", "Integrate with external APIs"),

            # Evolution capabilities
            Capability("self_improvement", "evolution", "Self-improvement through learning"),
            Capability("adaptation", "evolution", "Adapt to new requirements"),

            # Business capabilities
            Capability("business_logic", "business", "Implement business rules"),
            Capability("pricing", "business", "Pricing and monetization"),
            Capability("marketing", "business", "Marketing and promotion"),
        ]

        for cap in defaults:
            self.register_capability(cap)

    def register_capability(self, capability: Capability):
        """
        Register a new capability.

        Args:
            capability: Capability to register
        """
        self._capabilities[capability.name] = capability

        # Update category index
        if capability.category not in self._capability_categories:
            self._capability_categories[capability.category] = set()
        self._capability_categories[capability.category].add(capability.name)

        logger.debug(f"Registered capability: {capability.name}")

    def get_capability(self, name: str) -> Optional[Capability]:
        """
        Get a capability by name.

        Args:
            name: Capability name

        Returns:
            Capability or None
        """
        return self._capabilities.get(name)

    def get_capabilities_by_category(self, category: str) -> List[Capability]:
        """
        Get all capabilities in a category.

        Args:
            category: Category name

        Returns:
            List of capabilities
        """
        cap_names = self._capability_categories.get(category, set())
        return [self._capabilities[n] for n in cap_names if n in self._capabilities]

    def register_agent_profile(self, profile: AgentCapabilityProfile):
        """
        Register an agent's capability profile.

        Args:
            profile: Agent capability profile
        """
        import time
        profile.last_updated = time.time()
        self._agent_profiles[profile.agent_id] = profile
        logger.info(f"Registered profile for agent: {profile.agent_name}")

    def get_agent_profile(self, agent_id: str) -> Optional[AgentCapabilityProfile]:
        """
        Get an agent's capability profile.

        Args:
            agent_id: Agent ID

        Returns:
            Agent profile or None
        """
        return self._agent_profiles.get(agent_id)

    def update_agent_capability(
        self,
        agent_id: str,
        capability: str,
        level: CapabilityLevel,
        performance_score: Optional[float] = None
    ):
        """
        Update an agent's capability level.

        Args:
            agent_id: Agent ID
            capability: Capability name
            level: New capability level
            performance_score: Optional performance score
        """
        profile = self._agent_profiles.get(agent_id)
        if not profile:
            logger.warning(f"No profile found for agent: {agent_id}")
            return

        profile.capabilities[capability] = level
        if performance_score is not None:
            profile.performance_scores[capability] = performance_score

        import time
        profile.last_updated = time.time()

    def find_agents_with_capability(
        self,
        capability: str,
        min_level: CapabilityLevel = CapabilityLevel.BASIC
    ) -> List[AgentCapabilityProfile]:
        """
        Find agents with a specific capability.

        Args:
            capability: Capability name
            min_level: Minimum required level

        Returns:
            List of matching agent profiles
        """
        matches = []
        for profile in self._agent_profiles.values():
            agent_level = profile.capabilities.get(capability, CapabilityLevel.NONE)
            if agent_level.value >= min_level.value:
                matches.append(profile)

        # Sort by capability level (descending)
        matches.sort(
            key=lambda p: p.capabilities.get(capability, CapabilityLevel.NONE).value,
            reverse=True
        )

        return matches

    def match_task_requirements(
        self,
        requirements: Dict[str, CapabilityLevel]
    ) -> List[AgentCapabilityProfile]:
        """
        Find agents matching task requirements.

        Args:
            requirements: Dict of capability -> minimum level

        Returns:
            List of matching agents, sorted by match quality
        """
        matches = []

        for profile in self._agent_profiles.values():
            match_score = self._calculate_match_score(profile, requirements)
            if match_score > 0:
                matches.append((profile, match_score))

        # Sort by match score
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches]

    def _calculate_match_score(
        self,
        profile: AgentCapabilityProfile,
        requirements: Dict[str, CapabilityLevel]
    ) -> float:
        """Calculate match score for requirements."""
        if not requirements:
            return 1.0

        total_score = 0.0
        total_weight = 0.0

        for cap, required_level in requirements.items():
            agent_level = profile.capabilities.get(cap, CapabilityLevel.NONE)

            if agent_level.value >= required_level.value:
                # Met or exceeded requirement
                score = 1.0 + (agent_level.value - required_level.value) * 0.1
            elif agent_level.value > 0:
                # Partial capability
                score = agent_level.value / required_level.value * 0.5
            else:
                # No capability
                score = 0.0

            total_score += score
            total_weight += 1.0

        return total_score / total_weight if total_weight > 0 else 0.0

    def analyze_skill_gaps(
        self,
        agent_id: str,
        target_capabilities: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze skill gaps for an agent.

        Args:
            agent_id: Agent ID
            target_capabilities: Capabilities to check

        Returns:
            Skill gap analysis
        """
        profile = self._agent_profiles.get(agent_id)
        if not profile:
            return {"error": f"Agent not found: {agent_id}"}

        gaps = []
        strengths = []

        for cap_name in target_capabilities:
            level = profile.capabilities.get(cap_name, CapabilityLevel.NONE)
            capability = self._capabilities.get(cap_name)

            if level == CapabilityLevel.NONE:
                gaps.append({
                    "capability": cap_name,
                    "current_level": "none",
                    "recommendation": f"Training needed for {cap_name}"
                })
            elif level.value < CapabilityLevel.INTERMEDIATE.value:
                gaps.append({
                    "capability": cap_name,
                    "current_level": level.name.lower(),
                    "recommendation": f"Improve {cap_name} from {level.name} to INTERMEDIATE"
                })
            else:
                strengths.append({
                    "capability": cap_name,
                    "level": level.name.lower()
                })

        return {
            "agent_id": agent_id,
            "gaps": gaps,
            "strengths": strengths,
            "gap_count": len(gaps),
            "strength_count": len(strengths),
            "coverage": len(strengths) / len(target_capabilities) if target_capabilities else 1.0
        }

    def get_capability_matrix(self) -> Dict[str, Dict[str, str]]:
        """
        Get full capability matrix for all agents.

        Returns:
            Dict mapping agent_id -> capability -> level
        """
        matrix = {}

        for agent_id, profile in self._agent_profiles.items():
            matrix[agent_id] = {
                cap: level.name.lower()
                for cap, level in profile.capabilities.items()
            }

        return matrix

    def list_all_capabilities(self) -> List[Dict[str, Any]]:
        """
        List all registered capabilities.

        Returns:
            List of capability info dicts
        """
        return [
            {
                "name": cap.name,
                "category": cap.category,
                "description": cap.description
            }
            for cap in self._capabilities.values()
        ]


# Module-level factory function
def get_capability_registry() -> CapabilityRegistry:
    """Get a capability registry instance."""
    return CapabilityRegistry()
