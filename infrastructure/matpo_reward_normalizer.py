"""
MATPO Reward Normalizer - Group Relative Policy Optimization for Genesis

Integrates MATPO's GRPO reward normalization algorithm with Genesis TrajectoryPool.
Based on: https://github.com/mzf666/MATPO

Key Improvements over raw scores:
- Group-based normalization: (score - mean) / (std + epsilon)
- Handles single-sample groups gracefully (mean=0, std=1)
- Multi-agent credit assignment for planner/worker tasks
- Role-specific advantage computation

Reference: external/MATPO/verl/trainer/ppo/core_algos.py lines 167-221
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class AgentRole(Enum):
    """Agent roles in multi-agent task decomposition"""
    PLANNER = "planner"  # High-level task orchestration
    WORKER = "worker"    # Subtask execution
    HYBRID = "hybrid"    # Both planning and execution


@dataclass
class NormalizedTrajectory:
    """Trajectory with GRPO-normalized advantages"""
    trajectory_id: str
    raw_score: float
    normalized_advantage: float
    group_id: str  # Task/problem grouping for normalization
    agent_role: str = AgentRole.HYBRID.value
    credit_weight: float = 1.0  # Multi-agent credit assignment weight

    # Group statistics (for debugging/analysis)
    group_mean: float = 0.0
    group_std: float = 1.0


@dataclass
class GroupStatistics:
    """Statistics for a trajectory group"""
    group_id: str
    scores: List[float] = field(default_factory=list)
    mean: float = 0.0
    std: float = 1.0
    trajectory_count: int = 0


class MATPORewardNormalizer:
    """
    GRPO (Group Relative Policy Optimization) reward normalizer

    Implements the normalization algorithm from MATPO:
    normalized_score = (score - group_mean) / (group_std + epsilon)

    Key features:
    - Groups trajectories by task/problem for fair comparison
    - Handles single-sample groups (fallback to mean=0, std=1)
    - Supports multi-agent credit assignment
    - Role-aware normalization for planner vs worker agents
    """

    def __init__(
        self,
        epsilon: float = 1e-6,
        norm_by_std: bool = True,
        planner_credit_weight: float = 0.6,
        worker_credit_weight: float = 0.4,
    ):
        """
        Initialize MATPO reward normalizer.

        Args:
            epsilon: Small constant to prevent division by zero
            norm_by_std: Whether to normalize by std (True = full GRPO, False = mean-only)
            planner_credit_weight: Credit weight for planner agents (0-1)
            worker_credit_weight: Credit weight for worker agents (0-1)
        """
        self.epsilon = epsilon
        self.norm_by_std = norm_by_std
        self.planner_credit_weight = planner_credit_weight
        self.worker_credit_weight = worker_credit_weight

        # Statistics tracking
        self.group_stats: Dict[str, GroupStatistics] = {}
        self.total_normalized = 0

        logger.info(
            f"MATPORewardNormalizer initialized: epsilon={epsilon}, "
            f"norm_by_std={norm_by_std}, planner_weight={planner_credit_weight}"
        )

    def compute_group_statistics(
        self,
        trajectories: List[Dict[str, Any]],
        group_key: str = "task_type"
    ) -> Dict[str, GroupStatistics]:
        """
        Compute mean and std for each trajectory group.

        Args:
            trajectories: List of trajectory dicts with 'success_score' and group_key
            group_key: Key to group trajectories by (e.g., 'task_type', 'problem_id')

        Returns:
            Dictionary mapping group_id to GroupStatistics
        """
        # Group scores by group_id
        id2scores: Dict[str, List[float]] = defaultdict(list)

        for traj in trajectories:
            group_id = traj.get(group_key, "default")
            score = traj.get("success_score", 0.0)
            id2scores[group_id].append(score)

        # Compute statistics for each group
        stats = {}
        for group_id, scores in id2scores.items():
            if len(scores) == 1:
                # Single sample: use neutral normalization (MATPO approach)
                mean = 0.0
                std = 1.0
            else:
                mean = sum(scores) / len(scores)
                variance = sum((s - mean) ** 2 for s in scores) / len(scores)
                std = variance ** 0.5

            stats[group_id] = GroupStatistics(
                group_id=group_id,
                scores=scores,
                mean=mean,
                std=std,
                trajectory_count=len(scores)
            )

        self.group_stats = stats
        return stats

    def normalize_score(
        self,
        score: float,
        group_id: str,
        agent_role: str = AgentRole.HYBRID.value
    ) -> NormalizedTrajectory:
        """
        Normalize a single score using GRPO algorithm.

        Args:
            score: Raw success score (0-1 or 0-100)
            group_id: Group this trajectory belongs to
            agent_role: Role of the agent (planner/worker/hybrid)

        Returns:
            NormalizedTrajectory with advantage and credit weight
        """
        # Get or create group statistics
        if group_id not in self.group_stats:
            # New group - use neutral normalization
            self.group_stats[group_id] = GroupStatistics(
                group_id=group_id,
                scores=[score],
                mean=0.0,
                std=1.0,
                trajectory_count=1
            )

        stats = self.group_stats[group_id]

        # GRPO normalization: (score - mean) / (std + epsilon)
        if self.norm_by_std:
            normalized = (score - stats.mean) / (stats.std + self.epsilon)
        else:
            # Mean-only normalization
            normalized = score - stats.mean

        # Determine credit weight based on role
        if agent_role == AgentRole.PLANNER.value:
            credit_weight = self.planner_credit_weight
        elif agent_role == AgentRole.WORKER.value:
            credit_weight = self.worker_credit_weight
        else:
            credit_weight = 1.0  # Hybrid gets full credit

        self.total_normalized += 1

        return NormalizedTrajectory(
            trajectory_id=f"norm_{self.total_normalized}",
            raw_score=score,
            normalized_advantage=normalized * credit_weight,
            group_id=group_id,
            agent_role=agent_role,
            credit_weight=credit_weight,
            group_mean=stats.mean,
            group_std=stats.std
        )

    def normalize_batch(
        self,
        trajectories: List[Dict[str, Any]],
        group_key: str = "task_type",
        score_key: str = "success_score",
        role_key: str = "agent_role"
    ) -> List[NormalizedTrajectory]:
        """
        Normalize a batch of trajectories using GRPO.

        This is the main entry point for batch normalization.

        Args:
            trajectories: List of trajectory dicts
            group_key: Key for grouping trajectories
            score_key: Key for raw score
            role_key: Key for agent role

        Returns:
            List of NormalizedTrajectory objects
        """
        if not trajectories:
            return []

        # First pass: compute group statistics
        self.compute_group_statistics(trajectories, group_key)

        # Second pass: normalize each trajectory
        normalized = []
        for traj in trajectories:
            group_id = traj.get(group_key, "default")
            score = traj.get(score_key, 0.0)
            role = traj.get(role_key, AgentRole.HYBRID.value)

            norm_traj = self.normalize_score(score, group_id, role)
            norm_traj.trajectory_id = traj.get("trajectory_id", norm_traj.trajectory_id)
            normalized.append(norm_traj)

        logger.info(
            f"Normalized {len(normalized)} trajectories across "
            f"{len(self.group_stats)} groups"
        )

        return normalized

    def compute_multi_agent_credit(
        self,
        planner_score: float,
        worker_scores: List[float],
        task_success: bool
    ) -> Dict[str, float]:
        """
        Compute credit assignment for multi-agent task.

        Based on MATPO's broadcast_advantage_return_tensor_by_reqs_ids pattern.

        Args:
            planner_score: Score of the planner agent
            worker_scores: Scores of worker agents
            task_success: Whether overall task succeeded

        Returns:
            Dict with 'planner_credit' and 'worker_credits' list
        """
        # Overall task outcome affects all agents
        outcome_bonus = 0.5 if task_success else -0.2

        # Planner gets credit proportional to worker success
        avg_worker_score = sum(worker_scores) / len(worker_scores) if worker_scores else 0.5
        planner_credit = (
            planner_score * self.planner_credit_weight +
            avg_worker_score * (1 - self.planner_credit_weight) +
            outcome_bonus
        )

        # Workers get individual credit with planner influence
        worker_credits = []
        for w_score in worker_scores:
            credit = (
                w_score * self.worker_credit_weight +
                planner_score * (1 - self.worker_credit_weight) * 0.5 +
                outcome_bonus * 0.5
            )
            worker_credits.append(credit)

        return {
            "planner_credit": planner_credit,
            "worker_credits": worker_credits,
            "outcome_bonus": outcome_bonus
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Get normalizer statistics"""
        return {
            "total_normalized": self.total_normalized,
            "num_groups": len(self.group_stats),
            "groups": {
                gid: {
                    "count": stats.trajectory_count,
                    "mean": stats.mean,
                    "std": stats.std
                }
                for gid, stats in self.group_stats.items()
            },
            "config": {
                "epsilon": self.epsilon,
                "norm_by_std": self.norm_by_std,
                "planner_weight": self.planner_credit_weight,
                "worker_weight": self.worker_credit_weight
            }
        }


