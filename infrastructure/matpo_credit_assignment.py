"""
MATPO Credit Assignment for Genesis Multi-Agent Tasks

Implements multi-agent credit assignment based on MATPO's approach:
- Main agent (planner) receives direct task reward
- Worker agents receive broadcasted reward from parent task
- Advantage broadcasting propagates planner success to workers
- Turn-based ordering maintains temporal credit structure

Reference: external/MATPO/verl/protocol.py (broadcast_advantage_return_tensor_by_reqs_ids)

Key Features:
1. Hierarchical credit: Planner -> Workers
2. Temporal credit: Earlier contributions weighted higher
3. Outcome-based credit: Task success/failure affects all participants
4. Counterfactual credit: What would have happened without this agent?
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class CreditAssignmentMethod(Enum):
    """Methods for distributing credit in multi-agent tasks"""
    BROADCAST = "broadcast"          # MATPO: planner credit -> all workers
    COUNTERFACTUAL = "counterfactual"  # Shapley-like value estimation
    TEMPORAL_DECAY = "temporal_decay"  # Earlier agents get more credit
    EQUAL = "equal"                  # Simple equal distribution
    HIERARCHICAL = "hierarchical"    # Based on agent role hierarchy


@dataclass
class AgentContribution:
    """Record of an agent's contribution to a multi-agent task"""
    agent_id: str
    agent_name: str
    role: str  # "planner" or "worker"
    parent_agent_id: Optional[str] = None  # For workers, links to planner

    # Contribution metrics
    raw_score: float = 0.0
    normalized_score: float = 0.0
    credit_weight: float = 1.0
    assigned_credit: float = 0.0

    # Temporal info
    turn_count: int = 0  # When in the sequence this agent acted
    execution_time_ms: float = 0.0

    # Task info
    task_id: str = ""
    subtask_description: str = ""
    status: str = "pending"  # pending, success, partial, failed

    # Metadata
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MultiAgentTask:
    """A multi-agent task with planner and worker contributions"""
    task_id: str
    description: str
    planner_contribution: Optional[AgentContribution] = None
    worker_contributions: List[AgentContribution] = field(default_factory=list)

    # Overall task outcome
    task_success: bool = False
    task_score: float = 0.0

    # Credit assignment results
    credit_method: str = CreditAssignmentMethod.BROADCAST.value
    total_credit_distributed: float = 0.0

    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None


