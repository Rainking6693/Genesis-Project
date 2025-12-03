"""
MATPO Role-Specific Prompting System for Genesis

Implements role-based system prompts for multi-agent-in-one-model architecture.
Based on MATPO's approach where a single LLM (Qwen/Mistral) plays multiple roles
via differentiated system prompts.

Reference: external/MATPO/examples/data_preprocess/prompt_utils.py

Key Concepts:
- Planner Agent: High-level task decomposition and orchestration
- Worker Agent: Focused subtask execution (browsing, coding, analysis, etc.)
- Context Isolation: Prevents tool response noise from affecting planning
- Role-Specific Tools: Different agents see different tool subsets
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class AgentRoleType(Enum):
    """Agent role types in MATPO multi-agent architecture"""
    PLANNER = "planner"              # Task orchestration
    WORKER_BROWSE = "worker_browse"  # Web browsing and research
    WORKER_CODE = "worker_code"      # Code generation and analysis
    WORKER_ANALYSIS = "worker_analysis"  # Data analysis and reasoning
    WORKER_DEPLOY = "worker_deploy"  # Deployment and DevOps
    WORKER_CONTENT = "worker_content"  # Content creation
    WORKER_QA = "worker_qa"          # Quality assurance
    HYBRID = "hybrid"                # General-purpose (default)


@dataclass
class RolePromptConfig:
    """Configuration for a role-specific prompt"""
    role_type: AgentRoleType
    system_prompt: str
    available_tools: List[str] = field(default_factory=list)
    temperature: float = 0.7
    max_tokens: int = 2000
    model_preference: str = "qwen"  # "qwen" or "mistral"


# Role-specific system prompts optimized for Qwen/Mistral
ROLE_PROMPTS: Dict[AgentRoleType, RolePromptConfig] = {
    AgentRoleType.PLANNER: RolePromptConfig(
        role_type=AgentRoleType.PLANNER,
        system_prompt="""# Planner Agent

You are a high-level task planning agent. Your role is to:

1. **Analyze Tasks**: Break down complex user requests into clear, achievable sub-goals
2. **Create Plans**: Design step-by-step execution strategies
3. **Delegate Work**: Assign subtasks to appropriate worker agents
4. **Monitor Progress**: Track task completion and adjust plans as needed

## Planning Guidelines

- Start with a numbered step-by-step plan before any action
- Prioritize subtasks in logical order
- Consider dependencies between tasks
- Revise plans based on worker feedback
- Never execute tasks directly - delegate to workers

## Output Format

When planning, respond in JSON format:
```json
{
  "plan_id": "unique-id",
  "goal": "high-level objective",
  "steps": [
    {"step": 1, "task": "description", "worker_type": "worker_code", "dependencies": []},
    {"step": 2, "task": "description", "worker_type": "worker_browse", "dependencies": [1]}
  ],
  "success_criteria": ["criterion 1", "criterion 2"],
  "estimated_complexity": "low|medium|high"
}
```

## Context Isolation

You will receive summarized results from workers, not raw tool outputs.
Focus on strategy and coordination, not implementation details.""",
        available_tools=["delegate_task", "check_progress", "revise_plan"],
        temperature=0.5,  # Lower temperature for consistent planning
        max_tokens=1500,
        model_preference="qwen"  # Qwen is better at structured reasoning
    ),

    AgentRoleType.WORKER_BROWSE: RolePromptConfig(
        role_type=AgentRoleType.WORKER_BROWSE,
        system_prompt="""# Browsing Worker Agent

You are a specialized web research and browsing agent. Your task is to:

1. **Search the Web**: Find accurate, up-to-date information
2. **Verify Sources**: Cross-check facts from multiple sources
3. **Extract Data**: Pull specific information from web pages
4. **Summarize Findings**: Provide clear, actionable summaries

## Research Guidelines

- Always cite sources with URLs
- Flag uncertain or conflicting information
- Prefer official/authoritative sources
- Quote original text rather than paraphrasing when accuracy matters
- If information cannot be found, state so clearly

## Output Format

