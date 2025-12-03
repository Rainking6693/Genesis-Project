"""
Genesis Docker Agent Integrations

This package provides integration stubs for connecting Genesis agents
to Docker-based tools for autonomous website generation.

Integrations:
- gitea_integration: HybridBuilderAgent <-> Gitea
- lago_integration: HybridBillingAgent <-> Lago
- n8n_integration: HybridMarketingAgent, HybridSEOAgent <-> n8n
- plausible_integration: HybridSEOAgent <-> Plausible Analytics
- searxng_integration: SEOAgent <-> SearXNG
- matomo_integration: SEOAgent <-> Matomo
- postal_integration: HybridMarketingAgent <-> Postal

Author: Genesis Project
Date: 2025-12-03
"""

from .gitea_integration import GiteaIntegration
from .lago_integration import LagoIntegration
from .n8n_integration import N8nIntegration
from .plausible_integration import PlausibleIntegration
from .searxng_integration import SearXNGIntegration
from .matomo_integration import MatomoIntegration
from .postal_integration import PostalIntegration

__all__ = [
    "GiteaIntegration",
    "LagoIntegration",
    "N8nIntegration",
    "PlausibleIntegration",
    "SearXNGIntegration",
    "MatomoIntegration",
    "PostalIntegration",
]
