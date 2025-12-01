#!/usr/bin/env python3
"""
GENESIS BUSINESS MASTERY TRAINING

Train Genesis on the REAL skills needed for autonomous business operation:
1. Business Generation - End-to-end business creation
2. Agent Orchestration - Coordinating multiple agents
3. Decision Making - Viability, kill, resource decisions
4. Error Recovery - Handling failures gracefully

Each skill area has progressive difficulty levels.
Genesis must demonstrate mastery to level up.

Usage:
    python run_business_mastery_training.py --hours 8 --iterations-per-hour 10
"""

import sys
import os
import asyncio
import argparse
import logging
import json
import time
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

# Setup paths
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))
os.environ["PYTHONPATH"] = f"{PROJECT_ROOT};{PROJECT_ROOT / 'src'};{os.environ.get('PYTHONPATH', '')}"

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(PROJECT_ROOT / "logs" / f"business_mastery_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
    ],
)
logger = logging.getLogger("business_mastery")


# =============================================================================
# SKILL 1: BUSINESS GENERATION
# =============================================================================

BUSINESS_GENERATION_CHALLENGES = [
    # Level 1: Basic business spec creation
    {
        "name": "create_business_spec",
        "skill": "business_generation",
        "level": 1,
        "description": "Create a valid business specification",
        "code": '''
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

class BusinessType(Enum):
    SAAS = "saas"
    MARKETPLACE = "marketplace"
    CONTENT = "content"
    ECOMMERCE = "ecommerce"

@dataclass
class BusinessSpec:
    """A complete business specification."""
    name: str
    business_type: BusinessType
    description: str
    target_market: str
    revenue_model: str
    tech_stack: List[str]
    estimated_cost: float
    estimated_revenue: float

    def is_valid(self) -> bool:
        """Check if spec is complete and valid."""
        return (
            len(self.name) >= 3 and
            len(self.description) >= 20 and
            len(self.target_market) >= 10 and
            len(self.tech_stack) >= 2 and
            self.estimated_cost > 0 and
            self.estimated_revenue > 0
        )

    def viability_score(self) -> float:
        """Calculate basic viability score."""
        if self.estimated_cost <= 0:
            return 0.0
        roi = (self.estimated_revenue - self.estimated_cost) / self.estimated_cost
        return min(1.0, max(0.0, (roi + 1) / 2))

# Test basic spec creation
spec1 = BusinessSpec(
    name="TaskFlow",
    business_type=BusinessType.SAAS,
    description="AI-powered project management for remote teams",
    target_market="Small to medium tech companies",
    revenue_model="Monthly subscription $29/user",
    tech_stack=["Python", "React", "PostgreSQL", "OpenAI"],
    estimated_cost=5000.0,
    estimated_revenue=15000.0
)

assert spec1.is_valid() == True, "Valid spec should pass validation"
assert spec1.viability_score() > 0.5, "Good ROI should have high viability"

# Test invalid spec
spec2 = BusinessSpec(
    name="AB",  # Too short
    business_type=BusinessType.SAAS,
    description="Short",  # Too short
    target_market="Everyone",  # Too short
    revenue_model="Ads",
    tech_stack=["Python"],  # Only 1 item
    estimated_cost=0,  # Invalid
    estimated_revenue=1000.0
)
assert spec2.is_valid() == False, "Invalid spec should fail validation"

# Test viability calculation
spec3 = BusinessSpec(
    name="LowROI",
    business_type=BusinessType.CONTENT,
    description="A content platform with uncertain revenue",
    target_market="General consumers worldwide",
    revenue_model="Advertising based",
    tech_stack=["WordPress", "MySQL"],
    estimated_cost=10000.0,
    estimated_revenue=5000.0  # Negative ROI
)
assert spec3.viability_score() < 0.5, "Negative ROI should have low viability"

print("Skill 1 Level 1: create_business_spec PASSED!")
''',
        "tests_count": 3,
        "hint": "BusinessSpec needs name, type, description, market, revenue model, tech stack, and costs",
    },
    # Level 2: Business pipeline generation
    {
        "name": "generate_business_pipeline",
        "skill": "business_generation",
        "level": 2,
        "description": "Generate a full business creation pipeline",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum

class PipelineStage(Enum):
    IDEATION = "ideation"
    VALIDATION = "validation"
    DESIGN = "design"
    DEVELOPMENT = "development"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"

@dataclass
class PipelineStep:
    """A single step in the business pipeline."""
    stage: PipelineStage
    name: str
    description: str
    dependencies: List[str] = field(default_factory=list)
    estimated_hours: float = 1.0
    required_agents: List[str] = field(default_factory=list)

    def can_start(self, completed_steps: List[str]) -> bool:
        """Check if all dependencies are met."""
        return all(dep in completed_steps for dep in self.dependencies)

@dataclass
class BusinessPipeline:
    """Complete pipeline for business generation."""
    business_name: str
    steps: List[PipelineStep] = field(default_factory=list)

    def add_step(self, step: PipelineStep) -> None:
        self.steps.append(step)

    def get_ready_steps(self, completed: List[str]) -> List[PipelineStep]:
        """Get steps that can be started now."""
        return [s for s in self.steps if s.name not in completed and s.can_start(completed)]

    def total_hours(self) -> float:
        return sum(s.estimated_hours for s in self.steps)

    def critical_path(self) -> List[str]:
        """Find the critical path through the pipeline."""
        if not self.steps:
            return []

        # Simple topological sort
        completed = []
        remaining = list(self.steps)

        while remaining:
            ready = [s for s in remaining if s.can_start(completed)]
            if not ready:
                break  # Circular dependency
            # Pick the longest one
            next_step = max(ready, key=lambda s: s.estimated_hours)
            completed.append(next_step.name)
            remaining.remove(next_step)

        return completed

def generate_saas_pipeline(name: str) -> BusinessPipeline:
    """Generate a standard SaaS business pipeline."""
    pipeline = BusinessPipeline(business_name=name)

    # Ideation
    pipeline.add_step(PipelineStep(
        stage=PipelineStage.IDEATION,
        name="market_research",
        description="Research target market and competitors",
        estimated_hours=4.0,
        required_agents=["research_agent"]
    ))

    pipeline.add_step(PipelineStep(
        stage=PipelineStage.IDEATION,
        name="feature_definition",
        description="Define core features and MVP scope",
        dependencies=["market_research"],
        estimated_hours=2.0,
        required_agents=["product_agent"]
    ))

    # Validation
    pipeline.add_step(PipelineStep(
        stage=PipelineStage.VALIDATION,
        name="viability_check",
        description="Assess technical and market viability",
        dependencies=["feature_definition"],
        estimated_hours=2.0,
        required_agents=["validator_agent"]
    ))

    # Design
    pipeline.add_step(PipelineStep(
        stage=PipelineStage.DESIGN,
        name="architecture_design",
        description="Design system architecture",
        dependencies=["viability_check"],
        estimated_hours=3.0,
        required_agents=["architect_agent"]
    ))

    pipeline.add_step(PipelineStep(
        stage=PipelineStage.DESIGN,
        name="ui_design",
        description="Create UI/UX designs",
        dependencies=["viability_check"],
        estimated_hours=4.0,
        required_agents=["design_agent"]
    ))

    # Development
    pipeline.add_step(PipelineStep(
        stage=PipelineStage.DEVELOPMENT,
        name="backend_dev",
        description="Develop backend services",
        dependencies=["architecture_design"],
        estimated_hours=20.0,
        required_agents=["backend_agent"]
    ))

    pipeline.add_step(PipelineStep(
        stage=PipelineStage.DEVELOPMENT,
        name="frontend_dev",
        description="Develop frontend application",
        dependencies=["ui_design", "backend_dev"],
        estimated_hours=16.0,
        required_agents=["frontend_agent"]
    ))

    # Testing & Deployment
    pipeline.add_step(PipelineStep(
        stage=PipelineStage.TESTING,
        name="testing",
        description="Run comprehensive tests",
        dependencies=["frontend_dev"],
        estimated_hours=8.0,
        required_agents=["qa_agent"]
    ))

    pipeline.add_step(PipelineStep(
        stage=PipelineStage.DEPLOYMENT,
        name="deployment",
        description="Deploy to production",
        dependencies=["testing"],
        estimated_hours=2.0,
        required_agents=["devops_agent"]
    ))

    return pipeline

# Tests
pipeline = generate_saas_pipeline("TaskFlow")

# Test pipeline structure
assert len(pipeline.steps) == 9, f"Pipeline should have 9 steps, got {len(pipeline.steps)}"
assert pipeline.business_name == "TaskFlow"

# Test dependency resolution
completed = []
ready = pipeline.get_ready_steps(completed)
assert len(ready) == 1, "Only market_research should be ready initially"
assert ready[0].name == "market_research"

completed = ["market_research"]
ready = pipeline.get_ready_steps(completed)
assert len(ready) == 1, "feature_definition should be next"

completed = ["market_research", "feature_definition", "viability_check"]
ready = pipeline.get_ready_steps(completed)
assert len(ready) == 2, "architecture_design and ui_design should be ready in parallel"

# Test total hours
assert pipeline.total_hours() > 50, "Total hours should be significant"

# Test critical path
critical = pipeline.critical_path()
assert len(critical) == 9, "Critical path should include all steps"
assert critical[0] == "market_research", "Critical path should start with market_research"

# Test can_start
step = pipeline.steps[1]  # feature_definition
assert step.can_start([]) == False, "Should not start without dependencies"
assert step.can_start(["market_research"]) == True, "Should start with dependency met"

print("Skill 1 Level 2: generate_business_pipeline PASSED!")
''',
        "tests_count": 7,
        "hint": "Pipeline needs stages, steps with dependencies, and methods for traversal",
    },
    # Level 3: End-to-end business generation
    {
        "name": "end_to_end_business_generation",
        "skill": "business_generation",
        "level": 3,
        "description": "Generate a complete business with all artifacts",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
import json

class BusinessType(Enum):
    SAAS = "saas"
    MARKETPLACE = "marketplace"

class ArtifactType(Enum):
    SPEC = "specification"
    ARCHITECTURE = "architecture"
    DATABASE = "database_schema"
    API = "api_design"
    FRONTEND = "frontend_code"
    BACKEND = "backend_code"
    TESTS = "test_suite"
    DEPLOYMENT = "deployment_config"
    DOCS = "documentation"

@dataclass
class Artifact:
    """A generated business artifact."""
    artifact_type: ArtifactType
    name: str
    content: str
    version: str = "1.0"
    dependencies: List[str] = field(default_factory=list)

    def is_valid(self) -> bool:
        return len(self.content) > 10 and len(self.name) > 0

@dataclass
class GeneratedBusiness:
    """A fully generated business."""
    name: str
    business_type: BusinessType
    artifacts: Dict[ArtifactType, Artifact] = field(default_factory=dict)
    metrics: Dict[str, float] = field(default_factory=dict)

    def add_artifact(self, artifact: Artifact) -> None:
        self.artifacts[artifact.artifact_type] = artifact

    def completeness_score(self) -> float:
        """Calculate how complete the business is."""
        required = [
            ArtifactType.SPEC, ArtifactType.ARCHITECTURE,
            ArtifactType.DATABASE, ArtifactType.API,
            ArtifactType.BACKEND, ArtifactType.DEPLOYMENT
        ]
        present = sum(1 for r in required if r in self.artifacts)
        return present / len(required)

    def is_deployable(self) -> bool:
        """Check if business can be deployed."""
        required = [
            ArtifactType.BACKEND, ArtifactType.DEPLOYMENT,
            ArtifactType.DATABASE
        ]
        return all(r in self.artifacts for r in required)

    def quality_score(self) -> float:
        """Calculate overall quality score."""
        if not self.artifacts:
            return 0.0
        valid_count = sum(1 for a in self.artifacts.values() if a.is_valid())
        return valid_count / len(self.artifacts)

    def to_manifest(self) -> Dict[str, Any]:
        """Export business to deployment manifest."""
        return {
            "name": self.name,
            "type": self.business_type.value,
            "artifacts": [a.name for a in self.artifacts.values()],
            "completeness": self.completeness_score(),
            "deployable": self.is_deployable(),
            "quality": self.quality_score()
        }

class BusinessGenerator:
    """End-to-end business generator."""

    def __init__(self):
        self.templates = {
            BusinessType.SAAS: self._generate_saas,
            BusinessType.MARKETPLACE: self._generate_marketplace
        }

    def generate(self, name: str, btype: BusinessType) -> GeneratedBusiness:
        """Generate a complete business."""
        generator = self.templates.get(btype, self._generate_saas)
        return generator(name)

    def _generate_saas(self, name: str) -> GeneratedBusiness:
        business = GeneratedBusiness(name=name, business_type=BusinessType.SAAS)

        # Specification
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.SPEC,
            name=f"{name}_spec",
            content=f"Business Specification for {name}\\nType: SaaS\\nTarget: SMB"
        ))

        # Architecture
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.ARCHITECTURE,
            name=f"{name}_architecture",
            content="Microservices architecture with API Gateway\\nServices: auth, core, billing",
            dependencies=["spec"]
        ))

        # Database
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.DATABASE,
            name=f"{name}_db_schema",
            content="PostgreSQL schema\\nTables: users, subscriptions, data",
            dependencies=["architecture"]
        ))

        # API
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.API,
            name=f"{name}_api",
            content="REST API v1\\nEndpoints: /auth, /users, /data, /billing",
            dependencies=["architecture"]
        ))

        # Backend
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.BACKEND,
            name=f"{name}_backend",
            content="Python FastAPI backend\\nModules: auth, core, billing, api",
            dependencies=["database", "api"]
        ))

        # Deployment
        business.add_artifact(Artifact(
            artifact_type=ArtifactType.DEPLOYMENT,
            name=f"{name}_deploy",
            content="Docker + Railway deployment\\nServices: api, db, redis",
            dependencies=["backend"]
        ))

        business.metrics = {
            "estimated_cost": 5000.0,
            "estimated_revenue": 15000.0,
            "time_to_market_days": 30
        }

        return business

    def _generate_marketplace(self, name: str) -> GeneratedBusiness:
        business = GeneratedBusiness(name=name, business_type=BusinessType.MARKETPLACE)

        business.add_artifact(Artifact(
            artifact_type=ArtifactType.SPEC,
            name=f"{name}_spec",
            content=f"Marketplace Specification for {name}\\nBuyers and Sellers platform"
        ))

        business.add_artifact(Artifact(
            artifact_type=ArtifactType.ARCHITECTURE,
            name=f"{name}_architecture",
            content="Multi-tenant marketplace architecture\\nServices: users, listings, transactions, payments"
        ))

        business.add_artifact(Artifact(
            artifact_type=ArtifactType.DATABASE,
            name=f"{name}_db",
            content="PostgreSQL + Elasticsearch\\nTables: users, listings, orders, reviews"
        ))

        business.add_artifact(Artifact(
            artifact_type=ArtifactType.BACKEND,
            name=f"{name}_backend",
            content="Node.js backend with GraphQL\\nServices: auth, marketplace, payments"
        ))

        business.add_artifact(Artifact(
            artifact_type=ArtifactType.DEPLOYMENT,
            name=f"{name}_deploy",
            content="Kubernetes deployment\\nPods: api, search, payments, workers"
        ))

        return business

# Tests
generator = BusinessGenerator()

# Test SaaS generation
saas = generator.generate("TaskFlow", BusinessType.SAAS)
assert saas.name == "TaskFlow"
assert saas.business_type == BusinessType.SAAS
assert len(saas.artifacts) >= 6, f"Should have 6+ artifacts, got {len(saas.artifacts)}"
assert saas.completeness_score() >= 1.0, "Should be 100% complete"
assert saas.is_deployable() == True, "Should be deployable"
assert saas.quality_score() == 1.0, "All artifacts should be valid"

# Test Marketplace generation
marketplace = generator.generate("ShopHub", BusinessType.MARKETPLACE)
assert marketplace.business_type == BusinessType.MARKETPLACE
assert len(marketplace.artifacts) >= 5
assert marketplace.is_deployable() == True

# Test manifest export
manifest = saas.to_manifest()
assert manifest["name"] == "TaskFlow"
assert manifest["deployable"] == True
assert manifest["completeness"] >= 1.0

# Test artifact validation
invalid_artifact = Artifact(
    artifact_type=ArtifactType.DOCS,
    name="",  # Invalid - empty name
    content="Short"  # Invalid - too short
)
assert invalid_artifact.is_valid() == False

# Test incomplete business
incomplete = GeneratedBusiness(name="Incomplete", business_type=BusinessType.SAAS)
incomplete.add_artifact(Artifact(
    artifact_type=ArtifactType.SPEC,
    name="spec",
    content="Just a specification, nothing else"
))
assert incomplete.completeness_score() < 0.5, "Should be incomplete"
assert incomplete.is_deployable() == False, "Should not be deployable"

print("Skill 1 Level 3: end_to_end_business_generation PASSED!")
''',
        "tests_count": 10,
        "hint": "Business needs spec, architecture, database, API, backend, and deployment artifacts",
    },
]


