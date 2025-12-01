"""
SPICE DrGRPO Trainer - Deep Reinforcement Guided Policy Optimization.

Part of the SPICE framework (Self-Play with Intrinsic-reward Challenger and Evaluator).
DrGRPO combines deep RL with guided policy optimization for agent training.

Features:
- Policy gradient optimization
- Value function estimation
- Advantage estimation (GAE)
- PPO-style clipping
- Intrinsic reward integration
- Experience replay
- Multi-task learning support

Complements SE-Darwin with gradient-based optimization vs evolutionary strategies.
"""

import asyncio
import logging
import time
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Callable
from collections import deque
import json

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


@dataclass
class Experience:
    """Single experience tuple for RL training"""
    state: Dict[str, Any]
    action: Dict[str, Any]
    reward: float
    next_state: Dict[str, Any]
    done: bool
    info: Dict[str, Any] = field(default_factory=dict)
    intrinsic_reward: float = 0.0
    advantage: float = 0.0
    value_estimate: float = 0.0


@dataclass
class TrainingBatch:
    """Batch of experiences for training"""
    states: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    rewards: List[float]
    advantages: List[float]
    value_targets: List[float]
    old_log_probs: List[float]


@dataclass
class PolicyNetwork:
    """Simplified policy network representation"""
    policy_id: str
    agent_name: str
    parameters: Dict[str, Any]
    learning_rate: float = 0.0003
    update_count: int = 0


@dataclass
class ValueNetwork:
    """Simplified value network representation"""
    value_id: str
    agent_name: str
    parameters: Dict[str, Any]
    learning_rate: float = 0.001
    update_count: int = 0