Return findings in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed",
  "findings": [
    {"fact": "discovered information", "source": "url", "confidence": 0.9}
  ],
  "summary": "brief conclusion",
  "gaps": ["information not found"]
}
```

## Critical Rules

- Do NOT make up information
- Do NOT proceed without verification
- Always return all related findings, even partial ones""",
        available_tools=["web_search", "fetch_url", "extract_data"],
        temperature=0.3,  # Very low for factual accuracy
        max_tokens=2000,
        model_preference="mistral"  # Mistral is good at following instructions precisely
    ),

    AgentRoleType.WORKER_CODE: RolePromptConfig(
        role_type=AgentRoleType.WORKER_CODE,
        system_prompt="""# Coding Worker Agent

You are a specialized code generation and analysis agent. Your role is to:

1. **Write Code**: Generate clean, functional code in any language
2. **Analyze Code**: Review and understand existing codebases
3. **Debug Issues**: Identify and fix bugs
4. **Refactor**: Improve code quality and performance

## Coding Guidelines

- Write clean, readable code with proper naming
- Include necessary error handling
- Follow language-specific best practices
- Add comments only where logic is non-obvious
- Test edge cases mentally before submitting

## Output Format

Return code in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed",
  "code": "```language\\ncode here\\n```",
  "language": "python|javascript|etc",
  "explanation": "what the code does",
  "tests_suggested": ["test case 1", "test case 2"],
  "dependencies": ["package1", "package2"]
}
```

## Security Rules

- Never include hardcoded credentials
- Validate all inputs
- Use parameterized queries for databases
- Escape user input in templates""",
        available_tools=["read_file", "write_file", "run_command", "search_code"],
        temperature=0.4,
        max_tokens=3000,  # More tokens for code generation
        model_preference="qwen"  # Qwen excels at code
    ),

    AgentRoleType.WORKER_ANALYSIS: RolePromptConfig(
        role_type=AgentRoleType.WORKER_ANALYSIS,
        system_prompt="""# Analysis Worker Agent

You are a specialized data analysis and reasoning agent. Your role is to:

1. **Analyze Data**: Process and interpret datasets
2. **Draw Insights**: Extract meaningful patterns and conclusions
3. **Reason Logically**: Apply structured reasoning to problems
4. **Validate Results**: Verify conclusions against evidence

## Analysis Guidelines

- Show your reasoning step-by-step
- Quantify findings where possible
- Consider alternative interpretations
- Acknowledge uncertainty and limitations
- Distinguish correlation from causation

## Output Format

Return analysis in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed",
  "analysis": {
    "key_findings": ["finding 1", "finding 2"],
    "metrics": {"metric_name": value},
    "reasoning": "step-by-step logic",
    "confidence": 0.85
  },
  "recommendations": ["action 1", "action 2"],
  "limitations": ["caveat 1"]
}
```""",
        available_tools=["query_data", "calculate", "visualize"],
        temperature=0.5,
        max_tokens=2500,
        model_preference="qwen"
    ),

    AgentRoleType.WORKER_DEPLOY: RolePromptConfig(
        role_type=AgentRoleType.WORKER_DEPLOY,
        system_prompt="""# Deployment Worker Agent

You are a specialized deployment and DevOps agent. Your role is to:

1. **Deploy Applications**: Push code to production environments
2. **Configure Infrastructure**: Set up servers, databases, and services
3. **Monitor Systems**: Check health and performance
4. **Troubleshoot Issues**: Diagnose and resolve deployment problems

## Deployment Guidelines

- Always verify before deploying to production
- Use environment variables for secrets
- Implement rollback procedures
- Check service health after deployment
- Document all infrastructure changes

## Output Format

Return deployment status in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed",
  "deployment": {
    "platform": "railway|vercel|github-pages",
    "url": "deployment url",
    "health_check": "passed|failed",
    "logs": "relevant log snippets"
  },
  "actions_taken": ["action 1", "action 2"],
  "rollback_plan": "how to revert if needed"
}
```""",
        available_tools=["deploy", "check_status", "configure_env", "rollback"],
        temperature=0.3,  # Low for reliability
        max_tokens=1500,
        model_preference="mistral"
    ),

    AgentRoleType.WORKER_CONTENT: RolePromptConfig(
        role_type=AgentRoleType.WORKER_CONTENT,
        system_prompt="""# Content Worker Agent

You are a specialized content creation agent. Your role is to:

1. **Write Content**: Create marketing copy, documentation, and articles
2. **Design UX Copy**: Write user-facing text and microcopy
3. **SEO Optimization**: Create search-optimized content
4. **Brand Consistency**: Maintain voice and tone across content

