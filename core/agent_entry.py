"""
Agent Entry Point - Run Genesis agents with tasks.

Usage:
    python -m core.agent_entry --agent builder_agent_enhanced --task "Build a landing page"
    python -m core.agent_entry --list-agents

Programmatic:
    from core.agent_entry import get_agent_instance, run_agent_task
    agent = await get_agent_instance("builder_agent_enhanced")
    result = await run_agent_task("builder_agent_enhanced", "Build a landing page")
"""

import argparse
import asyncio
import inspect
import logging
import sys
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, Optional

# Add project root
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Agent factory registry: maps names to async factory functions
AGENT_FACTORIES: Dict[str, Callable[[], Awaitable[Any]]] = {}


def _register_agent_factory(name: str, factory: Callable[[], Awaitable[Any]]):
    """Register an agent factory function."""
    AGENT_FACTORIES[name] = factory


def _create_lazy_factory(module_path: str, getter_name: str, **default_kwargs):
    """Create a lazy-loading factory for an agent."""
    async def factory():
        import importlib
        try:
            module = importlib.import_module(module_path)
            getter = getattr(module, getter_name)
            if asyncio.iscoroutinefunction(getter):
                return await getter(**default_kwargs)
            return getter(**default_kwargs)
        except Exception as e:
            logger.warning(f"Failed to load {module_path}.{getter_name}: {e}")
            # Return stub on failure
            return _StubAgent(getter_name)
    return factory


class _StubAgent:
    """Stub agent for when real agent fails to load."""
    def __init__(self, name: str):
        self.name = name
        self.business_id = "stub"

    async def route_task(self, task_description: str, **kwargs) -> Dict[str, Any]:
        return {"agent": self.name, "task": task_description, "status": "stub", "message": "Agent not loaded"}

    async def initialize(self):
        pass


# Register all agents with lazy loading
# Format: agent_name -> (module_path, getter_name, kwargs)
_AGENT_DEFINITIONS = {
    # Top agents
    "analyst_agent": ("agents.analyst_agent", "get_analyst_agent", {"business_id": "default"}),
    "builder_agent_enhanced": ("agents.builder_agent_enhanced", "get_enhanced_builder_agent", {"business_id": "default"}),
    "deploy_agent": ("agents.deploy_agent", "get_deploy_agent", {"business_id": "default"}),
    "billing_agent": ("agents.billing_agent", "get_billing_agent", {"business_id": "default"}),
    "emergency_error_specialist_agent": ("agents.emergency_error_specialist_agent", "get_emergency_error_specialist_agent", {"business_id": "default"}),
    "marketing_agent": ("agents.marketing_agent", "get_marketing_agent", {"business_id": "default"}),
    "support_agent": ("agents.support_agent", "get_support_agent", {"business_id": "default"}),
    "onboarding_agent": ("agents.onboarding_agent", "get_onboarding_agent", {"business_id": "default"}),
    "qa_agent": ("agents.qa_agent", "get_qa_agent", {"business_id": "default"}),
    # SE-Darwin takes agent_name, not business_id
    "se_darwin_agent": ("agents.se_darwin_agent", "get_se_darwin_agent", {"agent_name": "genesis"}),
    "seo_agent": ("agents.seo_agent", "get_seo_agent", {"business_id": "default"}),

    # Other agents
    "commerce_agent": ("agents.commerce_agent", "get_commerce_agent", {"business_id": "default"}),
    "content_agent": ("agents.content_agent", "get_content_agent", {"business_id": "default"}),
    "darwin_agent": ("agents.darwin_agent", "get_darwin_agent", {"business_id": "default"}),
    "domain_name_agent": ("agents.domain_name_agent", "get_domain_name_agent", {"business_id": "default"}),
    "email_agent": ("agents.email_agent", "get_email_agent", {"business_id": "default"}),
    "finance_agent": ("agents.finance_agent", "get_finance_agent", {"business_id": "default"}),
    "legal_agent": ("agents.legal_agent", "get_legal_agent", {"business_id": "default"}),
    "maintenance_agent": ("agents.maintenance_agent", "get_maintenance_agent", {"business_id": "default"}),
    "pricing_agent": ("agents.pricing_agent", "get_pricing_agent", {"business_id": "default"}),
    "reflection_agent": ("agents.reflection_agent", "get_reflection_agent", {"business_id": "default"}),
    "research_discovery_agent": ("agents.research_discovery_agent", "get_research_discovery_agent", {"business_id": "default"}),
    "ring1t_reasoning": ("agents.ring1t_reasoning", "get_ring1t_reasoning_agent", {}),
    "security_agent": ("agents.security_agent", "get_security_agent", {"business_id": "default"}),
    "spec_agent": ("agents.spec_agent", "get_spec_agent", {"business_id": "default"}),
    "waltzrl_conversation_agent": ("agents.waltzrl_conversation_agent", "get_waltzrl_conversation_agent", {"business_id": "default"}),
    "waltzrl_feedback_agent": ("agents.waltzrl_feedback_agent", "get_waltzrl_feedback_agent", {"business_id": "default"}),
    "builder_agent": ("agents.builder_agent", "get_builder_agent", {"business_id": "default"}),
}