class TrajectoryPoolGRPOAdapter:
    """
    Adapter to integrate MATPO reward normalization with Genesis TrajectoryPool.

    Usage:
        from infrastructure.trajectory_pool import TrajectoryPool
        from infrastructure.matpo_reward_normalizer import TrajectoryPoolGRPOAdapter

        pool = TrajectoryPool(agent_name="builder")
        adapter = TrajectoryPoolGRPOAdapter(pool)

        # Get GRPO-normalized advantages
        normalized = adapter.get_normalized_advantages()

        # Select trajectories for training with GRPO weighting
        training_batch = adapter.select_training_batch(batch_size=32)
    """

    def __init__(
        self,
        trajectory_pool,  # TrajectoryPool instance
        normalizer: Optional[MATPORewardNormalizer] = None,
        group_by: str = "operator_applied"  # Default grouping
    ):
        """
        Initialize adapter.

        Args:
            trajectory_pool: Genesis TrajectoryPool instance
            normalizer: MATPORewardNormalizer (creates default if None)
            group_by: Field to group trajectories by for normalization
        """
        self.pool = trajectory_pool
        self.normalizer = normalizer or MATPORewardNormalizer()
        self.group_by = group_by

        # Cache for normalized trajectories
        self._normalized_cache: Optional[List[NormalizedTrajectory]] = None
        self._cache_generation: int = 0

    def get_normalized_advantages(
        self,
        force_refresh: bool = False
    ) -> List[NormalizedTrajectory]:
        """
        Get GRPO-normalized advantages for all trajectories in pool.

        Args:
            force_refresh: Force recomputation even if cached

        Returns:
            List of NormalizedTrajectory objects
        """
        # Check if cache is valid
        current_gen = self.pool.total_added
        if (
            not force_refresh and
            self._normalized_cache is not None and
            self._cache_generation == current_gen
        ):
            return self._normalized_cache

        # Convert pool trajectories to dicts for normalization
        traj_dicts = []
        for traj in self.pool.get_all_trajectories():
            traj_dict = {
                "trajectory_id": traj.trajectory_id,
                "success_score": traj.success_score,
                self.group_by: getattr(traj, self.group_by, "default"),
                "agent_role": self._infer_agent_role(traj)
            }
            traj_dicts.append(traj_dict)

        # Normalize using GRPO
        self._normalized_cache = self.normalizer.normalize_batch(
            traj_dicts,
            group_key=self.group_by,
            score_key="success_score",
            role_key="agent_role"
        )
        self._cache_generation = current_gen

        return self._normalized_cache

    def _infer_agent_role(self, trajectory) -> str:
        """Infer agent role from trajectory metadata."""
        # Check metadata for explicit role
        if hasattr(trajectory, 'metadata') and trajectory.metadata:
            role = trajectory.metadata.get('agent_role')
            if role:
                return role

        # Infer from operator type
        if trajectory.operator_applied == "baseline":
            return AgentRole.PLANNER.value
        elif trajectory.operator_applied in ("revision", "refinement"):
            return AgentRole.WORKER.value

        return AgentRole.HYBRID.value

    def select_training_batch(
        self,
        batch_size: int = 32,
        prefer_positive_advantage: bool = True,
        diversity_weight: float = 0.3
    ) -> List[Tuple[Any, NormalizedTrajectory]]:
        """
        Select trajectories for training, weighted by GRPO advantage.

        Args:
            batch_size: Number of trajectories to select
            prefer_positive_advantage: Prefer trajectories with positive advantage
            diversity_weight: Weight for diversity in selection (0-1)

        Returns:
            List of (Trajectory, NormalizedTrajectory) tuples
        """
        normalized = self.get_normalized_advantages()

        if not normalized:
            return []

        # Sort by normalized advantage
        sorted_normalized = sorted(
            normalized,
            key=lambda n: n.normalized_advantage,
            reverse=prefer_positive_advantage
        )

        # Select with diversity
        selected = []
        used_groups = set()

        for norm_traj in sorted_normalized:
            if len(selected) >= batch_size:
                break

            # Diversity: prefer different groups
            group_penalty = 1.0 if norm_traj.group_id not in used_groups else (1.0 - diversity_weight)

            # Get original trajectory
            original = self.pool.get_trajectory(norm_traj.trajectory_id)
            if original:
                selected.append((original, norm_traj))
                used_groups.add(norm_traj.group_id)

        return selected

    def get_elite_trajectories(
        self,
        top_percent: float = 0.2
    ) -> List[Tuple[Any, NormalizedTrajectory]]:
        """
        Get elite trajectories (top % by normalized advantage).

        Useful for ES/GRPO training where only elites update the policy.

        Args:
            top_percent: Fraction of trajectories to consider elite (0-1)

        Returns:
            List of (Trajectory, NormalizedTrajectory) tuples
        """
        normalized = self.get_normalized_advantages()

        if not normalized:
            return []

        # Sort by advantage (descending)
        sorted_normalized = sorted(
            normalized,
            key=lambda n: n.normalized_advantage,
            reverse=True
        )

        # Take top percent
        elite_count = max(1, int(len(sorted_normalized) * top_percent))
        elites = sorted_normalized[:elite_count]

        result = []
        for norm_traj in elites:
            original = self.pool.get_trajectory(norm_traj.trajectory_id)
            if original:
                result.append((original, norm_traj))

        return result

    def compute_policy_gradient_weights(self) -> Dict[str, float]:
        """
        Compute weights for policy gradient update based on GRPO advantages.

        Returns:
            Dict mapping trajectory_id to weight for gradient update
        """
        normalized = self.get_normalized_advantages()

        weights = {}
        for norm_traj in normalized:
            # Advantage serves as weight (can be negative for failed trajectories)
            weights[norm_traj.trajectory_id] = norm_traj.normalized_advantage

        return weights


def integrate_matpo_with_pool(
    pool,  # TrajectoryPool
    epsilon: float = 1e-6,
    planner_weight: float = 0.6
) -> TrajectoryPoolGRPOAdapter:
    """
    Factory function to create MATPO-integrated TrajectoryPool.

    Args:
        pool: Existing TrajectoryPool instance
        epsilon: GRPO epsilon for numerical stability
        planner_weight: Credit weight for planner agents

    Returns:
        TrajectoryPoolGRPOAdapter with MATPO normalization
    """
    normalizer = MATPORewardNormalizer(
        epsilon=epsilon,
        planner_credit_weight=planner_weight,
        worker_credit_weight=1.0 - planner_weight
    )

    return TrajectoryPoolGRPOAdapter(pool, normalizer)
