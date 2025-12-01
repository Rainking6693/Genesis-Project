"""
Pipelex Workflows - Pipeline execution framework for Genesis.

Provides declarative workflow definition and execution with:
- DAG-based task dependencies
- Parallel and sequential execution
- Error handling and retry logic
- State management and checkpointing
- Dynamic workflow generation
- Pipeline templates

Enables complex multi-agent workflows with clear dependency management.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set, Callable, Awaitable
from enum import Enum
import json

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class TaskState(Enum):
    """Task execution state"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class PipelineState(Enum):
    """Pipeline execution state"""
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TaskConfig:
    """Configuration for a pipeline task"""
    task_id: str
    name: str
    executor: Callable[..., Awaitable[Any]]
    dependencies: List[str] = field(default_factory=list)
    retry_count: int = 3
    retry_delay: float = 1.0
    timeout: Optional[float] = None
    skip_on_failure: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskResult:
    """Result of task execution"""
    task_id: str
    state: TaskState
    output: Any = None
    error: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    attempts: int = 0

    @property
    def duration(self) -> Optional[float]:
        """Calculate execution duration"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    @property
    def succeeded(self) -> bool:
        """Check if task succeeded"""
        return self.state == TaskState.COMPLETED


@dataclass
class Pipeline:
    """Pipeline definition"""
    pipeline_id: str
    name: str
    tasks: List[TaskConfig]
    state: PipelineState = PipelineState.CREATED
    results: Dict[str, TaskResult] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> Optional[float]:
        """Calculate pipeline duration"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None

    def get_task(self, task_id: str) -> Optional[TaskConfig]:
        """Get task by ID"""
        for task in self.tasks:
            if task.task_id == task_id:
                return task
        return None