# Register factories
for name, (module_path, getter_name, kwargs) in _AGENT_DEFINITIONS.items():
    _register_agent_factory(name, _create_lazy_factory(module_path, getter_name, **kwargs))

# Special: Genesis Meta Agent
async def _get_genesis_meta():
    try:
        from infrastructure.genesis_meta_agent import GenesisMetaAgent
        return GenesisMetaAgent()
    except Exception as e:
        logger.warning(f"Failed to load GenesisMetaAgent: {e}")
        return _StubAgent("genesis_meta")

_register_agent_factory("genesis_meta", _get_genesis_meta)


def get_available_agents() -> list:
    """Return list of available agent names."""
    return sorted(AGENT_FACTORIES.keys())


async def get_agent_instance(agent_name: str) -> Any:
    """
    Get an instance of the specified agent.

    Args:
        agent_name: Name of the agent (e.g., "builder_agent_enhanced")

    Returns:
        Agent instance

    Raises:
        ValueError: If agent name not found
    """
    if agent_name not in AGENT_FACTORIES:
        available = ", ".join(get_available_agents())
        raise ValueError(f"Unknown agent: {agent_name}. Available: {available}")

    factory = AGENT_FACTORIES[agent_name]
    agent = await factory()

    # Initialize if needed
    if hasattr(agent, 'initialize'):
        try:
            await agent.initialize()
        except Exception as e:
            logger.debug(f"Agent initialization failed (may be ok): {e}")

    return agent


async def run_agent_task(
    agent_name: str,
    task: str,
    method: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Execute a task on the specified agent.

    Args:
        agent_name: Name of the agent
        task: Task description
        method: Optional specific method to call
        **kwargs: Additional method arguments

    Returns:
        Dict with result, status, etc.
    """
    result = {
        "agent": agent_name,
        "task": task,
        "status": "pending",
        "result": None,
        "error": None,
        "method_used": None,
    }

    try:
        agent = await get_agent_instance(agent_name)

        # Determine method
        if method:
            method_name = method
        elif hasattr(agent, 'route_task'):
            method_name = 'route_task'
        elif hasattr(agent, 'handle_task'):
            method_name = 'handle_task'
        elif hasattr(agent, 'run'):
            method_name = 'run'
        else:
            raise AttributeError(f"Agent {agent_name} has no callable method")

        result["method_used"] = method_name
        agent_method = getattr(agent, method_name)

        # Call the method
        if asyncio.iscoroutinefunction(agent_method):
            if method_name == 'route_task':
                output = await agent_method(task_description=task, **kwargs)
            else:
                output = await agent_method(task, **kwargs)
        else:
            if method_name == 'route_task':
                output = agent_method(task_description=task, **kwargs)
            else:
                output = agent_method(task, **kwargs)

        result["status"] = "success"
        result["result"] = output

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        result["status"] = "error"
        result["error"] = str(e)

    return result


async def main():
    parser = argparse.ArgumentParser(description="Run a Genesis agent with a task")
    parser.add_argument("--agent", "-a", help="Agent name")
    parser.add_argument("--task", "-t", help="Task description")
    parser.add_argument("--method", "-m", help="Specific method to call")
    parser.add_argument("--list-agents", "-l", action="store_true", help="List available agents")

    args = parser.parse_args()

    if args.list_agents:
        print("Available agents:")
        for name in get_available_agents():
            print(f"  - {name}")
        return

    if not args.agent or not args.task:
        parser.error("--agent and --task required (or use --list-agents)")

    result = await run_agent_task(args.agent, args.task, args.method)

    print(f"\nAgent: {result['agent']}")
    print(f"Method: {result['method_used']}")
    print(f"Status: {result['status']}")

    if result['status'] == 'success':
        print(f"Result: {result['result']}")
    else:
        print(f"Error: {result['error']}")


if __name__ == "__main__":
    asyncio.run(main())