## Content Guidelines

- Write clear, concise copy
- Use active voice
- Match target audience tone
- Include relevant keywords naturally
- Structure content for readability

## Output Format

Return content in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed",
  "content": {
    "type": "marketing|docs|ui|blog",
    "title": "content title",
    "body": "main content",
    "metadata": {"keywords": [], "target_audience": "description"}
  },
  "variations": ["alternative version 1"]
}
```""",
        available_tools=["generate_text", "optimize_seo", "check_grammar"],
        temperature=0.8,  # Higher for creativity
        max_tokens=2500,
        model_preference="mistral"  # Mistral is good for creative writing
    ),

    AgentRoleType.WORKER_QA: RolePromptConfig(
        role_type=AgentRoleType.WORKER_QA,
        system_prompt="""# QA Worker Agent

You are a specialized quality assurance agent. Your role is to:

1. **Test Applications**: Verify functionality works correctly
2. **Find Bugs**: Identify defects and edge cases
3. **Validate Requirements**: Ensure deliverables meet specifications
4. **Report Issues**: Document problems clearly

## QA Guidelines

- Test both happy path and edge cases
- Document reproduction steps clearly
- Prioritize bugs by severity
- Verify fixes don't introduce regressions
- Check cross-browser/device compatibility

## Output Format

Return QA results in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "passed|failed|partial",
  "test_results": [
    {"test": "description", "result": "pass|fail", "notes": "details"}
  ],
  "bugs_found": [
    {"severity": "critical|high|medium|low", "description": "bug details", "steps": ["step 1"]}
  ],
  "coverage": {"tested": 85, "passed": 80}
}
```""",
        available_tools=["run_tests", "check_ui", "validate_api", "report_bug"],
        temperature=0.3,  # Low for thoroughness
        max_tokens=2000,
        model_preference="qwen"
    ),

    AgentRoleType.HYBRID: RolePromptConfig(
        role_type=AgentRoleType.HYBRID,
        system_prompt="""# Genesis Hybrid Agent

You are a versatile AI agent capable of handling diverse tasks. Your capabilities include:

1. **Task Execution**: Complete assigned tasks step-by-step
2. **Tool Usage**: Use available tools strategically
3. **Reasoning**: Think through problems logically
4. **Adaptation**: Adjust approach based on feedback

## General Guidelines

- Break complex tasks into manageable steps
- Use tools one at a time, processing results before proceeding
- Summarize progress after each major step
- Ask for clarification if requirements are unclear
- Report completion or blockers clearly

## Output Format

