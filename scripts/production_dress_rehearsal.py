#!/usr/bin/env python3
"""
PRODUCTION DRESS REHEARSAL - 100 Business Generation Test

Full end-to-end production test with:
- Qwen 2.5 (14b) as primary LLM
- Mistral-Nemo (12b) as fallback
- All 26 agents engaged
- Genesis Meta-Agent as orchestrator with stuck-agent recovery
- Hudson (code review) and Cora (agent optimization) as watchdogs
- All integrations firing (Opik, LatentMAS, MGRPO, etc.)
- All memory systems (Acontext, Memori, MemoryOS, CaseBank)

Usage:
    python scripts/production_dress_rehearsal.py

Author: Genesis Infrastructure
Date: December 2025
"""

import asyncio
import sys
import logging
import os
import time
import json
import traceback
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
from collections import defaultdict

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# CRITICAL: Load .env FIRST
from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Configure Ollama for Qwen 2.5 primary / Mistral fallback
os.environ["OLLAMA_PRIMARY_MODEL"] = "qwen2.5:14b-instruct-q4_K_M"
os.environ["OLLAMA_FALLBACK_MODEL"] = "mistral-nemo:12b-instruct-2407-q4_K_M"
os.environ["ENABLE_LATENTMAS"] = "true"
os.environ["OPIK_ENABLED"] = "true"
os.environ["ENABLE_MGRPO"] = "true"

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"logs/production_rehearsal_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger("production_rehearsal")


class AgentStatus(Enum):
    """Agent operational status"""
    IDLE = "idle"
    WORKING = "working"
    STUCK = "stuck"
    RECOVERED = "recovered"
    FAILED = "failed"


@dataclass
class AgentHealthMetrics:
    """Health metrics for an agent"""
    agent_name: str
    status: AgentStatus = AgentStatus.IDLE
    tasks_completed: int = 0
    tasks_failed: int = 0
    avg_response_time_ms: float = 0.0
    stuck_count: int = 0
    last_activity: Optional[datetime] = None
    current_task: Optional[str] = None
    error_messages: List[str] = field(default_factory=list)


@dataclass
class WatchdogReport:
    """Report from Hudson/Cora watchdog agents"""
    timestamp: datetime
    agent_name: str
    issue_type: str  # "stuck", "quality", "error", "performance"
    severity: str  # "low", "medium", "high", "critical"
    description: str
    recommendation: str
    auto_fixed: bool = False
    fix_applied: Optional[str] = None


class OllamaLocalClient:
    """Local Ollama client with Qwen 2.5 primary / Mistral fallback"""

    def __init__(self):
        self.primary_model = os.environ.get("OLLAMA_PRIMARY_MODEL", "qwen2.5:14b-instruct-q4_K_M")
        self.fallback_model = os.environ.get("OLLAMA_FALLBACK_MODEL", "mistral-nemo:12b-instruct-2407-q4_K_M")
        self.base_url = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        self.primary_calls = 0
        self.fallback_calls = 0
        self.total_tokens = 0
        logger.info(f"[OllamaClient] Primary: {self.primary_model}, Fallback: {self.fallback_model}")

    async def complete(self, prompt: str, max_tokens: int = 2048, temperature: float = 0.7) -> str:
        """Generate completion with fallback"""
        import aiohttp

        # Try primary first (Qwen 2.5)
        try:
            result = await self._call_ollama(self.primary_model, prompt, max_tokens, temperature)
            self.primary_calls += 1
            return result
        except Exception as e:
            logger.warning(f"[OllamaClient] Primary ({self.primary_model}) failed: {e}, trying fallback")

        # Fallback to Mistral
        try:
            result = await self._call_ollama(self.fallback_model, prompt, max_tokens, temperature)
            self.fallback_calls += 1
            return result
        except Exception as e:
            logger.error(f"[OllamaClient] Fallback ({self.fallback_model}) also failed: {e}")
            raise

    async def _call_ollama(self, model: str, prompt: str, max_tokens: int, temperature: float) -> str:
        """Call Ollama API"""
        import aiohttp

        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=120)) as response:
                if response.status != 200:
                    raise Exception(f"Ollama returned {response.status}")
                data = await response.json()
                self.total_tokens += data.get("eval_count", 0)
                return data.get("response", "")

    def get_stats(self) -> Dict[str, Any]:
        return {
            "primary_calls": self.primary_calls,
            "fallback_calls": self.fallback_calls,
            "fallback_rate": self.fallback_calls / max(1, self.primary_calls + self.fallback_calls) * 100,
            "total_tokens": self.total_tokens
        }