# =============================================================================
# SKILL 2: AGENT ORCHESTRATION
# =============================================================================

AGENT_ORCHESTRATION_CHALLENGES = [
    # Level 1: Basic agent coordination
    {
        "name": "basic_agent_coordination",
        "skill": "agent_orchestration",
        "level": 1,
        "description": "Coordinate multiple agents for a task",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from enum import Enum

class AgentStatus(Enum):
    IDLE = "idle"
    BUSY = "busy"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Agent:
    """A single agent in the system."""
    name: str
    capabilities: List[str]
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None
    results: Dict[str, Any] = field(default_factory=dict)

    def can_handle(self, task_type: str) -> bool:
        return task_type in self.capabilities

    def assign_task(self, task: str) -> bool:
        if self.status != AgentStatus.IDLE:
            return False
        self.current_task = task
        self.status = AgentStatus.BUSY
        return True

    def complete_task(self, result: Any) -> None:
        if self.current_task:
            self.results[self.current_task] = result
        self.status = AgentStatus.COMPLETED
        self.current_task = None

    def fail_task(self, error: str) -> None:
        self.results[self.current_task or "unknown"] = {"error": error}
        self.status = AgentStatus.FAILED
        self.current_task = None

    def reset(self) -> None:
        self.status = AgentStatus.IDLE
        self.current_task = None

@dataclass
class Task:
    """A task to be executed by agents."""
    task_id: str
    task_type: str
    payload: Dict[str, Any]
    priority: int = 1
    dependencies: List[str] = field(default_factory=list)

class AgentPool:
    """Pool of agents for task execution."""

    def __init__(self):
        self.agents: Dict[str, Agent] = {}

    def register_agent(self, agent: Agent) -> None:
        self.agents[agent.name] = agent

    def find_available_agent(self, task_type: str) -> Optional[Agent]:
        """Find an idle agent that can handle the task."""
        for agent in self.agents.values():
            if agent.status == AgentStatus.IDLE and agent.can_handle(task_type):
                return agent
        return None

    def get_busy_agents(self) -> List[Agent]:
        return [a for a in self.agents.values() if a.status == AgentStatus.BUSY]

    def get_idle_agents(self) -> List[Agent]:
        return [a for a in self.agents.values() if a.status == AgentStatus.IDLE]

# Tests
pool = AgentPool()

# Register agents
backend_agent = Agent(
    name="backend_agent",
    capabilities=["code_generation", "api_design", "database"]
)
frontend_agent = Agent(
    name="frontend_agent",
    capabilities=["ui_design", "frontend_code", "styling"]
)
qa_agent = Agent(
    name="qa_agent",
    capabilities=["testing", "code_review", "security_audit"]
)

pool.register_agent(backend_agent)
pool.register_agent(frontend_agent)
pool.register_agent(qa_agent)

# Test agent lookup
assert len(pool.agents) == 3
assert pool.find_available_agent("code_generation") == backend_agent
assert pool.find_available_agent("ui_design") == frontend_agent
assert pool.find_available_agent("nonexistent") is None

# Test task assignment
task = Task(task_id="t1", task_type="code_generation", payload={"module": "auth"})
agent = pool.find_available_agent(task.task_type)
assert agent is not None
assert agent.assign_task(task.task_id) == True
assert agent.status == AgentStatus.BUSY

# Agent should not accept another task while busy
assert agent.assign_task("another_task") == False

# Test completion
agent.complete_task({"code": "def auth(): pass"})
assert agent.status == AgentStatus.COMPLETED
assert "t1" in agent.results

# Test reset
agent.reset()
assert agent.status == AgentStatus.IDLE

# Test failure handling
agent.assign_task("failing_task")
agent.fail_task("Connection timeout")
assert agent.status == AgentStatus.FAILED
assert "error" in agent.results.get("failing_task", {})

print("Skill 2 Level 1: basic_agent_coordination PASSED!")
''',
        "tests_count": 8,
        "hint": "Agents have capabilities, status, and can be assigned/complete tasks",
    },
    # Level 2: Task queue and scheduling
    {
        "name": "task_queue_scheduling",
        "skill": "agent_orchestration",
        "level": 2,
        "description": "Implement task queue with priority scheduling",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
import heapq

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

@dataclass
class Task:
    task_id: str
    task_type: str
    priority: int = 1  # Higher = more important
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None

    def __lt__(self, other):
        # For heap: higher priority comes first (use negative)
        return self.priority > other.priority

class TaskQueue:
    """Priority task queue with dependency management."""

    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.heap: List[Task] = []
        self.completed: set = set()

    def add_task(self, task: Task) -> None:
        """Add a task to the queue."""
        self.tasks[task.task_id] = task
        if self._can_run(task):
            heapq.heappush(self.heap, task)
        else:
            task.status = TaskStatus.BLOCKED

    def _can_run(self, task: Task) -> bool:
        """Check if all dependencies are completed."""
        return all(dep in self.completed for dep in task.dependencies)

    def get_next_task(self) -> Optional[Task]:
        """Get the highest priority runnable task."""
        while self.heap:
            task = heapq.heappop(self.heap)
            if task.status == TaskStatus.PENDING and self._can_run(task):
                task.status = TaskStatus.RUNNING
                return task
        return None

    def complete_task(self, task_id: str, result: Any = None) -> None:
        """Mark a task as completed and unblock dependents."""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.status = TaskStatus.COMPLETED
        task.result = result
        self.completed.add(task_id)

        # Check for newly unblocked tasks
        for t in self.tasks.values():
            if t.status == TaskStatus.BLOCKED and self._can_run(t):
                t.status = TaskStatus.PENDING
                heapq.heappush(self.heap, t)

    def fail_task(self, task_id: str, error: str) -> None:
        """Mark a task as failed."""
        if task_id in self.tasks:
            self.tasks[task_id].status = TaskStatus.FAILED
            self.tasks[task_id].result = {"error": error}

    def get_pending_count(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status == TaskStatus.PENDING)

    def get_blocked_count(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status == TaskStatus.BLOCKED)

# Tests
queue = TaskQueue()

# Add tasks with dependencies
queue.add_task(Task(task_id="db_schema", task_type="database", priority=3))
queue.add_task(Task(task_id="api_design", task_type="design", priority=2, dependencies=["db_schema"]))
queue.add_task(Task(task_id="backend", task_type="code", priority=2, dependencies=["api_design"]))
queue.add_task(Task(task_id="frontend", task_type="code", priority=1, dependencies=["api_design"]))
queue.add_task(Task(task_id="testing", task_type="qa", priority=1, dependencies=["backend", "frontend"]))

# Test initial state
assert queue.get_blocked_count() == 4, "4 tasks should be blocked"
assert queue.tasks["db_schema"].status == TaskStatus.PENDING

# Get first task (highest priority with no deps)
task = queue.get_next_task()
assert task is not None
assert task.task_id == "db_schema", "db_schema should be first (priority 3, no deps)"
assert task.status == TaskStatus.RUNNING

# Complete first task
queue.complete_task("db_schema", {"schema": "created"})
assert queue.tasks["api_design"].status == TaskStatus.PENDING, "api_design should be unblocked"

# Get next task
task = queue.get_next_task()
assert task.task_id == "api_design"
queue.complete_task("api_design", {"api": "designed"})

# Both backend and frontend should now be unblocked
assert queue.tasks["backend"].status == TaskStatus.PENDING
assert queue.tasks["frontend"].status == TaskStatus.PENDING

# Backend has higher priority
task = queue.get_next_task()
assert task.task_id == "backend"

# Test failure
queue.fail_task("backend", "Compilation error")
assert queue.tasks["backend"].status == TaskStatus.FAILED

# Testing is still blocked (depends on backend which failed)
assert queue.tasks["testing"].status == TaskStatus.BLOCKED

print("Skill 2 Level 2: task_queue_scheduling PASSED!")
''',
        "tests_count": 9,
        "hint": "Use priority queue (heap) with dependency tracking",
    },
    # Level 3: Full orchestration with parallel execution
    {
        "name": "parallel_orchestration",
        "skill": "agent_orchestration",
        "level": 3,
        "description": "Orchestrate parallel agent execution with resource management",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set
from enum import Enum
from collections import defaultdict

class AgentStatus(Enum):
    IDLE = "idle"
    BUSY = "busy"

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Agent:
    name: str
    capabilities: List[str]
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None

@dataclass
class Task:
    task_id: str
    task_type: str
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: Optional[str] = None
    result: Any = None

class Orchestrator:
    """Full agent orchestrator with parallel execution."""

    def __init__(self, max_parallel: int = 3):
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.completed: Set[str] = set()
        self.max_parallel = max_parallel
        self.execution_log: List[str] = []

    def register_agent(self, agent: Agent) -> None:
        self.agents[agent.name] = agent

    def add_task(self, task: Task) -> None:
        self.tasks[task.task_id] = task

    def _get_runnable_tasks(self) -> List[Task]:
        """Get tasks that can be run (deps satisfied, not running)."""
        runnable = []
        for task in self.tasks.values():
            if task.status == TaskStatus.PENDING:
                if all(dep in self.completed for dep in task.dependencies):
                    runnable.append(task)
        return runnable

    def _find_agent_for_task(self, task: Task) -> Optional[Agent]:
        """Find an idle agent that can handle the task type."""
        for agent in self.agents.values():
            if agent.status == AgentStatus.IDLE:
                if task.task_type in agent.capabilities:
                    return agent
        return None

    def _count_running(self) -> int:
        """Count currently running tasks."""
        return sum(1 for t in self.tasks.values() if t.status == TaskStatus.RUNNING)

    def schedule(self) -> List[tuple]:
        """Schedule tasks to agents, return list of (task, agent) pairs."""
        assignments = []

        while self._count_running() < self.max_parallel:
            runnable = self._get_runnable_tasks()
            if not runnable:
                break

            for task in runnable:
                agent = self._find_agent_for_task(task)
                if agent:
                    task.status = TaskStatus.RUNNING
                    task.assigned_agent = agent.name
                    agent.status = AgentStatus.BUSY
                    agent.current_task = task.task_id
                    assignments.append((task.task_id, agent.name))
                    self.execution_log.append(f"ASSIGN: {task.task_id} -> {agent.name}")

                    if self._count_running() >= self.max_parallel:
                        break

        return assignments

    def complete_task(self, task_id: str, result: Any = None) -> List[str]:
        """Complete a task and return newly unblocked task IDs."""
        if task_id not in self.tasks:
            return []

        task = self.tasks[task_id]
        task.status = TaskStatus.COMPLETED
        task.result = result
        self.completed.add(task_id)

        # Release agent
        if task.assigned_agent and task.assigned_agent in self.agents:
            agent = self.agents[task.assigned_agent]
            agent.status = AgentStatus.IDLE
            agent.current_task = None

        self.execution_log.append(f"COMPLETE: {task_id}")

        # Find newly unblocked tasks
        unblocked = []
        for t in self.tasks.values():
            if t.status == TaskStatus.PENDING:
                if all(dep in self.completed for dep in t.dependencies):
                    unblocked.append(t.task_id)

        return unblocked

    def fail_task(self, task_id: str, error: str) -> None:
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = TaskStatus.FAILED
            task.result = {"error": error}

            if task.assigned_agent and task.assigned_agent in self.agents:
                self.agents[task.assigned_agent].status = AgentStatus.IDLE

            self.execution_log.append(f"FAIL: {task_id} - {error}")

    def get_progress(self) -> Dict[str, int]:
        """Get task progress summary."""
        counts = defaultdict(int)
        for task in self.tasks.values():
            counts[task.status.value] += 1
        return dict(counts)

    def is_complete(self) -> bool:
        """Check if all tasks are done (completed or failed)."""
        return all(
            t.status in (TaskStatus.COMPLETED, TaskStatus.FAILED)
            for t in self.tasks.values()
        )

# Tests
orchestrator = Orchestrator(max_parallel=2)

# Register agents
orchestrator.register_agent(Agent("backend1", ["backend", "database"]))
orchestrator.register_agent(Agent("backend2", ["backend", "api"]))
orchestrator.register_agent(Agent("frontend", ["frontend", "ui"]))
orchestrator.register_agent(Agent("qa", ["testing"]))

# Add tasks with dependencies
orchestrator.add_task(Task("db", "database"))
orchestrator.add_task(Task("api", "api", dependencies=["db"]))
orchestrator.add_task(Task("backend", "backend", dependencies=["api"]))
orchestrator.add_task(Task("frontend", "frontend", dependencies=["api"]))
orchestrator.add_task(Task("tests", "testing", dependencies=["backend", "frontend"]))

# First schedule - should assign db (only task with no deps)
assignments = orchestrator.schedule()
assert len(assignments) == 1, f"Should assign 1 task, got {len(assignments)}"
assert assignments[0][0] == "db"

# Complete db - api should become runnable
unblocked = orchestrator.complete_task("db", {"schema": "done"})
assert "api" in unblocked

# Schedule again - should assign api
assignments = orchestrator.schedule()
assert len(assignments) == 1
assert assignments[0][0] == "api"

# Complete api - backend and frontend become runnable
unblocked = orchestrator.complete_task("api", {"spec": "done"})
assert "backend" in unblocked
assert "frontend" in unblocked

# Schedule - should assign both (parallel, max_parallel=2)
assignments = orchestrator.schedule()
assert len(assignments) == 2, "Should assign 2 tasks in parallel"
assigned_tasks = {a[0] for a in assignments}
assert "backend" in assigned_tasks
assert "frontend" in assigned_tasks

# Complete both
orchestrator.complete_task("backend", {"code": "done"})
orchestrator.complete_task("frontend", {"ui": "done"})

# Tests should now be runnable
assignments = orchestrator.schedule()
assert len(assignments) == 1
assert assignments[0][0] == "tests"

# Complete tests
orchestrator.complete_task("tests", {"passed": True})

# Check completion
assert orchestrator.is_complete() == True
progress = orchestrator.get_progress()
assert progress["completed"] == 5

# Test execution log
assert len(orchestrator.execution_log) >= 10  # Assignments + completions

print("Skill 2 Level 3: parallel_orchestration PASSED!")
''',
        "tests_count": 10,
        "hint": "Orchestrator manages agents, schedules tasks in parallel, tracks dependencies",
    },
]


# =============================================================================
# SKILL 3: DECISION MAKING
# =============================================================================

DECISION_MAKING_CHALLENGES = [
    # Level 1: Viability assessment
    {
        "name": "viability_assessment",
        "skill": "decision_making",
        "level": 1,
        "description": "Assess business viability and make go/no-go decisions",
        "code": '''
from dataclasses import dataclass
from typing import Dict, Any, List
from enum import Enum

class Decision(Enum):
    GO = "go"
    NO_GO = "no_go"
    PIVOT = "pivot"
    DEFER = "defer"

@dataclass
class ViabilityMetrics:
    """Metrics for assessing business viability."""
    market_size: float  # In millions
    competition_level: float  # 0-1 (1 = highly competitive)
    technical_feasibility: float  # 0-1
    estimated_cost: float
    estimated_revenue: float
    time_to_market_days: int
    team_capability: float  # 0-1

    def roi(self) -> float:
        if self.estimated_cost <= 0:
            return 0.0
        return (self.estimated_revenue - self.estimated_cost) / self.estimated_cost

    def market_opportunity_score(self) -> float:
        """Higher market size + lower competition = better opportunity."""
        # Normalize market size (assume 100M is excellent)
        market_score = min(1.0, self.market_size / 100)
        competition_penalty = self.competition_level * 0.5
        return max(0, market_score - competition_penalty)

class ViabilityAssessor:
    """Assess business viability and make decisions."""

    # Thresholds
    MIN_ROI = 0.5  # 50% minimum ROI
    MIN_FEASIBILITY = 0.6
    MAX_COMPETITION = 0.8
    MIN_CAPABILITY = 0.5
    MAX_TIME_TO_MARKET = 180  # 6 months

    def assess(self, metrics: ViabilityMetrics) -> Dict[str, Any]:
        """Perform comprehensive viability assessment."""
        scores = {
            "roi_score": self._score_roi(metrics.roi()),
            "market_score": metrics.market_opportunity_score(),
            "feasibility_score": metrics.technical_feasibility,
            "capability_score": metrics.team_capability,
            "time_score": self._score_time(metrics.time_to_market_days),
        }

        overall = sum(scores.values()) / len(scores)
        decision = self._make_decision(scores, metrics)

        return {
            "scores": scores,
            "overall_score": overall,
            "decision": decision,
            "reasoning": self._generate_reasoning(scores, decision)
        }

    def _score_roi(self, roi: float) -> float:
        if roi < 0:
            return 0.0
        elif roi < self.MIN_ROI:
            return roi / self.MIN_ROI * 0.5
        else:
            return min(1.0, 0.5 + (roi - self.MIN_ROI) * 0.5)

    def _score_time(self, days: int) -> float:
        if days <= 30:
            return 1.0
        elif days <= self.MAX_TIME_TO_MARKET:
            return 1.0 - (days - 30) / (self.MAX_TIME_TO_MARKET - 30) * 0.5
        else:
            return max(0, 0.5 - (days - self.MAX_TIME_TO_MARKET) / 180 * 0.5)

    def _make_decision(self, scores: Dict[str, float], metrics: ViabilityMetrics) -> Decision:
        overall = sum(scores.values()) / len(scores)

        # Hard no-go conditions
        if metrics.roi() < 0:
            return Decision.NO_GO
        if metrics.technical_feasibility < 0.3:
            return Decision.NO_GO
        if metrics.competition_level > 0.95:
            return Decision.NO_GO

        # Decision based on overall score
        if overall >= 0.7:
            return Decision.GO
        elif overall >= 0.5:
            return Decision.PIVOT
        elif overall >= 0.3:
            return Decision.DEFER
        else:
            return Decision.NO_GO

    def _generate_reasoning(self, scores: Dict[str, float], decision: Decision) -> List[str]:
        reasons = []
        if scores["roi_score"] < 0.5:
            reasons.append("Low ROI - consider cost reduction")
        if scores["market_score"] < 0.5:
            reasons.append("Weak market opportunity")
        if scores["feasibility_score"] < 0.5:
            reasons.append("Technical challenges present")
        if scores["capability_score"] < 0.5:
            reasons.append("Team capability gaps identified")
        if scores["time_score"] < 0.5:
            reasons.append("Long time to market")
        return reasons if reasons else ["All metrics acceptable"]

# Tests
assessor = ViabilityAssessor()

# Test GO decision - strong metrics
strong_metrics = ViabilityMetrics(
    market_size=50.0,
    competition_level=0.3,
    technical_feasibility=0.9,
    estimated_cost=10000,
    estimated_revenue=25000,
    time_to_market_days=45,
    team_capability=0.8
)
result = assessor.assess(strong_metrics)
assert result["decision"] == Decision.GO, f"Strong metrics should be GO, got {result['decision']}"
assert result["overall_score"] > 0.6

# Test NO_GO decision - negative ROI
bad_roi_metrics = ViabilityMetrics(
    market_size=20.0,
    competition_level=0.5,
    technical_feasibility=0.7,
    estimated_cost=50000,
    estimated_revenue=20000,  # Negative ROI
    time_to_market_days=60,
    team_capability=0.7
)
result = assessor.assess(bad_roi_metrics)
assert result["decision"] == Decision.NO_GO, "Negative ROI should be NO_GO"

# Test PIVOT decision - mediocre metrics
mediocre_metrics = ViabilityMetrics(
    market_size=30.0,
    competition_level=0.6,
    technical_feasibility=0.6,
    estimated_cost=20000,
    estimated_revenue=35000,
    time_to_market_days=120,
    team_capability=0.5
)
result = assessor.assess(mediocre_metrics)
assert result["decision"] in (Decision.PIVOT, Decision.DEFER), "Mediocre metrics should suggest PIVOT or DEFER"

# Test hard NO_GO - impossible technically
impossible_metrics = ViabilityMetrics(
    market_size=100.0,
    competition_level=0.2,
    technical_feasibility=0.1,  # Very low
    estimated_cost=5000,
    estimated_revenue=50000,
    time_to_market_days=30,
    team_capability=0.9
)
result = assessor.assess(impossible_metrics)
assert result["decision"] == Decision.NO_GO, "Low feasibility should be NO_GO"

# Test reasoning generation
result = assessor.assess(mediocre_metrics)
assert len(result["reasoning"]) > 0, "Should provide reasoning"

print("Skill 3 Level 1: viability_assessment PASSED!")
''',
        "tests_count": 5,
        "hint": "Assess multiple dimensions: ROI, market, feasibility, capability, time",
    },
    # Level 2: Resource allocation decisions
    {
        "name": "resource_allocation",
        "skill": "decision_making",
        "level": 2,
        "description": "Make optimal resource allocation decisions across businesses",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum

class Priority(Enum):
    CRITICAL = 4
    HIGH = 3
    MEDIUM = 2
    LOW = 1

@dataclass
class Business:
    """A business requiring resources."""
    business_id: str
    name: str
    current_score: float  # 0-100 viability score
    revenue_potential: float
    resource_needs: Dict[str, int]  # resource_type -> amount needed
    priority: Priority = Priority.MEDIUM

    def efficiency_ratio(self) -> float:
        """Revenue potential per resource unit."""
        total_resources = sum(self.resource_needs.values())
        if total_resources == 0:
            return 0.0
        return self.revenue_potential / total_resources

@dataclass
class ResourcePool:
    """Available resources for allocation."""
    compute: int = 100
    memory: int = 100
    api_calls: int = 1000
    storage: int = 100

@dataclass
class Allocation:
    """Resource allocation decision."""
    business_id: str
    allocated: Dict[str, int]
    satisfied: bool
    efficiency: float

class ResourceAllocator:
    """Allocate resources across businesses optimally."""

    def __init__(self, pool: ResourcePool):
        self.pool = pool
        self.allocations: List[Allocation] = []

    def allocate(self, businesses: List[Business]) -> List[Allocation]:
        """Allocate resources using priority + efficiency strategy."""
        # Sort by priority (descending) then by efficiency (descending)
        sorted_businesses = sorted(
            businesses,
            key=lambda b: (b.priority.value, b.efficiency_ratio()),
            reverse=True
        )

        remaining = {
            "compute": self.pool.compute,
            "memory": self.pool.memory,
            "api_calls": self.pool.api_calls,
            "storage": self.pool.storage
        }

        allocations = []

        for business in sorted_businesses:
            allocated = {}
            can_satisfy = True

            for resource, needed in business.resource_needs.items():
                available = remaining.get(resource, 0)
                if available >= needed:
                    allocated[resource] = needed
                else:
                    # Partial allocation
                    allocated[resource] = available
                    can_satisfy = False

            # Commit allocation
            for resource, amount in allocated.items():
                remaining[resource] -= amount

            allocation = Allocation(
                business_id=business.business_id,
                allocated=allocated,
                satisfied=can_satisfy,
                efficiency=business.efficiency_ratio()
            )
            allocations.append(allocation)

        self.allocations = allocations
        return allocations

    def get_utilization(self) -> Dict[str, float]:
        """Calculate resource utilization percentages."""
        total_allocated = {"compute": 0, "memory": 0, "api_calls": 0, "storage": 0}

        for alloc in self.allocations:
            for resource, amount in alloc.allocated.items():
                total_allocated[resource] += amount

        return {
            "compute": total_allocated["compute"] / self.pool.compute,
            "memory": total_allocated["memory"] / self.pool.memory,
            "api_calls": total_allocated["api_calls"] / self.pool.api_calls,
            "storage": total_allocated["storage"] / self.pool.storage
        }

    def get_satisfaction_rate(self) -> float:
        """Percentage of businesses fully satisfied."""
        if not self.allocations:
            return 0.0
        satisfied = sum(1 for a in self.allocations if a.satisfied)
        return satisfied / len(self.allocations)

# Tests
pool = ResourcePool(compute=100, memory=100, api_calls=500, storage=50)
allocator = ResourceAllocator(pool)

# Create businesses with different priorities and needs
businesses = [
    Business(
        business_id="b1",
        name="High Priority SaaS",
        current_score=85,
        revenue_potential=10000,
        resource_needs={"compute": 30, "memory": 20, "api_calls": 100},
        priority=Priority.CRITICAL
    ),
    Business(
        business_id="b2",
        name="Efficient Startup",
        current_score=70,
        revenue_potential=8000,
        resource_needs={"compute": 10, "memory": 10, "api_calls": 50},
        priority=Priority.HIGH
    ),
    Business(
        business_id="b3",
        name="Resource Heavy",
        current_score=60,
        revenue_potential=5000,
        resource_needs={"compute": 80, "memory": 60, "api_calls": 300},
        priority=Priority.MEDIUM
    ),
    Business(
        business_id="b4",
        name="Low Priority Test",
        current_score=40,
        revenue_potential=2000,
        resource_needs={"compute": 20, "memory": 20, "api_calls": 100},
        priority=Priority.LOW
    ),
]

# Run allocation
allocations = allocator.allocate(businesses)

# Test priority ordering - critical should be allocated first
critical_alloc = next(a for a in allocations if a.business_id == "b1")
assert critical_alloc.satisfied == True, "Critical business should be fully satisfied"

# High priority efficient business should also be satisfied
high_alloc = next(a for a in allocations if a.business_id == "b2")
assert high_alloc.satisfied == True, "High priority efficient business should be satisfied"

# Medium priority heavy business may be partially satisfied
medium_alloc = next(a for a in allocations if a.business_id == "b3")
# It needs 80 compute, but only 60 remaining after b1 and b2
assert medium_alloc.allocated["compute"] <= 60, "Should get remaining compute"

# Test utilization
utilization = allocator.get_utilization()
assert utilization["compute"] > 0.5, "Should use significant compute"

# Test satisfaction rate
satisfaction = allocator.get_satisfaction_rate()
assert satisfaction >= 0.5, "At least half should be satisfied"

# Test efficiency calculation
assert businesses[1].efficiency_ratio() > businesses[2].efficiency_ratio(), "b2 should be more efficient than b3"

print("Skill 3 Level 2: resource_allocation PASSED!")
''',
        "tests_count": 7,
        "hint": "Prioritize by business priority, then by efficiency ratio",
    },
    # Level 3: Kill decisions
    {
        "name": "kill_decisions",
        "skill": "decision_making",
        "level": 3,
        "description": "Make difficult kill/continue decisions for underperforming businesses",
        "code": '''
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from datetime import datetime, timedelta

class KillDecision(Enum):
    CONTINUE = "continue"
    KILL = "kill"
    PIVOT = "pivot"
    INCUBATE = "incubate"  # Reduce resources but keep alive

@dataclass
class BusinessMetrics:
    """Historical metrics for a business."""
    business_id: str
    name: str
    age_days: int
    total_investment: float
    total_revenue: float
    monthly_burn_rate: float
    score_history: List[float]  # Last N months
    user_count: int
    growth_rate: float  # Month over month

    @property
    def roi(self) -> float:
        if self.total_investment <= 0:
            return 0.0
        return (self.total_revenue - self.total_investment) / self.total_investment

    @property
    def runway_months(self) -> float:
        if self.monthly_burn_rate <= 0:
            return float('inf')
        remaining = max(0, self.total_investment - self.total_revenue)
        return remaining / self.monthly_burn_rate if self.monthly_burn_rate > 0 else float('inf')

    @property
    def score_trend(self) -> float:
        """Calculate trend: positive = improving, negative = declining."""
        if len(self.score_history) < 2:
            return 0.0
        recent = self.score_history[-3:] if len(self.score_history) >= 3 else self.score_history
        if len(recent) < 2:
            return 0.0
        return (recent[-1] - recent[0]) / len(recent)

    @property
    def current_score(self) -> float:
        return self.score_history[-1] if self.score_history else 0.0

class KillDecisionEngine:
    """Make kill/continue decisions for businesses."""

    # Thresholds
    MIN_SCORE = 50  # Minimum acceptable score
    MIN_GROWTH = -0.1  # Maximum acceptable negative growth
    MAX_AGE_WITHOUT_PROFIT = 180  # Days before needing positive ROI
    MIN_RUNWAY = 2  # Minimum months runway before action needed

    def evaluate(self, metrics: BusinessMetrics) -> Dict[str, Any]:
        """Evaluate a business and make a decision."""
        factors = self._analyze_factors(metrics)
        decision = self._make_decision(factors, metrics)
        actions = self._recommend_actions(decision, metrics)

        return {
            "decision": decision,
            "factors": factors,
            "confidence": self._calculate_confidence(factors),
            "actions": actions,
            "summary": self._generate_summary(decision, factors, metrics)
        }

    def _analyze_factors(self, m: BusinessMetrics) -> Dict[str, Any]:
        return {
            "score_acceptable": m.current_score >= self.MIN_SCORE,
            "score_improving": m.score_trend > 0,
            "growth_positive": m.growth_rate > 0,
            "growth_acceptable": m.growth_rate >= self.MIN_GROWTH,
            "roi_positive": m.roi > 0,
            "runway_safe": m.runway_months >= self.MIN_RUNWAY,
            "has_users": m.user_count > 0,
            "mature": m.age_days > 90,
            "profitable": m.total_revenue > m.total_investment
        }

    def _make_decision(self, factors: Dict[str, Any], m: BusinessMetrics) -> KillDecision:
        # Hard kill conditions
        if m.current_score < 30 and m.score_trend <= 0:
            return KillDecision.KILL

        if m.runway_months < 1 and m.roi < 0:
            return KillDecision.KILL

        if m.age_days > self.MAX_AGE_WITHOUT_PROFIT and m.roi < -0.5:
            return KillDecision.KILL

        # Pivot conditions
        if not factors["score_acceptable"] and factors["score_improving"]:
            return KillDecision.PIVOT

        if factors["has_users"] and not factors["growth_positive"] and m.current_score >= 40:
            return KillDecision.PIVOT

        # Incubate conditions
        if m.current_score >= 40 and m.current_score < 50 and factors["score_improving"]:
            return KillDecision.INCUBATE

        if factors["growth_positive"] and not factors["score_acceptable"]:
            return KillDecision.INCUBATE

        # Continue if generally healthy
        if factors["score_acceptable"] and factors["runway_safe"]:
            return KillDecision.CONTINUE

        # Default to incubate for uncertain cases
        return KillDecision.INCUBATE

    def _calculate_confidence(self, factors: Dict[str, Any]) -> float:
        """Calculate confidence in decision (0-1)."""
        positive_factors = sum(1 for v in factors.values() if v)
        return positive_factors / len(factors)

    def _recommend_actions(self, decision: KillDecision, m: BusinessMetrics) -> List[str]:
        actions = []

        if decision == KillDecision.KILL:
            actions.append("Archive business artifacts")
            actions.append("Release all allocated resources")
            actions.append("Document lessons learned")

        elif decision == KillDecision.PIVOT:
            actions.append("Analyze user feedback for pivot direction")
            actions.append("Reduce burn rate by 50%")
            actions.append("Focus on core value proposition")

        elif decision == KillDecision.INCUBATE:
            actions.append("Reduce resource allocation by 30%")
            actions.append("Set 30-day review checkpoint")
            actions.append("Focus on key metrics improvement")

        else:  # CONTINUE
            actions.append("Maintain current trajectory")
            if m.growth_rate < 0.1:
                actions.append("Investigate growth opportunities")

        return actions

    def _generate_summary(self, decision: KillDecision, factors: Dict[str, Any], m: BusinessMetrics) -> str:
        pos = sum(1 for v in factors.values() if v)
        neg = len(factors) - pos
        return f"{decision.value.upper()}: {m.name} - {pos} positive, {neg} negative factors. Score: {m.current_score:.1f}, ROI: {m.roi:.1%}"

    def batch_evaluate(self, businesses: List[BusinessMetrics]) -> List[Tuple[str, KillDecision]]:
        """Evaluate multiple businesses."""
        return [(b.business_id, self.evaluate(b)["decision"]) for b in businesses]

# Tests
engine = KillDecisionEngine()

# Test CONTINUE - healthy business
healthy = BusinessMetrics(
    business_id="healthy",
    name="HealthyApp",
    age_days=120,
    total_investment=10000,
    total_revenue=12000,
    monthly_burn_rate=500,
    score_history=[60, 65, 70, 75],
    user_count=500,
    growth_rate=0.15
)
result = engine.evaluate(healthy)
assert result["decision"] == KillDecision.CONTINUE, f"Healthy business should CONTINUE, got {result['decision']}"

# Test KILL - terrible metrics
terrible = BusinessMetrics(
    business_id="terrible",
    name="FailingApp",
    age_days=200,
    total_investment=50000,
    total_revenue=5000,
    monthly_burn_rate=5000,
    score_history=[40, 35, 30, 25],
    user_count=10,
    growth_rate=-0.3
)
result = engine.evaluate(terrible)
assert result["decision"] == KillDecision.KILL, f"Terrible business should be KILLED, got {result['decision']}"

# Test PIVOT - has users but declining
declining = BusinessMetrics(
    business_id="declining",
    name="DecliningApp",
    age_days=90,
    total_investment=20000,
    total_revenue=15000,
    monthly_burn_rate=1000,
    score_history=[70, 65, 55, 45],
    user_count=1000,
    growth_rate=-0.05
)
result = engine.evaluate(declining)
assert result["decision"] in (KillDecision.PIVOT, KillDecision.INCUBATE), f"Declining with users should PIVOT or INCUBATE"

# Test INCUBATE - improving but below threshold
improving = BusinessMetrics(
    business_id="improving",
    name="ImprovingApp",
    age_days=60,
    total_investment=15000,
    total_revenue=8000,
    monthly_burn_rate=800,
    score_history=[30, 35, 40, 45],
    user_count=200,
    growth_rate=0.1
)
result = engine.evaluate(improving)
assert result["decision"] == KillDecision.INCUBATE, f"Improving but weak should INCUBATE, got {result['decision']}"

# Test batch evaluation
businesses = [healthy, terrible, declining, improving]
batch_results = engine.batch_evaluate(businesses)
assert len(batch_results) == 4
assert ("terrible", KillDecision.KILL) in batch_results

# Test actions are generated
result = engine.evaluate(terrible)
assert len(result["actions"]) > 0, "Should have recommended actions"
assert "Archive" in result["actions"][0], "Kill decision should recommend archiving"

# Test summary generation
assert "KILL" in result["summary"] or "CONTINUE" in result["summary"]

print("Skill 3 Level 3: kill_decisions PASSED!")
''',
        "tests_count": 8,
        "hint": "Analyze trends, ROI, runway. Kill if hopeless, pivot if users exist, incubate if improving",
    },
]


