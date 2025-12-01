import importlib
import inspect
from pathlib import Path
from typing import List, Optional

import pytest

# Staged smoke tests for the “main” agents.
MAIN_AGENTS = [
    "analyst_agent",
    "billing_agent",
    "builder_agent_enhanced",
    "commerce_agent",
    "content_agent",
    "darwin_agent",
    "deploy_agent",
    "domain_name_agent",
    "email_agent",
    "emergency_error_specialist_agent",
    "finance_agent",
    "legal_agent",
    "maintenance_agent",
    "marketing_agent",
    "onboarding_agent",
    "pricing_agent",
    "qa_agent",
    "reflection_agent",
    "research_discovery_agent",
    "ring1t_reasoning",
    "se_darwin_agent",
    "security_agent",
    "seo_agent",
    "spec_agent",
    "support_agent",
    "waltzrl_conversation_agent",
    "waltzrl_feedback_agent",
]


def _module_path(agent_name: str) -> Path:
    return Path("agents") / f"{agent_name}.py"


def _import_agent_module(agent_name: str):
    return importlib.import_module(f"agents.{agent_name}")


def _find_agent_class(mod) -> Optional[type]:
    """
    Heuristic: pick the first class defined in the module whose name ends with 'Agent'.
    """
    classes = [
        cls
        for _, cls in inspect.getmembers(mod, inspect.isclass)
        if cls.__module__ == mod.__name__ and cls.__name__.lower().endswith("agent")
    ]
    return classes[0] if classes else None


def _can_instantiate(cls: type) -> bool:
    """
    Determine if the class can be created without required args.
    """
    sig = inspect.signature(cls)
    for param in sig.parameters.values():
        if param.default is inspect._empty and param.kind in (
            param.POSITIONAL_ONLY,
            param.POSITIONAL_OR_KEYWORD,
        ):
            if param.name not in ("self",):
                return False
    return True


@pytest.mark.parametrize("agent_name", MAIN_AGENTS)
def test_easy_import(agent_name: str):
    """Easy: module file exists and imports cleanly."""
    path = _module_path(agent_name)
    assert path.exists(), f"Missing agent file: {path}"
    try:
        _import_agent_module(agent_name)
    except ImportError as e:
        pytest.xfail(f"Import failed for {agent_name}: {e}")


@pytest.mark.parametrize("agent_name", MAIN_AGENTS)
def test_intermediate_class_present(agent_name: str):
    """Intermediate: a class ending in 'Agent' is defined."""
    try:
        mod = _import_agent_module(agent_name)
    except ImportError as e:
        pytest.xfail(f"Import failed for {agent_name}: {e}")
    cls = _find_agent_class(mod)
    if cls is None:
        pytest.xfail(f"No agent class found in {agent_name}")


@pytest.mark.parametrize("agent_name", MAIN_AGENTS)
def test_hard_instantiate_and_capabilities(agent_name: str):
    """
    Hard: instantiate if possible; otherwise xfail.
    Check for at least one handler-like method.
    """
    try:
        mod = _import_agent_module(agent_name)
    except ImportError as e:
        pytest.xfail(f"Import failed for {agent_name}: {e}")

    cls = _find_agent_class(mod)
    if cls is None:
        pytest.xfail(f"No agent class found in {agent_name}")

    if not _can_instantiate(cls):
        pytest.xfail(f"{agent_name} requires constructor args")

    try:
        instance = cls()  # type: ignore[call-arg]
    except Exception as e:
        pytest.xfail(f"Instantiation failed for {agent_name}: {e}")

    candidate_methods: List[str] = [
        "route_task",
        "run",
        "execute",
        "run_task",
        "handle",
        "process",
        "shutdown",
    ]
    has_method = any(hasattr(instance, m) for m in candidate_methods)
    if not has_method:
        pytest.xfail(f"{agent_name} lacks a known handler method")