class HudsonWatchdog:
    """
    Hudson - Code Review Watchdog Agent

    Monitors code quality, reviews agent outputs, identifies issues.
    Steps in to fix quality problems before they propagate.
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client
        self.reviews_completed = 0
        self.issues_found = 0
        self.auto_fixes = 0
        self.reports: List[WatchdogReport] = []
        logger.info("[Hudson] Code review watchdog initialized")

    async def review_output(self, agent_name: str, output: Dict[str, Any]) -> WatchdogReport:
        """Review agent output for quality issues"""
        start_time = time.time()

        # Quick heuristic checks first
        issues = []

        # Check for empty or minimal output
        if not output or len(str(output)) < 50:
            issues.append(("high", "Empty or minimal output detected"))

        # Check for error indicators
        output_str = str(output).lower()
        if "error" in output_str or "exception" in output_str or "failed" in output_str:
            issues.append(("medium", "Error indicators in output"))

        # Check for placeholder code
        if "todo" in output_str or "fixme" in output_str or "placeholder" in output_str:
            issues.append(("low", "Placeholder code detected"))

        # Create report
        if issues:
            self.issues_found += 1
            severity, description = issues[0]  # Most severe issue
            report = WatchdogReport(
                timestamp=datetime.now(timezone.utc),
                agent_name=agent_name,
                issue_type="quality",
                severity=severity,
                description=description,
                recommendation=f"Review {agent_name} output for quality issues"
            )
        else:
            report = WatchdogReport(
                timestamp=datetime.now(timezone.utc),
                agent_name=agent_name,
                issue_type="review",
                severity="low",
                description="Output passed basic quality checks",
                recommendation="No action needed"
            )

        self.reviews_completed += 1
        self.reports.append(report)
        return report

    async def fix_issue(self, agent_name: str, issue: str, original_output: Any) -> Tuple[bool, Any]:
        """Attempt to fix a quality issue"""
        try:
            fix_prompt = f"""You are Hudson, a code review specialist. Fix this issue:

Agent: {agent_name}
Issue: {issue}
Original Output: {str(original_output)[:500]}