# =============================================================================
# SKILL 4: ERROR RECOVERY
# =============================================================================

ERROR_RECOVERY_CHALLENGES = [
    # Level 1: Basic error handling
    {
        "name": "basic_error_handling",
        "skill": "error_recovery",
        "level": 1,
        "description": "Implement robust error handling with retries",
        "code": '''
from dataclasses import dataclass, field
from typing import Callable, Any, Optional, List
from enum import Enum
import time

class ErrorSeverity(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class ErrorContext:
    """Context about an error for recovery decisions."""
    error_type: str
    message: str
    severity: ErrorSeverity
    retryable: bool
    attempt: int = 1
    max_retries: int = 3

    @property
    def should_retry(self) -> bool:
        return self.retryable and self.attempt < self.max_retries

@dataclass
class RecoveryResult:
    """Result of a recovery attempt."""
    success: bool
    result: Any = None
    error: Optional[str] = None
    attempts: int = 1
    recovery_action: Optional[str] = None

class RetryHandler:
    """Handle retries with exponential backoff."""

    def __init__(self, max_retries: int = 3, base_delay: float = 0.01):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.attempts = 0
        self.errors: List[str] = []

    def execute_with_retry(self, func: Callable, *args, **kwargs) -> RecoveryResult:
        """Execute a function with retry logic."""
        last_error = None

        for attempt in range(1, self.max_retries + 1):
            self.attempts = attempt
            try:
                result = func(*args, **kwargs)
                return RecoveryResult(
                    success=True,
                    result=result,
                    attempts=attempt
                )
            except Exception as e:
                last_error = str(e)
                self.errors.append(f"Attempt {attempt}: {last_error}")

                if attempt < self.max_retries:
                    # Exponential backoff
                    delay = self.base_delay * (2 ** (attempt - 1))
                    time.sleep(delay)

        return RecoveryResult(
            success=False,
            error=last_error,
            attempts=self.attempts,
            recovery_action="All retries exhausted"
        )

    def reset(self):
        self.attempts = 0
        self.errors = []

def classify_error(error: Exception) -> ErrorContext:
    """Classify an error and determine recovery strategy."""
    error_str = str(error).lower()

    if "timeout" in error_str or "connection" in error_str:
        return ErrorContext(
            error_type="network",
            message=str(error),
            severity=ErrorSeverity.MEDIUM,
            retryable=True
        )

    if "rate limit" in error_str or "429" in error_str:
        return ErrorContext(
            error_type="rate_limit",
            message=str(error),
            severity=ErrorSeverity.LOW,
            retryable=True,
            max_retries=5
        )

    if "permission" in error_str or "unauthorized" in error_str:
        return ErrorContext(
            error_type="auth",
            message=str(error),
            severity=ErrorSeverity.HIGH,
            retryable=False
        )

    if "out of memory" in error_str or "oom" in error_str:
        return ErrorContext(
            error_type="resource",
            message=str(error),
            severity=ErrorSeverity.CRITICAL,
            retryable=False
        )

    return ErrorContext(
        error_type="unknown",
        message=str(error),
        severity=ErrorSeverity.MEDIUM,
        retryable=True
    )

# Tests
handler = RetryHandler(max_retries=3, base_delay=0.001)

# Test successful execution
def success_func():
    return "success"

result = handler.execute_with_retry(success_func)
assert result.success == True
assert result.result == "success"
assert result.attempts == 1

# Test retry on failure
call_count = 0
def fail_twice():
    global call_count
    call_count += 1
    if call_count < 3:
        raise Exception("Temporary failure")
    return "recovered"

handler.reset()
call_count = 0
result = handler.execute_with_retry(fail_twice)
assert result.success == True
assert result.attempts == 3
assert result.result == "recovered"

# Test max retries exceeded
def always_fail():
    raise Exception("Always fails")

handler.reset()
result = handler.execute_with_retry(always_fail)
assert result.success == False
assert result.attempts == 3
assert "exhausted" in result.recovery_action

# Test error classification
ctx = classify_error(Exception("Connection timeout"))
assert ctx.error_type == "network"
assert ctx.retryable == True

ctx = classify_error(Exception("Permission denied"))
assert ctx.error_type == "auth"
assert ctx.retryable == False

ctx = classify_error(Exception("Rate limit exceeded (429)"))
assert ctx.error_type == "rate_limit"
assert ctx.max_retries == 5

ctx = classify_error(Exception("Out of memory"))
assert ctx.severity == ErrorSeverity.CRITICAL

print("Skill 4 Level 1: basic_error_handling PASSED!")
''',
        "tests_count": 8,
        "hint": "Implement retry with exponential backoff, classify errors by type",
    },
    # Level 2: Circuit breaker pattern
    {
        "name": "circuit_breaker",
        "skill": "error_recovery",
        "level": 2,
        "description": "Implement circuit breaker for fault tolerance",
        "code": '''
from dataclasses import dataclass, field
from typing import Callable, Any, Optional, List
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

@dataclass
class CircuitBreaker:
    """Circuit breaker for fault tolerance."""
    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 0.1  # Seconds (short for testing)
    half_open_max_calls: int = 3

    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0
    half_open_calls: int = 0

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to try recovery."""
        if self.state != CircuitState.OPEN:
            return False
        return time.time() - self.last_failure_time >= self.recovery_timeout

    def _update_state(self):
        """Update circuit state based on counts."""
        if self.state == CircuitState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.last_failure_time = time.time()

        elif self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0

        elif self.state == CircuitState.HALF_OPEN:
            if self.success_count >= self.half_open_max_calls:
                # Recovered
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function through circuit breaker."""
        self._update_state()

        if self.state == CircuitState.OPEN:
            raise CircuitOpenError(f"Circuit {self.name} is OPEN")

        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise

    def _record_success(self):
        self.success_count += 1
        if self.state == CircuitState.HALF_OPEN:
            self.half_open_calls += 1
        self._update_state()

    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.state == CircuitState.HALF_OPEN:
            # Immediately re-open on failure during half-open
            self.state = CircuitState.OPEN
        self._update_state()

    def reset(self):
        """Manual reset of the circuit."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.half_open_calls = 0

class CircuitOpenError(Exception):
    """Raised when circuit is open."""
    pass

class CircuitBreakerRegistry:
    """Manage multiple circuit breakers."""

    def __init__(self):
        self.breakers: dict = {}

    def get_or_create(self, name: str, **kwargs) -> CircuitBreaker:
        if name not in self.breakers:
            self.breakers[name] = CircuitBreaker(name=name, **kwargs)
        return self.breakers[name]

    def get_status(self) -> dict:
        return {
            name: {
                "state": cb.state.value,
                "failures": cb.failure_count
            }
            for name, cb in self.breakers.items()
        }

# Tests
cb = CircuitBreaker(name="test", failure_threshold=3, recovery_timeout=0.05)

# Test normal operation
def success_op():
    return "ok"

result = cb.call(success_op)
assert result == "ok"
assert cb.state == CircuitState.CLOSED

# Test failure tracking
fail_count = 0
def failing_op():
    raise Exception("Service down")

for i in range(3):
    try:
        cb.call(failing_op)
    except Exception:
        pass

assert cb.state == CircuitState.OPEN, f"Should be OPEN after 3 failures, got {cb.state}"

# Test circuit open rejects calls
try:
    cb.call(success_op)
    assert False, "Should have raised CircuitOpenError"
except CircuitOpenError:
    pass  # Expected

# Test recovery after timeout
time.sleep(0.06)  # Wait for recovery timeout
cb._update_state()
assert cb.state == CircuitState.HALF_OPEN, f"Should be HALF_OPEN after timeout, got {cb.state}"

# Test successful recovery
for i in range(3):
    cb.call(success_op)

assert cb.state == CircuitState.CLOSED, "Should be CLOSED after successful half-open calls"

# Test registry
registry = CircuitBreakerRegistry()
cb1 = registry.get_or_create("service_a", failure_threshold=5)
cb2 = registry.get_or_create("service_b", failure_threshold=10)
assert cb1 is not cb2
assert "service_a" in registry.get_status()

# Test half-open failure reopens circuit
cb3 = CircuitBreaker(name="reopen_test", failure_threshold=2, recovery_timeout=0.01)
try:
    cb3.call(failing_op)
except:
    pass
try:
    cb3.call(failing_op)
except:
    pass
assert cb3.state == CircuitState.OPEN

time.sleep(0.02)
cb3._update_state()
assert cb3.state == CircuitState.HALF_OPEN

try:
    cb3.call(failing_op)
except:
    pass
assert cb3.state == CircuitState.OPEN, "Should reopen on half-open failure"

print("Skill 4 Level 2: circuit_breaker PASSED!")
''',
        "tests_count": 9,
        "hint": "States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing). Track failures, use timeouts.",
    },
    # Level 3: Comprehensive recovery orchestration
    {
        "name": "recovery_orchestration",
        "skill": "error_recovery",
        "level": 3,
        "description": "Orchestrate complex error recovery across systems",
        "code": '''
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
import time

class RecoveryStrategy(Enum):
    RETRY = "retry"
    FALLBACK = "fallback"
    COMPENSATE = "compensate"
    SKIP = "skip"
    ESCALATE = "escalate"

class SystemStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILING = "failing"
    RECOVERED = "recovered"

@dataclass
class SystemHealth:
    """Health status of a system component."""
    name: str
    status: SystemStatus = SystemStatus.HEALTHY
    error_count: int = 0
    last_error: Optional[str] = None
    recovery_attempts: int = 0

@dataclass
class RecoveryAction:
    """A recovery action to execute."""
    strategy: RecoveryStrategy
    target: str
    params: Dict[str, Any] = field(default_factory=dict)
    executed: bool = False
    success: bool = False
    result: Any = None

class RecoveryOrchestrator:
    """Orchestrate error recovery across multiple systems."""

    def __init__(self):
        self.systems: Dict[str, SystemHealth] = {}
        self.fallbacks: Dict[str, Callable] = {}
        self.compensations: Dict[str, Callable] = {}
        self.recovery_log: List[Dict[str, Any]] = []

    def register_system(self, name: str) -> None:
        self.systems[name] = SystemHealth(name=name)

    def register_fallback(self, system: str, fallback: Callable) -> None:
        self.fallbacks[system] = fallback

    def register_compensation(self, system: str, compensation: Callable) -> None:
        self.compensations[system] = compensation

    def report_error(self, system: str, error: str) -> None:
        """Report an error for a system."""
        if system not in self.systems:
            self.register_system(system)

        health = self.systems[system]
        health.error_count += 1
        health.last_error = error

        # Update status based on error count
        if health.error_count >= 5:
            health.status = SystemStatus.FAILING
        elif health.error_count >= 2:
            health.status = SystemStatus.DEGRADED

    def determine_strategy(self, system: str, error: str) -> RecoveryStrategy:
        """Determine the best recovery strategy."""
        health = self.systems.get(system)
        if not health:
            return RecoveryStrategy.RETRY

        # Failing system - try fallback or escalate
        if health.status == SystemStatus.FAILING:
            if system in self.fallbacks:
                return RecoveryStrategy.FALLBACK
            return RecoveryStrategy.ESCALATE

        # Degraded - retry a few times then fallback
        if health.status == SystemStatus.DEGRADED:
            if health.recovery_attempts < 3:
                return RecoveryStrategy.RETRY
            if system in self.fallbacks:
                return RecoveryStrategy.FALLBACK
            return RecoveryStrategy.SKIP

        # Default to retry for healthy/new systems
        return RecoveryStrategy.RETRY

    def execute_recovery(self, system: str, error: str, context: Dict[str, Any] = None) -> RecoveryAction:
        """Execute recovery for a failed operation."""
        strategy = self.determine_strategy(system, error)
        action = RecoveryAction(strategy=strategy, target=system, params=context or {})

        health = self.systems.get(system)
        if health:
            health.recovery_attempts += 1

        try:
            if strategy == RecoveryStrategy.RETRY:
                # Simulate retry (would call original operation)
                action.success = False  # Caller must retry
                action.result = {"action": "retry_requested"}

            elif strategy == RecoveryStrategy.FALLBACK:
                fallback = self.fallbacks.get(system)
                if fallback:
                    action.result = fallback(context)
                    action.success = True

            elif strategy == RecoveryStrategy.COMPENSATE:
                compensation = self.compensations.get(system)
                if compensation:
                    action.result = compensation(context)
                    action.success = True

            elif strategy == RecoveryStrategy.SKIP:
                action.success = True
                action.result = {"action": "skipped"}

            elif strategy == RecoveryStrategy.ESCALATE:
                action.success = False
                action.result = {"action": "escalated", "requires_human": True}

            action.executed = True

        except Exception as e:
            action.success = False
            action.result = {"error": str(e)}

        self._log_recovery(action)
        return action

    def _log_recovery(self, action: RecoveryAction) -> None:
        self.recovery_log.append({
            "timestamp": time.time(),
            "target": action.target,
            "strategy": action.strategy.value,
            "success": action.success
        })

    def recover_system(self, system: str) -> bool:
        """Attempt to recover a failing system."""
        health = self.systems.get(system)
        if not health:
            return False

        health.error_count = 0
        health.recovery_attempts = 0
        health.status = SystemStatus.RECOVERED
        return True

    def get_system_statuses(self) -> Dict[str, str]:
        return {name: h.status.value for name, h in self.systems.items()}

    def get_failing_systems(self) -> List[str]:
        return [name for name, h in self.systems.items() if h.status == SystemStatus.FAILING]

# Tests
orchestrator = RecoveryOrchestrator()

# Register systems
orchestrator.register_system("database")
orchestrator.register_system("api")
orchestrator.register_system("cache")

# Register fallbacks
orchestrator.register_fallback("cache", lambda ctx: {"cached": False, "direct": True})
orchestrator.register_fallback("api", lambda ctx: {"fallback_data": []})

# Test healthy system gets retry strategy
strategy = orchestrator.determine_strategy("database", "Connection timeout")
assert strategy == RecoveryStrategy.RETRY

# Test degraded system progression
orchestrator.report_error("database", "Error 1")
orchestrator.report_error("database", "Error 2")
assert orchestrator.systems["database"].status == SystemStatus.DEGRADED

# Test failing system gets fallback
for i in range(5):
    orchestrator.report_error("cache", f"Error {i}")
assert orchestrator.systems["cache"].status == SystemStatus.FAILING
strategy = orchestrator.determine_strategy("cache", "Error")
assert strategy == RecoveryStrategy.FALLBACK

# Test fallback execution
action = orchestrator.execute_recovery("cache", "Cache down", {"key": "test"})
assert action.success == True
assert action.strategy == RecoveryStrategy.FALLBACK
assert "direct" in action.result

# Test escalation for system without fallback
for i in range(5):
    orchestrator.report_error("database", f"Error {i}")
strategy = orchestrator.determine_strategy("database", "Error")
assert strategy == RecoveryStrategy.ESCALATE

action = orchestrator.execute_recovery("database", "Still failing")
assert action.result["requires_human"] == True

# Test system recovery
assert orchestrator.recover_system("database") == True
assert orchestrator.systems["database"].status == SystemStatus.RECOVERED

# Test get failing systems
failing = orchestrator.get_failing_systems()
assert "cache" in failing
assert "database" not in failing

# Test recovery log
assert len(orchestrator.recovery_log) >= 2

print("Skill 4 Level 3: recovery_orchestration PASSED!")
''',
        "tests_count": 10,
        "hint": "Track system health, determine strategy (retry/fallback/escalate), execute recovery actions",
    },
]