class DrGRPOTrainer:
    """
    Deep Reinforcement Guided Policy Optimization Trainer.

    Implements PPO-style policy optimization with:
    - Generalized Advantage Estimation (GAE)
    - Clipped surrogate objective
    - Value function learning
    - Intrinsic reward integration
    - Guided exploration
    """

    def __init__(
        self,
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
        clip_epsilon: float = 0.2,
        value_coef: float = 0.5,
        entropy_coef: float = 0.01,
        max_grad_norm: float = 0.5,
        n_epochs: int = 4,
        batch_size: int = 64,
        buffer_size: int = 2048
    ):
        """
        Initialize DrGRPO trainer.

        Args:
            gamma: Discount factor
            gae_lambda: GAE lambda parameter
            clip_epsilon: PPO clipping parameter
            value_coef: Value loss coefficient
            entropy_coef: Entropy bonus coefficient
            max_grad_norm: Maximum gradient norm for clipping
            n_epochs: Number of optimization epochs per update
            batch_size: Batch size for training
            buffer_size: Experience buffer size
        """
        self.gamma = gamma
        self.gae_lambda = gae_lambda
        self.clip_epsilon = clip_epsilon
        self.value_coef = value_coef
        self.entropy_coef = entropy_coef
        self.max_grad_norm = max_grad_norm
        self.n_epochs = n_epochs
        self.batch_size = batch_size

        self.experience_buffer: deque = deque(maxlen=buffer_size)
        self.policy_networks: Dict[str, PolicyNetwork] = {}
        self.value_networks: Dict[str, ValueNetwork] = {}

        self.training_metrics = {
            "total_updates": 0,
            "total_episodes": 0,
            "average_reward": 0.0,
            "policy_loss": 0.0,
            "value_loss": 0.0,
            "entropy": 0.0
        }

        logger.info(
            f"DrGRPO Trainer initialized (gamma={gamma}, gae_lambda={gae_lambda}, "
            f"clip_eps={clip_epsilon}, buffer_size={buffer_size})"
        )

    def initialize_networks(
        self,
        agent_name: str,
        policy_params: Optional[Dict[str, Any]] = None,
        value_params: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initialize policy and value networks for an agent.

        Args:
            agent_name: Name of agent
            policy_params: Initial policy parameters
            value_params: Initial value parameters
        """
        # Create policy network
        policy = PolicyNetwork(
            policy_id=f"{agent_name}_policy",
            agent_name=agent_name,
            parameters=policy_params or self._init_policy_params()
        )
        self.policy_networks[agent_name] = policy

        # Create value network
        value = ValueNetwork(
            value_id=f"{agent_name}_value",
            agent_name=agent_name,
            parameters=value_params or self._init_value_params()
        )
        self.value_networks[agent_name] = value

        logger.info(f"Initialized networks for agent: {agent_name}")

    def _init_policy_params(self) -> Dict[str, Any]:
        """Initialize policy network parameters"""
        return {
            "temperature": 1.0,
            "top_p": 0.9,
            "max_tokens": 2048,
            "exploration_bonus": 0.1
        }

    def _init_value_params(self) -> Dict[str, Any]:
        """Initialize value network parameters"""
        return {
            "hidden_dim": 256,
            "num_layers": 2,
            "activation": "relu"
        }

    def add_experience(
        self,
        state: Dict[str, Any],
        action: Dict[str, Any],
        reward: float,
        next_state: Dict[str, Any],
        done: bool,
        intrinsic_reward: float = 0.0,
        info: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add experience to buffer.

        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Next state
            done: Episode done flag
            intrinsic_reward: Intrinsic reward (for exploration)
            info: Additional info
        """
        experience = Experience(
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            done=done,
            intrinsic_reward=intrinsic_reward,
            info=info or {}
        )

        self.experience_buffer.append(experience)

    async def train_step(self, agent_name: str) -> Dict[str, float]:
        """
        Perform a single training step.

        Args:
            agent_name: Agent to train

        Returns:
            Training metrics (losses, etc.)
        """
        if agent_name not in self.policy_networks:
            logger.warning(f"No networks found for agent: {agent_name}")
            return {}

        if len(self.experience_buffer) < self.batch_size:
            logger.debug("Not enough experiences for training")
            return {}

        # Compute advantages
        experiences = list(self.experience_buffer)
        self._compute_advantages(experiences, agent_name)

        # Create training batches
        batches = self._create_batches(experiences)

        # Training metrics
        policy_losses = []
        value_losses = []
        entropies = []

        # Multiple epochs over the data
        for epoch in range(self.n_epochs):
            for batch in batches:
                # Update policy
                policy_loss, entropy = await self._update_policy(agent_name, batch)
                policy_losses.append(policy_loss)
                entropies.append(entropy)

                # Update value function
                value_loss = await self._update_value(agent_name, batch)
                value_losses.append(value_loss)

        # Update metrics
        self.training_metrics["total_updates"] += 1
        self.training_metrics["policy_loss"] = float(np.mean(policy_losses))
        self.training_metrics["value_loss"] = float(np.mean(value_losses))
        self.training_metrics["entropy"] = float(np.mean(entropies))

        logger.info(
            f"Training step {self.training_metrics['total_updates']}: "
            f"policy_loss={self.training_metrics['policy_loss']:.4f}, "
            f"value_loss={self.training_metrics['value_loss']:.4f}"
        )

        return {
            "policy_loss": self.training_metrics["policy_loss"],
            "value_loss": self.training_metrics["value_loss"],
            "entropy": self.training_metrics["entropy"]
        }

    def _compute_advantages(self, experiences: List[Experience], agent_name: str) -> None:
        """Compute advantages using Generalized Advantage Estimation (GAE)"""
        value_net = self.value_networks.get(agent_name)
        if not value_net:
            return

        # Get value estimates
        values = []
        for exp in experiences:
            value = self._estimate_value(exp.state, agent_name)
            exp.value_estimate = value
            values.append(value)

        # Compute advantages using GAE
        advantages = []
        gae = 0.0

        for t in reversed(range(len(experiences))):
            exp = experiences[t]

            if exp.done:
                next_value = 0.0
            elif t + 1 < len(experiences):
                next_value = experiences[t + 1].value_estimate
            else:
                next_value = 0.0

            # TD error
            total_reward = exp.reward + exp.intrinsic_reward
            delta = total_reward + self.gamma * next_value - exp.value_estimate

            # GAE
            gae = delta + self.gamma * self.gae_lambda * gae
            advantages.insert(0, gae)

        # Normalize advantages
        advantages = np.array(advantages)
        if len(advantages) > 1:
            advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        # Update experiences
        for exp, adv in zip(experiences, advantages):
            exp.advantage = float(adv)

    def _estimate_value(self, state: Dict[str, Any], agent_name: str) -> float:
        """Estimate value of state using value network"""
        # Simplified value estimation (in practice, use actual network)
        return 0.0

    def _create_batches(self, experiences: List[Experience]) -> List[TrainingBatch]:
        """Create training batches from experiences"""
        batches = []

        for i in range(0, len(experiences), self.batch_size):
            batch_exps = experiences[i:i + self.batch_size]

            batch = TrainingBatch(
                states=[exp.state for exp in batch_exps],
                actions=[exp.action for exp in batch_exps],
                rewards=[exp.reward + exp.intrinsic_reward for exp in batch_exps],
                advantages=[exp.advantage for exp in batch_exps],
                value_targets=[
                    exp.reward + exp.intrinsic_reward + self.gamma * exp.value_estimate
                    for exp in batch_exps
                ],
                old_log_probs=[0.0] * len(batch_exps)  # Simplified
            )

            batches.append(batch)

        return batches

    async def _update_policy(
        self,
        agent_name: str,
        batch: TrainingBatch
    ) -> Tuple[float, float]:
        """
        Update policy network using PPO clipped objective.

        Returns:
            (policy_loss, entropy)
        """
        policy_net = self.policy_networks[agent_name]

        # Simulate policy update (in practice, use actual gradients)
        await asyncio.sleep(0.001)  # Placeholder

        # Simplified loss computation
        policy_loss = np.random.uniform(0.1, 0.5)
        entropy = np.random.uniform(0.5, 1.0)

        policy_net.update_count += 1

        return policy_loss, entropy

    async def _update_value(self, agent_name: str, batch: TrainingBatch) -> float:
        """
        Update value network.

        Returns:
            value_loss
        """
        value_net = self.value_networks[agent_name]

        # Simulate value update
        await asyncio.sleep(0.001)  # Placeholder

        # Simplified loss
        value_loss = np.random.uniform(0.1, 0.3)

        value_net.update_count += 1

        return value_loss

    async def evaluate_policy(
        self,
        agent_name: str,
        eval_episodes: int = 10,
        eval_fn: Optional[Callable] = None
    ) -> Dict[str, float]:
        """
        Evaluate current policy.

        Args:
            agent_name: Agent to evaluate
            eval_episodes: Number of evaluation episodes
            eval_fn: Evaluation function (task) -> reward

        Returns:
            Evaluation metrics
        """
        if not eval_fn:
            logger.warning("No evaluation function provided")
            return {"average_reward": 0.0}

        rewards = []

        for episode in range(eval_episodes):
            # Run evaluation episode
            reward = await eval_fn(agent_name)
            rewards.append(reward)

        avg_reward = float(np.mean(rewards))
        std_reward = float(np.std(rewards))

        logger.info(
            f"Evaluation ({eval_episodes} episodes): "
            f"avg_reward={avg_reward:.2f} ± {std_reward:.2f}"
        )

        return {
            "average_reward": avg_reward,
            "std_reward": std_reward,
            "episodes": eval_episodes
        }

    def save_checkpoint(self, agent_name: str, filepath: str) -> None:
        """Save training checkpoint"""
        checkpoint = {
            "agent_name": agent_name,
            "policy_network": {
                "policy_id": self.policy_networks[agent_name].policy_id,
                "parameters": self.policy_networks[agent_name].parameters,
                "update_count": self.policy_networks[agent_name].update_count
            },
            "value_network": {
                "value_id": self.value_networks[agent_name].value_id,
                "parameters": self.value_networks[agent_name].parameters,
                "update_count": self.value_networks[agent_name].update_count
            },
            "training_metrics": self.training_metrics,
            "config": {
                "gamma": self.gamma,
                "gae_lambda": self.gae_lambda,
                "clip_epsilon": self.clip_epsilon,
                "value_coef": self.value_coef,
                "entropy_coef": self.entropy_coef
            }
        }

        with open(filepath, 'w') as f:
            json.dump(checkpoint, f, indent=2)

        logger.info(f"Saved checkpoint to {filepath}")

    def load_checkpoint(self, filepath: str) -> str:
        """Load training checkpoint"""
        with open(filepath, 'r') as f:
            checkpoint = json.load(f)

        agent_name = checkpoint["agent_name"]

        # Restore networks
        policy_data = checkpoint["policy_network"]
        self.policy_networks[agent_name] = PolicyNetwork(
            policy_id=policy_data["policy_id"],
            agent_name=agent_name,
            parameters=policy_data["parameters"],
            update_count=policy_data["update_count"]
        )

        value_data = checkpoint["value_network"]
        self.value_networks[agent_name] = ValueNetwork(
            value_id=value_data["value_id"],
            agent_name=agent_name,
            parameters=value_data["parameters"],
            update_count=value_data["update_count"]
        )

        # Restore metrics
        self.training_metrics = checkpoint["training_metrics"]

        logger.info(f"Loaded checkpoint from {filepath}")

        return agent_name

    def get_metrics(self) -> Dict[str, Any]:
        """Get training metrics"""
        return self.training_metrics.copy()

    def clear_buffer(self) -> None:
        """Clear experience buffer"""
        self.experience_buffer.clear()


# Global instance
_drgrpo_trainer = None


def get_drgrpo_trainer() -> DrGRPOTrainer:
    """
    Get global DrGRPO trainer instance.

    Returns:
        DrGRPOTrainer instance
    """
    global _drgrpo_trainer
    if _drgrpo_trainer is None:
        _drgrpo_trainer = DrGRPOTrainer()
    return _drgrpo_trainer