Provide the corrected output:"""

            fixed = await self.llm_client.complete(fix_prompt, max_tokens=1000)
            self.auto_fixes += 1
            return True, fixed
        except Exception as e:
            logger.error(f"[Hudson] Fix failed: {e}")
            return False, original_output

    def get_stats(self) -> Dict[str, Any]:
        return {
            "reviews_completed": self.reviews_completed,
            "issues_found": self.issues_found,
            "auto_fixes": self.auto_fixes,
            "issue_rate": self.issues_found / max(1, self.reviews_completed) * 100
        }


class CoraWatchdog:
    """
    Cora - Agent Optimization Watchdog

    Monitors agent performance, detects stuck agents, orchestrates recovery.
    Specializes in multi-agent coordination and optimization.
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client
        self.agent_health: Dict[str, AgentHealthMetrics] = {}
        self.stuck_recoveries = 0
        self.optimizations_applied = 0
        self.reports: List[WatchdogReport] = []
        self.stuck_timeout_seconds = 60  # Consider agent stuck after 60s
        logger.info("[Cora] Agent optimization watchdog initialized")

    def register_agent(self, agent_name: str):
        """Register an agent for monitoring"""
        if agent_name not in self.agent_health:
            self.agent_health[agent_name] = AgentHealthMetrics(agent_name=agent_name)

    def start_task(self, agent_name: str, task_id: str):
        """Mark agent as working on a task"""
        self.register_agent(agent_name)
        self.agent_health[agent_name].status = AgentStatus.WORKING
        self.agent_health[agent_name].current_task = task_id
        self.agent_health[agent_name].last_activity = datetime.now(timezone.utc)

    def complete_task(self, agent_name: str, success: bool, response_time_ms: float):
        """Mark task as completed"""
        if agent_name not in self.agent_health:
            return

        health = self.agent_health[agent_name]
        health.status = AgentStatus.IDLE
        health.current_task = None
        health.last_activity = datetime.now(timezone.utc)

        if success:
            health.tasks_completed += 1
        else:
            health.tasks_failed += 1

        # Update average response time
        total_tasks = health.tasks_completed + health.tasks_failed
        health.avg_response_time_ms = (
            (health.avg_response_time_ms * (total_tasks - 1) + response_time_ms) / total_tasks
        )

    def check_stuck_agents(self) -> List[str]:
        """Check for stuck agents and return their names"""
        stuck_agents = []
        now = datetime.now(timezone.utc)

        for agent_name, health in self.agent_health.items():
            if health.status == AgentStatus.WORKING and health.last_activity:
                elapsed = (now - health.last_activity).total_seconds()
                if elapsed > self.stuck_timeout_seconds:
                    health.status = AgentStatus.STUCK
                    health.stuck_count += 1
                    stuck_agents.append(agent_name)

        return stuck_agents

    async def recover_stuck_agent(self, agent_name: str, meta_agent) -> Tuple[bool, str]:
        """Attempt to recover a stuck agent using Meta-Agent"""
        logger.warning(f"[Cora] Recovering stuck agent: {agent_name}")

        health = self.agent_health.get(agent_name)
        if not health:
            return False, "Agent not found"

        try:
            # Create recovery report
            report = WatchdogReport(
                timestamp=datetime.now(timezone.utc),
                agent_name=agent_name,
                issue_type="stuck",
                severity="high",
                description=f"Agent stuck for >{self.stuck_timeout_seconds}s on task: {health.current_task}",
                recommendation="Meta-Agent takeover initiated"
            )
            self.reports.append(report)

            # Meta-Agent takes over the task
            recovery_prompt = f"""You are Genesis Meta-Agent. Agent '{agent_name}' is stuck on task: {health.current_task}

Take over and complete this task. Provide a complete solution:"""

            result = await self.llm_client.complete(recovery_prompt, max_tokens=2000)

            # Mark as recovered
            health.status = AgentStatus.RECOVERED
            health.current_task = None
            self.stuck_recoveries += 1

            report.auto_fixed = True
            report.fix_applied = "Meta-Agent completed task"

            return True, result

        except Exception as e:
            health.status = AgentStatus.FAILED
            health.error_messages.append(str(e))
            return False, str(e)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "agents_monitored": len(self.agent_health),
            "stuck_recoveries": self.stuck_recoveries,
            "optimizations_applied": self.optimizations_applied,
            "agent_health": {
                name: {
                    "status": health.status.value,
                    "tasks_completed": health.tasks_completed,
                    "tasks_failed": health.tasks_failed,
                    "stuck_count": health.stuck_count
                }
                for name, health in self.agent_health.items()
            }
        }


class IntegrationManager:
    """Manages all Genesis integrations"""

    def __init__(self):
        self.integrations = {}
        self.integration_stats = defaultdict(lambda: {"calls": 0, "errors": 0})
        self._initialize_integrations()

    def _initialize_integrations(self):
        """Initialize all integrations"""
        # Opik
        try:
            from infrastructure.opik_integration import get_opik_integration
            self.integrations["opik"] = get_opik_integration()
            logger.info("[Integrations] Opik: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] Opik: DISABLED ({e})")

        # LatentMAS
        try:
            from infrastructure.latentmas_integration import GenesisLatentMAS
            self.integrations["latentmas"] = GenesisLatentMAS()
            logger.info("[Integrations] LatentMAS: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] LatentMAS: DISABLED ({e})")

        # M-GRPO Trainer
        try:
            from infrastructure.evolution_strategies.mgrpo_trainer import MGRPOTrainer
            self.integrations["mgrpo"] = MGRPOTrainer()
            logger.info("[Integrations] M-GRPO: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] M-GRPO: DISABLED ({e})")

        # MCP Client
        try:
            from infrastructure.mcp_client import MCPClient
            self.integrations["mcp"] = MCPClient()
            logger.info("[Integrations] MCP Client: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] MCP Client: DISABLED ({e})")

        # Type-Safe Schemas
        try:
            from infrastructure.type_safe_schemas import TypeSafeSchemas
            self.integrations["type_safe"] = TypeSafeSchemas()
            logger.info("[Integrations] Type-Safe Schemas: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] Type-Safe Schemas: DISABLED ({e})")

        # Context System
        try:
            from infrastructure.context_system import ContextSystem
            self.integrations["context"] = ContextSystem()
            logger.info("[Integrations] Context System: ENABLED")
        except Exception as e:
            logger.warning(f"[Integrations] Context System: DISABLED ({e})")

    def get_integration(self, name: str) -> Any:
        return self.integrations.get(name)

    def log_call(self, name: str, success: bool = True):
        self.integration_stats[name]["calls"] += 1
        if not success:
            self.integration_stats[name]["errors"] += 1

    def get_stats(self) -> Dict[str, Any]:
        return {
            "enabled": list(self.integrations.keys()),
            "disabled_count": 6 - len(self.integrations),
            "stats": dict(self.integration_stats)
        }


