"""
veRL (Volcano Engine RL) Integration for Genesis

This module provides integration between Genesis's training infrastructure
and the veRL/MATPO framework from ByteDance.

## veRL vs Genesis Training Infrastructure Comparison

### veRL (MATPO) Strengths:
1. **FSDP Backend**: Full distributed training with Ray-based orchestration
2. **Multi-Agent PPO**: Native support for planner/worker credit assignment
3. **GRPO Algorithm**: Sophisticated reward normalization
4. **vLLM/SGLang Integration**: Efficient inference during rollouts
5. **Checkpointing**: Robust checkpoint management

### Genesis Training Strengths:
1. **Local Ollama Support**: No GPU cluster required
2. **Evolution Strategies**: Gradient-free optimization
3. **TrajectoryPool**: Rich trajectory metadata and cross-learning
4. **DreamGym**: Synthetic data augmentation
5. **Business Context**: Integrated with autonomous business generation

### Decision: Hybrid Approach
Rather than replacing Genesis's training infrastructure with veRL entirely,
we integrate MATPO's key algorithms (GRPO, credit assignment, role prompts)
while keeping Genesis's local Ollama-based approach for resource efficiency.

Key MATPO components integrated:
1. matpo_reward_normalizer.py - GRPO reward normalization
2. matpo_role_prompts.py - Role-specific system prompts
3. matpo_credit_assignment.py - Multi-agent credit assignment

This module provides the bridge to use these integrations within
Genesis's existing training loops.
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

# Import MATPO integrations
from infrastructure.matpo_reward_normalizer import (
    MATPORewardNormalizer,
    TrajectoryPoolGRPOAdapter,
    NormalizedTrajectory,
    integrate_matpo_with_pool
)
from infrastructure.matpo_role_prompts import (
    RolePromptManager,
    MultiAgentPromptOrchestrator,
    AgentRoleType,
    get_agent_role,
    get_agent_system_prompt,
    get_agent_model
)
from infrastructure.matpo_credit_assignment import (
    MATPOCreditAssigner,
    CreditAssignmentMethod,
    MultiAgentTask,
    GenesisMultiAgentCreditIntegration,
    quick_credit_assignment
)

logger = logging.getLogger(__name__)


class TrainingBackend(Enum):
    """Available training backends"""
    GENESIS_ES = "genesis_es"        # Evolution Strategies (current)
    GENESIS_MGRPO = "genesis_mgrpo"  # Multi-agent GRPO (existing)
    MATPO_GRPO = "matpo_grpo"        # MATPO GRPO (new)
    HYBRID = "hybrid"                 # Combine ES + MATPO


@dataclass
class VeRLConfig:
    """Configuration for veRL integration"""
    # GRPO settings
    grpo_epsilon: float = 1e-6
    grpo_norm_by_std: bool = True

    # Credit assignment
    credit_method: str = "broadcast"
    planner_weight: float = 0.4

    # Role prompting
    use_role_prompts: bool = True
    planner_temperature: float = 0.5
    worker_temperature: float = 0.7

    # Training settings
    batch_size: int = 32
    elite_fraction: float = 0.2  # Top 20% for training updates


class VeRLGenesisIntegration:
    """
    Main integration class combining veRL/MATPO algorithms with Genesis.

    This provides a unified interface for:
    1. GRPO-normalized trajectory scoring
    2. Role-specific agent prompting
    3. Multi-agent credit assignment
    4. Training batch selection

    Usage:
        integration = VeRLGenesisIntegration()

        # During business generation
        task_id = integration.start_task("Build SaaS app", "spec_agent")
        integration.add_agent_result(task_id, "builder_agent", "code", 0.85)

        # After completion
        result = integration.complete_task(task_id, success=True, score=0.87)

        # Update trajectory pool
        integration.apply_to_trajectory_pool(trajectory_pool)
    """

    def __init__(self, config: Optional[VeRLConfig] = None):
        """Initialize veRL integration with Genesis."""
        self.config = config or VeRLConfig()

        # Initialize components
        self.reward_normalizer = MATPORewardNormalizer(
            epsilon=self.config.grpo_epsilon,
            norm_by_std=self.config.grpo_norm_by_std,
            planner_credit_weight=self.config.planner_weight
        )

        self.prompt_manager = RolePromptManager()
        self.prompt_orchestrator = MultiAgentPromptOrchestrator(self.prompt_manager)

        self.credit_integration = GenesisMultiAgentCreditIntegration(
            credit_method=CreditAssignmentMethod[self.config.credit_method.upper()]
        )

        # Trajectory pool adapter (initialized when pool is provided)
        self._pool_adapter: Optional[TrajectoryPoolGRPOAdapter] = None

        # Active tasks
        self.active_tasks: Dict[str, str] = {}  # business_id -> task_id

        logger.info(
            f"VeRLGenesisIntegration initialized: "
            f"credit_method={self.config.credit_method}, "
            f"role_prompts={self.config.use_role_prompts}"
        )

    def start_task(
        self,
        description: str,
        planner_agent: str,
        business_id: Optional[str] = None
    ) -> str:
        """
        Start a new multi-agent task.

        Args:
            description: Task description
            planner_agent: Name of the planning agent
            business_id: Optional business ID to track

        Returns:
            Task ID for tracking
        """
        task_id = self.credit_integration.start_multi_agent_task(
            description=description,
            planner_agent=planner_agent,
            business_id=business_id
        )

        # Create planner context for prompt orchestration
        if self.config.use_role_prompts:
            self.prompt_orchestrator.create_planner_context(
                task=description,
                business_context={"business_id": business_id} if business_id else None
            )

        if business_id:
            self.active_tasks[business_id] = task_id

        return task_id

    def add_agent_result(
        self,
        task_id: str,
        agent_name: str,
        subtask: str,
        score: float,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Add an agent's contribution to a task.

        Args:
            task_id: Task ID
            agent_name: Name of the contributing agent
            subtask: Description of subtask performed
            score: Agent's performance score (0-1 or 0-100)
            metadata: Additional metadata
        """
        self.credit_integration.add_worker_result(
            task_id=task_id,
            worker_agent=agent_name,
            subtask=subtask,
            score=score
        )

        # Record in prompt orchestrator for context isolation
        if self.config.use_role_prompts:
            role = get_agent_role(agent_name)
            context_id = f"worker_{agent_name}_{task_id}"
            self.prompt_orchestrator.create_worker_context(
                role=role,
                subtask=subtask,
                parent_context_id=task_id,
                isolated=True  # MATPO context isolation
            )

    def complete_task(
        self,
        task_id: str,
        success: bool,
        score: float
    ) -> Dict[str, Any]:
        """
        Complete a task and compute credit assignment.

        Args:
            task_id: Task ID
            success: Whether task succeeded
            score: Overall task score

        Returns:
            Dict with credits and summary
        """
        # Compute credit assignment
        credits = self.credit_integration.finalize_task(task_id, success, score)

        # Get task summary
        summary = self.credit_integration.assigner.get_task_summary(task_id)

        return {
            "credits": credits,
            "summary": summary,
            "success": success,
            "score": score
        }

    def get_agent_prompt(
        self,
        agent_name: str,
        task: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Get role-specific prompt for an agent.

        Args:
            agent_name: Name of the agent
            task: Task description
            context: Additional context

        Returns:
            Formatted system prompt
        """
        if not self.config.use_role_prompts:
            return task  # Return task as-is if role prompts disabled

        role = get_agent_role(agent_name)
        return self.prompt_manager.format_task_prompt(
            role=role,
            task=task,
            context=context
        )

    def get_model_for_agent(self, agent_name: str) -> str:
        """
        Get preferred Ollama model for an agent based on role.

        Args:
            agent_name: Name of the agent

        Returns:
            Ollama model string
        """
        return get_agent_model(agent_name)

    def integrate_with_pool(self, trajectory_pool) -> TrajectoryPoolGRPOAdapter:
        """
        Integrate MATPO GRPO with a TrajectoryPool.

        Args:
            trajectory_pool: Genesis TrajectoryPool instance

        Returns:
            Adapter with GRPO normalization
        """
        self._pool_adapter = integrate_matpo_with_pool(
            pool=trajectory_pool,
            epsilon=self.config.grpo_epsilon,
            planner_weight=self.config.planner_weight
        )
        return self._pool_adapter

    def apply_to_trajectory_pool(
        self,
        trajectory_pool,
        task_id: Optional[str] = None
    ):
        """
        Apply MATPO credits to trajectory pool.

        Args:
            trajectory_pool: Genesis TrajectoryPool instance
            task_id: Optional specific task to apply
        """
        if task_id:
            credits = self.credit_integration.assigner.compute_credit(
                task_id,
                self.credit_integration.assigner.tasks[task_id].task_success,
                self.credit_integration.assigner.tasks[task_id].task_score
            )
            self.credit_integration.apply_credits_to_pool(
                credits, trajectory_pool, task_id
            )
        else:
            # Apply all pending tasks
            for tid in self.credit_integration.assigner.tasks:
                task = self.credit_integration.assigner.tasks[tid]
                if task.completed_at:
                    self.credit_integration.apply_credits_to_pool(
                        {}, trajectory_pool, tid
                    )

    def select_training_batch(
        self,
        trajectory_pool,
        batch_size: Optional[int] = None
    ) -> List[Tuple[Any, NormalizedTrajectory]]:
        """
        Select trajectories for training with GRPO weighting.

        Args:
            trajectory_pool: Genesis TrajectoryPool instance
            batch_size: Number of trajectories to select

        Returns:
            List of (Trajectory, NormalizedTrajectory) tuples
        """
        if not self._pool_adapter:
            self._pool_adapter = self.integrate_with_pool(trajectory_pool)

        batch_size = batch_size or self.config.batch_size

        return self._pool_adapter.select_training_batch(
            batch_size=batch_size,
            prefer_positive_advantage=True,
            diversity_weight=0.3
        )

    def get_elite_trajectories(
        self,
        trajectory_pool,
        top_percent: Optional[float] = None
    ) -> List[Tuple[Any, NormalizedTrajectory]]:
        """
        Get elite trajectories for ES/GRPO training.

        Args:
            trajectory_pool: Genesis TrajectoryPool instance
            top_percent: Fraction to consider elite

        Returns:
            List of elite (Trajectory, NormalizedTrajectory) tuples
        """
        if not self._pool_adapter:
            self._pool_adapter = self.integrate_with_pool(trajectory_pool)

        top_percent = top_percent or self.config.elite_fraction

        return self._pool_adapter.get_elite_trajectories(top_percent=top_percent)

    def get_statistics(self) -> Dict[str, Any]:
        """Get integration statistics."""
        return {
            "normalizer": self.reward_normalizer.get_statistics(),
            "credit_assignment": self.credit_integration.assigner.get_statistics(),
            "active_tasks": len(self.active_tasks),
            "config": {
                "grpo_epsilon": self.config.grpo_epsilon,
                "credit_method": self.config.credit_method,
                "use_role_prompts": self.config.use_role_prompts
            }
        }


# Factory functions
def create_verl_integration(
    credit_method: str = "broadcast",
    use_role_prompts: bool = True
) -> VeRLGenesisIntegration:
    """
    Create a veRL integration instance.

    Args:
        credit_method: Credit assignment method (broadcast, hierarchical, temporal, etc.)
        use_role_prompts: Whether to use role-specific prompts

    Returns:
        Configured VeRLGenesisIntegration instance
    """
    config = VeRLConfig(
        credit_method=credit_method,
        use_role_prompts=use_role_prompts
    )
    return VeRLGenesisIntegration(config)


def quick_verl_credit(
    planner: str,
    workers: List[Tuple[str, str, float]],
    success: bool,
    score: float
) -> Dict[str, float]:
    """
    Quick credit assignment using MATPO GRPO.

    Args:
        planner: Planner agent name
        workers: List of (agent_name, subtask, score) tuples
        success: Task success
        score: Overall score

    Returns:
        Dict mapping agent names to credit
    """
    return quick_credit_assignment(
        planner_name=planner,
        planner_score=score,
        workers=workers,
        task_success=success,
        task_score=score
    )


# Convenience export
__all__ = [
    'VeRLGenesisIntegration',
    'VeRLConfig',
    'TrainingBackend',
    'create_verl_integration',
    'quick_verl_credit',
    # Re-export from MATPO modules
    'MATPORewardNormalizer',
    'MATPOCreditAssigner',
    'RolePromptManager',
    'AgentRoleType',
    'CreditAssignmentMethod'
]