# =============================================================================
# ALL SKILLS COMBINED
# =============================================================================

ALL_SKILLS = {
    "business_generation": BUSINESS_GENERATION_CHALLENGES,
    "agent_orchestration": AGENT_ORCHESTRATION_CHALLENGES,
    "decision_making": DECISION_MAKING_CHALLENGES,
    "error_recovery": ERROR_RECOVERY_CHALLENGES,
}

SKILL_LEVELS = {
    "business_generation": 3,
    "agent_orchestration": 3,
    "decision_making": 3,
    "error_recovery": 3,
}


@dataclass
class MasteryState:
    """Track Genesis's mastery across all skills."""
    skill_levels: Dict[str, int] = field(default_factory=lambda: {
        "business_generation": 1,
        "agent_orchestration": 1,
        "decision_making": 1,
        "error_recovery": 1,
    })
    skill_scores: Dict[str, List[float]] = field(default_factory=lambda: {
        "business_generation": [],
        "agent_orchestration": [],
        "decision_making": [],
        "error_recovery": [],
    })
    challenges_passed: Dict[str, int] = field(default_factory=dict)
    total_tests_passed: int = 0
    total_tests_attempted: int = 0

    def pass_rate(self, skill: str) -> float:
        scores = self.skill_scores.get(skill, [])
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def should_level_up(self, skill: str) -> bool:
        """Level up if 80%+ pass rate on current level with 3+ attempts."""
        scores = self.skill_scores.get(skill, [])
        current_level = self.skill_levels.get(skill, 1)

        # Filter scores for current level
        if len(scores) < 3:
            return False
        recent = scores[-5:]
        return sum(recent) / len(recent) >= 0.8

    def overall_mastery(self) -> float:
        """Calculate overall mastery score."""
        total_possible = sum(SKILL_LEVELS.values())
        current_total = sum(self.skill_levels.values())
        return current_total / total_possible