class MemoryManager:
    """Manages all memory systems"""

    def __init__(self):
        self.memory_systems = {}
        self._initialize_memory()

    def _initialize_memory(self):
        """Initialize all memory systems"""
        # CaseBank
        try:
            from infrastructure.casebank import get_casebank
            self.memory_systems["casebank"] = get_casebank()
            logger.info("[Memory] CaseBank: ENABLED")
        except Exception as e:
            logger.warning(f"[Memory] CaseBank: DISABLED ({e})")

        # Memento
        try:
            from infrastructure.memento_agent import MementoAgent
            self.memory_systems["memento"] = MementoAgent(agent_name="production_rehearsal")
            logger.info("[Memory] Memento: ENABLED")
        except Exception as e:
            logger.warning(f"[Memory] Memento: DISABLED ({e})")

        # TEI Embeddings
        try:
            from infrastructure.tei_client import get_tei_client
            self.memory_systems["tei"] = get_tei_client()
            logger.info("[Memory] TEI Embeddings: ENABLED")
        except Exception as e:
            logger.warning(f"[Memory] TEI: DISABLED ({e})")

        # Experience Buffer (AgentEvolver)
        try:
            from infrastructure.agentevolver.experience_buffer import get_experience_buffer
            self.memory_systems["experience_buffer"] = get_experience_buffer()
            logger.info("[Memory] Experience Buffer: ENABLED")
        except Exception as e:
            logger.warning(f"[Memory] Experience Buffer: DISABLED ({e})")

        # TrajectoryPool
        try:
            from infrastructure.trajectory_pool import TrajectoryPool
            self.memory_systems["trajectory_pool"] = TrajectoryPool(agent_name="production_rehearsal")
            logger.info("[Memory] TrajectoryPool: ENABLED")
        except Exception as e:
            logger.warning(f"[Memory] TrajectoryPool: DISABLED ({e})")

    def get_stats(self) -> Dict[str, Any]:
        stats = {"enabled": list(self.memory_systems.keys())}

        if "casebank" in self.memory_systems:
            cb = self.memory_systems["casebank"]
            stats["casebank_size"] = len(cb.cases) if hasattr(cb, 'cases') else 0

        if "trajectory_pool" in self.memory_systems:
            tp = self.memory_systems["trajectory_pool"]
            stats["trajectory_pool_size"] = tp.size() if hasattr(tp, 'size') else 0

        return stats


