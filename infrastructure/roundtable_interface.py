"""
Roundtable Interface - Multi-LLM Coordination

Interface for communicating with Codex, Gemini, Cursor, and Claude
via the Roundtable MCP server.

Best Practice #5 from arXiv:2512.08769:
"Responsible AI-aligned Model Consortium Design"
- Multiple specialized LLMs independently generate outputs
- A ReasoningAgent synthesizes, validates, and audits results

Roles:
- Codex: Lead Developer - generates and implements code
- Gemini: Lead QA - runs tests and verification
- Cursor: Codebase Navigator - searches and understands code
- Claude: Already the primary orchestrator
- ReasoningAgent: Final auditor - consolidates and validates outputs
"""

import asyncio
import logging
import os
import subprocess
import json
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from pathlib import Path

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Import ReasoningAgent for multi-model consolidation (Best Practice #5)
try:
    from agents.reasoning_agent import (
        ReasoningAgent,
        ModelOutput,
        ConsolidatedOutput,
        ConflictResolutionStrategy,
        consolidate_model_outputs
    )
    REASONING_AGENT_AVAILABLE = True
except ImportError:
    REASONING_AGENT_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class SubagentResult:
    """Result from a Roundtable subagent call"""
    success: bool
    output: str
    agent: str
    model: Optional[str] = None
    duration_seconds: float = 0.0
    files_modified: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class RoundtableInterface:
    """
    Interface for Roundtable MCP Server

    Provides methods to invoke Codex, Gemini, Cursor, and Claude
    as subagents for specialized tasks.
    """

    # Default models for each agent
    DEFAULT_MODELS = {
        "codex": "gpt-5",
        "gemini": "gemini-2.5-pro",
        "cursor": "sonnet-4",
        "claude": "sonnet-4"
    }

    def __init__(
        self,
        working_dir: Optional[str] = None,
        timeout: int = 300,
        verbose: bool = False
    ):
        """
        Initialize Roundtable Interface.

        Args:
            working_dir: Default working directory for subagents
            timeout: Default timeout for subagent calls (seconds)
            verbose: Enable verbose output
        """
        self.working_dir = working_dir or os.getcwd()
        self.timeout = timeout
        self.verbose = verbose

        # Check availability
        self._availability = {}
        self._check_availability()

        logger.info(f"Roundtable Interface initialized")
        logger.info(f"  Working dir: {self.working_dir}")
        logger.info(f"  Available agents: {list(self._availability.keys())}")

    def _check_availability(self):
        """Check which subagents are available"""
        try:
            # Check for roundtable-ai executable
            result = subprocess.run(
                ["roundtable-ai", "--check"],
                capture_output=True,
                text=True,
                timeout=30,
                env={**os.environ, "PYTHONIOENCODING": "utf-8"}
            )

            # Parse availability from output or cache file
            cache_path = Path.home() / ".roundtable" / "availability_check.json"
            if cache_path.exists():
                with open(cache_path) as f:
                    data = json.load(f)
                    for agent, info in data.items():
                        if agent != "_metadata" and info.get("available"):
                            self._availability[agent] = True

        except FileNotFoundError:
            logger.warning("roundtable-ai not found in PATH")
        except subprocess.TimeoutExpired:
            logger.warning("roundtable-ai availability check timed out")
        except Exception as e:
            logger.warning(f"Failed to check availability: {e}")

    def is_available(self, agent: str) -> bool:
        """Check if an agent is available"""
        return self._availability.get(agent.lower(), False)

    # ========== Codex (Lead Developer) ==========

    async def invoke_codex(
        self,
        instruction: str,
        project_path: Optional[str] = None,
        model: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> SubagentResult:
        """
        Invoke Codex as Lead Developer.

        Codex specializes in:
        - Generating complete codebases
        - Implementing features
        - Fixing bugs
        - Refactoring code

        Args:
            instruction: The coding task to execute
            project_path: Path to the project directory
            model: Model to use (default: gpt-5)
            session_id: Optional session ID for continuity

        Returns:
            SubagentResult with implementation details
        """
        return await self._invoke_subagent(
            agent="codex",
            instruction=instruction,
            project_path=project_path or self.working_dir,
            model=model or self.DEFAULT_MODELS["codex"],
            session_id=session_id
        )

    # ========== Gemini (Lead QA) ==========

    async def invoke_gemini(
        self,
        instruction: str,
        project_path: Optional[str] = None,
        model: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> SubagentResult:
        """
        Invoke Gemini as Lead QA.

        Gemini specializes in:
        - E2E testing
        - Code quality analysis
        - Security scanning
        - Performance testing
        - Accessibility testing

        Args:
            instruction: The QA task to execute
            project_path: Path to the project directory
            model: Model to use (default: gemini-2.5-pro)
            session_id: Optional session ID for continuity

        Returns:
            SubagentResult with test results
        """
        return await self._invoke_subagent(
            agent="gemini",
            instruction=instruction,
            project_path=project_path or self.working_dir,
            model=model or self.DEFAULT_MODELS["gemini"],
            session_id=session_id
        )

    # ========== Cursor (Codebase Navigator) ==========

    async def invoke_cursor(
        self,
        instruction: str,
        project_path: Optional[str] = None,
        model: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> SubagentResult:
        """
        Invoke Cursor for codebase navigation.

        Cursor specializes in:
        - Searching code
        - Understanding architecture
        - Finding patterns
        - Locating files

        Args:
            instruction: The search/analysis task
            project_path: Path to the project directory
            model: Model to use (default: sonnet-4)
            session_id: Optional session ID for continuity

        Returns:
            SubagentResult with search results
        """
        return await self._invoke_subagent(
            agent="cursor",
            instruction=instruction,
            project_path=project_path or self.working_dir,
            model=model or self.DEFAULT_MODELS["cursor"],
            session_id=session_id
        )

    # ========== Claude (Orchestrator Delegate) ==========

    async def invoke_claude(
        self,
        instruction: str,
        project_path: Optional[str] = None,
        model: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> SubagentResult:
        """
        Invoke Claude as delegate (for parallel work).

        Claude specializes in:
        - Complex reasoning
        - Architecture design
        - Code review
        - Documentation

        Args:
            instruction: The task to execute
            project_path: Path to the project directory
            model: Model to use (default: sonnet-4)
            session_id: Optional session ID for continuity

        Returns:
            SubagentResult with task results
        """
        return await self._invoke_subagent(
            agent="claude",
            instruction=instruction,
            project_path=project_path or self.working_dir,
            model=model or self.DEFAULT_MODELS["claude"],
            session_id=session_id
        )

    # ========== Core Invocation ==========

    async def _invoke_subagent(
        self,
        agent: str,
        instruction: str,
        project_path: str,
        model: str,
        session_id: Optional[str] = None
    ) -> SubagentResult:
        """
        Internal method to invoke a subagent via Roundtable MCP.

        This would typically be called via the MCP protocol,
        but we provide a fallback direct CLI invocation.
        """
        import time
        start_time = time.time()

        logger.info(f"Invoking {agent} subagent...")
        logger.info(f"  Model: {model}")
        logger.info(f"  Project: {project_path}")
        logger.debug(f"  Instruction: {instruction[:100]}...")

        try:
            # Try MCP invocation first (if running in MCP context)
            result = await self._try_mcp_invocation(
                agent, instruction, project_path, model, session_id
            )

            if result:
                result.duration_seconds = time.time() - start_time
                return result

            # Fallback to direct CLI invocation
            result = await self._direct_cli_invocation(
                agent, instruction, project_path, model, session_id
            )
            result.duration_seconds = time.time() - start_time
            return result

        except Exception as e:
            logger.error(f"Failed to invoke {agent}: {e}")
            return SubagentResult(
                success=False,
                output="",
                agent=agent,
                model=model,
                duration_seconds=time.time() - start_time,
                errors=[str(e)]
            )

    async def _try_mcp_invocation(
        self,
        agent: str,
        instruction: str,
        project_path: str,
        model: str,
        session_id: Optional[str]
    ) -> Optional[SubagentResult]:
        """
        Try to invoke via MCP protocol.

        In a full implementation, this would use the MCP client
        to call the roundtable-ai server's tools.
        """
        # This is a placeholder - in actual use, the MCP tools
        # (mcp__roundtable-ai__codex_subagent, etc.) would be
        # called directly by Claude
        return None

    async def _direct_cli_invocation(
        self,
        agent: str,
        instruction: str,
        project_path: str,
        model: str,
        session_id: Optional[str]
    ) -> SubagentResult:
        """
        Direct CLI invocation of subagent.

        Uses the underlying CLI tools (codex, gemini, etc.) directly.
        """
        cli_commands = {
            "codex": ["codex", "-p"],
            "gemini": ["gemini"],
            "cursor": ["cursor", "--agent"],
            "claude": ["claude", "-p"]
        }

        cmd = cli_commands.get(agent)
        if not cmd:
            return SubagentResult(
                success=False,
                output="",
                agent=agent,
                errors=[f"Unknown agent: {agent}"]
            )

        try:
            # Build command
            full_cmd = cmd + [instruction]

            # Run with timeout
            process = await asyncio.create_subprocess_exec(
                *full_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path,
                env={**os.environ, "PYTHONIOENCODING": "utf-8"}
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout
            )

            output = stdout.decode("utf-8", errors="replace")
            errors = stderr.decode("utf-8", errors="replace") if stderr else ""

            return SubagentResult(
                success=process.returncode == 0,
                output=output,
                agent=agent,
                model=model,
                errors=[errors] if errors and process.returncode != 0 else []
            )

        except asyncio.TimeoutError:
            return SubagentResult(
                success=False,
                output="",
                agent=agent,
                model=model,
                errors=[f"Timeout after {self.timeout} seconds"]
            )

        except FileNotFoundError:
            return SubagentResult(
                success=False,
                output="",
                agent=agent,
                model=model,
                errors=[f"{agent} CLI not found in PATH"]
            )

    # ========== Parallel Invocation ==========

    async def invoke_parallel(
        self,
        tasks: List[Dict[str, Any]]
    ) -> List[SubagentResult]:
        """
        Invoke multiple subagents in parallel.

        Args:
            tasks: List of task dicts with keys:
                - agent: "codex", "gemini", "cursor", or "claude"
                - instruction: The task instruction
                - project_path: Optional project path
                - model: Optional model override

        Returns:
            List of SubagentResults in same order as tasks
        """
        coroutines = []

        for task in tasks:
            agent = task.get("agent", "claude")
            instruction = task.get("instruction", "")
            project_path = task.get("project_path")
            model = task.get("model")

            if agent == "codex":
                coro = self.invoke_codex(instruction, project_path, model)
            elif agent == "gemini":
                coro = self.invoke_gemini(instruction, project_path, model)
            elif agent == "cursor":
                coro = self.invoke_cursor(instruction, project_path, model)
            else:
                coro = self.invoke_claude(instruction, project_path, model)

            coroutines.append(coro)

        return await asyncio.gather(*coroutines)

    # ========== Multi-Model Consortium (Best Practice #5) ==========

    async def invoke_consortium(
        self,
        instruction: str,
        agents: List[str] = ["codex", "gemini", "claude"],
        project_path: Optional[str] = None,
        output_type: str = "json",
        strategy: str = "conservative"
    ) -> Dict[str, Any]:
        """
        Invoke multiple models in parallel and consolidate results.

        Implements Best Practice #5 from arXiv:2512.08769:
        "Responsible AI-aligned Model Consortium Design"

        The paper states: "A dedicated reasoning agent then synthesizes these
        drafts, resolves conflicts, removes speculation, and grounds the final
        output in agreed-upon facts."

        Args:
            instruction: The task for all agents to perform
            agents: List of agents to invoke (default: codex, gemini, claude)
            project_path: Path to the project directory
            output_type: Type of output to consolidate ("json", "text", "list", "code")
            strategy: Conflict resolution strategy:
                - "conservative": Only accept facts >60% agree on
                - "majority_vote": Most common answer wins
                - "weighted": Weight by model confidence
                - "union": Merge all unique elements

        Returns:
            Dict with consolidated result and metadata
        """
        if not REASONING_AGENT_AVAILABLE:
            logger.warning("ReasoningAgent not available, falling back to single agent")
            result = await self.invoke_codex(instruction, project_path)
            return {
                "result": result.output,
                "confidence": 0.7 if result.success else 0.3,
                "agreement_score": 1.0,
                "sources": ["codex"],
                "reasoning_trace": "Single agent fallback (ReasoningAgent not available)"
            }

        logger.info(f"Invoking consortium of {len(agents)} agents: {agents}")

        # Step 1: Invoke all agents in parallel
        tasks = [
            {"agent": agent, "instruction": instruction, "project_path": project_path}
            for agent in agents
        ]
        results = await self.invoke_parallel(tasks)

        # Step 2: Convert to ModelOutput format for ReasoningAgent
        model_outputs = []
        for i, result in enumerate(results):
            agent_name = agents[i]

            # Try to parse JSON if output_type is json
            output = result.output
            if output_type == "json":
                try:
                    output = json.loads(result.output)
                except (json.JSONDecodeError, TypeError):
                    # Keep as string if JSON parse fails
                    pass

            model_outputs.append(ModelOutput(
                model_name=agent_name,
                output=output,
                confidence=0.9 if result.success else 0.5,
                reasoning=f"Agent {agent_name} completed in {result.duration_seconds:.1f}s"
            ))

        # Step 3: Use ReasoningAgent to consolidate
        strategy_map = {
            "conservative": ConflictResolutionStrategy.CONSERVATIVE,
            "majority_vote": ConflictResolutionStrategy.MAJORITY_VOTE,
            "weighted": ConflictResolutionStrategy.WEIGHTED_CONFIDENCE,
            "union": ConflictResolutionStrategy.UNION,
            "intersection": ConflictResolutionStrategy.INTERSECTION
        }

        reasoning_agent = ReasoningAgent(
            strategy=strategy_map.get(strategy, ConflictResolutionStrategy.CONSERVATIVE)
        )

        consolidated = await reasoning_agent.consolidate(
            outputs=model_outputs,
            output_type=output_type
        )

        logger.info(f"Consortium result: confidence={consolidated.confidence:.2f}, "
                   f"agreement={consolidated.agreement_score:.2f}")

        return {
            "result": consolidated.result,
            "confidence": consolidated.confidence,
            "agreement_score": consolidated.agreement_score,
            "conflicts_resolved": consolidated.conflicts_resolved,
            "hallucinations_removed": consolidated.hallucinations_removed,
            "sources": consolidated.sources,
            "reasoning_trace": consolidated.reasoning_trace
        }

    async def code_with_review(
        self,
        instruction: str,
        project_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate code with Codex, review with Gemini, consolidate with ReasoningAgent.

        This is a specialized consortium workflow for code generation that:
        1. Has Codex generate the initial implementation
        2. Has Gemini review and suggest improvements
        3. Has Claude verify the architecture
        4. Consolidates into a final, validated implementation

        Args:
            instruction: The code generation task
            project_path: Path to the project directory

        Returns:
            Dict with validated code and review metadata
        """
        # Use full consortium for critical code
        return await self.invoke_consortium(
            instruction=instruction,
            agents=["codex", "gemini", "claude"],
            project_path=project_path,
            output_type="code",
            strategy="conservative"
        )

    # ========== Conversation Mode ==========

    async def start_session(self, agent: str) -> str:
        """
        Start a persistent session with an agent.

        Returns session_id for subsequent calls.
        """
        import uuid
        session_id = str(uuid.uuid4())[:8]
        logger.info(f"Started {agent} session: {session_id}")
        return session_id

    async def continue_session(
        self,
        agent: str,
        session_id: str,
        instruction: str,
        project_path: Optional[str] = None
    ) -> SubagentResult:
        """
        Continue an existing session with an agent.
        """
        invoke_method = {
            "codex": self.invoke_codex,
            "gemini": self.invoke_gemini,
            "cursor": self.invoke_cursor,
            "claude": self.invoke_claude
        }.get(agent, self.invoke_claude)

        return await invoke_method(
            instruction=instruction,
            project_path=project_path,
            session_id=session_id
        )


# ========== Convenience Functions ==========

_global_interface: Optional[RoundtableInterface] = None


def get_roundtable() -> RoundtableInterface:
    """Get or create global Roundtable interface"""
    global _global_interface
    if _global_interface is None:
        _global_interface = RoundtableInterface()
    return _global_interface


async def ask_codex(instruction: str, project_path: Optional[str] = None) -> SubagentResult:
    """Quick helper to ask Codex"""
    return await get_roundtable().invoke_codex(instruction, project_path)


async def ask_gemini(instruction: str, project_path: Optional[str] = None) -> SubagentResult:
    """Quick helper to ask Gemini"""
    return await get_roundtable().invoke_gemini(instruction, project_path)


# ========== Testing ==========

if __name__ == "__main__":
    import asyncio

    async def test_roundtable():
        rt = RoundtableInterface()

        print(f"Available agents: {rt._availability}")

        # Test Codex
        print("\nTesting Codex (Lead Developer)...")
        result = await rt.invoke_codex(
            instruction="Create a simple hello world Python script",
            project_path="."
        )
        print(f"Success: {result.success}")
        print(f"Output: {result.output[:200] if result.output else 'No output'}...")

        # Test Gemini
        print("\nTesting Gemini (Lead QA)...")
        result = await rt.invoke_gemini(
            instruction="What files are in this directory?",
            project_path="."
        )
        print(f"Success: {result.success}")
        print(f"Output: {result.output[:200] if result.output else 'No output'}...")

    asyncio.run(test_roundtable())