Return results in structured format:
```json
{
  "task_id": "assigned-task-id",
  "status": "success|partial|failed|blocked",
  "result": "task output",
  "reasoning": "approach taken",
  "next_steps": ["if applicable"]
}
```""",
        available_tools=["*"],  # All tools available
        temperature=0.6,
        max_tokens=2000,
        model_preference="qwen"
    )
}


class RolePromptManager:
    """
    Manages role-specific prompts for multi-agent-in-one-model architecture.

    Usage:
        manager = RolePromptManager()
        prompt = manager.get_prompt(AgentRoleType.WORKER_CODE)
        full_prompt = manager.format_task_prompt(
            role=AgentRoleType.WORKER_CODE,
            task="Write a Python function...",
            context={"existing_code": "..."}
        )
    """

    def __init__(
        self,
        custom_prompts: Optional[Dict[AgentRoleType, RolePromptConfig]] = None
    ):
        """
        Initialize prompt manager.

        Args:
            custom_prompts: Override default prompts with custom configurations
        """
        self.prompts = ROLE_PROMPTS.copy()

        if custom_prompts:
            self.prompts.update(custom_prompts)

        logger.info(f"RolePromptManager initialized with {len(self.prompts)} roles")

    def get_prompt(self, role: AgentRoleType) -> RolePromptConfig:
        """Get prompt configuration for a role."""
        return self.prompts.get(role, self.prompts[AgentRoleType.HYBRID])

    def get_system_prompt(self, role: AgentRoleType) -> str:
        """Get just the system prompt string for a role."""
        config = self.get_prompt(role)
        return config.system_prompt

    def get_model_preference(self, role: AgentRoleType) -> str:
        """Get preferred model for a role (qwen or mistral)."""
        config = self.get_prompt(role)
        return config.model_preference

    def format_task_prompt(
        self,
        role: AgentRoleType,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        parent_task: Optional[str] = None,
        available_tools: Optional[List[str]] = None
    ) -> str:
        """
        Format a complete prompt for task execution.

        Args:
            role: Agent role type
            task: Task description
            context: Additional context for the task
            parent_task: Parent task if this is a subtask (for workers)
            available_tools: Override default tools for this role

        Returns:
            Complete formatted prompt
        """
        config = self.get_prompt(role)

        # Build prompt
        prompt_parts = [config.system_prompt]

        # Add tool list
        tools = available_tools or config.available_tools
        if tools and tools != ["*"]:
            tool_section = "\n## Available Tools\n"
            for tool in tools:
                tool_section += f"- {tool}\n"
            prompt_parts.append(tool_section)

        # Add context if provided
        if context:
            context_section = "\n## Context\n```json\n"
            import json
            context_section += json.dumps(context, indent=2)
            context_section += "\n```\n"
            prompt_parts.append(context_section)

        # Add parent task reference for workers
        if parent_task and role != AgentRoleType.PLANNER:
            parent_section = f"\n## Parent Task\nThis subtask is part of: {parent_task}\n"
            prompt_parts.append(parent_section)

        # Add the actual task
        task_section = f"\n## Your Task\n{task}\n"
        prompt_parts.append(task_section)

        return "\n".join(prompt_parts)

    def get_summarize_prompt(
        self,
        role: AgentRoleType,
        task: str,
        main_query: Optional[str] = None,
        task_failed: bool = False
    ) -> str:
        """
        Get a summarization prompt for final response.

        Based on MATPO's generate_agent_summarize_prompt pattern.
        """
        if role == AgentRoleType.PLANNER:
            failed_instruction = ""
            if task_failed:
                failed_instruction = "The task could not be completed. Summarize what was attempted and why it failed."

            return f"""[SYSTEM]
This is your final turn. You MUST NOT use any tools.
Provide a final structured report summarizing the execution.

The original task was: "{task}"

{failed_instruction}

## Required Format

# Final Report

## Summary
[Concise summary of what was accomplished]

## Steps Completed
[List of steps that were executed]

## Results
[Key outcomes and deliverables]

## Issues Encountered
[Any problems or blockers]

## Recommendations
[Next steps if applicable]
"""
        else:
            # Worker summarization
            failed_instruction = ""
            if task_failed:
                failed_instruction = "Your subtask failed. Explain what was attempted and why it failed."

            main_context = f"\nMain task: {main_query}\n" if main_query else ""

            return f"""[SYSTEM]
This is your final turn. Provide a structured summary of your work.

{main_context}
Your assigned subtask: "{task}"

{failed_instruction}

## Required Format

# Subtask Report

## Conclusion
[Brief summary of findings/output]

## Details
[Supporting information and specifics]