class ProductionDressRehearsal:
    """
    Production Dress Rehearsal - 100 Business Generation Test

    Orchestrates the full end-to-end test with all systems engaged.
    """

    def __init__(self, business_count: int = 100, min_score: float = 70.0):
        self.business_count = business_count
        self.min_score = min_score

        # Core LLM client (Qwen 2.5 primary, Mistral fallback)
        self.llm_client = OllamaLocalClient()

        # Watchdog agents
        self.hudson = HudsonWatchdog(self.llm_client)
        self.cora = CoraWatchdog(self.llm_client)

        # Managers
        self.integrations = IntegrationManager()
        self.memory = MemoryManager()

        # Core systems
        self.meta_agent = None
        self.idea_generator = None
        self.halo_router = None

        # Statistics
        self.successful_businesses = 0
        self.failed_businesses = 0
        self.stuck_recoveries = 0
        self.quality_fixes = 0
        self.start_time = None
        self.business_results: List[Dict[str, Any]] = []

        # All 26 agents
        self.all_agents = [
            "builder_agent", "deploy_agent", "marketing_agent", "support_agent",
            "monitor_agent", "analyst_agent", "spec_agent", "qa_agent",
            "security_agent", "design_agent", "content_agent", "seo_agent",
            "sales_agent", "hr_agent", "finance_agent", "billing_agent",
            "email_agent", "api_agent", "database_agent", "devops_agent",
            "testing_agent", "documentation_agent", "integration_agent",
            "performance_agent", "compliance_agent", "research_agent"
        ]

        self._initialize_systems()

    def _initialize_systems(self):
        """Initialize all core systems"""
        logger.info("\n" + "="*80)
        logger.info("PRODUCTION DRESS REHEARSAL - INITIALIZATION")
        logger.info("="*80)

        # Register all agents with Cora
        for agent in self.all_agents:
            self.cora.register_agent(agent)
        logger.info(f"[Init] Registered {len(self.all_agents)} agents with Cora watchdog")

        # Initialize Genesis Meta-Agent
        try:
            from infrastructure.genesis_meta_agent import GenesisMetaAgent
            self.meta_agent = GenesisMetaAgent()
            logger.info("[Init] Genesis Meta-Agent: READY")
        except Exception as e:
            logger.error(f"[Init] Genesis Meta-Agent: FAILED ({e})")

        # Initialize Idea Generator
        try:
            from infrastructure.business_idea_generator import get_idea_generator
            self.idea_generator = get_idea_generator()
            logger.info("[Init] Idea Generator: READY")
        except Exception as e:
            logger.error(f"[Init] Idea Generator: FAILED ({e})")

        # Initialize HALO Router
        try:
            from infrastructure.halo_router import HALORouter
            self.halo_router = HALORouter()
            logger.info("[Init] HALO Router: READY")
        except Exception as e:
            logger.error(f"[Init] HALO Router: FAILED ({e})")

        logger.info("="*80 + "\n")

    async def generate_one_business(self, business_num: int) -> Dict[str, Any]:
        """Generate one business with full integration"""
        start_time = time.time()
        result = {
            "business_num": business_num,
            "success": False,
            "idea": None,
            "agents_used": [],
            "integrations_fired": [],
            "stuck_agents": [],
            "quality_issues": [],
            "duration_seconds": 0
        }

        try:
            # STEP 1: Generate Idea
            logger.info(f"\n[Business #{business_num}] Generating idea...")
            idea = await self.idea_generator.generate_idea(min_revenue_score=self.min_score)
            result["idea"] = idea.to_dict()
            logger.info(f"[Business #{business_num}] Idea: {idea.name} ({idea.business_type})")

            # Log to Opik
            opik = self.integrations.get_integration("opik")
            if opik:
                opik.log_trace(
                    name=f"business_{business_num}.idea_generation",
                    input={"min_score": self.min_score},
                    output={"name": idea.name, "type": idea.business_type, "score": idea.overall_score}
                )
                result["integrations_fired"].append("opik")

            # STEP 2: Select Team (HALO + Cora optimization)
            logger.info(f"[Business #{business_num}] Selecting agent team...")
            team = await self._select_team(idea)
            result["agents_used"] = team

            # STEP 3: Execute with agents (with stuck detection)
            for agent_name in team:
                self.cora.start_task(agent_name, f"business_{business_num}")

                # Simulate agent work
                agent_start = time.time()
                try:
                    agent_result = await self._execute_agent_task(agent_name, idea)
                    agent_time = (time.time() - agent_start) * 1000

                    # Hudson reviews output
                    review = await self.hudson.review_output(agent_name, agent_result)
                    if review.severity in ["high", "critical"]:
                        result["quality_issues"].append({
                            "agent": agent_name,
                            "issue": review.description
                        })
                        self.quality_fixes += 1

                    self.cora.complete_task(agent_name, True, agent_time)

                except asyncio.TimeoutError:
                    # Agent stuck - Cora recovers
                    stuck_agents = self.cora.check_stuck_agents()
                    if agent_name in stuck_agents:
                        result["stuck_agents"].append(agent_name)
                        success, recovery = await self.cora.recover_stuck_agent(agent_name, self.meta_agent)
                        if success:
                            self.stuck_recoveries += 1
                            logger.info(f"[Business #{business_num}] Meta-Agent recovered {agent_name}")

            # STEP 4: Build business (Meta-Agent)
            logger.info(f"[Business #{business_num}] Building business...")
            from infrastructure.genesis_meta_agent import BusinessSpec

            spec = BusinessSpec(
                name=idea.name,
                business_type=idea.business_type,
                description=idea.description,
                components=[],
                output_dir=Path(f"businesses/production_test/{idea.business_type}/{self._sanitize_name(idea.name)}")
            )

            build_result = await self.meta_agent.generate_business(spec)
            result["success"] = build_result.success
            result["components"] = build_result.tasks_completed

            if build_result.success:
                self.successful_businesses += 1
                logger.info(f"[Business #{business_num}] SUCCESS: {idea.name}")
            else:
                self.failed_businesses += 1
                logger.warning(f"[Business #{business_num}] FAILED: {idea.name}")

            # STEP 5: Store in memory systems
            if "trajectory_pool" in self.memory.memory_systems:
                from infrastructure.trajectory_pool import Trajectory, TrajectoryStatus
                trajectory = Trajectory(
                    trajectory_id=f"rehearsal_{business_num}_{time.time()}",
                    generation=business_num,
                    agent_name="meta_agent",
                    code_changes=f"Generated {build_result.tasks_completed} components",
                    problem_diagnosis=idea.description,
                    proposed_strategy=f"Build {idea.business_type}",
                    status=TrajectoryStatus.SUCCESS.value if build_result.success else TrajectoryStatus.FAILURE.value,
                    success_score=idea.overall_score / 100.0
                )
                self.memory.memory_systems["trajectory_pool"].add_trajectory(trajectory)
                result["integrations_fired"].append("trajectory_pool")

        except Exception as e:
            logger.error(f"[Business #{business_num}] ERROR: {e}")
            logger.error(traceback.format_exc())
            result["error"] = str(e)
            self.failed_businesses += 1

        result["duration_seconds"] = time.time() - start_time
        self.business_results.append(result)
        return result

    async def _select_team(self, idea) -> List[str]:
        """Select optimal agent team for business"""
        team = ["builder_agent", "qa_agent", "deploy_agent"]

        features_str = " ".join(idea.mvp_features).lower()

        if "payment" in features_str or "billing" in features_str:
            team.append("billing_agent")
        if "email" in features_str:
            team.append("email_agent")
        if "auth" in features_str or "security" in features_str:
            team.append("security_agent")
        if "api" in features_str:
            team.append("api_agent")
        if "database" in features_str:
            team.append("database_agent")
        if "marketing" in features_str or "seo" in features_str:
            team.extend(["marketing_agent", "seo_agent"])

        return list(set(team))[:8]  # Max 8 agents

    async def _execute_agent_task(self, agent_name: str, idea) -> Dict[str, Any]:
        """Execute a task with an agent"""
        prompt = f"""You are {agent_name}. Complete your part for building: {idea.name}

Business: {idea.description}
Your role: {agent_name.replace('_', ' ')}

Provide your output:"""

        try:
            response = await asyncio.wait_for(
                self.llm_client.complete(prompt, max_tokens=500),
                timeout=30.0
            )
            return {"agent": agent_name, "output": response, "success": True}
        except asyncio.TimeoutError:
            raise
        except Exception as e:
            return {"agent": agent_name, "error": str(e), "success": False}

    def _sanitize_name(self, name: str) -> str:
        return name.lower().replace(" ", "-").replace("'", "").replace('"', "")[:50]

    async def run(self):
        """Run the full production dress rehearsal"""
        self.start_time = time.time()

        logger.info("\n" + "="*80)
        logger.info("PRODUCTION DRESS REHEARSAL - STARTING")
        logger.info(f"Businesses to generate: {self.business_count}")
        logger.info(f"Primary LLM: Qwen 2.5 (14b)")
        logger.info(f"Fallback LLM: Mistral-Nemo (12b)")
        logger.info(f"Agents: {len(self.all_agents)}")
        logger.info(f"Watchdogs: Hudson (code review), Cora (agent optimization)")
        logger.info("="*80 + "\n")

        # Run business generation
        for i in range(1, self.business_count + 1):
            logger.info(f"\n{'='*60}")
            logger.info(f"BUSINESS {i}/{self.business_count}")
            logger.info(f"{'='*60}")

            try:
                result = await self.generate_one_business(i)

                # Periodic status update
                if i % 10 == 0:
                    self._print_status_update(i)

            except KeyboardInterrupt:
                logger.info("\n\nStopped by user")
                break
            except Exception as e:
                logger.error(f"Business {i} failed: {e}")
                continue

        # Final report
        self._print_final_report()

    def _print_status_update(self, current: int):
        """Print periodic status update"""
        elapsed = time.time() - self.start_time
        rate = current / elapsed * 60 if elapsed > 0 else 0

        logger.info(f"\n--- STATUS UPDATE ({current}/{self.business_count}) ---")
        logger.info(f"Success: {self.successful_businesses}, Failed: {self.failed_businesses}")
        logger.info(f"Stuck recoveries: {self.stuck_recoveries}, Quality fixes: {self.quality_fixes}")
        logger.info(f"Rate: {rate:.1f} businesses/min")
        logger.info(f"LLM Stats: {self.llm_client.get_stats()}")
        logger.info("---")

    def _print_final_report(self):
        """Print final comprehensive report"""
        elapsed = time.time() - self.start_time

        logger.info("\n" + "="*80)
        logger.info("PRODUCTION DRESS REHEARSAL - FINAL REPORT")
        logger.info("="*80)

        logger.info(f"\n📊 RESULTS:")
        logger.info(f"  Total businesses: {len(self.business_results)}")
        logger.info(f"  Successful: {self.successful_businesses}")
        logger.info(f"  Failed: {self.failed_businesses}")
        logger.info(f"  Success rate: {self.successful_businesses/max(1,len(self.business_results))*100:.1f}%")

        logger.info(f"\n⏱️  TIMING:")
        logger.info(f"  Total time: {elapsed/60:.1f} minutes")
        logger.info(f"  Avg per business: {elapsed/max(1,len(self.business_results)):.1f} seconds")

        logger.info(f"\n🤖 LLM USAGE:")
        llm_stats = self.llm_client.get_stats()
        logger.info(f"  Primary (Qwen 2.5) calls: {llm_stats['primary_calls']}")
        logger.info(f"  Fallback (Mistral) calls: {llm_stats['fallback_calls']}")
        logger.info(f"  Fallback rate: {llm_stats['fallback_rate']:.1f}%")
        logger.info(f"  Total tokens: {llm_stats['total_tokens']:,}")

        logger.info(f"\n👀 WATCHDOG STATS:")
        logger.info(f"  Hudson (Code Review): {self.hudson.get_stats()}")
        logger.info(f"  Cora (Agent Optimization): {self.cora.get_stats()}")

        logger.info(f"\n🔌 INTEGRATIONS:")
        logger.info(f"  {self.integrations.get_stats()}")

        logger.info(f"\n🧠 MEMORY SYSTEMS:")
        logger.info(f"  {self.memory.get_stats()}")

        logger.info("\n" + "="*80)

        # Save report to file
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "config": {
                "business_count": self.business_count,
                "min_score": self.min_score,
                "primary_llm": "qwen2.5:14b-instruct-q4_K_M",
                "fallback_llm": "mistral-nemo:12b-instruct-2407-q4_K_M"
            },
            "results": {
                "total": len(self.business_results),
                "successful": self.successful_businesses,
                "failed": self.failed_businesses,
                "success_rate": self.successful_businesses/max(1,len(self.business_results))*100
            },
            "timing": {
                "total_seconds": elapsed,
                "avg_per_business": elapsed/max(1,len(self.business_results))
            },
            "llm_stats": llm_stats,
            "watchdogs": {
                "hudson": self.hudson.get_stats(),
                "cora": self.cora.get_stats()
            },
            "integrations": self.integrations.get_stats(),
            "memory": self.memory.get_stats(),
            "businesses": self.business_results
        }

        report_path = Path(f"logs/production_rehearsal_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"\n📄 Report saved to: {report_path}")


async def main():
    """Main entry point"""
    # Ensure logs directory exists
    Path("logs").mkdir(parents=True, exist_ok=True)

    rehearsal = ProductionDressRehearsal(
        business_count=100,
        min_score=70.0
    )

    await rehearsal.run()


if __name__ == "__main__":
    asyncio.run(main())