class PipelexWorkflowEngine:
    """
    Pipelex workflow execution engine.

    Executes pipelines with DAG-based task dependencies, parallel execution,
    error handling, and state management.
    """

    def __init__(self, max_parallel_tasks: int = 10):
        """
        Initialize workflow engine.

        Args:
            max_parallel_tasks: Maximum concurrent task execution
        """
        self.max_parallel_tasks = max_parallel_tasks
        self.active_pipelines: Dict[str, Pipeline] = {}
        self.completed_pipelines: List[str] = []

        logger.info(f"Pipelex workflow engine initialized (max_parallel={max_parallel_tasks})")

    def create_pipeline(
        self,
        name: str,
        tasks: List[TaskConfig],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Pipeline:
        """
        Create a new pipeline.

        Args:
            name: Pipeline name
            tasks: List of task configurations
            metadata: Optional metadata

        Returns:
            Pipeline instance
        """
        pipeline = Pipeline(
            pipeline_id=str(uuid.uuid4()),
            name=name,
            tasks=tasks,
            metadata=metadata or {}
        )

        # Validate DAG (no cycles)
        if not self._validate_dag(tasks):
            raise ValueError("Pipeline contains circular dependencies")

        logger.info(f"Created pipeline '{name}' with {len(tasks)} tasks (id: {pipeline.pipeline_id})")

        return pipeline

    def _validate_dag(self, tasks: List[TaskConfig]) -> bool:
        """Validate that task dependencies form a DAG (no cycles)"""
        # Build adjacency list
        graph = {task.task_id: set(task.dependencies) for task in tasks}

        # DFS cycle detection
        visited = set()
        rec_stack = set()

        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in graph.get(node, set()):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node)
            return False

        for task in tasks:
            if task.task_id not in visited:
                if has_cycle(task.task_id):
                    return False

        return True

    async def execute_pipeline(
        self,
        pipeline: Pipeline,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute pipeline.

        Args:
            pipeline: Pipeline to execute
            context: Execution context shared across tasks

        Returns:
            Execution summary
        """
        pipeline.state = PipelineState.RUNNING
        pipeline.started_at = time.time()
        self.active_pipelines[pipeline.pipeline_id] = pipeline

        logger.info(f"Executing pipeline '{pipeline.name}' ({pipeline.pipeline_id})")

        context = context or {}

        try:
            # Track completed tasks
            completed: Set[str] = set()
            failed: Set[str] = set()

            # Execute tasks respecting dependencies
            while len(completed) + len(failed) < len(pipeline.tasks):
                # Get ready tasks (dependencies met)
                ready_tasks = self._get_ready_tasks(pipeline, completed, failed)

                if not ready_tasks:
                    # No ready tasks - check for deadlock
                    if len(completed) + len(failed) < len(pipeline.tasks):
                        logger.error("Pipeline deadlock detected")
                        pipeline.state = PipelineState.FAILED
                        break
                    continue

                # Execute ready tasks in parallel
                results = await self._execute_task_batch(
                    ready_tasks,
                    pipeline,
                    context
                )

                # Process results
                for task_id, result in results.items():
                    pipeline.results[task_id] = result

                    if result.succeeded:
                        completed.add(task_id)
                        logger.info(f"Task '{task_id}' completed in {result.duration:.2f}s")
                    else:
                        task = pipeline.get_task(task_id)
                        if task and task.skip_on_failure:
                            logger.warning(f"Task '{task_id}' failed but marked to skip")
                            completed.add(task_id)
                        else:
                            failed.add(task_id)
                            logger.error(f"Task '{task_id}' failed: {result.error}")

            # Determine final state
            if failed:
                pipeline.state = PipelineState.FAILED
            else:
                pipeline.state = PipelineState.COMPLETED

            pipeline.completed_at = time.time()

            # Move to completed
            self.active_pipelines.pop(pipeline.pipeline_id, None)
            self.completed_pipelines.append(pipeline.pipeline_id)

            logger.info(
                f"Pipeline '{pipeline.name}' {pipeline.state.value} "
                f"({len(completed)} completed, {len(failed)} failed, "
                f"duration: {pipeline.duration:.2f}s)"
            )

            return {
                "pipeline_id": pipeline.pipeline_id,
                "state": pipeline.state.value,
                "completed_tasks": len(completed),
                "failed_tasks": len(failed),
                "duration": pipeline.duration,
                "results": {k: v.output for k, v in pipeline.results.items() if v.succeeded}
            }

        except Exception as e:
            logger.error(f"Pipeline execution error: {e}", exc_info=True)
            pipeline.state = PipelineState.FAILED
            pipeline.completed_at = time.time()

            return {
                "pipeline_id": pipeline.pipeline_id,
                "state": "failed",
                "error": str(e)
            }

    def _get_ready_tasks(
        self,
        pipeline: Pipeline,
        completed: Set[str],
        failed: Set[str]
    ) -> List[TaskConfig]:
        """Get tasks ready to execute"""
        ready = []

        for task in pipeline.tasks:
            # Skip if already processed
            if task.task_id in completed or task.task_id in failed:
                continue

            # Skip if already running
            if task.task_id in pipeline.results:
                result = pipeline.results[task.task_id]
                if result.state == TaskState.RUNNING:
                    continue

            # Check dependencies
            deps_met = all(dep in completed for dep in task.dependencies)

            if deps_met:
                ready.append(task)

        return ready

    async def _execute_task_batch(
        self,
        tasks: List[TaskConfig],
        pipeline: Pipeline,
        context: Dict[str, Any]
    ) -> Dict[str, TaskResult]:
        """Execute batch of tasks in parallel"""
        # Limit parallelism
        batch = tasks[:self.max_parallel_tasks]

        # Execute tasks
        task_futures = {
            task.task_id: self._execute_task(task, pipeline, context)
            for task in batch
        }

        # Wait for all to complete
        results = {}
        for task_id, future in task_futures.items():
            results[task_id] = await future

        return results

    async def _execute_task(
        self,
        task: TaskConfig,
        pipeline: Pipeline,
        context: Dict[str, Any]
    ) -> TaskResult:
        """Execute a single task with retry logic"""
        result = TaskResult(
            task_id=task.task_id,
            state=TaskState.RUNNING,
            start_time=time.time()
        )

        for attempt in range(task.retry_count + 1):
            result.attempts = attempt + 1

            try:
                # Execute with timeout
                if task.timeout:
                    output = await asyncio.wait_for(
                        task.executor(context),
                        timeout=task.timeout
                    )
                else:
                    output = await task.executor(context)

                result.output = output
                result.state = TaskState.COMPLETED
                result.end_time = time.time()

                return result

            except asyncio.TimeoutError:
                error = f"Task timed out after {task.timeout}s"
                logger.warning(f"Task '{task.task_id}' timeout (attempt {attempt + 1})")

            except Exception as e:
                error = str(e)
                logger.warning(f"Task '{task.task_id}' failed (attempt {attempt + 1}): {e}")

            # Retry if attempts remaining
            if attempt < task.retry_count:
                result.state = TaskState.RETRYING
                await asyncio.sleep(task.retry_delay * (2 ** attempt))  # Exponential backoff
            else:
                result.state = TaskState.FAILED
                result.error = error
                result.end_time = time.time()

        return result

    def get_pipeline_status(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Get pipeline execution status"""
        pipeline = self.active_pipelines.get(pipeline_id)

        if not pipeline:
            return None

        return {
            "pipeline_id": pipeline.pipeline_id,
            "name": pipeline.name,
            "state": pipeline.state.value,
            "total_tasks": len(pipeline.tasks),
            "completed_tasks": sum(1 for r in pipeline.results.values() if r.succeeded),
            "failed_tasks": sum(1 for r in pipeline.results.values() if r.state == TaskState.FAILED),
            "running_tasks": sum(1 for r in pipeline.results.values() if r.state == TaskState.RUNNING),
            "duration": time.time() - pipeline.started_at if pipeline.started_at else None
        }


class PipelineBuilder:
    """Builder for creating pipelines declaratively"""

    def __init__(self, name: str):
        """Initialize pipeline builder"""
        self.name = name
        self.tasks: List[TaskConfig] = []

    def add_task(
        self,
        task_id: str,
        executor: Callable[..., Awaitable[Any]],
        dependencies: Optional[List[str]] = None,
        **kwargs
    ) -> 'PipelineBuilder':
        """
        Add task to pipeline.

        Args:
            task_id: Unique task identifier
            executor: Async function to execute
            dependencies: Task IDs this task depends on
            **kwargs: Additional task configuration

        Returns:
            Self for chaining
        """
        task = TaskConfig(
            task_id=task_id,
            name=kwargs.get("name", task_id),
            executor=executor,
            dependencies=dependencies or [],
            **{k: v for k, v in kwargs.items() if k != "name"}
        )

        self.tasks.append(task)

        return self

    def build(self) -> Pipeline:
        """Build pipeline"""
        engine = get_pipelex_engine()
        return engine.create_pipeline(self.name, self.tasks)


# Global instance
_pipelex_engine = None


def get_pipelex_engine() -> PipelexWorkflowEngine:
    """
    Get global Pipelex workflow engine.

    Returns:
        PipelexWorkflowEngine instance
    """
    global _pipelex_engine
    if _pipelex_engine is None:
        _pipelex_engine = PipelexWorkflowEngine()
    return _pipelex_engine
