# Rapid Integration Plan: 4 Systems Same-Day Deployment

**Date:** November 12, 2025
**Timeline:** SAME DAY (8-10 hours total)
**Target:** Install all 4 integrations (#69-72) in production by end of day
**Engineer Count:** 1-2 engineers working in parallel

---

## Executive Summary

This plan deploys all 4 critical integrations from the research analysis in a **single day** using:
- **Parallel implementation** (2 engineers working simultaneously)
- **MVP approach** (core functionality first, optimizations later)
- **Aggressive testing** (continuous validation during implementation)
- **Agent assignment** (leverage existing 25 Genesis agents for validation)

**Risk Level:** MEDIUM-HIGH (rapid deployment, but with comprehensive testing)
**Mitigation:** Fallback to current system via feature flags, extensive monitoring

---

## Hour-by-Hour Schedule (10-Hour Day)

### Phase 1: IterResearch + Dr. MAMR (Hours 1-5)

**Engineer A: IterResearch Workspace Manager**
**Engineer B: Dr. MAMR Attribution Layer**

### Phase 2: AgileThinker + Tongyi-DeepResearch (Hours 6-9)

**Engineer A: AgileThinker Dual-Thread Router**
**Engineer B: Tongyi-DeepResearch Client**

### Phase 3: Integration Testing + Audit (Hour 10)

**Both Engineers: Full system validation**

---

## Detailed Implementation Plans

---

## INTEGRATION #69: IterResearch Workspace Manager

**Location:** `infrastructure/iterresearch_workspace.py`
**Engineer:** Engineer A
**Timeline:** Hours 1-3 (Implementation) + Hour 5 (Testing)
**Dependencies:** TrajectoryPool, SE-Darwin

### Hour 1: Core Workspace Implementation (60 min)

**Tasks:**
1. Create `IterResearchWorkspace` class (20 min)
2. Implement `evolving_report` structure (15 min)
3. Add `interaction_history` tracking (15 min)
4. Implement basic synthesis logic (10 min)

**Code to Write:**

```python
# infrastructure/iterresearch_workspace.py
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio
import json
from pathlib import Path

from infrastructure.local_llm_client import get_local_llm_client
from infrastructure.load_env import load_genesis_env

load_genesis_env()

@dataclass
class Interaction:
    """Single interaction in the reasoning chain."""
    step_number: int
    timestamp: str
    agent_name: str
    action: str
    observation: str
    reasoning: str
    quality_score: float = 0.0

@dataclass
class Insight:
    """Key insight extracted from interactions."""
    content: str
    confidence: float
    supporting_steps: List[int]
    category: str  # "strategy", "learning", "warning", "success"

class IterResearchWorkspace:
    """
    Markovian state reconstruction for long-horizon reasoning.
    Maintains evolving report across 2048+ interactions.
    Based on arXiv:2511.07327 IterResearch paper.
    """
    def __init__(
        self,
        task_id: str,
        max_interactions: int = 2048,
        synthesis_threshold: int = 50,
        storage_dir: Optional[Path] = None
    ):
        self.task_id = task_id
        self.max_interactions = max_interactions
        self.synthesis_threshold = synthesis_threshold
        self.storage_dir = storage_dir or Path("data/workspaces")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Core state
        self.evolving_report: Dict[str, Any] = {
            "task_id": task_id,
            "created_at": datetime.now().isoformat(),
            "current_state": "initializing",
            "key_insights": [],
            "next_actions": [],
            "quality_trend": [],
            "agent_contributions": {}
        }
        self.interaction_history: List[Interaction] = []
        self.synthesis_count = 0

        # LLM client for synthesis
        self.llm_client = get_local_llm_client()

    async def add_interaction(
        self,
        agent_name: str,
        action: str,
        observation: str,
        reasoning: str,
        quality_score: float = 0.0
    ) -> None:
        """Add interaction and trigger synthesis if threshold reached."""
        interaction = Interaction(
            step_number=len(self.interaction_history) + 1,
            timestamp=datetime.now().isoformat(),
            agent_name=agent_name,
            action=action,
            observation=observation,
            reasoning=reasoning,
            quality_score=quality_score
        )

        self.interaction_history.append(interaction)

        # Update agent contributions
        if agent_name not in self.evolving_report["agent_contributions"]:
            self.evolving_report["agent_contributions"][agent_name] = {
                "interaction_count": 0,
                "avg_quality": 0.0,
                "total_quality": 0.0
            }

        contrib = self.evolving_report["agent_contributions"][agent_name]
        contrib["interaction_count"] += 1
        contrib["total_quality"] += quality_score
        contrib["avg_quality"] = contrib["total_quality"] / contrib["interaction_count"]

        # Track quality trend
        self.evolving_report["quality_trend"].append({
            "step": interaction.step_number,
            "score": quality_score,
            "agent": agent_name
        })

        # Periodic synthesis
        if len(self.interaction_history) % self.synthesis_threshold == 0:
            await self._synthesize_workspace()

    async def _synthesize_workspace(self) -> None:
        """Periodic workspace reconstruction to prevent context suffocation."""
        self.synthesis_count += 1

        # Get recent interactions
        recent_interactions = self.interaction_history[-self.synthesis_threshold:]

        # Extract insights using LLM
        insights = await self._extract_insights(recent_interactions)

        # Update evolving report
        self.evolving_report["current_state"] = self._summarize_state(recent_interactions)
        self.evolving_report["key_insights"].extend(insights)
        self.evolving_report["next_actions"] = self._recommend_actions(insights)
        self.evolving_report["last_synthesis"] = datetime.now().isoformat()
        self.evolving_report["synthesis_count"] = self.synthesis_count

        # Keep only top 20 insights (prevent bloat)
        self.evolving_report["key_insights"] = sorted(
            self.evolving_report["key_insights"],
            key=lambda x: x.confidence,
            reverse=True
        )[:20]

        # Persist to disk
        await self._save_workspace()

    async def _extract_insights(self, interactions: List[Interaction]) -> List[Insight]:
        """Extract key learnings from interaction sequence using LLM."""
        # Format interactions for LLM
        interaction_text = "\n\n".join([
            f"Step {i.step_number} ({i.agent_name}):\n"
            f"Action: {i.action}\n"
            f"Observation: {i.observation}\n"
            f"Reasoning: {i.reasoning}\n"
            f"Quality: {i.quality_score:.2f}"
            for i in interactions[-10:]  # Last 10 for context
        ])

        prompt = f"""Analyze these recent interactions and extract 3-5 key insights.
Focus on: successful patterns, failure modes, strategic learnings, and quality trends.

Recent Interactions:
{interaction_text}

Extract insights in this format:
INSIGHT 1: [brief insight] (confidence: 0.0-1.0) (category: strategy/learning/warning/success)
INSIGHT 2: ...

Insights:"""

        try:
            response = await self.llm_client.complete(prompt, max_tokens=500, temperature=0.3)

            # Parse insights (simple regex-based parsing)
            insights = []
            for line in response.split('\n'):
                if line.startswith('INSIGHT'):
                    # Extract content, confidence, category
                    # Simple parsing - production would use structured output
                    content = line.split(':', 1)[1].split('(')[0].strip()
                    insights.append(Insight(
                        content=content,
                        confidence=0.7,  # Default
                        supporting_steps=[i.step_number for i in interactions[-5:]],
                        category="learning"
                    ))

            return insights[:5]  # Max 5 insights per synthesis

        except Exception as e:
            # Fallback: heuristic-based insights
            return [
                Insight(
                    content=f"Average quality in recent steps: {sum(i.quality_score for i in interactions) / len(interactions):.2f}",
                    confidence=1.0,
                    supporting_steps=[i.step_number for i in interactions],
                    category="learning"
                )
            ]

    def _summarize_state(self, interactions: List[Interaction]) -> str:
        """Summarize current reasoning state."""
        if not interactions:
            return "No interactions yet"

        latest = interactions[-1]
        avg_quality = sum(i.quality_score for i in interactions) / len(interactions)
        unique_agents = len(set(i.agent_name for i in interactions))

        return f"Step {latest.step_number}: {latest.agent_name} | Avg Quality: {avg_quality:.2f} | {unique_agents} agents involved"

    def _recommend_actions(self, insights: List[Insight]) -> List[str]:
        """Recommend next actions based on insights."""
        actions = []

        # Analyze quality trend
        if len(self.evolving_report["quality_trend"]) >= 5:
            recent_quality = [q["score"] for q in self.evolving_report["quality_trend"][-5:]]
            avg_recent = sum(recent_quality) / len(recent_quality)

            if avg_recent < 0.5:
                actions.append("CRITICAL: Quality declining - consider restart or different agent")
            elif avg_recent > 0.8:
                actions.append("SUCCESS: Quality high - continue current strategy")

        # Analyze agent contributions
        if self.evolving_report["agent_contributions"]:
            top_agent = max(
                self.evolving_report["agent_contributions"].items(),
                key=lambda x: x[1]["avg_quality"]
            )
            actions.append(f"STRATEGY: Agent '{top_agent[0]}' performing best (quality: {top_agent[1]['avg_quality']:.2f})")

        return actions[:5]  # Max 5 recommendations

    def get_workspace_context(self) -> str:
        """Get compressed workspace representation for next interaction."""
        return f"""# Workspace Context (Task: {self.task_id})

## Current State
{self.evolving_report.get('current_state', 'N/A')}

## Key Insights ({len(self.evolving_report.get('key_insights', []))})
{chr(10).join(f"- {insight.content} (confidence: {insight.confidence:.2f})" for insight in self.evolving_report.get('key_insights', [])[:5])}

## Recommended Next Actions
{chr(10).join(f"- {action}" for action in self.evolving_report.get('next_actions', []))}

## Agent Performance
{chr(10).join(f"- {agent}: {data['avg_quality']:.2f} ({data['interaction_count']} interactions)" for agent, data in list(self.evolving_report.get('agent_contributions', {}).items())[:5])}

## Progress
- Total Steps: {len(self.interaction_history)}
- Synthesis Count: {self.synthesis_count}
- Last Synthesis: {self.evolving_report.get('last_synthesis', 'Never')}
"""

    async def _save_workspace(self) -> None:
        """Persist workspace to disk."""
        workspace_file = self.storage_dir / f"{self.task_id}_workspace.json"

        # Convert to JSON-serializable format
        workspace_data = {
            "evolving_report": self.evolving_report,
            "interaction_count": len(self.interaction_history),
            "synthesis_count": self.synthesis_count,
            "recent_interactions": [
                {
                    "step": i.step_number,
                    "agent": i.agent_name,
                    "action": i.action[:100],  # Truncate
                    "quality": i.quality_score
                }
                for i in self.interaction_history[-20:]  # Last 20
            ]
        }

        with open(workspace_file, 'w') as f:
            json.dump(workspace_data, f, indent=2)

    async def load_workspace(self) -> None:
        """Load workspace from disk."""
        workspace_file = self.storage_dir / f"{self.task_id}_workspace.json"

        if workspace_file.exists():
            with open(workspace_file, 'r') as f:
                workspace_data = json.load(f)
                self.evolving_report = workspace_data["evolving_report"]
                self.synthesis_count = workspace_data["synthesis_count"]

    def get_metrics(self) -> Dict[str, Any]:
        """Get workspace metrics for monitoring."""
        if not self.interaction_history:
            return {"status": "empty"}

        return {
            "total_interactions": len(self.interaction_history),
            "synthesis_count": self.synthesis_count,
            "avg_quality": sum(i.quality_score for i in self.interaction_history) / len(self.interaction_history),
            "unique_agents": len(set(i.agent_name for i in self.interaction_history)),
            "insights_count": len(self.evolving_report.get("key_insights", [])),
            "quality_trend": "improving" if self._is_quality_improving() else "declining",
            "context_efficiency": 1.0 - (len(self.interaction_history) / self.max_interactions)
        }

    def _is_quality_improving(self) -> bool:
        """Check if quality is improving over time."""
        if len(self.evolving_report["quality_trend"]) < 10:
            return True  # Not enough data

        first_half = [q["score"] for q in self.evolving_report["quality_trend"][:len(self.evolving_report["quality_trend"])//2]]
        second_half = [q["score"] for q in self.evolving_report["quality_trend"][len(self.evolving_report["quality_trend"])//2:]]

        return sum(second_half) / len(second_half) > sum(first_half) / len(first_half)


# Factory function for easy instantiation
def create_workspace(task_id: str) -> IterResearchWorkspace:
    """Create a new IterResearch workspace for a task."""
    return IterResearchWorkspace(task_id=task_id)
```

### Hour 2: TrajectoryPool Integration (60 min)

**Tasks:**
1. Add workspace snapshot to Trajectory dataclass (10 min)
2. Modify TrajectoryPool to support workspace storage (20 min)
3. Create workspace retrieval methods (20 min)
4. Test integration (10 min)

**Code to Modify:**

```python
# infrastructure/trajectory_pool.py - ADD THIS

from infrastructure.iterresearch_workspace import IterResearchWorkspace, Interaction

class TrajectoryPool:
    # ... existing code ...

    def __init__(self, ...):
        # ... existing init ...
        self.workspace: Optional[IterResearchWorkspace] = None

    def attach_workspace(self, task_id: str) -> IterResearchWorkspace:
        """Attach an IterResearch workspace to this trajectory pool."""
        self.workspace = IterResearchWorkspace(task_id=task_id)
        return self.workspace

    async def add_trajectory_with_workspace(
        self,
        trajectory: Trajectory,
        workspace_snapshot: Optional[Dict] = None
    ) -> None:
        """Add trajectory and optionally save workspace snapshot."""
        self.add_trajectory(trajectory)

        if self.workspace and workspace_snapshot:
            # Store workspace snapshot in trajectory metadata
            trajectory.metadata = trajectory.metadata or {}
            trajectory.metadata["workspace_snapshot"] = workspace_snapshot

    def get_workspace_history(self, task_id: str) -> List[Dict]:
        """Get workspace evolution for a specific task."""
        workspaces = []
        for trajectory in self.trajectories:
            if (trajectory.metadata and
                "workspace_snapshot" in trajectory.metadata and
                trajectory.metadata.get("task_id") == task_id):
                workspaces.append(trajectory.metadata["workspace_snapshot"])
        return workspaces
```

### Hour 3: HTDAG Integration (60 min)

**Tasks:**
1. Add workspace parameter to TaskDAG (15 min)
2. Modify HTDAGPlanner to create workspace for complex tasks (20 min)
3. Add workspace context to agent invocations (15 min)
4. Test end-to-end flow (10 min)

**Code to Modify:**

```python
# infrastructure/htdag_planner.py - ADD THIS

from infrastructure.iterresearch_workspace import create_workspace

class HTDAGPlanner:
    # ... existing code ...

    async def decompose_task(
        self,
        task: str,
        enable_workspace: bool = True
    ) -> TaskDAG:
        """
        Decompose task into hierarchical DAG.
        If enable_workspace=True and task is complex, attach IterResearch workspace.
        """
        dag = await self._original_decompose_task(task)

        # Attach workspace for complex tasks (>5 subtasks or >50 interactions expected)
        if enable_workspace and (len(dag.nodes) > 5 or self._is_complex_task(task)):
            task_id = f"{dag.root_id}_workspace"
            workspace = create_workspace(task_id)
            dag.metadata["workspace"] = workspace
            dag.metadata["workspace_enabled"] = True

        return dag

    def _is_complex_task(self, task: str) -> bool:
        """Heuristic to detect complex tasks needing workspace."""
        complexity_keywords = [
            "research", "investigate", "analyze", "comprehensive",
            "multi-step", "iterative", "refine", "optimize"
        ]
        return any(keyword in task.lower() for keyword in complexity_keywords)
```

### Hour 5: Integration Testing (60 min)

**Test Script:** `scripts/test_iterresearch_integration.py`

```python
# scripts/test_iterresearch_integration.py
import asyncio
from infrastructure.iterresearch_workspace import create_workspace, Interaction

async def test_workspace_basic():
    """Test basic workspace operations."""
    workspace = create_workspace("test_task_001")

    # Add interactions
    for i in range(55):  # Trigger synthesis at 50
        await workspace.add_interaction(
            agent_name=f"agent_{i % 3}",
            action=f"Execute step {i}",
            observation=f"Completed step {i}",
            reasoning=f"Reasoning for step {i}",
            quality_score=0.7 + (i % 10) * 0.03
        )

    # Check metrics
    metrics = workspace.get_metrics()
    assert metrics["total_interactions"] == 55
    assert metrics["synthesis_count"] == 1
    assert metrics["unique_agents"] == 3

    # Check workspace context
    context = workspace.get_workspace_context()
    assert "Current State" in context
    assert "Key Insights" in context

    print("[OK] Basic workspace test passed")
    print(f"Metrics: {metrics}")

async def test_workspace_with_trajectorypool():
    """Test workspace integration with TrajectoryPool."""
    from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus, OperatorType
    import uuid

    pool = TrajectoryPool(agent_name="test_agent")
    workspace = pool.attach_workspace("test_task_002")

    # Add interactions to workspace
    await workspace.add_interaction(
        agent_name="builder_agent",
        action="Build auth system",
        observation="Auth system created",
        reasoning="Used JWT approach",
        quality_score=0.92
    )

    # Add trajectory with workspace snapshot
    trajectory = Trajectory(
        trajectory_id=str(uuid.uuid4()),
        generation=1,
        agent_name="builder_agent",
        operator_applied=OperatorType.BASELINE.value,
        code_changes="Added auth",
        problem_diagnosis="Need auth",
        proposed_strategy="JWT",
        status=TrajectoryStatus.SUCCESS.value,
        success_score=0.92,
        test_results={},
        tools_used=[],
        modified_files=[],
        execution_time_seconds=10.0
    )

    await pool.add_trajectory_with_workspace(
        trajectory,
        workspace_snapshot=workspace.evolving_report
    )

    print("[OK] TrajectoryPool integration test passed")

async def main():
    print("Testing IterResearch Integration...")
    print("-" * 60)

    await test_workspace_basic()
    await test_workspace_with_trajectorypool()

    print("-" * 60)
    print("[SUCCESS] All IterResearch tests passed!")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## INTEGRATION #70: Dr. MAMR Attribution Layer

**Location:** `infrastructure/swarm/dr_mamr_attribution.py`
**Engineer:** Engineer B
**Timeline:** Hours 1-3 (Implementation) + Hour 5 (Testing)
**Dependencies:** HALO Router, A2A Connector, Inclusive Fitness

### Hour 1: Core Attribution Implementation (60 min)

**Code to Write:**

```python
# infrastructure/swarm/dr_mamr_attribution.py
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from collections import defaultdict
import asyncio
import json
from pathlib import Path
from datetime import datetime

from infrastructure.load_env import load_genesis_env
from infrastructure.error_handler import log_error_with_context, ErrorCategory, ErrorSeverity

load_genesis_env()

import logging
logger = logging.getLogger(__name__)

class ShapleyValueCalculator:
    """
    Compute Shapley values for agent contributions using coalition sampling.
    Based on Dr. MAMR paper (arXiv:2511.02303).
    """
    def __init__(self, num_samples: int = 10):
        self.num_samples = num_samples

    async def compute_shapley_values(
        self,
        agents: List[str],
        task: str,
        result_quality: float,
        agent_outputs: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Compute Shapley values via coalition sampling.

        Shapley value = average marginal contribution across all coalitions.
        For efficiency, sample random coalitions instead of exhaustive enumeration.
        """
        shapley_values = {agent: 0.0 for agent in agents}

        if len(agents) == 1:
            # Single agent gets all credit
            return {agents[0]: 1.0}

        # Sample coalitions
        for _ in range(self.num_samples):
            # Random permutation of agents
            permutation = np.random.permutation(agents).tolist()

            # Compute marginal contributions
            for i, agent in enumerate(permutation):
                # Coalition without this agent
                coalition_without = set(permutation[:i])
                # Coalition with this agent
                coalition_with = set(permutation[:i+1])

                # Estimate value difference (marginal contribution)
                value_without = self._estimate_coalition_value(
                    coalition_without, result_quality, agent_outputs
                )
                value_with = self._estimate_coalition_value(
                    coalition_with, result_quality, agent_outputs
                )

                marginal_contribution = value_with - value_without
                shapley_values[agent] += marginal_contribution

        # Average over samples
        shapley_values = {
            agent: value / self.num_samples
            for agent, value in shapley_values.items()
        }

        # Normalize to sum to 1.0
        total = sum(shapley_values.values())
        if total > 0:
            shapley_values = {
                agent: value / total
                for agent, value in shapley_values.items()
            }

        return shapley_values

    def _estimate_coalition_value(
        self,
        coalition: set,
        result_quality: float,
        agent_outputs: Dict[str, Any]
    ) -> float:
        """
        Estimate value of a coalition.
        Heuristic: proportional to result quality and coalition size.
        """
        if not coalition:
            return 0.0

        # Simple heuristic: value = quality * coalition_contribution
        # In practice, this would evaluate the coalition's actual output
        coalition_contribution = sum(
            self._get_agent_output_quality(agent, agent_outputs)
            for agent in coalition
        ) / len(coalition)

        return result_quality * coalition_contribution

    def _get_agent_output_quality(self, agent: str, agent_outputs: Dict[str, Any]) -> float:
        """Get quality score for an agent's output (0.0-1.0)."""
        if agent not in agent_outputs:
            return 0.5  # Default

        output = agent_outputs[agent]
        # Extract quality from output metadata
        if isinstance(output, dict) and "quality" in output:
            return output["quality"]

        return 0.7  # Default good quality


class RestartTokenManager:
    """
    Manage restart tokens for deliberation reset.
    Issues tokens when quality drops below threshold.
    """
    def __init__(self, quality_threshold: float = 0.3):
        self.quality_threshold = quality_threshold
        self.restart_history: List[Dict] = []

    async def check_restart_needed(
        self,
        task: str,
        agents: List[str],
        quality_score: float,
        recent_quality_history: List[float]
    ) -> bool:
        """
        Check if restart token should be issued.

        Restart if:
        1. Quality drops below threshold
        2. Quality declining for 3+ consecutive steps
        3. Quality variance is very high (unstable)
        """
        # Check threshold
        if quality_score < self.quality_threshold:
            await self._issue_restart_token(task, agents, quality_score, "quality_threshold")
            return True

        # Check declining trend
        if len(recent_quality_history) >= 3:
            if all(recent_quality_history[i] > recent_quality_history[i+1]
                   for i in range(len(recent_quality_history)-1)):
                await self._issue_restart_token(task, agents, quality_score, "declining_trend")
                return True

        # Check high variance (unstable)
        if len(recent_quality_history) >= 5:
            variance = np.var(recent_quality_history)
            if variance > 0.2:  # High variance threshold
                await self._issue_restart_token(task, agents, quality_score, "high_variance")
                return True

        return False

    async def _issue_restart_token(
        self,
        task: str,
        agents: List[str],
        quality_score: float,
        reason: str
    ) -> None:
        """Issue restart token."""
        restart_event = {
            "timestamp": datetime.now().isoformat(),
            "task": task[:100],
            "agents": agents,
            "quality_score": quality_score,
            "reason": reason
        }
        self.restart_history.append(restart_event)

        logger.warning(
            f"[RESTART TOKEN] Issued for task '{task[:50]}...' "
            f"(quality={quality_score:.2f}, reason={reason})"
        )


class DrMAMRAttributionLayer:
    """
    Dr. MAMR Attribution Layer for multi-agent collaboration.
    Tracks causal influence, issues restart tokens, computes GRPO rewards.
    Based on arXiv:2511.02303.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.shapley_calculator = ShapleyValueCalculator(num_samples=10)
        self.restart_manager = RestartTokenManager(quality_threshold=0.3)

        # Historical data
        self.agent_contributions: Dict[str, List[float]] = defaultdict(list)
        self.collaboration_history: List[Dict] = []

        # Storage
        self.storage_dir = storage_dir or Path("data/attribution")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def track_collaboration(
        self,
        task: str,
        agents: List[str],
        agent_outputs: Dict[str, Any],
        result_quality: float
    ) -> Dict[str, float]:
        """
        Track multi-agent collaboration and compute causal influence.

        Args:
            task: Task description
            agents: List of agent names involved
            agent_outputs: Dict of agent name -> output
            result_quality: Overall result quality (0.0-1.0)

        Returns:
            Shapley values for each agent
        """
        # Compute Shapley values
        shapley_values = await self.shapley_calculator.compute_shapley_values(
            agents, task, result_quality, agent_outputs
        )

        # Update historical contributions
        for agent, value in shapley_values.items():
            self.agent_contributions[agent].append(value)

        # Store collaboration event
        collaboration_event = {
            "timestamp": datetime.now().isoformat(),
            "task": task[:100],
            "agents": agents,
            "shapley_values": shapley_values,
            "result_quality": result_quality
        }
        self.collaboration_history.append(collaboration_event)

        # Check if restart needed
        recent_quality = [
            event["result_quality"]
            for event in self.collaboration_history[-5:]
        ]
        restart_needed = await self.restart_manager.check_restart_needed(
            task, agents, result_quality, recent_quality
        )

        if restart_needed:
            collaboration_event["restart_issued"] = True

        # Persist
        await self._save_attribution_data()

        logger.info(
            f"[Dr.MAMR] Tracked collaboration: {len(agents)} agents, "
            f"quality={result_quality:.2f}, top contributor: "
            f"{max(shapley_values.items(), key=lambda x: x[1])[0]}"
        )

        return shapley_values

    def get_top_contributors(self, k: int = 5) -> List[Tuple[str, float]]:
        """Get top K contributing agents by average Shapley value."""
        if not self.agent_contributions:
            return []

        avg_contributions = {
            agent: np.mean(values)
            for agent, values in self.agent_contributions.items()
        }
        return sorted(
            avg_contributions.items(),
            key=lambda x: x[1],
            reverse=True
        )[:k]

    def detect_free_riders(self, threshold: float = 0.1, min_samples: int = 10) -> List[str]:
        """
        Detect agents with consistently low contributions (free-riders).

        Args:
            threshold: Minimum average Shapley value to not be considered free-rider
            min_samples: Minimum number of collaborations to evaluate

        Returns:
            List of agent names identified as free-riders
        """
        free_riders = []
        for agent, values in self.agent_contributions.items():
            if len(values) >= min_samples:
                avg_contribution = np.mean(values)
                if avg_contribution < threshold:
                    free_riders.append(agent)
                    logger.warning(
                        f"[FREE-RIDER DETECTED] Agent '{agent}' has low avg contribution: {avg_contribution:.3f}"
                    )

        return free_riders

    def get_agent_stats(self, agent_name: str) -> Dict[str, Any]:
        """Get statistics for a specific agent."""
        if agent_name not in self.agent_contributions:
            return {"status": "no_data"}

        values = self.agent_contributions[agent_name]
        return {
            "agent_name": agent_name,
            "collaboration_count": len(values),
            "avg_contribution": np.mean(values),
            "std_contribution": np.std(values),
            "min_contribution": np.min(values),
            "max_contribution": np.max(values),
            "contribution_trend": "improving" if self._is_improving(values) else "declining"
        }

    def _is_improving(self, values: List[float]) -> bool:
        """Check if contribution is improving over time."""
        if len(values) < 10:
            return True  # Not enough data

        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]

        return np.mean(second_half) > np.mean(first_half)

    def compute_grpo_step_rewards(
        self,
        agent_name: str,
        step_quality: float,
        collaboration_shapley: float
    ) -> float:
        """
        Compute Group Relative Policy Optimization (GRPO) step-level reward.

        Reward = step_quality * collaboration_shapley
        (Agent gets higher reward if step quality is good AND they contributed significantly)
        """
        reward = step_quality * collaboration_shapley
        return reward

    async def _save_attribution_data(self) -> None:
        """Persist attribution data to disk."""
        attribution_file = self.storage_dir / "attribution_history.json"

        data = {
            "agent_contributions": {
                agent: {
                    "values": values[-100:],  # Last 100 samples
                    "avg": float(np.mean(values)),
                    "count": len(values)
                }
                for agent, values in self.agent_contributions.items()
            },
            "recent_collaborations": self.collaboration_history[-50:],  # Last 50
            "restart_history": self.restart_manager.restart_history[-20:]  # Last 20
        }

        with open(attribution_file, 'w') as f:
            json.dump(data, f, indent=2)

    async def load_attribution_data(self) -> None:
        """Load attribution data from disk."""
        attribution_file = self.storage_dir / "attribution_history.json"

        if attribution_file.exists():
            with open(attribution_file, 'r') as f:
                data = json.load(f)

                # Restore agent contributions
                for agent, agent_data in data.get("agent_contributions", {}).items():
                    self.agent_contributions[agent] = agent_data["values"]

                # Restore collaboration history
                self.collaboration_history = data.get("recent_collaborations", [])
                self.restart_manager.restart_history = data.get("restart_history", [])


# Singleton instance
_attribution_layer: Optional[DrMAMRAttributionLayer] = None

def get_attribution_layer() -> DrMAMRAttributionLayer:
    """Get singleton attribution layer instance."""
    global _attribution_layer
    if _attribution_layer is None:
        _attribution_layer = DrMAMRAttributionLayer()
    return _attribution_layer
```

### Hour 2: HALO Router Integration (60 min)

**Modify:** `infrastructure/halo_router.py`

```python
# infrastructure/halo_router.py - ADD THIS

from infrastructure.swarm.dr_mamr_attribution import get_attribution_layer

class HALORouter:
    # ... existing code ...

    def __init__(self):
        # ... existing init ...
        self.attribution_layer = get_attribution_layer()
        self.use_attribution_routing = True

    def route_task(self, task_type: str, requirements: Dict[str, Any]) -> Any:
        """
        Route task to appropriate agent.
        Enhanced with Dr. MAMR attribution scores.
        """
        # Get candidates from capability matching (existing logic)
        candidates = self._get_capability_matches(task_type, requirements)

        # Enhance with attribution scores
        if self.use_attribution_routing and len(candidates) > 1:
            candidates = self._rank_by_attribution(candidates, task_type)

        # Select best candidate
        selected_agent = candidates[0] if candidates else self._get_fallback_agent()

        return selected_agent

    def _rank_by_attribution(
        self,
        candidates: List[str],
        task_type: str
    ) -> List[str]:
        """Rank candidates by historical attribution scores."""
        # Get attribution stats for each candidate
        candidate_scores = []
        for agent_name in candidates:
            stats = self.attribution_layer.get_agent_stats(agent_name)

            if stats.get("status") == "no_data":
                # No history, give neutral score
                score = 0.5
            else:
                score = stats["avg_contribution"]

            candidate_scores.append((agent_name, score))

        # Sort by score (descending)
        candidate_scores.sort(key=lambda x: x[1], reverse=True)

        return [agent_name for agent_name, score in candidate_scores]
```

### Hour 3: A2A Connector Integration (60 min)

**Modify:** `infrastructure/a2a_connector.py`

```python
# infrastructure/a2a_connector.py - ADD THIS

from infrastructure.swarm.dr_mamr_attribution import get_attribution_layer

class A2AConnector:
    # ... existing code ...

    def __init__(self):
        # ... existing init ...
        self.attribution_layer = get_attribution_layer()
        self.collaboration_buffer: Dict[str, List] = {}  # task_id -> agents involved

    async def invoke_multi_agent(
        self,
        task_id: str,
        task: str,
        agent_names: List[str]
    ) -> Dict[str, Any]:
        """
        Invoke multiple agents and track collaboration with Dr. MAMR attribution.
        """
        # Initialize collaboration tracking
        self.collaboration_buffer[task_id] = agent_names

        # Invoke agents (existing logic)
        agent_outputs = {}
        for agent_name in agent_names:
            output = await self._invoke_single_agent(agent_name, task)
            agent_outputs[agent_name] = output

        # Evaluate result quality
        result_quality = self._evaluate_result_quality(agent_outputs)

        # Track collaboration with attribution layer
        shapley_values = await self.attribution_layer.track_collaboration(
            task=task,
            agents=agent_names,
            agent_outputs=agent_outputs,
            result_quality=result_quality
        )

        # Compute GRPO rewards for each agent
        grpo_rewards = {}
        for agent_name in agent_names:
            agent_output_quality = self._get_output_quality(agent_outputs[agent_name])
            grpo_reward = self.attribution_layer.compute_grpo_step_rewards(
                agent_name,
                agent_output_quality,
                shapley_values[agent_name]
            )
            grpo_rewards[agent_name] = grpo_reward

        # Combine results
        return {
            "outputs": agent_outputs,
            "shapley_values": shapley_values,
            "grpo_rewards": grpo_rewards,
            "result_quality": result_quality
        }

    def _evaluate_result_quality(self, agent_outputs: Dict[str, Any]) -> float:
        """Evaluate overall result quality from agent outputs."""
        # Simple heuristic: average of individual output qualities
        qualities = []
        for output in agent_outputs.values():
            if isinstance(output, dict) and "quality" in output:
                qualities.append(output["quality"])
            else:
                qualities.append(0.7)  # Default

        return sum(qualities) / len(qualities) if qualities else 0.5

    def _get_output_quality(self, output: Any) -> float:
        """Extract quality score from agent output."""
        if isinstance(output, dict) and "quality" in output:
            return output["quality"]
        return 0.7  # Default
```

### Hour 5: Integration Testing (60 min)

**Test Script:** `scripts/test_dr_mamr_integration.py`

```python
# scripts/test_dr_mamr_integration.py
import asyncio
from infrastructure.swarm.dr_mamr_attribution import DrMAMRAttributionLayer

async def test_shapley_computation():
    """Test Shapley value computation."""
    attribution = DrMAMRAttributionLayer()

    # Simulate collaboration
    agents = ["builder_agent", "qa_agent", "deploy_agent"]
    agent_outputs = {
        "builder_agent": {"quality": 0.9, "output": "code"},
        "qa_agent": {"quality": 0.8, "output": "tests"},
        "deploy_agent": {"quality": 0.85, "output": "deployment"}
    }

    shapley_values = await attribution.track_collaboration(
        task="Build and deploy feature",
        agents=agents,
        agent_outputs=agent_outputs,
        result_quality=0.88
    )

    # Validate
    assert len(shapley_values) == 3
    assert abs(sum(shapley_values.values()) - 1.0) < 0.01  # Sum to 1.0
    assert all(0 <= v <= 1 for v in shapley_values.values())

    print(f"[OK] Shapley values computed: {shapley_values}")

async def test_free_rider_detection():
    """Test free-rider detection."""
    attribution = DrMAMRAttributionLayer()

    # Simulate multiple collaborations with one lazy agent
    for i in range(15):
        agents = ["good_agent", "lazy_agent"]
        agent_outputs = {
            "good_agent": {"quality": 0.9},
            "lazy_agent": {"quality": 0.3}  # Consistently low
        }

        await attribution.track_collaboration(
            task=f"Task {i}",
            agents=agents,
            agent_outputs=agent_outputs,
            result_quality=0.7
        )

    # Detect free-riders
    free_riders = attribution.detect_free_riders(threshold=0.2, min_samples=10)

    assert "lazy_agent" in free_riders
    print(f"[OK] Free-rider detected: {free_riders}")

async def test_restart_token():
    """Test restart token issuance."""
    attribution = DrMAMRAttributionLayer()

    # Simulate declining quality
    for i in range(5):
        quality = 0.9 - (i * 0.15)  # Declining from 0.9 to 0.3
        await attribution.track_collaboration(
            task=f"Declining task {i}",
            agents=["agent_1"],
            agent_outputs={"agent_1": {"quality": quality}},
            result_quality=quality
        )

    # Check restart history
    assert len(attribution.restart_manager.restart_history) > 0
    print(f"[OK] Restart tokens issued: {len(attribution.restart_manager.restart_history)}")

async def main():
    print("Testing Dr. MAMR Attribution Layer...")
    print("-" * 60)

    await test_shapley_computation()
    await test_free_rider_detection()
    await test_restart_token()

    print("-" * 60)
    print("[SUCCESS] All Dr. MAMR tests passed!")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## INTEGRATION #71: AgileThinker Dual-Thread Router

**Location:** `infrastructure/orchestration/agile_thinker_router.py`
**Engineer:** Engineer A
**Timeline:** Hours 6-7 (Implementation) + Hour 9 (Testing)

### Hour 6: Core Dual-Thread Implementation (60 min)

**Code to Write:**

```python
# infrastructure/orchestration/agile_thinker_router.py
from typing import Any, Optional, Dict, List
import asyncio
import time
import re
from dataclasses import dataclass

from infrastructure.htdag_planner import HTDAGPlanner
from infrastructure.halo_router import HALORouter
from infrastructure.load_env import load_genesis_env

load_genesis_env()

import logging
logger = logging.getLogger(__name__)

@dataclass
class ReactivePattern:
    """Pattern for fast reactive execution."""
    pattern: str  # Regex pattern
    agent_name: str
    confidence: float
    avg_latency: float  # Historical average latency

class AgileThinkerRouter:
    """
    Dual-thread orchestration: reactive for speed, planning for depth.
    Based on arXiv:2511.04898 (Real-Time Reasoning Agents).

    Reactive Thread: Fast pattern matching + direct agent invocation
    Planning Thread: Full HTDAG decomposition + comprehensive execution
    """
    def __init__(
        self,
        htdag_planner: HTDAGPlanner,
        halo_router: HALORouter
    ):
        self.htdag_planner = htdag_planner
        self.halo_router = halo_router

        # Reactive patterns (learned from TrajectoryPool)
        self.reactive_patterns: List[ReactivePattern] = self._load_reactive_patterns()

        # Result cache for instant responses
        self.result_cache: Dict[str, Any] = {}

        # Performance tracking
        self.reactive_count = 0
        self.planning_count = 0
        self.cache_hits = 0

    async def route_task(
        self,
        task: str,
        deadline: Optional[float] = None,
        prefer_quality: bool = False
    ) -> Dict[str, Any]:
        """
        Route task through reactive or planning thread.

        Args:
            task: Task description
            deadline: Optional deadline in seconds
            prefer_quality: If True, always use planning thread

        Returns:
            Result dict with output, metadata, and performance stats
        """
        start_time = time.time()

        # Check cache first
        cache_key = self._get_cache_key(task)
        if cache_key in self.result_cache:
            self.cache_hits += 1
            logger.info(f"[AgileThinker] Cache hit for task '{task[:50]}...'")
            return {
                "output": self.result_cache[cache_key],
                "method": "cache",
                "latency": time.time() - start_time
            }

        # Match reactive patterns
        reactive_match = self._match_reactive_pattern(task)

        # Decision logic
        if prefer_quality:
            # Quality-critical: use planning thread only
            logger.info(f"[AgileThinker] Quality mode for task '{task[:50]}...'")
            return await self._planning_thread_only(task, start_time)

        elif reactive_match and reactive_match.confidence > 0.8:
            # High-confidence match: use reactive thread only
            logger.info(f"[AgileThinker] Fast path for task '{task[:50]}...'")
            return await self._reactive_thread_only(reactive_match, task, start_time)

        elif deadline:
            # Deadline-aware: run both threads, return first completion
            logger.info(f"[AgileThinker] Dual-thread (deadline={deadline}s) for task '{task[:50]}...'")
            return await self._dual_thread_with_deadline(task, deadline, start_time)

        else:
            # Default: try reactive, fallback to planning
            logger.info(f"[AgileThinker] Dual-thread (no deadline) for task '{task[:50]}...'")
            return await self._dual_thread_no_deadline(task, reactive_match, start_time)

    async def _reactive_thread_only(
        self,
        pattern: ReactivePattern,
        task: str,
        start_time: float
    ) -> Dict[str, Any]:
        """Execute via reactive thread only."""
        self.reactive_count += 1

        # Get agent from pattern
        agent = self.halo_router.route_task(pattern.agent_name, {})

        # Execute
        result = await agent.execute(task)

        # Cache result
        cache_key = self._get_cache_key(task)
        self.result_cache[cache_key] = result

        return {
            "output": result,
            "method": "reactive",
            "pattern_matched": pattern.pattern,
            "agent_used": pattern.agent_name,
            "latency": time.time() - start_time
        }

    async def _planning_thread_only(
        self,
        task: str,
        start_time: float
    ) -> Dict[str, Any]:
        """Execute via planning thread only."""
        self.planning_count += 1

        # Full HTDAG decomposition
        dag = await self.htdag_planner.decompose_task(task)

        # Execute DAG
        result = await self._execute_dag(dag)

        return {
            "output": result,
            "method": "planning",
            "subtasks": len(dag.nodes),
            "latency": time.time() - start_time
        }

    async def _dual_thread_with_deadline(
        self,
        task: str,
        deadline: float,
        start_time: float
    ) -> Dict[str, Any]:
        """Run both threads in parallel, return first completion within deadline."""
        # Launch reactive thread
        reactive_task = asyncio.create_task(
            self._reactive_thread_best_effort(task)
        )

        # Launch planning thread
        planning_task = asyncio.create_task(
            self._planning_thread_only(task, start_time)
        )

        # Wait for first completion or deadline
        timeout = deadline - (time.time() - start_time)

        try:
            done, pending = await asyncio.wait(
                [reactive_task, planning_task],
                timeout=max(timeout, 0.1),  # At least 0.1s
                return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel pending tasks
            for task in pending:
                task.cancel()

            # Return first completed result
            if done:
                completed_task = list(done)[0]
                result = completed_task.result()
                result["deadline_met"] = True
                result["latency"] = time.time() - start_time
                return result
            else:
                # Timeout: return partial result or error
                reactive_task.cancel()
                planning_task.cancel()
                return {
                    "output": None,
                    "method": "timeout",
                    "error": "Deadline exceeded",
                    "latency": time.time() - start_time,
                    "deadline_met": False
                }

        except Exception as e:
            logger.error(f"[AgileThinker] Error in dual-thread: {e}")
            return {
                "output": None,
                "method": "error",
                "error": str(e),
                "latency": time.time() - start_time
            }

    async def _dual_thread_no_deadline(
        self,
        task: str,
        reactive_match: Optional[ReactivePattern],
        start_time: float
    ) -> Dict[str, Any]:
        """Run both threads, prefer planning result but fallback to reactive."""
        # Launch both
        reactive_task = asyncio.create_task(
            self._reactive_thread_best_effort(task)
        )
        planning_task = asyncio.create_task(
            self._planning_thread_only(task, start_time)
        )

        # Wait for planning (preferred)
        try:
            planning_result = await asyncio.wait_for(planning_task, timeout=30.0)
            reactive_task.cancel()
            return planning_result

        except asyncio.TimeoutError:
            # Planning too slow, use reactive
            logger.warning("[AgileThinker] Planning timeout, using reactive result")
            planning_task.cancel()
            reactive_result = await reactive_task
            reactive_result["fallback"] = True
            return reactive_result

        except Exception as e:
            # Planning failed, use reactive
            logger.warning(f"[AgileThinker] Planning failed: {e}, using reactive result")
            reactive_result = await reactive_task
            reactive_result["fallback"] = True
            return reactive_result

    async def _reactive_thread_best_effort(self, task: str) -> Dict[str, Any]:
        """Reactive thread with best-effort pattern matching."""
        pattern = self._match_reactive_pattern(task)

        if pattern:
            return await self._reactive_thread_only(pattern, task, time.time())
        else:
            # No pattern match: use heuristic agent selection
            agent_name = self._heuristic_agent_selection(task)
            agent = self.halo_router.route_task(agent_name, {})
            result = await agent.execute(task)

            return {
                "output": result,
                "method": "reactive_heuristic",
                "agent_used": agent_name,
                "latency": 0.0
            }

    def _match_reactive_pattern(self, task: str) -> Optional[ReactivePattern]:
        """Match task against reactive patterns."""
        task_lower = task.lower()

        for pattern in self.reactive_patterns:
            if re.search(pattern.pattern, task_lower):
                return pattern

        return None

    def _heuristic_agent_selection(self, task: str) -> str:
        """Heuristic-based agent selection when no pattern matches."""
        task_lower = task.lower()

        # Simple keyword matching
        if any(kw in task_lower for kw in ["build", "create", "implement", "code"]):
            return "builder_agent"
        elif any(kw in task_lower for kw in ["test", "qa", "validate"]):
            return "qa_agent"
        elif any(kw in task_lower for kw in ["deploy", "release", "production"]):
            return "deploy_agent"
        elif any(kw in task_lower for kw in ["research", "investigate", "analyze"]):
            return "research_discovery_agent"
        else:
            return "builder_agent"  # Default

    def _load_reactive_patterns(self) -> List[ReactivePattern]:
        """Load reactive patterns from historical data."""
        # In production, learn these from TrajectoryPool
        # For now, use hand-crafted patterns
        return [
            ReactivePattern(
                pattern=r"(generate|create|build).*(simple|basic).*(component|function)",
                agent_name="builder_agent",
                confidence=0.9,
                avg_latency=2.5
            ),
            ReactivePattern(
                pattern=r"(run|execute).*(test|tests|testing)",
                agent_name="qa_agent",
                confidence=0.95,
                avg_latency=3.0
            ),
            ReactivePattern(
                pattern=r"(deploy|release).*(staging|prod|production)",
                agent_name="deploy_agent",
                confidence=0.9,
                avg_latency=4.0
            ),
            ReactivePattern(
                pattern=r"(fix|debug|repair).*(bug|error|issue)",
                agent_name="maintenance_agent",
                confidence=0.85,
                avg_latency=5.0
            ),
            ReactivePattern(
                pattern=r"(write|create).*(docs|documentation|readme)",
                agent_name="content_agent",
                confidence=0.9,
                avg_latency=3.5
            ),
        ]

    def _get_cache_key(self, task: str) -> str:
        """Generate cache key for task."""
        # Simple hash-based key (in production, use semantic similarity)
        return hash(task.lower().strip()) % 10000

    async def _execute_dag(self, dag) -> Any:
        """Execute TaskDAG (placeholder - use actual HTDAG execution)."""
        # This would use the actual DAG execution logic from GenesisMetaAgent
        # For now, return placeholder
        return {"status": "completed", "dag_nodes": len(dag.nodes)}

    def get_stats(self) -> Dict[str, Any]:
        """Get routing statistics."""
        total = self.reactive_count + self.planning_count
        return {
            "reactive_count": self.reactive_count,
            "planning_count": self.planning_count,
            "cache_hits": self.cache_hits,
            "total_routed": total,
            "reactive_percentage": (self.reactive_count / total * 100) if total > 0 else 0,
            "planning_percentage": (self.planning_count / total * 100) if total > 0 else 0,
            "cache_hit_rate": (self.cache_hits / total * 100) if total > 0 else 0
        }


# Singleton instance
_agile_thinker: Optional[AgileThinkerRouter] = None

def get_agile_thinker(
    htdag_planner: Optional[HTDAGPlanner] = None,
    halo_router: Optional[HALORouter] = None
) -> AgileThinkerRouter:
    """Get singleton AgileThinker instance."""
    global _agile_thinker
    if _agile_thinker is None:
        if htdag_planner is None or halo_router is None:
            raise ValueError("Must provide htdag_planner and halo_router on first call")
        _agile_thinker = AgileThinkerRouter(htdag_planner, halo_router)
    return _agile_thinker
```

### Hour 7: Genesis Meta Agent Integration (60 min)

**Modify:** `infrastructure/genesis_meta_agent.py`

```python
# infrastructure/genesis_meta_agent.py - ADD THIS

from infrastructure.orchestration.agile_thinker_router import get_agile_thinker

class GenesisMetaAgent:
    # ... existing code ...

    def __init__(self):
        # ... existing init ...
        self.agile_thinker = get_agile_thinker(self.htdag_planner, self.halo_router)
        self.use_agile_thinking = True

    async def execute_task(self, task: str, **kwargs) -> Any:
        """
        Execute task with optional AgileThinker routing.

        If task has deadline or is simple, use AgileThinker.
        Otherwise, use traditional HTDAG flow.
        """
        deadline = kwargs.get("deadline")
        prefer_quality = kwargs.get("prefer_quality", False)

        if self.use_agile_thinking and (deadline or self._is_simple_task(task)):
            # Route through AgileThinker
            result = await self.agile_thinker.route_task(
                task,
                deadline=deadline,
                prefer_quality=prefer_quality
            )
            return result["output"]
        else:
            # Traditional HTDAG flow
            return await self._traditional_execute(task, **kwargs)

    def _is_simple_task(self, task: str) -> bool:
        """Heuristic to detect simple tasks suitable for fast path."""
        simple_keywords = [
            "run test", "deploy to", "create component",
            "generate file", "update config", "check status"
        ]
        return any(kw in task.lower() for kw in simple_keywords)
```

---

## INTEGRATION #72: Tongyi-DeepResearch Client

**Location:** `infrastructure/llm_providers/tongyi_deepresearch_client.py`
**Engineer:** Engineer B
**Timeline:** Hours 6-8 (Implementation + Testing)

### Hour 6-7: Client Implementation (120 min)

**Code to Write:**

```python
# infrastructure/llm_providers/tongyi_deepresearch_client.py
from typing import Dict, List, Any, Optional
import os
import asyncio
from dataclasses import dataclass

from infrastructure.load_env import load_genesis_env

load_genesis_env()

import logging
logger = logging.getLogger(__name__)

# Try to import HuggingFace Inference Client
try:
    from huggingface_hub import AsyncInferenceClient
    HF_AVAILABLE = True
except ImportError:
    logger.warning("huggingface_hub not installed. Install with: pip install huggingface_hub")
    HF_AVAILABLE = False

@dataclass
class ResearchResult:
    """Result from Tongyi-DeepResearch query."""
    final_answer: str
    reasoning_steps: List[str]
    confidence: float
    sources_used: List[str]
    mode_used: str  # "react" or "heavy"
    tokens_used: int
    latency: float

class TongyiDeepResearchClient:
    """
    Client for Tongyi-DeepResearch-30B-A3B specialized research model.
    Supports ReAct (fast) and IterResearch-Heavy (quality) modes.
    Based on Alibaba-NLP/Tongyi-DeepResearch-30B-A3B.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        mode: str = "react",
        use_local: bool = False,
        local_url: Optional[str] = None
    ):
        """
        Initialize Tongyi-DeepResearch client.

        Args:
            api_key: HuggingFace API token (or None to use HF_TOKEN env var)
            mode: "react" (fast) or "heavy" (IterResearch quality mode)
            use_local: If True, use locally hosted vLLM instance
            local_url: URL for local vLLM endpoint
        """
        self.api_key = api_key or os.getenv("HF_TOKEN")
        self.mode = mode
        self.use_local = use_local
        self.local_url = local_url or "http://localhost:8000"

        self.model_id = "Alibaba-NLP/Tongyi-DeepResearch-30B-A3B"

        # Initialize client
        if not use_local:
            if not HF_AVAILABLE:
                raise ImportError(
                    "huggingface_hub required for API mode. "
                    "Install with: pip install huggingface_hub"
                )
            if not self.api_key:
                raise ValueError("HuggingFace API token required (HF_TOKEN env var or api_key parameter)")

            self.client = AsyncInferenceClient(token=self.api_key)
            logger.info(f"[Tongyi] Initialized with HF Inference API (mode={mode})")
        else:
            self.client = None  # Use local vLLM
            logger.info(f"[Tongyi] Initialized with local vLLM at {local_url} (mode={mode})")

    async def research_query(
        self,
        query: str,
        max_steps: int = 10,
        mode: Optional[str] = None,
        temperature: float = 0.7
    ) -> ResearchResult:
        """
        Execute research query with Tongyi-DeepResearch.

        Args:
            query: Research question
            max_steps: Maximum reasoning steps
            mode: "react" (fast) or "heavy" (quality), overrides default
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            ResearchResult with answer, reasoning, confidence, sources
        """
        import time
        start_time = time.time()

        mode = mode or self.mode

        # Format prompt based on mode
        if mode == "react":
            prompt = self._format_react_prompt(query)
            max_tokens = 2000
        else:  # heavy mode
            prompt = self._format_iterresearch_prompt(query, max_steps)
            max_tokens = 8000

        # Generate response
        if self.use_local:
            response_text = await self._generate_local(prompt, max_tokens, temperature)
        else:
            response_text = await self._generate_api(prompt, max_tokens, temperature)

        # Parse response
        result = self._parse_research_response(response_text, mode)
        result.latency = time.time() - start_time

        logger.info(
            f"[Tongyi] Research completed in {result.latency:.2f}s "
            f"(mode={mode}, confidence={result.confidence:.2f})"
        )

        return result

    async def _generate_api(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate response via HuggingFace Inference API."""
        try:
            response = await self.client.text_generation(
                prompt=prompt,
                model=self.model_id,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=0.9,
                do_sample=True,
                return_full_text=False
            )
            return response

        except Exception as e:
            logger.error(f"[Tongyi] API error: {e}")
            # Fallback to simple response
            return self._generate_fallback_response(prompt)

    async def _generate_local(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate response via local vLLM instance."""
        import aiohttp

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model_id,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.9
                }

                async with session.post(
                    f"{self.local_url}/v1/completions",
                    json=payload
                ) as response:
                    data = await response.json()
                    return data["choices"][0]["text"]

        except Exception as e:
            logger.error(f"[Tongyi] Local generation error: {e}")
            return self._generate_fallback_response(prompt)

    def _format_react_prompt(self, query: str) -> str:
        """Format prompt for fast ReAct mode."""
        return f"""<|im_start|>system
You are a research assistant. Answer this query using ReAct reasoning.
Provide clear, concise answers with step-by-step reasoning.
<|im_end|>
<|im_start|>user
{query}

Think step-by-step using this format:
Thought 1: [your reasoning]
Action 1: [action to take]
Observation 1: [what you learned]
...
Final Answer: [conclusion]
<|im_end|>
<|im_start|>assistant
"""

    def _format_iterresearch_prompt(self, query: str, max_steps: int) -> str:
        """Format prompt for deep IterResearch-Heavy mode."""
        return f"""<|im_start|>system
You are a deep research specialist. Conduct comprehensive analysis of this query using iterative refinement.
Use up to {max_steps} steps for thorough investigation.
<|im_end|>
<|im_start|>user
{query}

Research Process:
1. Initial exploration and hypothesis formation
2. Evidence gathering and source analysis
3. Synthesis and insight extraction
4. Refinement and validation
5. Final comprehensive report

Begin your deep research:
<|im_end|>
<|im_start|>assistant
"""

    def _parse_research_response(self, response: str, mode: str) -> ResearchResult:
        """Parse model response into structured format."""
        # Extract reasoning steps
        reasoning_steps = []
        for line in response.split('\n'):
            if line.startswith(('Thought', 'Action', 'Observation', 'Step')):
                reasoning_steps.append(line.strip())

        # Extract final answer
        final_answer = ""
        if "Final Answer:" in response:
            final_answer = response.split("Final Answer:")[1].strip()
        elif "Conclusion:" in response:
            final_answer = response.split("Conclusion:")[1].strip()
        else:
            # Take last paragraph as answer
            paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
            final_answer = paragraphs[-1] if paragraphs else response[:500]

        # Extract sources (if mentioned)
        sources = []
        for line in response.split('\n'):
            if "source:" in line.lower() or "reference:" in line.lower():
                sources.append(line.strip())

        # Estimate confidence (heuristic based on response quality)
        confidence = 0.8 if len(reasoning_steps) >= 3 else 0.6
        if mode == "heavy" and len(reasoning_steps) >= 5:
            confidence = 0.9

        # Estimate tokens (rough approximation)
        tokens_used = len(response.split()) * 1.3  # ~1.3 tokens per word

        return ResearchResult(
            final_answer=final_answer,
            reasoning_steps=reasoning_steps[:10],  # Top 10 steps
            confidence=confidence,
            sources_used=sources,
            mode_used=mode,
            tokens_used=int(tokens_used),
            latency=0.0  # Set by caller
        )

    def _generate_fallback_response(self, prompt: str) -> str:
        """Generate simple fallback response if API/local fails."""
        return """Thought 1: I need to analyze this query carefully.
Action 1: Research the key concepts and gather information.
Observation 1: Based on available knowledge, I can provide a preliminary answer.

Final Answer: I apologize, but I'm currently unable to access the full research capabilities.
Please try again or use an alternative research method."""

    async def batch_research_queries(
        self,
        queries: List[str],
        mode: Optional[str] = None
    ) -> List[ResearchResult]:
        """Execute multiple research queries in parallel."""
        tasks = [
            self.research_query(query, mode=mode)
            for query in queries
        ]
        return await asyncio.gather(*tasks)

    def get_cost_estimate(self, num_queries: int, mode: str = "react") -> Dict[str, float]:
        """
        Estimate cost for N queries.

        HF Inference API pricing (approximate):
        - Input: $0.000002 per token
        - Output: $0.000006 per token

        Tongyi-30B (3B active): ~70% cheaper than full 30B model
        """
        if mode == "react":
            avg_input_tokens = 200
            avg_output_tokens = 500
        else:  # heavy mode
            avg_input_tokens = 500
            avg_output_tokens = 2000

        input_cost = num_queries * avg_input_tokens * 0.000002 * 0.3  # 70% discount for sparse activation
        output_cost = num_queries * avg_output_tokens * 0.000006 * 0.3

        total_cost = input_cost + output_cost

        return {
            "num_queries": num_queries,
            "mode": mode,
            "estimated_cost_usd": total_cost,
            "cost_per_query": total_cost / num_queries,
            "input_tokens": avg_input_tokens * num_queries,
            "output_tokens": avg_output_tokens * num_queries
        }


# Singleton instance
_tongyi_client: Optional[TongyiDeepResearchClient] = None

def get_tongyi_client(
    mode: str = "react",
    use_local: bool = False
) -> TongyiDeepResearchClient:
    """Get singleton Tongyi-DeepResearch client."""
    global _tongyi_client
    if _tongyi_client is None:
        _tongyi_client = TongyiDeepResearchClient(mode=mode, use_local=use_local)
    return _tongyi_client
```

### Hour 8: Research Discovery Agent Integration (60 min)

**Modify:** `infrastructure/research_discovery_agent.py`

```python
# infrastructure/research_discovery_agent.py - ADD THIS

from infrastructure.llm_providers.tongyi_deepresearch_client import get_tongyi_client

class ResearchDiscoveryAgent:
    # ... existing code ...

    def __init__(self):
        # ... existing init ...
        self.use_tongyi = os.getenv("USE_TONGYI_RESEARCH", "false").lower() == "true"

        if self.use_tongyi:
            self.tongyi_client = get_tongyi_client(mode="react")  # Default to fast mode
            logger.info("[ResearchAgent] Using Tongyi-DeepResearch model")

    async def research_topic(self, topic: str, depth: str = "medium") -> Dict[str, Any]:
        """
        Research a topic with specified depth.

        Args:
            topic: Research topic/question
            depth: "fast" (ReAct), "medium" (ReAct), or "deep" (IterResearch-Heavy)
        """
        if self.use_tongyi:
            # Route to Tongyi-DeepResearch
            mode = "heavy" if depth == "deep" else "react"

            result = await self.tongyi_client.research_query(
                query=topic,
                max_steps=20 if depth == "deep" else 10,
                mode=mode
            )

            return {
                "answer": result.final_answer,
                "reasoning": result.reasoning_steps,
                "confidence": result.confidence,
                "sources": result.sources_used,
                "model": "Tongyi-DeepResearch-30B",
                "mode": result.mode_used,
                "latency": result.latency
            }
        else:
            # Use existing Claude/GPT-4 research
            return await self._traditional_research(topic, depth)
```

### Hour 9: Integration Testing (60 min)

**Test Script:** `scripts/test_tongyi_integration.py`

```python
# scripts/test_tongyi_integration.py
import asyncio
import os

# Set test mode (no real API calls needed)
os.environ["USE_TONGYI_RESEARCH"] = "false"  # Test fallback mode first

from infrastructure.llm_providers.tongyi_deepresearch_client import TongyiDeepResearchClient

async def test_client_initialization():
    """Test client initialization."""
    # Test without API key (should use fallback)
    client = TongyiDeepResearchClient(
        api_key=None,
        mode="react",
        use_local=True  # Use local mode to avoid API requirement
    )

    assert client.mode == "react"
    assert client.use_local == True
    print("[OK] Client initialized")

async def test_prompt_formatting():
    """Test prompt formatting for both modes."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    # Test ReAct prompt
    react_prompt = client._format_react_prompt("What is quantum computing?")
    assert "ReAct reasoning" in react_prompt
    assert "Thought 1:" in react_prompt

    # Test IterResearch prompt
    heavy_prompt = client._format_iterresearch_prompt("Explain machine learning", max_steps=5)
    assert "deep research specialist" in heavy_prompt
    assert "iterative refinement" in heavy_prompt

    print("[OK] Prompt formatting works")

async def test_response_parsing():
    """Test response parsing."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    mock_response = """Thought 1: I need to explain this concept clearly.
Action 1: Research the fundamentals.
Observation 1: Found key information.

Final Answer: This is a comprehensive answer to the question."""

    result = client._parse_research_response(mock_response, "react")

    assert len(result.reasoning_steps) == 3
    assert "comprehensive answer" in result.final_answer
    assert result.confidence > 0.5

    print("[OK] Response parsing works")
    print(f"  Parsed result: {result.reasoning_steps[0][:50]}...")

async def test_cost_estimation():
    """Test cost estimation."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    # Estimate cost for 100 queries
    cost_react = client.get_cost_estimate(100, mode="react")
    cost_heavy = client.get_cost_estimate(100, mode="heavy")

    assert cost_react["num_queries"] == 100
    assert cost_heavy["estimated_cost_usd"] > cost_react["estimated_cost_usd"]

    print(f"[OK] Cost estimation works")
    print(f"  ReAct mode: ${cost_react['estimated_cost_usd']:.4f} for 100 queries")
    print(f"  Heavy mode: ${cost_heavy['estimated_cost_usd']:.4f} for 100 queries")

async def main():
    print("Testing Tongyi-DeepResearch Integration...")
    print("-" * 60)

    await test_client_initialization()
    await test_prompt_formatting()
    await test_response_parsing()
    await test_cost_estimation()

    print("-" * 60)
    print("[SUCCESS] All Tongyi-DeepResearch tests passed!")
    print()
    print("To enable Tongyi-DeepResearch in production:")
    print("1. Set HF_TOKEN environment variable with your HuggingFace API token")
    print("2. Set USE_TONGYI_RESEARCH=true in .env")
    print("3. Or use local vLLM with: use_local=True")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## HOUR 10: Integration Testing + Audit

**Timeline:** 60 minutes
**Engineers:** Both A + B

### Comprehensive Test Suite (30 min)

**Create:** `scripts/test_all_4_integrations.py`

```python
# scripts/test_all_4_integrations.py
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

async def test_integration_69_iterresearch():
    """Test IterResearch Workspace Manager (#69)."""
    print("\n[1/4] Testing IterResearch Workspace Manager...")

    from infrastructure.iterresearch_workspace import create_workspace

    workspace = create_workspace("test_comprehensive")

    # Add 60 interactions (trigger synthesis)
    for i in range(60):
        await workspace.add_interaction(
            agent_name=f"agent_{i % 5}",
            action=f"Execute step {i}",
            observation=f"Completed step {i}",
            reasoning=f"Reasoning for step {i}",
            quality_score=0.6 + (i % 5) * 0.08
        )

    # Validate
    metrics = workspace.get_metrics()
    assert metrics["total_interactions"] == 60
    assert metrics["synthesis_count"] >= 1
    assert metrics["unique_agents"] == 5

    context = workspace.get_workspace_context()
    assert "Current State" in context
    assert "Key Insights" in context

    print(f"  [OK] Workspace created with {metrics['total_interactions']} interactions")
    print(f"  [OK] {metrics['synthesis_count']} synthesis cycles completed")
    print(f"  [OK] {metrics['unique_agents']} unique agents tracked")
    return True

async def test_integration_70_dr_mamr():
    """Test Dr. MAMR Attribution Layer (#70)."""
    print("\n[2/4] Testing Dr. MAMR Attribution Layer...")

    from infrastructure.swarm.dr_mamr_attribution import DrMAMRAttributionLayer

    attribution = DrMAMRAttributionLayer()

    # Simulate collaborations
    for i in range(20):
        agents = ["agent_a", "agent_b", "agent_c"]
        agent_outputs = {
            "agent_a": {"quality": 0.85 + (i % 3) * 0.05},
            "agent_b": {"quality": 0.75 + (i % 4) * 0.05},
            "agent_c": {"quality": 0.3}  # Lazy agent
        }

        shapley_values = await attribution.track_collaboration(
            task=f"Task {i}",
            agents=agents,
            agent_outputs=agent_outputs,
            result_quality=0.75
        )

        # Validate Shapley values sum to 1.0
        assert abs(sum(shapley_values.values()) - 1.0) < 0.01

    # Check free-rider detection
    free_riders = attribution.detect_free_riders(threshold=0.15, min_samples=10)
    assert "agent_c" in free_riders

    # Check top contributors
    top_contributors = attribution.get_top_contributors(k=2)
    assert len(top_contributors) >= 2

    print(f"  [OK] Tracked 20 collaborations")
    print(f"  [OK] Shapley values computed correctly")
    print(f"  [OK] Free-rider detected: {free_riders}")
    print(f"  [OK] Top contributors: {[name for name, _ in top_contributors]}")
    return True

async def test_integration_71_agile_thinker():
    """Test AgileThinker Dual-Thread Router (#71)."""
    print("\n[3/4] Testing AgileThinker Dual-Thread Router...")

    from infrastructure.orchestration.agile_thinker_router import AgileThinkerRouter
    from infrastructure.htdag_planner import HTDAGPlanner
    from infrastructure.halo_router import HALORouter

    # Create mock dependencies
    htdag = HTDAGPlanner()
    halo = HALORouter.create_with_integrations()

    router = AgileThinkerRouter(htdag, halo)

    # Test pattern matching
    pattern = router._match_reactive_pattern("run tests on the system")
    assert pattern is not None
    assert pattern.agent_name == "qa_agent"

    # Test heuristic agent selection
    agent = router._heuristic_agent_selection("build a new feature")
    assert agent == "builder_agent"

    # Test cache key generation
    key1 = router._get_cache_key("test task")
    key2 = router._get_cache_key("test task")
    assert key1 == key2  # Same task = same key

    # Test stats
    stats = router.get_stats()
    assert "reactive_count" in stats
    assert "planning_count" in stats

    print(f"  [OK] Pattern matching works")
    print(f"  [OK] Heuristic agent selection works")
    print(f"  [OK] Cache key generation works")
    print(f"  [OK] Statistics tracking works")
    return True

async def test_integration_72_tongyi():
    """Test Tongyi-DeepResearch Client (#72)."""
    print("\n[4/4] Testing Tongyi-DeepResearch Client...")

    from infrastructure.llm_providers.tongyi_deepresearch_client import TongyiDeepResearchClient

    # Test in local mode (no API required)
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    # Test prompt formatting
    react_prompt = client._format_react_prompt("Test query")
    assert "ReAct reasoning" in react_prompt

    heavy_prompt = client._format_iterresearch_prompt("Test query", 10)
    assert "deep research specialist" in heavy_prompt

    # Test response parsing
    mock_response = """Thought 1: Testing
Action 1: Execute
Observation 1: Done
Final Answer: Success"""

    result = client._parse_research_response(mock_response, "react")
    assert result.final_answer == "Success"
    assert len(result.reasoning_steps) == 3

    # Test cost estimation
    cost = client.get_cost_estimate(100, mode="react")
    assert cost["num_queries"] == 100
    assert cost["estimated_cost_usd"] > 0

    print(f"  [OK] Prompt formatting works (ReAct + Heavy modes)")
    print(f"  [OK] Response parsing works")
    print(f"  [OK] Cost estimation works")
    print(f"  [OK] Cost for 100 queries: ${cost['estimated_cost_usd']:.4f}")
    return True

async def main():
    print("=" * 60)
    print("COMPREHENSIVE INTEGRATION TEST - 4 SYSTEMS")
    print("=" * 60)

    results = []

    try:
        results.append(await test_integration_69_iterresearch())
    except Exception as e:
        print(f"  [ERROR] IterResearch test failed: {e}")
        results.append(False)

    try:
        results.append(await test_integration_70_dr_mamr())
    except Exception as e:
        print(f"  [ERROR] Dr. MAMR test failed: {e}")
        results.append(False)

    try:
        results.append(await test_integration_71_agile_thinker())
    except Exception as e:
        print(f"  [ERROR] AgileThinker test failed: {e}")
        results.append(False)

    try:
        results.append(await test_integration_72_tongyi())
    except Exception as e:
        print(f"  [ERROR] Tongyi test failed: {e}")
        results.append(False)

    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Integration #69 (IterResearch): {'PASS' if results[0] else 'FAIL'}")
    print(f"Integration #70 (Dr. MAMR): {'PASS' if results[1] else 'FAIL'}")
    print(f"Integration #71 (AgileThinker): {'PASS' if results[2] else 'FAIL'}")
    print(f"Integration #72 (Tongyi): {'PASS' if results[3] else 'FAIL'}")
    print("=" * 60)

    if all(results):
        print("\n[SUCCESS] ALL 4 INTEGRATIONS PASSED!")
        print("\nGenesis now has 72 total integrations (68 + 4 new)")
        print("Ready for production deployment.")
        return 0
    else:
        print("\n[WARNING] Some tests failed. Review errors above.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### Audit Protocol (30 min)

**Create:** `scripts/audit_4_integrations.py`

```python
# scripts/audit_4_integrations.py
import asyncio
from pathlib import Path

async def audit_integration_69():
    """Audit IterResearch integration."""
    print("\n[AUDIT] Integration #69: IterResearch Workspace Manager")
    print("-" * 60)

    checks = []

    # Check file exists
    file_path = Path("infrastructure/iterresearch_workspace.py")
    checks.append(("File exists", file_path.exists()))

    # Check imports
    try:
        from infrastructure.iterresearch_workspace import (
            IterResearchWorkspace,
            Interaction,
            Insight,
            create_workspace
        )
        checks.append(("Imports work", True))
    except Exception as e:
        checks.append(("Imports work", False))
        print(f"  Import error: {e}")

    # Check instantiation
    try:
        workspace = create_workspace("audit_test")
        checks.append(("Instantiation works", True))
    except Exception as e:
        checks.append(("Instantiation works", False))

    # Check TrajectoryPool integration
    try:
        from infrastructure.trajectory_pool import TrajectoryPool
        pool = TrajectoryPool(agent_name="audit_agent")
        workspace = pool.attach_workspace("audit_task")
        checks.append(("TrajectoryPool integration", True))
    except Exception as e:
        checks.append(("TrajectoryPool integration", False))

    # Print results
    for check_name, passed in checks:
        status = "[OK]" if passed else "[FAIL]"
        print(f"  {status} {check_name}")

    return all(passed for _, passed in checks)

async def audit_integration_70():
    """Audit Dr. MAMR integration."""
    print("\n[AUDIT] Integration #70: Dr. MAMR Attribution Layer")
    print("-" * 60)

    checks = []

    # Check file exists
    file_path = Path("infrastructure/swarm/dr_mamr_attribution.py")
    checks.append(("File exists", file_path.exists()))

    # Check directory exists
    dir_path = Path("infrastructure/swarm")
    checks.append(("Directory exists", dir_path.exists()))

    # Check imports
    try:
        from infrastructure.swarm.dr_mamr_attribution import (
            DrMAMRAttributionLayer,
            ShapleyValueCalculator,
            RestartTokenManager,
            get_attribution_layer
        )
        checks.append(("Imports work", True))
    except Exception as e:
        checks.append(("Imports work", False))
        print(f"  Import error: {e}")

    # Check instantiation
    try:
        attribution = get_attribution_layer()
        checks.append(("Instantiation works", True))
    except Exception as e:
        checks.append(("Instantiation works", False))

    # Print results
    for check_name, passed in checks:
        status = "[OK]" if passed else "[FAIL]"
        print(f"  {status} {check_name}")

    return all(passed for _, passed in checks)

async def audit_integration_71():
    """Audit AgileThinker integration."""
    print("\n[AUDIT] Integration #71: AgileThinker Dual-Thread Router")
    print("-" * 60)

    checks = []

    # Check file exists
    file_path = Path("infrastructure/orchestration/agile_thinker_router.py")
    checks.append(("File exists", file_path.exists()))

    # Check directory
    dir_path = Path("infrastructure/orchestration")
    checks.append(("Directory exists", dir_path.exists()))

    # Check imports
    try:
        from infrastructure.orchestration.agile_thinker_router import (
            AgileThinkerRouter,
            ReactivePattern,
            get_agile_thinker
        )
        checks.append(("Imports work", True))
    except Exception as e:
        checks.append(("Imports work", False))
        print(f"  Import error: {e}")

    # Print results
    for check_name, passed in checks:
        status = "[OK]" if passed else "[FAIL]"
        print(f"  {status} {check_name}")

    return all(passed for _, passed in checks)

async def audit_integration_72():
    """Audit Tongyi-DeepResearch integration."""
    print("\n[AUDIT] Integration #72: Tongyi-DeepResearch Client")
    print("-" * 60)

    checks = []

    # Check file exists
    file_path = Path("infrastructure/llm_providers/tongyi_deepresearch_client.py")
    checks.append(("File exists", file_path.exists()))

    # Check directory
    dir_path = Path("infrastructure/llm_providers")
    checks.append(("Directory exists", dir_path.exists()))

    # Check imports
    try:
        from infrastructure.llm_providers.tongyi_deepresearch_client import (
            TongyiDeepResearchClient,
            ResearchResult,
            get_tongyi_client
        )
        checks.append(("Imports work", True))
    except Exception as e:
        checks.append(("Imports work", False))
        print(f"  Import error: {e}")

    # Check instantiation (local mode, no API)
    try:
        client = TongyiDeepResearchClient(mode="react", use_local=True)
        checks.append(("Instantiation works", True))
    except Exception as e:
        checks.append(("Instantiation works", False))

    # Print results
    for check_name, passed in checks:
        status = "[OK]" if passed else "[FAIL]"
        print(f"  {status} {check_name}")

    return all(passed for _, passed in checks)

async def main():
    print("=" * 60)
    print("AUDIT PROTOCOL - 4 NEW INTEGRATIONS")
    print("=" * 60)

    results = []
    results.append(await audit_integration_69())
    results.append(await audit_integration_70())
    results.append(await audit_integration_71())
    results.append(await audit_integration_72())

    print("\n" + "=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)
    print(f"Integration #69 (IterResearch): {'PASS' if results[0] else 'FAIL'}")
    print(f"Integration #70 (Dr. MAMR): {'PASS' if results[1] else 'FAIL'}")
    print(f"Integration #71 (AgileThinker): {'PASS' if results[2] else 'FAIL'}")
    print(f"Integration #72 (Tongyi): {'PASS' if results[3] else 'FAIL'}")
    print("=" * 60)

    if all(results):
        print("\n[SUCCESS] All integrations passed audit!")
        print("\nNext steps:")
        print("1. Run full integration tests: python scripts/test_all_4_integrations.py")
        print("2. Update CLAUDE.md with new integration count (72 total)")
        print("3. Deploy to production with feature flags")
        return 0
    else:
        print("\n[WARNING] Some integrations failed audit.")
        return 1

if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

---

## Agent Mapping & Deployment Plan

### Agent Ownership Matrix

| Integration | Primary Owner | Supporting Agents | Testing Agent |
|-------------|---------------|-------------------|---------------|
| #69 IterResearch | SE-Darwin Agent | TrajectoryPool, Genesis Meta | QA Agent |
| #70 Dr. MAMR | Inclusive Fitness (Swarm) | HALO Router, A2A Connector | Analyst Agent |
| #71 AgileThinker | Genesis Meta Agent | HTDAG Planner, HALO Router | QA Agent |
| #72 Tongyi-DeepResearch | Research Discovery Agent | Content Agent, Analyst | QA Agent |

### Deployment Checklist

**Pre-Deployment (Now):**
- [ ] Create all 4 integration files
- [ ] Run comprehensive tests (`test_all_4_integrations.py`)
- [ ] Run audit (`audit_4_integrations.py`)
- [ ] Update CLAUDE.md (68 → 72 integrations)
- [ ] Create feature flags in `.env`

**Deployment (After Tests Pass):**
- [ ] Commit to Git
- [ ] Push to main branch
- [ ] Deploy to staging
- [ ] Run production validation tests
- [ ] Monitor metrics for 1 hour
- [ ] Enable in production

**Post-Deployment:**
- [ ] Update documentation
- [ ] Train team on new capabilities
- [ ] Set up monitoring dashboards
- [ ] Schedule weekly review

---

## Quick Start Commands

```bash
# 1. Create all directories
mkdir -p infrastructure/swarm
mkdir -p infrastructure/orchestration
mkdir -p infrastructure/llm_providers
mkdir -p data/workspaces
mkdir -p data/attribution

# 2. Run comprehensive tests
python scripts/test_all_4_integrations.py

# 3. Run audit
python scripts/audit_4_integrations.py

# 4. If all pass, update CLAUDE.md
# Change: "68 integrations" → "72 integrations"
# Add: Integrations #69-72 to the list

# 5. Enable in production (.env)
echo "ENABLE_ITERRESEARCH=true" >> .env
echo "ENABLE_DR_MAMR=true" >> .env
echo "ENABLE_AGILE_THINKER=true" >> .env
echo "USE_TONGYI_RESEARCH=false" >> .env  # Enable after HF token setup

# 6. Run full business generation test
python scripts/autonomous_fully_integrated.py --count 1 --min-score 75.0
```

---

## Success Metrics (Monitor for 24 Hours)

| Metric | Baseline | Target | Integration |
|--------|----------|--------|-------------|
| Max reasoning steps | 50-100 | 500+ | #69 IterResearch |
| Multi-agent collaboration efficiency | Baseline | +20% | #70 Dr. MAMR |
| Simple task latency | 10-15s | 2-5s | #71 AgileThinker |
| Research cost per query | $0.50-1.00 | $0.10-0.20 | #72 Tongyi |

---

## Rollback Plan

If critical issues occur:

```bash
# Disable all new integrations
echo "ENABLE_ITERRESEARCH=false" >> .env
echo "ENABLE_DR_MAMR=false" >> .env
echo "ENABLE_AGILE_THINKER=false" >> .env
echo "USE_TONGYI_RESEARCH=false" >> .env

# Restart services
python a2a_fastapi.py
```

---

**Total Implementation Time:** 10 hours (achievable in single day)
**Risk Level:** MEDIUM (aggressive timeline, but comprehensive testing)
**Expected Outcome:** Genesis with 72 integrations, ready for production

**GO/NO-GO Decision Point:** After Hour 10 audit results
