"""
Genesis Tools Integration Layer

This module provides unified access to external tools and frameworks
integrated into the Genesis autonomous business operating system.

Available Tools:
- Playwright: Browser automation and testing (Integration #74 VOIX)
- CrewAI: Multi-agent orchestration framework (Tournament Winner)

Usage:
    from infrastructure.tools import get_playwright_client, get_crewai_orchestrator
"""

from .playwright_client import get_playwright_client, PlaywrightClient
from .crewai_orchestrator import get_crewai_orchestrator, CrewAIOrchestrator

__all__ = [
    'get_playwright_client',
    'PlaywrightClient',
    'get_crewai_orchestrator',
    'CrewAIOrchestrator',
]