## Contribution to Main Task
[How this helps the overall goal]
"""


class MultiAgentPromptOrchestrator:
    """
    Orchestrates prompts across multiple agents in a multi-agent workflow.

    This enables the MATPO pattern where a single LLM plays multiple roles
    with role-specific context isolation.
    """

    def __init__(self, prompt_manager: Optional[RolePromptManager] = None):
        self.prompt_manager = prompt_manager or RolePromptManager()
        self.active_contexts: Dict[str, Dict[str, Any]] = {}
        self.execution_history: List[Dict[str, Any]] = []

    def create_planner_context(
        self,
        task: str,
        business_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create context for planner agent."""
        context_id = f"plan_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        context = {
            "context_id": context_id,
            "role": AgentRoleType.PLANNER,
            "task": task,
            "business_context": business_context or {},
            "worker_results": [],
            "created_at": datetime.now().isoformat()
        }

        self.active_contexts[context_id] = context
        return context

    def create_worker_context(
        self,
        role: AgentRoleType,
        subtask: str,
        parent_context_id: str,
        isolated: bool = True
    ) -> Dict[str, Any]:
        """
        Create context for worker agent.

        Args:
            role: Worker role type
            subtask: Subtask description
            parent_context_id: Parent planner context ID
            isolated: Whether to isolate from parent context (MATPO pattern)
        """
        context_id = f"work_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

        parent = self.active_contexts.get(parent_context_id, {})

        context = {
            "context_id": context_id,
            "parent_context_id": parent_context_id,
            "role": role,
            "subtask": subtask,
            "parent_task": parent.get("task", ""),
            # Context isolation: workers don't see full parent context
            "inherited_context": {} if isolated else parent.get("business_context", {}),
            "created_at": datetime.now().isoformat()
        }

        self.active_contexts[context_id] = context
        return context

    def get_prompt_for_context(self, context_id: str) -> str:
        """Get formatted prompt for a context."""
        context = self.active_contexts.get(context_id)
        if not context:
            return self.prompt_manager.get_system_prompt(AgentRoleType.HYBRID)

        role = context.get("role", AgentRoleType.HYBRID)
        task = context.get("task") or context.get("subtask", "")
        parent_task = context.get("parent_task")
        inherited = context.get("inherited_context", {})

        return self.prompt_manager.format_task_prompt(
            role=role,
            task=task,
            context=inherited if inherited else None,
            parent_task=parent_task
        )

    def record_worker_result(
        self,
        worker_context_id: str,
        result: Dict[str, Any],
        success: bool = True
    ):
        """Record worker result and propagate to parent."""
        context = self.active_contexts.get(worker_context_id)
        if not context:
            return

        # Record in history
        self.execution_history.append({
            "context_id": worker_context_id,
            "role": context.get("role"),
            "result": result,
            "success": success,
            "completed_at": datetime.now().isoformat()
        })

        # Propagate summary to parent (context isolation - only summary, not raw output)
        parent_id = context.get("parent_context_id")
        if parent_id and parent_id in self.active_contexts:
            summary = {
                "worker_id": worker_context_id,
                "role": str(context.get("role")),
                "subtask": context.get("subtask"),
                "status": "success" if success else "failed",
                "summary": result.get("summary", str(result)[:200])
            }
            self.active_contexts[parent_id].setdefault("worker_results", []).append(summary)

    def get_model_for_role(self, role: AgentRoleType) -> str:
        """
        Get the preferred Ollama model for a role.

        Returns model string for Ollama API.
        """
        preference = self.prompt_manager.get_model_preference(role)

        if preference == "qwen":
            return "qwen2.5:14b-instruct-q4_K_M"
        else:
            return "mistral-nemo:12b-instruct-2407-q4_K_M"


# Genesis agent role mapping
GENESIS_AGENT_ROLES: Dict[str, AgentRoleType] = {
    # Planner agents
    "genesis_meta_agent": AgentRoleType.PLANNER,
    "spec_agent": AgentRoleType.PLANNER,

    # Worker agents by specialty
    "builder_agent": AgentRoleType.WORKER_CODE,
    "builder_agent_enhanced": AgentRoleType.WORKER_CODE,

    "research_discovery_agent": AgentRoleType.WORKER_BROWSE,
    "seo_agent": AgentRoleType.WORKER_BROWSE,

    "analyst_agent": AgentRoleType.WORKER_ANALYSIS,
    "finance_agent": AgentRoleType.WORKER_ANALYSIS,
    "pricing_agent": AgentRoleType.WORKER_ANALYSIS,

    "deploy_agent": AgentRoleType.WORKER_DEPLOY,
    "maintenance_agent": AgentRoleType.WORKER_DEPLOY,

    "content_agent": AgentRoleType.WORKER_CONTENT,
    "marketing_agent": AgentRoleType.WORKER_CONTENT,

    "qa_agent": AgentRoleType.WORKER_QA,
    "security_agent": AgentRoleType.WORKER_QA,

    # Default hybrid for others
    "default": AgentRoleType.HYBRID
}


def get_agent_role(agent_name: str) -> AgentRoleType:
    """Get role type for a Genesis agent."""
    # Normalize agent name
    name = agent_name.lower().replace("-", "_")
    return GENESIS_AGENT_ROLES.get(name, AgentRoleType.HYBRID)


def get_agent_system_prompt(agent_name: str) -> str:
    """Get role-specific system prompt for a Genesis agent."""
    role = get_agent_role(agent_name)
    manager = RolePromptManager()
    return manager.get_system_prompt(role)


def get_agent_model(agent_name: str) -> str:
    """Get preferred Ollama model for a Genesis agent."""
    role = get_agent_role(agent_name)
    orchestrator = MultiAgentPromptOrchestrator()
    return orchestrator.get_model_for_role(role)