class MATPOCreditAssigner:
    """
    MATPO-style credit assignment for multi-agent workflows.

    Implements the broadcast_advantage pattern from MATPO where:
    1. Main agent (planner) computes advantage from task outcome
    2. Advantage is broadcast to all worker agents based on parent relationship
    3. Workers contribute to training weighted by planner's advantage

    This enables end-to-end multi-agent RL training with proper credit attribution.
    """

    def __init__(
        self,
        default_method: CreditAssignmentMethod = CreditAssignmentMethod.BROADCAST,
        planner_base_weight: float = 0.4,
        temporal_decay_factor: float = 0.9,
        success_bonus: float = 0.5,
        failure_penalty: float = 0.3
    ):
        """
        Initialize credit assigner.

        Args:
            default_method: Default credit assignment method
            planner_base_weight: Base weight for planner in hierarchical assignment
            temporal_decay_factor: Decay factor for earlier turns (closer to 1 = less decay)
            success_bonus: Bonus credit for successful tasks
            failure_penalty: Penalty for failed tasks
        """
        self.default_method = default_method
        self.planner_base_weight = planner_base_weight
        self.temporal_decay_factor = temporal_decay_factor
        self.success_bonus = success_bonus
        self.failure_penalty = failure_penalty

        # Tracking
        self.tasks: Dict[str, MultiAgentTask] = {}
        self.total_tasks_processed = 0

        logger.info(
            f"MATPOCreditAssigner initialized: method={default_method.value}, "
            f"planner_weight={planner_base_weight}"
        )

    def create_task(
        self,
        description: str,
        task_id: Optional[str] = None
    ) -> MultiAgentTask:
        """Create a new multi-agent task for tracking."""
        task_id = task_id or f"task_{uuid.uuid4().hex[:8]}"

        task = MultiAgentTask(
            task_id=task_id,
            description=description
        )

        self.tasks[task_id] = task
        return task

    def register_planner(
        self,
        task_id: str,
        agent_name: str,
        raw_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentContribution:
        """
        Register the planner agent for a task.

        Args:
            task_id: Task ID
            agent_name: Name of the planner agent
            raw_score: Planner's raw performance score
            metadata: Additional metadata

        Returns:
            AgentContribution for the planner
        """
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        contribution = AgentContribution(
            agent_id=f"planner_{uuid.uuid4().hex[:8]}",
            agent_name=agent_name,
            role="planner",
            raw_score=raw_score,
            task_id=task_id,
            turn_count=0,
            metadata=metadata or {}
        )

        task.planner_contribution = contribution
        return contribution

    def register_worker(
        self,
        task_id: str,
        agent_name: str,
        subtask_description: str,
        raw_score: float = 0.0,
        turn_count: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentContribution:
        """
        Register a worker agent contribution.

        Args:
            task_id: Task ID
            agent_name: Name of the worker agent
            subtask_description: Description of the subtask
            raw_score: Worker's raw performance score
            turn_count: Turn in sequence (auto-increments if not provided)
            metadata: Additional metadata

        Returns:
            AgentContribution for the worker
        """
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if not task.planner_contribution:
            raise ValueError(f"Task {task_id} has no registered planner")

        # Auto-increment turn count if not provided
        if turn_count is None:
            turn_count = len(task.worker_contributions) + 1

        contribution = AgentContribution(
            agent_id=f"worker_{uuid.uuid4().hex[:8]}",
            agent_name=agent_name,
            role="worker",
            parent_agent_id=task.planner_contribution.agent_id,
            raw_score=raw_score,
            task_id=task_id,
            subtask_description=subtask_description,
            turn_count=turn_count,
            metadata=metadata or {}
        )

        task.worker_contributions.append(contribution)
        return contribution

    def compute_credit(
        self,
        task_id: str,
        task_success: bool,
        task_score: float,
        method: Optional[CreditAssignmentMethod] = None
    ) -> Dict[str, float]:
        """
        Compute credit assignment for all agents in a task.

        This is the main entry point implementing MATPO's credit assignment.

        Args:
            task_id: Task ID
            task_success: Whether the overall task succeeded
            task_score: Overall task score (0-1 or 0-100)
            method: Credit assignment method (uses default if None)

        Returns:
            Dict mapping agent_id to assigned credit
        """
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        method = method or self.default_method
        task.task_success = task_success
        task.task_score = task_score
        task.credit_method = method.value

        # Normalize task score to 0-1
        normalized_task_score = task_score / 100.0 if task_score > 1 else task_score

        # Dispatch to appropriate method
        if method == CreditAssignmentMethod.BROADCAST:
            credits = self._broadcast_credit(task, normalized_task_score, task_success)
        elif method == CreditAssignmentMethod.HIERARCHICAL:
            credits = self._hierarchical_credit(task, normalized_task_score, task_success)
        elif method == CreditAssignmentMethod.TEMPORAL_DECAY:
            credits = self._temporal_decay_credit(task, normalized_task_score, task_success)
        elif method == CreditAssignmentMethod.COUNTERFACTUAL:
            credits = self._counterfactual_credit(task, normalized_task_score, task_success)
        else:  # EQUAL
            credits = self._equal_credit(task, normalized_task_score, task_success)

        # Update task
        task.total_credit_distributed = sum(credits.values())
        task.completed_at = datetime.now().isoformat()
        self.total_tasks_processed += 1

        logger.info(
            f"Credit computed for task {task_id}: method={method.value}, "
            f"total_credit={task.total_credit_distributed:.3f}"
        )

        return credits

    def _broadcast_credit(
        self,
        task: MultiAgentTask,
        task_score: float,
        task_success: bool
    ) -> Dict[str, float]:
        """
        MATPO broadcast credit: planner's advantage propagates to all workers.

        Based on broadcast_advantage_return_tensor_by_reqs_ids pattern.
        """
        credits = {}

        # Compute planner advantage
        planner = task.planner_contribution
        outcome_adjustment = self.success_bonus if task_success else -self.failure_penalty

        # Planner gets full task credit + outcome bonus
        planner_credit = task_score + outcome_adjustment
        planner.assigned_credit = planner_credit
        credits[planner.agent_id] = planner_credit

        # Workers get broadcasted planner advantage
        # MATPO pattern: worker_advantage = planner_advantage (broadcast)
        for worker in task.worker_contributions:
            # Worker credit = planner credit * worker's individual score ratio
            if planner.raw_score > 0:
                individual_ratio = worker.raw_score / max(planner.raw_score, 0.01)
            else:
                individual_ratio = 0.5  # Neutral if planner has no score

            worker_credit = planner_credit * min(individual_ratio, 1.5)  # Cap at 1.5x
            worker.assigned_credit = worker_credit
            credits[worker.agent_id] = worker_credit

        return credits

    def _hierarchical_credit(
        self,
        task: MultiAgentTask,
        task_score: float,
        task_success: bool
    ) -> Dict[str, float]:
        """
        Hierarchical credit: planner gets base weight, workers share remainder.
        """
        credits = {}
        outcome_adjustment = self.success_bonus if task_success else -self.failure_penalty
        total_credit = task_score + outcome_adjustment

        # Planner gets base weight
        planner = task.planner_contribution
        planner_credit = total_credit * self.planner_base_weight
        planner.assigned_credit = planner_credit
        credits[planner.agent_id] = planner_credit

        # Workers share remaining credit weighted by their scores
        remaining_credit = total_credit * (1 - self.planner_base_weight)
        total_worker_score = sum(w.raw_score for w in task.worker_contributions) or 1

        for worker in task.worker_contributions:
            score_ratio = worker.raw_score / total_worker_score
            worker_credit = remaining_credit * score_ratio
            worker.assigned_credit = worker_credit
            credits[worker.agent_id] = worker_credit

        return credits

    def _temporal_decay_credit(
        self,
        task: MultiAgentTask,
        task_score: float,
        task_success: bool
    ) -> Dict[str, float]:
        """
        Temporal decay: earlier contributions get more credit.
        """
        credits = {}
        outcome_adjustment = self.success_bonus if task_success else -self.failure_penalty
        base_credit = task_score + outcome_adjustment

        # Planner (turn 0) gets highest credit
        planner = task.planner_contribution
        planner_credit = base_credit * (self.temporal_decay_factor ** 0)  # = base_credit
        planner.assigned_credit = planner_credit
        credits[planner.agent_id] = planner_credit

        # Workers get decayed credit based on turn order
        for worker in task.worker_contributions:
            decay = self.temporal_decay_factor ** worker.turn_count
            worker_credit = base_credit * decay * (worker.raw_score / 100.0 if worker.raw_score > 1 else worker.raw_score)
            worker.assigned_credit = worker_credit
            credits[worker.agent_id] = worker_credit

        return credits

    def _counterfactual_credit(
        self,
        task: MultiAgentTask,
        task_score: float,
        task_success: bool
    ) -> Dict[str, float]:
        """
        Counterfactual credit: estimate each agent's marginal contribution.

        Simplified Shapley-like value: contribution = score_with - score_without
        Approximated by: individual_score * (task_score / sum_of_scores)
        """
        credits = {}
        outcome_adjustment = self.success_bonus if task_success else -self.failure_penalty

        # Collect all scores
        all_contributions = [task.planner_contribution] + task.worker_contributions
        total_raw_score = sum(c.raw_score for c in all_contributions) or 1

        # Each agent's marginal contribution
        for contrib in all_contributions:
            # Counterfactual: if this agent wasn't there, what would we lose?
            # Approximated as proportional to their score contribution
            marginal_contribution = (contrib.raw_score / total_raw_score) * task_score
            credit = marginal_contribution + outcome_adjustment * (contrib.raw_score / total_raw_score)
            contrib.assigned_credit = credit
            credits[contrib.agent_id] = credit

        return credits

    def _equal_credit(
        self,
        task: MultiAgentTask,
        task_score: float,
        task_success: bool
    ) -> Dict[str, float]:
        """
        Equal credit: all agents get the same credit.
        """
        credits = {}
        outcome_adjustment = self.success_bonus if task_success else -self.failure_penalty
        total_credit = task_score + outcome_adjustment

        all_contributions = [task.planner_contribution] + task.worker_contributions
        per_agent_credit = total_credit / len(all_contributions)

        for contrib in all_contributions:
            contrib.assigned_credit = per_agent_credit
            credits[contrib.agent_id] = per_agent_credit

        return credits

    def get_task_summary(self, task_id: str) -> Dict[str, Any]:
        """Get summary of credit assignment for a task."""
        task = self.tasks.get(task_id)
        if not task:
            return {}

        return {
            "task_id": task.task_id,
            "description": task.description,
            "task_success": task.task_success,
            "task_score": task.task_score,
            "credit_method": task.credit_method,
            "total_credit_distributed": task.total_credit_distributed,
            "planner": {
                "agent_name": task.planner_contribution.agent_name,
                "raw_score": task.planner_contribution.raw_score,
                "assigned_credit": task.planner_contribution.assigned_credit
            } if task.planner_contribution else None,
            "workers": [
                {
                    "agent_name": w.agent_name,
                    "subtask": w.subtask_description,
                    "turn": w.turn_count,
                    "raw_score": w.raw_score,
                    "assigned_credit": w.assigned_credit
                }
                for w in task.worker_contributions
            ],
            "created_at": task.created_at,
            "completed_at": task.completed_at
        }

    def get_agent_credits(self, agent_name: str) -> List[Dict[str, Any]]:
        """Get all credit assignments for an agent across tasks."""
        results = []

        for task in self.tasks.values():
            if task.planner_contribution and task.planner_contribution.agent_name == agent_name:
                results.append({
                    "task_id": task.task_id,
                    "role": "planner",
                    "credit": task.planner_contribution.assigned_credit
                })

            for worker in task.worker_contributions:
                if worker.agent_name == agent_name:
                    results.append({
                        "task_id": task.task_id,
                        "role": "worker",
                        "subtask": worker.subtask_description,
                        "credit": worker.assigned_credit
                    })

        return results

    def get_statistics(self) -> Dict[str, Any]:
        """Get overall credit assignment statistics."""
        if not self.tasks:
            return {"total_tasks": 0}

        successful_tasks = sum(1 for t in self.tasks.values() if t.task_success)
        total_credit = sum(t.total_credit_distributed for t in self.tasks.values())

        return {
            "total_tasks": len(self.tasks),
            "successful_tasks": successful_tasks,
            "success_rate": successful_tasks / len(self.tasks),
            "total_credit_distributed": total_credit,
            "avg_credit_per_task": total_credit / len(self.tasks),
            "config": {
                "default_method": self.default_method.value,
                "planner_base_weight": self.planner_base_weight,
                "temporal_decay_factor": self.temporal_decay_factor
            }
        }


class GenesisMultiAgentCreditIntegration:
    """
    Integration layer connecting MATPO credit assignment with Genesis TrajectoryPool.

    Usage:
        integration = GenesisMultiAgentCreditIntegration()

        # During task execution
        task_id = integration.start_multi_agent_task("Build website", "spec_agent")
        integration.add_worker_result(task_id, "builder_agent", "Generate code", 0.85)
        integration.add_worker_result(task_id, "deploy_agent", "Deploy to Railway", 0.90)

        # After task completion
        credits = integration.finalize_task(task_id, success=True, score=0.87)

        # Update TrajectoryPool with credits
        integration.apply_credits_to_pool(credits, trajectory_pool)
    """

    def __init__(self, credit_method: CreditAssignmentMethod = CreditAssignmentMethod.BROADCAST):
        self.assigner = MATPOCreditAssigner(default_method=credit_method)
        self.active_tasks: Dict[str, str] = {}  # Maps business_id -> task_id

    def start_multi_agent_task(
        self,
        description: str,
        planner_agent: str,
        business_id: Optional[str] = None
    ) -> str:
        """Start a new multi-agent task and register the planner."""
        task = self.assigner.create_task(description)
        self.assigner.register_planner(task.task_id, planner_agent)

        if business_id:
            self.active_tasks[business_id] = task.task_id

        return task.task_id

    def add_worker_result(
        self,
        task_id: str,
        worker_agent: str,
        subtask: str,
        score: float
    ) -> AgentContribution:
        """Add a worker's contribution to the task."""
        return self.assigner.register_worker(
            task_id=task_id,
            agent_name=worker_agent,
            subtask_description=subtask,
            raw_score=score
        )

    def finalize_task(
        self,
        task_id: str,
        success: bool,
        score: float
    ) -> Dict[str, float]:
        """Finalize task and compute credit assignment."""
        return self.assigner.compute_credit(task_id, success, score)

    def apply_credits_to_pool(
        self,
        credits: Dict[str, float],
        trajectory_pool,  # TrajectoryPool instance
        task_id: str
    ):
        """
        Apply computed credits to TrajectoryPool for training.

        This updates trajectory scores based on MATPO credit assignment.
        """
        task = self.assigner.tasks.get(task_id)
        if not task:
            return

        # Map agent IDs to trajectory IDs and update scores
        for contrib in [task.planner_contribution] + task.worker_contributions:
            if not contrib:
                continue

            # Find trajectory for this agent
            for traj_id, traj in trajectory_pool.trajectories.items():
                if traj.agent_name == contrib.agent_name:
                    # Blend original score with MATPO credit
                    original = traj.success_score
                    matpo_credit = contrib.assigned_credit
                    # Weighted average: 70% original, 30% MATPO credit
                    traj.success_score = original * 0.7 + matpo_credit * 0.3 * 100

                    if hasattr(traj, 'metadata') and traj.metadata:
                        traj.metadata['matpo_credit'] = matpo_credit
                        traj.metadata['matpo_task_id'] = task_id

        logger.info(f"Applied MATPO credits to {len(credits)} agents in trajectory pool")


# Convenience functions
def create_credit_assigner(method: str = "broadcast") -> MATPOCreditAssigner:
    """Factory function to create a credit assigner."""
    method_map = {
        "broadcast": CreditAssignmentMethod.BROADCAST,
        "hierarchical": CreditAssignmentMethod.HIERARCHICAL,
        "temporal": CreditAssignmentMethod.TEMPORAL_DECAY,
        "counterfactual": CreditAssignmentMethod.COUNTERFACTUAL,
        "equal": CreditAssignmentMethod.EQUAL
    }
    return MATPOCreditAssigner(default_method=method_map.get(method, CreditAssignmentMethod.BROADCAST))


def quick_credit_assignment(
    planner_name: str,
    planner_score: float,
    workers: List[Tuple[str, str, float]],  # (name, subtask, score)
    task_success: bool,
    task_score: float,
    method: str = "broadcast"
) -> Dict[str, float]:
    """
    Quick credit assignment for a multi-agent task.

    Args:
        planner_name: Name of planner agent
        planner_score: Planner's raw score
        workers: List of (agent_name, subtask_description, raw_score) tuples
        task_success: Whether task succeeded
        task_score: Overall task score
        method: Credit assignment method

    Returns:
        Dict mapping agent names to credit
    """
    assigner = create_credit_assigner(method)
    task = assigner.create_task("Quick task")

    planner = assigner.register_planner(task.task_id, planner_name, planner_score)

    for name, subtask, score in workers:
        assigner.register_worker(task.task_id, name, subtask, score)

    credits = assigner.compute_credit(task.task_id, task_success, task_score)

    # Convert agent IDs to names
    task_obj = assigner.tasks[task.task_id]
    name_credits = {planner_name: task_obj.planner_contribution.assigned_credit}

    for worker in task_obj.worker_contributions:
        name_credits[worker.agent_name] = worker.assigned_credit

    return name_credits
