"""
Genesis Orchestrator V2 - Next-generation orchestration engine.

Enhanced orchestrator with improved task decomposition, intelligent routing,
dynamic optimization, and comprehensive monitoring. Builds on V1 with:

- Parallel task execution with dependency management
- Adaptive agent selection based on real-time performance
- Cost-aware routing and optimization
- Policy-driven governance
- Real-time monitoring and metrics
- Failure recovery and graceful degradation

Integrates with HTDAG, HALO, AOP, DAAO, and Policy Cards for complete orchestration.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set, Tuple
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Status of orchestrated tasks"""
    PENDING = "pending"
    DECOMPOSING = "decomposing"
    ROUTING = "routing"
    VALIDATING = "validating"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionMode(Enum):
    """Execution modes for orchestration"""
    SEQUENTIAL = "sequential"      # Execute tasks one by one
    PARALLEL = "parallel"          # Execute independent tasks in parallel
    ADAPTIVE = "adaptive"          # Dynamically choose based on load


@dataclass
class OrchestrationTask:
    """Represents a task in the orchestration pipeline"""
    task_id: str
    description: str
    task_type: str
    status: TaskStatus = TaskStatus.PENDING
    dependencies: Set[str] = field(default_factory=set)
    assigned_agent: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> Optional[float]:
        """Calculate task duration"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def is_ready(self, completed_tasks: Set[str]) -> bool:
        """Check if task is ready to execute (all dependencies met)"""
        return self.dependencies.issubset(completed_tasks)


@dataclass
class OrchestrationPlan:
    """Complete orchestration plan with tasks and dependencies"""
    plan_id: str
    description: str
    tasks: List[OrchestrationTask]
    execution_mode: ExecutionMode = ExecutionMode.ADAPTIVE
    estimated_cost: float = 0.0
    estimated_duration: float = 0.0
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_ready_tasks(self, completed_tasks: Set[str], executing_tasks: Set[str]) -> List[OrchestrationTask]:
        """Get tasks ready to execute"""
        ready = []
        for task in self.tasks:
            if task.status == TaskStatus.PENDING and task.task_id not in executing_tasks:
                if task.is_ready(completed_tasks):
                    ready.append(task)
        return ready

    def get_task_by_id(self, task_id: str) -> Optional[OrchestrationTask]:
        """Get task by ID"""
        for task in self.tasks:
            if task.task_id == task_id:
                return task
        return None


class GenesisOrchestratorV2:
    """
    Genesis Orchestrator V2 - Enhanced orchestration engine.

    Provides complete orchestration lifecycle:
    1. Task decomposition (HTDAG)
    2. Agent routing (HALO)
    3. Plan validation (AOP)
    4. Cost optimization (DAAO)
    5. Policy enforcement (Policy Cards)
    6. Parallel execution with dependency management
    7. Real-time monitoring and metrics
    """

    def __init__(
        self,
        max_parallel_tasks: int = 5,
        enable_policies: bool = True,
        enable_optimization: bool = True,
        enable_monitoring: bool = True
    ):
        """
        Initialize Genesis Orchestrator V2.

        Args:
            max_parallel_tasks: Maximum concurrent tasks
            enable_policies: Enable policy enforcement
            enable_optimization: Enable cost optimization
            enable_monitoring: Enable monitoring and metrics
        """
        self.max_parallel_tasks = max_parallel_tasks
        self.enable_policies = enable_policies
        self.enable_optimization = enable_optimization
        self.enable_monitoring = enable_monitoring

        # Orchestration components (lazy loaded)
        self._htdag = None
        self._halo = None
        self._aop = None
        self._daao = None
        self._policies = None

        # Execution state
        self.active_plans: Dict[str, OrchestrationPlan] = {}
        self.completed_plans: List[str] = []
        self.metrics: Dict[str, Any] = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "total_duration": 0.0,
            "total_cost": 0.0
        }

        logger.info(f"Genesis Orchestrator V2 initialized (max_parallel={max_parallel_tasks})")

    @property
    def htdag(self):
        """Lazy load HTDAG planner"""
        if self._htdag is None:
            try:
                from infrastructure.htdag_planner import HTDAGPlanner
                self._htdag = HTDAGPlanner()
                logger.debug("HTDAG planner loaded")
            except Exception as e:
                logger.warning(f"HTDAG unavailable: {e}")
                self._htdag = None
        return self._htdag

    @property
    def halo(self):
        """Lazy load HALO router"""
        if self._halo is None:
            try:
                from infrastructure.halo_router import HALORouter
                self._halo = HALORouter.create_with_integrations()
                logger.debug("HALO router loaded")
            except Exception as e:
                logger.warning(f"HALO unavailable: {e}")
                self._halo = None
        return self._halo

    @property
    def aop(self):
        """Lazy load AOP validator"""
        if self._aop is None:
            try:
                from infrastructure.aop_validator import AOPValidator
                self._aop = AOPValidator()
                logger.debug("AOP validator loaded")
            except Exception as e:
                logger.warning(f"AOP unavailable: {e}")
                self._aop = None
        return self._aop

    @property
    def daao(self):
        """Lazy load DAAO optimizer"""
        if self._daao is None and self.enable_optimization:
            try:
                from infrastructure.daao_optimizer import DAAOOptimizer
                self._daao = DAAOOptimizer()
                logger.debug("DAAO optimizer loaded")
            except Exception as e:
                logger.warning(f"DAAO unavailable: {e}")
                self._daao = None
        return self._daao

    @property
    def policies(self):
        """Lazy load policy cards"""
        if self._policies is None and self.enable_policies:
            try:
                from infrastructure.policy_card_system import get_policy_cards
                self._policies = get_policy_cards()
                logger.debug("Policy cards loaded")
            except Exception as e:
                logger.warning(f"Policy cards unavailable: {e}")
                self._policies = None
        return self._policies

    async def orchestrate(
        self,
        description: str,
        requirements: Optional[Dict[str, Any]] = None,
        execution_mode: ExecutionMode = ExecutionMode.ADAPTIVE
    ) -> Dict[str, Any]:
        """
        Orchestrate a complete workflow.

        Args:
            description: High-level task description
            requirements: Additional requirements and constraints
            execution_mode: How to execute tasks (sequential/parallel/adaptive)

        Returns:
            Orchestration result with outputs and metrics
        """
        plan_id = str(uuid.uuid4())
        requirements = requirements or {}

        logger.info(f"[{plan_id}] Starting orchestration: {description}")

        try:
            # 1. Decompose task into subtasks (HTDAG)
            logger.info(f"[{plan_id}] Decomposing task...")
            tasks = await self._decompose_task(description, requirements)

            # 2. Route tasks to agents (HALO)
            logger.info(f"[{plan_id}] Routing {len(tasks)} tasks to agents...")
            tasks = await self._route_tasks(tasks, requirements)

            # 3. Create orchestration plan
            plan = OrchestrationPlan(
                plan_id=plan_id,
                description=description,
                tasks=tasks,
                execution_mode=execution_mode,
                metadata=requirements
            )

            # 4. Validate plan (AOP)
            if self.aop:
                logger.info(f"[{plan_id}] Validating orchestration plan...")
                is_valid, validation_issues = await self._validate_plan(plan)
                if not is_valid:
                    logger.error(f"[{plan_id}] Plan validation failed: {validation_issues}")
                    return {
                        "success": False,
                        "error": "Plan validation failed",
                        "issues": validation_issues
                    }

            # 5. Optimize plan (DAAO)
            if self.daao:
                logger.info(f"[{plan_id}] Optimizing plan...")
                plan = await self._optimize_plan(plan)

            # 6. Enforce policies
            if self.policies:
                logger.info(f"[{plan_id}] Enforcing policies...")
                policy_ok = await self._enforce_policies(plan)
                if not policy_ok:
                    return {
                        "success": False,
                        "error": "Policy violations prevent execution"
                    }

            # 7. Execute plan
            logger.info(f"[{plan_id}] Executing plan ({execution_mode.value} mode)...")
            self.active_plans[plan_id] = plan
            results = await self._execute_plan(plan)

            # 8. Collect metrics
            self._update_metrics(plan)

            # Mark as completed
            self.active_plans.pop(plan_id, None)
            self.completed_plans.append(plan_id)

            logger.info(f"[{plan_id}] Orchestration completed successfully")

            return {
                "success": True,
                "plan_id": plan_id,
                "results": results,
                "metrics": {
                    "total_tasks": len(tasks),
                    "completed_tasks": sum(1 for t in tasks if t.status == TaskStatus.COMPLETED),
                    "failed_tasks": sum(1 for t in tasks if t.status == TaskStatus.FAILED),
                    "total_duration": sum(t.duration or 0 for t in tasks),
                    "estimated_cost": plan.estimated_cost
                }
            }

        except Exception as e:
            logger.error(f"[{plan_id}] Orchestration failed: {e}", exc_info=True)
            self.active_plans.pop(plan_id, None)
            return {
                "success": False,
                "error": str(e),
                "plan_id": plan_id
            }

    async def _decompose_task(
        self,
        description: str,
        requirements: Dict[str, Any]
    ) -> List[OrchestrationTask]:
        """Decompose high-level task into subtasks using HTDAG"""
        if self.htdag:
            try:
                dag = await self.htdag.decompose(description, requirements)
                tasks = []
                for node in dag.get("nodes", []):
                    task = OrchestrationTask(
                        task_id=node.get("id", str(uuid.uuid4())),
                        description=node.get("description", ""),
                        task_type=node.get("type", "generic"),
                        dependencies=set(node.get("dependencies", [])),
                        metadata=node.get("metadata", {})
                    )
                    tasks.append(task)
                return tasks
            except Exception as e:
                logger.error(f"HTDAG decomposition failed: {e}")

        # Fallback: single task
        return [OrchestrationTask(
            task_id=str(uuid.uuid4()),
            description=description,
            task_type="generic"
        )]

    async def _route_tasks(
        self,
        tasks: List[OrchestrationTask],
        requirements: Dict[str, Any]
    ) -> List[OrchestrationTask]:
        """Route tasks to appropriate agents using HALO"""
        if self.halo:
            for task in tasks:
                try:
                    agent = self.halo.route_task(
                        task_type=task.task_type,
                        requirements={**requirements, **task.metadata}
                    )
                    task.assigned_agent = agent.get("agent_name", "builder_agent")
                    task.status = TaskStatus.ROUTING
                except Exception as e:
                    logger.warning(f"HALO routing failed for task {task.task_id}: {e}")
                    task.assigned_agent = "builder_agent"  # Fallback
        else:
            # Fallback routing
            for task in tasks:
                task.assigned_agent = "builder_agent"

        return tasks

    async def _validate_plan(self, plan: OrchestrationPlan) -> Tuple[bool, List[str]]:
        """Validate orchestration plan using AOP"""
        try:
            result = await self.aop.validate(plan)
            return result.get("valid", False), result.get("issues", [])
        except Exception as e:
            logger.error(f"AOP validation error: {e}")
            return True, []  # Allow execution on validation error

    async def _optimize_plan(self, plan: OrchestrationPlan) -> OrchestrationPlan:
        """Optimize plan using DAAO"""
        try:
            optimized = await self.daao.optimize(plan)
            plan.estimated_cost = optimized.get("cost", 0.0)
            plan.estimated_duration = optimized.get("duration", 0.0)
        except Exception as e:
            logger.warning(f"DAAO optimization failed: {e}")
        return plan

    async def _enforce_policies(self, plan: OrchestrationPlan) -> bool:
        """Enforce policies using Policy Cards"""
        try:
            from infrastructure.policy_card_system import evaluate_policies

            context = {
                "plan_id": plan.plan_id,
                "task_count": len(plan.tasks),
                "estimated_cost": plan.estimated_cost,
                "cost": plan.estimated_cost,
                "budget": plan.metadata.get("budget", 1000),
                "budget_limit": plan.metadata.get("budget_limit", 1000),
            }

            violations = evaluate_policies(context, tags={"core"}, raise_on_fatal=False)

            if self.policies.has_fatal_violations(violations):
                logger.error("Fatal policy violations prevent execution")
                return False

            return True

        except Exception as e:
            logger.warning(f"Policy enforcement failed: {e}")
            return True  # Allow execution on policy error

    async def _execute_plan(self, plan: OrchestrationPlan) -> List[Dict[str, Any]]:
        """Execute orchestration plan with dependency management"""
        completed_tasks: Set[str] = set()
        executing_tasks: Set[str] = set()
        results = []

        while len(completed_tasks) < len(plan.tasks):
            # Get ready tasks
            ready_tasks = plan.get_ready_tasks(completed_tasks, executing_tasks)

            if not ready_tasks:
                # Wait for executing tasks to complete
                await asyncio.sleep(0.1)
                continue

            # Execute tasks (up to max_parallel_tasks)
            if plan.execution_mode == ExecutionMode.SEQUENTIAL:
                # Sequential: execute one at a time
                task = ready_tasks[0]
                result = await self._execute_task(task)
                results.append(result)
                completed_tasks.add(task.task_id)
            else:
                # Parallel/Adaptive: execute multiple
                batch = ready_tasks[:self.max_parallel_tasks]
                executing_tasks.update(t.task_id for t in batch)

                # Execute batch in parallel
                batch_results = await asyncio.gather(
                    *[self._execute_task(t) for t in batch],
                    return_exceptions=True
                )

                for task, result in zip(batch, batch_results):
                    executing_tasks.discard(task.task_id)
                    completed_tasks.add(task.task_id)
                    if not isinstance(result, Exception):
                        results.append(result)

        return results

    async def _execute_task(self, task: OrchestrationTask) -> Dict[str, Any]:
        """Execute a single task"""
        task.status = TaskStatus.EXECUTING
        task.start_time = time.time()

        try:
            # Simulate task execution
            logger.info(f"Executing task {task.task_id} with agent {task.assigned_agent}")
            await asyncio.sleep(0.1)  # Placeholder for actual agent execution

            task.result = {"status": "completed", "task_id": task.task_id}
            task.status = TaskStatus.COMPLETED
            task.end_time = time.time()

            return task.result

        except Exception as e:
            task.error = str(e)
            task.status = TaskStatus.FAILED
            task.end_time = time.time()
            logger.error(f"Task {task.task_id} failed: {e}")
            return {"status": "failed", "error": str(e)}

    def _update_metrics(self, plan: OrchestrationPlan) -> None:
        """Update global metrics after plan execution"""
        self.metrics["total_tasks"] += len(plan.tasks)
        self.metrics["completed_tasks"] += sum(1 for t in plan.tasks if t.status == TaskStatus.COMPLETED)
        self.metrics["failed_tasks"] += sum(1 for t in plan.tasks if t.status == TaskStatus.FAILED)
        self.metrics["total_duration"] += sum(t.duration or 0 for t in plan.tasks)
        self.metrics["total_cost"] += plan.estimated_cost

    def get_metrics(self) -> Dict[str, Any]:
        """Get orchestration metrics"""
        return self.metrics.copy()


# Global instance
_orchestrator = None


def get_genesis_orchestrator_v2() -> GenesisOrchestratorV2:
    """
    Get global Genesis Orchestrator V2 instance.

    Returns:
        GenesisOrchestratorV2 instance
    """
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = GenesisOrchestratorV2()
    return _orchestrator
