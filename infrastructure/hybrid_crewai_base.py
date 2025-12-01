# HYBRID CrewAI Base - Genesis Thin Wrapper
# Tournament Winner: CrewAI (87.85% vs Genesis 81.16%)
# Purpose: Preserve A2A/TrajectoryPool hooks while leveraging CrewAI's task orchestration

"""
Hybrid CrewAI Base for Genesis Agents

This module provides a thin wrapper that:
1. Inherits CrewAI's Agent/Task orchestration (tournament winner)
2. Preserves Genesis A2A protocol integration
3. Maintains TrajectoryPool learning hooks
4. Keeps StandardIntegrationMixin capabilities (459 integrations)
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# CrewAI imports - Tournament Winner Framework
try:
    from crewai import Agent as CrewAIAgent, Task, Crew
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False
    CrewAIAgent = object  # Fallback base

# Genesis infrastructure imports
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Optional imports with graceful fallback
try:
    from infrastructure.trajectory_pool import TrajectoryPool, get_trajectory_pool
    TRAJECTORY_POOL_AVAILABLE = True
except ImportError:
    TRAJECTORY_POOL_AVAILABLE = False
    TrajectoryPool = None
    def get_trajectory_pool(): return None

try:
    from infrastructure.a2a_connector import A2AConnector
    A2A_AVAILABLE = True
    def get_a2a_connector(): return A2AConnector()
except ImportError:
    A2A_AVAILABLE = False
    def get_a2a_connector(): return None

logger = logging.getLogger(__name__)


class HybridCrewAIAgent(StandardIntegrationMixin):
    """
    Hybrid agent combining CrewAI task orchestration with Genesis hooks.

    Tournament Results:
    - CrewAI Score: 87.85%
    - Genesis Score: 81.16%
    - Delta: +7.6% for CrewAI

    This wrapper preserves:
    - A2A protocol for inter-agent communication
    - TrajectoryPool for learning and evolution
    - All 459 StandardIntegrationMixin capabilities
    """

    # LiteLLM configuration for Ollama
    LITELLM_CONFIG = {
        "model": "ollama/qwen2.5:14b-instruct-q4_K_M",
        "api_base": "http://localhost:11434"
    }

    def __init__(
        self,
        agent_name: str,
        role: str,
        goal: str,
        backstory: str = "",
        business_id: str = "default",
        verbose: bool = False
    ):
        # Initialize Genesis StandardIntegrationMixin first
        super().__init__()

        self.agent_name = agent_name
        self.business_id = business_id
        self.genesis_hooks_enabled = True
        self.verbose = verbose

        # CrewAI agent configuration
        self._crewai_role = role
        self._crewai_goal = goal
        self._crewai_backstory = backstory

        # Initialize CrewAI agent if available
        self._crewai_agent: Optional[CrewAIAgent] = None
        if CREWAI_AVAILABLE:
            try:
                self._crewai_agent = CrewAIAgent(
                    role=role,
                    goal=goal,
                    backstory=backstory,
                    verbose=verbose,
                    llm=self.LITELLM_CONFIG["model"],
                    allow_delegation=False
                )
                logger.info(f"[HYBRID] CrewAI agent initialized for {agent_name}")
            except Exception as e:
                logger.warning(f"[HYBRID] CrewAI init failed for {agent_name}: {e}")
                self._crewai_agent = None

        # Genesis hooks
        self._trajectory_pool: Optional[TrajectoryPool] = None
        self._a2a_connector = None
        self._execution_history: List[Dict[str, Any]] = []

        logger.info(
            f"[HYBRID] {agent_name} initialized - "
            f"CrewAI: {'enabled' if self._crewai_agent else 'fallback'} | "
            f"Genesis hooks: enabled"
        )

    async def _init_genesis_hooks(self):
        """Initialize Genesis A2A and TrajectoryPool hooks"""
        try:
            self._trajectory_pool = get_trajectory_pool()
            self._a2a_connector = get_a2a_connector()
            logger.debug(f"[HYBRID] Genesis hooks initialized for {self.agent_name}")
        except Exception as e:
            logger.warning(f"[HYBRID] Genesis hooks init failed: {e}")

    async def execute_task(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None,
        expected_output: str = "Completed task result"
    ) -> Dict[str, Any]:
        """
        Execute task using CrewAI orchestration with Genesis hooks.

        Flow:
        1. Log to TrajectoryPool (pre-execution)
        2. Execute via CrewAI Agent
        3. A2A protocol notification
        4. Log result to TrajectoryPool (post-execution)
        """
        execution_id = f"{self.agent_name}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        start_time = datetime.now(timezone.utc)

        # Pre-execution Genesis hook
        trajectory_entry = {
            "execution_id": execution_id,
            "agent": self.agent_name,
            "task": task_description,
            "context": context or {},
            "started_at": start_time.isoformat(),
            "framework": "crewai_hybrid"
        }

        if self._trajectory_pool:
            await self._log_to_trajectory_pool("task_started", trajectory_entry)

        result = {
            "execution_id": execution_id,
            "agent": self.agent_name,
            "status": "pending",
            "framework_used": "crewai" if self._crewai_agent else "genesis_fallback"
        }

        try:
            if self._crewai_agent and CREWAI_AVAILABLE:
                # Execute via CrewAI
                task = Task(
                    description=task_description,
                    expected_output=expected_output,
                    agent=self._crewai_agent
                )

                crew = Crew(
                    agents=[self._crewai_agent],
                    tasks=[task],
                    verbose=self.verbose
                )

                crew_result = crew.kickoff()
                result["output"] = str(crew_result)
                result["status"] = "success"

            else:
                # Fallback to Genesis LLM
                prompt = f"""You are a {self._crewai_role}.