class BusinessMasteryTrainer:
    """Train Genesis on business mastery skills."""

    def __init__(self, hours: int = 8, iterations_per_hour: int = 10):
        self.hours = hours
        self.iterations_per_hour = iterations_per_hour
        self.total_iterations = hours * iterations_per_hour
        self.current_iteration = 0
        self.mastery_state = MasteryState()
        self.metrics_history = []
        self.best_reward = 0.0

        # Initialize Acontext
        from src.integrations.acontext_client import AcontextClient
        self.acontext = AcontextClient(
            db_path=str(PROJECT_ROOT / "data" / "business_mastery.db")
        )
        self.acontext.health_check()

        logger.info(f"BusinessMasteryTrainer: {hours}h, {iterations_per_hour}/h, total={self.total_iterations}")
        logger.info("Skills: Business Generation, Agent Orchestration, Decision Making, Error Recovery")

    def _get_challenge(self, skill: str, level: int) -> Dict[str, Any]:
        """Get a challenge for the given skill and level."""
        challenges = ALL_SKILLS.get(skill, [])
        level_challenges = [c for c in challenges if c["level"] == level]
        if not level_challenges:
            level_challenges = challenges
        return random.choice(level_challenges)

    def _select_skill(self) -> str:
        """Select which skill to train on (rotate through skills)."""
        skills = list(ALL_SKILLS.keys())
        # Prioritize skills with lower mastery
        weights = [1.0 / (self.mastery_state.skill_levels.get(s, 1) + 0.1) for s in skills]
        total = sum(weights)
        weights = [w / total for w in weights]
        return random.choices(skills, weights=weights)[0]

    async def execute_challenge(self, challenge: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a challenge and return results."""
        from infrastructure.openhands_local import OpenHandsClient

        try:
            oph = OpenHandsClient(timeout=60.0)  # Longer timeout for complex challenges
            start_time = time.time()

            result = await oph.execute(
                instructions=f"Execute {challenge['name']}",
                code=challenge["code"],
                run_tests=False
            )
            runtime_ms = (time.time() - start_time) * 1000

            output = result.output or ""
            success = "PASSED" in output and result.exit_code == 0

            tests_passed = challenge["tests_count"] if success else 0

            oph.cleanup()

            return {
                "success": success,
                "tests_passed": tests_passed,
                "tests_total": challenge["tests_count"],
                "runtime_ms": runtime_ms,
                "output": output,
                "error": result.errors if not success else None,
            }

        except Exception as e:
            logger.warning(f"Execution error: {e}")
            return {
                "success": False,
                "tests_passed": 0,
                "tests_total": challenge["tests_count"],
                "runtime_ms": 60000,
                "error": str(e),
            }

    def compute_reward(self, result: Dict[str, Any], challenge: Dict[str, Any]) -> float:
        """Compute reward based on skill level and performance."""
        skill = challenge["skill"]
        level = challenge["level"]

        if result["success"]:
            # Base reward increases with level and skill complexity
            base_reward = 1.0 + (level * 0.5)

            # Bonus for speed
            if result["runtime_ms"] < 500:
                base_reward += 0.3
            elif result["runtime_ms"] < 2000:
                base_reward += 0.1

            # Bonus for test count
            base_reward += result["tests_passed"] * 0.05

            return base_reward
        else:
            # Partial credit based on level (higher levels = harder)
            return 0.1 + (0.05 * (4 - level))

    def update_mastery(self, success: bool, challenge: Dict[str, Any]):
        """Update mastery state based on result."""
        skill = challenge["skill"]

        # Track score
        self.mastery_state.skill_scores[skill].append(1.0 if success else 0.0)

        if success:
            self.mastery_state.challenges_passed[challenge["name"]] = \
                self.mastery_state.challenges_passed.get(challenge["name"], 0) + 1

        # Check for level up
        if self.mastery_state.should_level_up(skill):
            current = self.mastery_state.skill_levels[skill]
            max_level = SKILL_LEVELS[skill]
            if current < max_level:
                self.mastery_state.skill_levels[skill] = current + 1
                logger.info(f"🎯 SKILL UP! {skill}: Level {current} -> {current + 1}")

    async def run_iteration(self) -> Dict[str, Any]:
        """Run a single training iteration."""
        iteration_start = time.time()

        # Select skill and get challenge
        skill = self._select_skill()
        level = self.mastery_state.skill_levels[skill]
        challenge = self._get_challenge(skill, level)

        logger.info(f"[{skill}] Level {level} | Challenge: {challenge['name']} ({challenge['tests_count']} tests)")

        # Execute
        result = await self.execute_challenge(challenge)

        # Compute reward
        reward = self.compute_reward(result, challenge)

        # Update mastery
        self.update_mastery(result["success"], challenge)

        # Track best
        if reward > self.best_reward:
            self.best_reward = reward
            logger.info(f"⭐ New best reward: {reward:.4f}")

        # Update totals
        self.mastery_state.total_tests_passed += result["tests_passed"]
        self.mastery_state.total_tests_attempted += result["tests_total"]

        # Generate insights
        insights = []
        if result["success"]:
            insights.append(f"✅ Mastered {challenge['name']} ({skill} L{level})")
        else:
            insights.append(f"❌ Failed {challenge['name']}. Hint: {challenge['hint']}")

        # Track iteration
        iteration_result = {
            "iteration": self.current_iteration,
            "skill": skill,
            "level": level,
            "challenge": challenge["name"],
            "success": result["success"],
            "reward": reward,
            "best_reward": self.best_reward,
            "tests_passed": result["tests_passed"],
            "tests_total": result["tests_total"],
            "skill_pass_rate": self.mastery_state.pass_rate(skill),
            "overall_mastery": self.mastery_state.overall_mastery(),
            "insights": insights,
            "iteration_time": time.time() - iteration_start,
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_history.append(iteration_result)
        self.current_iteration += 1

        # Log to Acontext
        self.acontext.log_rl_iteration(
            space="Genesis-Business-Mastery",
            iteration=self.current_iteration,
            metrics={
                "skill": skill,
                "level": level,
                "success": result["success"],
                "tests_passed": result["tests_passed"],
                "overall_mastery": self.mastery_state.overall_mastery(),
            },
            insights=insights,
            prefix="/rl/genesis/mastery/",
        )

        return iteration_result

    async def run_training(self):
        """Run full mastery training."""
        logger.info("=" * 70)
        logger.info("GENESIS BUSINESS MASTERY TRAINING")
        logger.info("=" * 70)
        logger.info(f"Total iterations: {self.total_iterations}")
        logger.info("Skills to master:")
        logger.info("  1. Business Generation - End-to-end business creation")
        logger.info("  2. Agent Orchestration - Coordinating multiple agents")
        logger.info("  3. Decision Making - Viability, kill, resource decisions")
        logger.info("  4. Error Recovery - Handling failures gracefully")
        logger.info("=" * 70)

        start_time = datetime.now()
        end_time = start_time + timedelta(hours=self.hours)

        try:
            while self.current_iteration < self.total_iterations:
                if datetime.now() > end_time:
                    logger.info("Time limit reached")
                    break

                result = await self.run_iteration()

                # Log progress
                progress = (self.current_iteration / self.total_iterations) * 100
                status = "✅" if result["success"] else "❌"

                skill_levels = " | ".join([
                    f"{s[:3].upper()}:L{l}"
                    for s, l in self.mastery_state.skill_levels.items()
                ])

                logger.info(
                    f"[{self.current_iteration}/{self.total_iterations}] {status} "
                    f"{result['skill'][:8]} L{result['level']} {result['challenge'][:20]} "
                    f"reward={result['reward']:.2f} mastery={result['overall_mastery']:.0%} "
                    f"[{skill_levels}] progress={progress:.1f}%"
                )

                # Save checkpoint every 10 iterations
                if self.current_iteration % 10 == 0:
                    self._save_checkpoint()

                await asyncio.sleep(0.5)

        except KeyboardInterrupt:
            logger.info("Training interrupted")
        finally:
            self._save_checkpoint()
            self._print_summary()
            self.acontext.close()

    def _save_checkpoint(self):
        """Save training checkpoint."""
        checkpoint = {
            "iteration": self.current_iteration,
            "skill_levels": self.mastery_state.skill_levels,
            "best_reward": self.best_reward,
            "total_tests_passed": self.mastery_state.total_tests_passed,
            "total_tests_attempted": self.mastery_state.total_tests_attempted,
            "skill_pass_rates": {
                skill: self.mastery_state.pass_rate(skill)
                for skill in ALL_SKILLS.keys()
            },
            "overall_mastery": self.mastery_state.overall_mastery(),
            "challenges_passed": self.mastery_state.challenges_passed,
            "metrics_history": self.metrics_history[-50:],
            "timestamp": datetime.now().isoformat(),
        }
        checkpoint_path = PROJECT_ROOT / "data" / "business_mastery_checkpoint.json"
        with open(checkpoint_path, "w") as f:
            json.dump(checkpoint, f, indent=2)

    def _print_summary(self):
        """Print training summary."""
        logger.info("=" * 70)
        logger.info("BUSINESS MASTERY TRAINING SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Overall Mastery: {self.mastery_state.overall_mastery():.0%}")
        logger.info(f"Best Reward: {self.best_reward:.4f}")
        logger.info(f"Total Tests: {self.mastery_state.total_tests_passed}/{self.mastery_state.total_tests_attempted}")

        logger.info("\nSkill Levels Achieved:")
        for skill, level in self.mastery_state.skill_levels.items():
            max_level = SKILL_LEVELS[skill]
            rate = self.mastery_state.pass_rate(skill)
            logger.info(f"  {skill}: Level {level}/{max_level} ({rate:.0%} pass rate)")

        logger.info("\nChallenges Mastered:")
        for name, count in sorted(self.mastery_state.challenges_passed.items(), key=lambda x: -x[1]):
            logger.info(f"  {name}: {count} passes")
        logger.info("=" * 70)


async def main():
    parser = argparse.ArgumentParser(description="Genesis Business Mastery Training")
    parser.add_argument("--hours", type=int, default=8)
    parser.add_argument("--iterations-per-hour", type=int, default=10)
    args = parser.parse_args()

    # Ensure directories
    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)
    (PROJECT_ROOT / "data").mkdir(exist_ok=True)

    trainer = BusinessMasteryTrainer(
        hours=args.hours,
        iterations_per_hour=args.iterations_per_hour
    )
    await trainer.run_training()


if __name__ == "__main__":
    asyncio.run(main())