Goal: {self._crewai_goal}

Task: {task_description}

Context: {json.dumps(context or {}, indent=2)}

Execute this task and provide the result in JSON format:
{{
  "result": "your task output",
  "reasoning": "your approach",
  "confidence": 0.0-1.0
}}
"""
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=1000)
                    try:
                        result["output"] = json.loads(llm_response)
                    except json.JSONDecodeError:
                        result["output"] = llm_response
                    result["status"] = "success"
                else:
                    result["output"] = "LLM client not available"
                    result["status"] = "error"

        except Exception as e:
            logger.error(f"[HYBRID] Task execution failed: {e}")
            result["status"] = "error"
            result["error"] = str(e)

        # Post-execution metrics
        end_time = datetime.now(timezone.utc)
        result["duration_ms"] = (end_time - start_time).total_seconds() * 1000
        result["completed_at"] = end_time.isoformat()

        # Post-execution Genesis hooks
        if self._trajectory_pool:
            await self._log_to_trajectory_pool("task_completed", {
                **trajectory_entry,
                "result": result,
                "completed_at": end_time.isoformat()
            })

        # A2A notification
        if self._a2a_connector:
            await self._notify_a2a(result)

        self._execution_history.append(result)
        return result

    async def a2a_invoke(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invoke via A2A protocol - Genesis inter-agent communication

        This preserves the A2A protocol integration for multi-agent workflows.
        """
        if not self._a2a_connector:
            await self._init_genesis_hooks()

        try:
            if self._a2a_connector:
                response = await self._a2a_connector.invoke(
                    agent_name=self.agent_name,
                    task=task
                )
                return response
            else:
                # Direct execution fallback
                return await self.execute_task(
                    task_description=task.get("description", str(task)),
                    context=task.get("context", {})
                )
        except Exception as e:
            logger.error(f"[HYBRID] A2A invoke failed: {e}")
            return {"status": "error", "error": str(e)}

    async def _log_to_trajectory_pool(self, event_type: str, data: Dict[str, Any]):
        """Log execution data to TrajectoryPool for learning"""
        if self._trajectory_pool:
            try:
                await self._trajectory_pool.log_trajectory(
                    agent_id=self.agent_name,
                    event_type=event_type,
                    data=data,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
            except Exception as e:
                logger.debug(f"[HYBRID] TrajectoryPool logging failed: {e}")

    async def _notify_a2a(self, result: Dict[str, Any]):
        """Send A2A notification for task completion"""
        if self._a2a_connector:
            try:
                await self._a2a_connector.notify(
                    agent_name=self.agent_name,
                    event="task_completed",
                    data=result
                )
            except Exception as e:
                logger.debug(f"[HYBRID] A2A notification failed: {e}")

    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history for this agent"""
        return list(self._execution_history)

    def get_metrics(self) -> Dict[str, Any]:
        """Get agent performance metrics"""
        if not self._execution_history:
            return {
                "agent": self.agent_name,
                "total_executions": 0,
                "framework": "crewai_hybrid"
            }

        successful = [e for e in self._execution_history if e.get("status") == "success"]
        avg_duration = sum(e.get("duration_ms", 0) for e in self._execution_history) / len(self._execution_history)

        return {
            "agent": self.agent_name,
            "total_executions": len(self._execution_history),
            "successful_executions": len(successful),
            "success_rate": len(successful) / len(self._execution_history),
            "avg_duration_ms": avg_duration,
            "framework": "crewai_hybrid",
            "crewai_available": CREWAI_AVAILABLE and self._crewai_agent is not None,
            "genesis_hooks_enabled": self.genesis_hooks_enabled
        }


# Factory function for creating hybrid agents
def create_hybrid_crewai_agent(
    agent_name: str,
    role: str,
    goal: str,
    backstory: str = "",
    business_id: str = "default"
) -> HybridCrewAIAgent:
    """Factory function to create a hybrid CrewAI agent with Genesis hooks"""
    return HybridCrewAIAgent(
        agent_name=agent_name,
        role=role,
        goal=goal,
        backstory=backstory,
        business_id=business_id
    )


__all__ = ["HybridCrewAIAgent", "create_hybrid_crewai_agent", "CREWAI_AVAILABLE"]
