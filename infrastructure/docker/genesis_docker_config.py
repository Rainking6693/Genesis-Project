"""
Genesis Docker Tools Configuration

This module provides configuration and management for all Docker-based tools
used in the Genesis autonomous website generation pipeline.

Tools Covered:
- Gitea: Code storage & free website hosting (HybridBuilderAgent)
- Coolify: Self-hosted deployment platform (HybridDeployAgent)
- Lago: Open-source billing (HybridBillingAgent)
- PostgreSQL/Supabase: Database services (HybridBuilderAgent, HybridBillingAgent)
- Postal: Email sending (HybridMarketingAgent)
- n8n: Workflow automation (HybridMarketingAgent, HybridSEOAgent)
- Plausible: Privacy-first analytics (HybridSEOAgent)
- SearXNG: Meta-search for SEO (SEOAgent)
- Matomo: Full analytics suite (SEOAgent)

Author: Genesis Project
Date: 2025-12-03
"""

import os
import subprocess
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class DockerServiceStatus(Enum):
    """Status of a Docker service."""
    UNKNOWN = "unknown"
    NOT_INSTALLED = "not_installed"
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"


@dataclass
class DockerToolConfig:
    """Configuration for a single Docker-based tool."""
    name: str
    image: str
    container_name: str
    target_agents: List[str]
    purpose: str
    ports: Dict[str, int]
    environment: Dict[str, str] = field(default_factory=dict)
    volumes: List[str] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    requires_api_keys: List[str] = field(default_factory=list)
    health_endpoint: Optional[str] = None
    documentation_url: Optional[str] = None


# =============================================================================
# DOCKER TOOL CONFIGURATIONS
# =============================================================================

GENESIS_DOCKER_TOOLS: Dict[str, DockerToolConfig] = {
    "gitea": DockerToolConfig(
        name="Gitea",
        image="gitea/gitea:latest",
        container_name="genesis-gitea",
        target_agents=["HybridBuilderAgent"],
        purpose="Code storage & free website hosting via Gitea Pages",
        ports={"web": 3000, "ssh": 2222},
        environment={
            "GITEA__server__ROOT_URL": "http://localhost:3000",
            "GITEA__server__HTTP_PORT": "3000",
            "GITEA__service__DISABLE_REGISTRATION": "false",
        },
        health_endpoint="http://localhost:3000/api/healthz",
        documentation_url="https://docs.gitea.io/",
    ),

    "coolify": DockerToolConfig(
        name="Coolify",
        image="coollabsio/coolify:latest",
        container_name="genesis-coolify",
        target_agents=["HybridDeployAgent"],
        purpose="Self-hosted PaaS for instant deployment & monitoring",
        ports={"web": 8000, "api": 3001},
        environment={
            "COOLIFY_SECRET_KEY": "${COOLIFY_SECRET_KEY}",
            "COOLIFY_DATABASE_URL": "postgresql://coolify:coolify@coolify-db:5432/coolify",
        },
        requires_api_keys=["COOLIFY_SECRET_KEY"],
        health_endpoint="http://localhost:8000/api/health",
        documentation_url="https://coolify.io/docs",
    ),

    "lago": DockerToolConfig(
        name="Lago",
        image="getlago/lago-api:latest",
        container_name="genesis-lago-api",
        target_agents=["HybridBillingAgent"],
        purpose="Open-source usage-based billing (Stripe alternative)",
        ports={"api": 3002, "frontend": 8080},
        environment={
            "DATABASE_URL": "postgresql://lago:lago@lago-postgres:5432/lago",
            "REDIS_URL": "redis://lago-redis:6379",
        },
        depends_on=["lago-postgres", "lago-redis"],
        health_endpoint="http://localhost:3002/health",
        documentation_url="https://docs.getlago.com/",
    ),

    "supabase-postgres": DockerToolConfig(
        name="Supabase PostgreSQL",
        image="supabase/postgres:latest",
        container_name="genesis-supabase-postgres",
        target_agents=["HybridBuilderAgent", "HybridBillingAgent"],
        purpose="PostgreSQL with pgvector, realtime, and REST API",
        ports={"postgres": 5432},
        environment={
            "POSTGRES_PASSWORD": "${SUPABASE_POSTGRES_PASSWORD}",
            "POSTGRES_USER": "postgres",
            "POSTGRES_DB": "postgres",
        },
        requires_api_keys=["SUPABASE_POSTGRES_PASSWORD"],
        health_endpoint=None,  # Uses pg_isready
        documentation_url="https://supabase.com/docs",
    ),

    "postal": DockerToolConfig(
        name="Postal",
        image="postalserver/postal:latest",
        container_name="genesis-postal",
        target_agents=["HybridMarketingAgent"],
        purpose="Self-hosted email sending server",
        ports={"smtp": 25, "web": 5000},
        environment={
            "POSTAL_WEB_HOST": "localhost",
            "POSTAL_WEB_PROTOCOL": "http",
        },
        documentation_url="https://docs.postalserver.io/",
    ),

    "n8n": DockerToolConfig(
        name="n8n",
        image="n8nio/n8n:latest",
        container_name="genesis-n8n",
        target_agents=["HybridMarketingAgent", "HybridSEOAgent"],
        purpose="No-code workflow automation for marketing & SEO",
        ports={"web": 5678},
        environment={
            "N8N_BASIC_AUTH_ACTIVE": "true",
            "N8N_BASIC_AUTH_USER": "${N8N_USER}",
            "N8N_BASIC_AUTH_PASSWORD": "${N8N_PASSWORD}",
        },
        requires_api_keys=["N8N_USER", "N8N_PASSWORD"],
        health_endpoint="http://localhost:5678/healthz",
        documentation_url="https://docs.n8n.io/",
    ),

    "plausible": DockerToolConfig(
        name="Plausible Analytics",
        image="plausible/analytics:latest",
        container_name="genesis-plausible",
        target_agents=["HybridSEOAgent"],
        purpose="Privacy-first website analytics (GDPR compliant)",
        ports={"web": 8001},
        environment={
            "BASE_URL": "http://localhost:8001",
            "SECRET_KEY_BASE": "${PLAUSIBLE_SECRET_KEY}",
        },
        depends_on=["plausible-postgres", "plausible-clickhouse"],
        requires_api_keys=["PLAUSIBLE_SECRET_KEY"],
        health_endpoint="http://localhost:8001/api/health",
        documentation_url="https://plausible.io/docs",
    ),

    "searxng": DockerToolConfig(
        name="SearXNG",
        image="searxng/searxng:latest",
        container_name="genesis-searxng",
        target_agents=["SEOAgent"],
        purpose="Privacy-respecting meta-search for keyword research",
        ports={"web": 8888},
        environment={
            "SEARXNG_BASE_URL": "http://localhost:8888",
            "SEARXNG_SECRET": "${SEARXNG_SECRET}",
        },
        requires_api_keys=["SEARXNG_SECRET"],
        health_endpoint="http://localhost:8888/",
        documentation_url="https://docs.searxng.org/",
    ),

    "matomo": DockerToolConfig(
        name="Matomo",
        image="matomo:latest",
        container_name="genesis-matomo",
        target_agents=["SEOAgent"],
        purpose="Full-featured analytics with heatmaps & conversion tracking",
        ports={"web": 8082},
        environment={
            "MATOMO_DATABASE_HOST": "matomo-mariadb",
            "MATOMO_DATABASE_USERNAME": "matomo",
            "MATOMO_DATABASE_PASSWORD": "matomo",
        },
        depends_on=["matomo-mariadb"],
        health_endpoint="http://localhost:8082/",
        documentation_url="https://matomo.org/docs/",
    ),
}


# =============================================================================
# EXTERNAL API KEYS REQUIRED
# =============================================================================

EXTERNAL_API_KEYS = {
    "cloudflare": {
        "env_var": "CLOUDFLARE_API_KEY",
        "description": "Cloudflare API key for DNS management and CDN",
        "used_by": ["HybridDeployAgent", "HybridBuilderAgent"],
        "documentation": "https://developers.cloudflare.com/api/",
        "required": False,  # Optional but recommended
    },
    "porkbun": {
        "env_vars": ["PORKBUN_API_KEY", "PORKBUN_SECRET_KEY"],
        "description": "Porkbun domain registrar API for domain purchases",
        "used_by": ["DomainNameAgent"],
        "documentation": "https://porkbun.com/api/json/v3/documentation",
        "required": False,  # Optional - alternative to Name.com
    },
}


# =============================================================================
# DOCKER MANAGEMENT CLASS
# =============================================================================

class GenesisDockerManager:
    """
    Manager class for Genesis Docker tools.

    Provides methods to:
    - Check Docker availability
    - Pull required images
    - Start/stop services
    - Check service health
    - Get connection strings for agents
    """

    def __init__(self, compose_file: Optional[str] = None):
        """Initialize the Docker manager."""
        self.compose_file = compose_file or str(
            Path(__file__).parent / "docker-compose.genesis-tools.yml"
        )
        self.tools = GENESIS_DOCKER_TOOLS
        self._docker_available: Optional[bool] = None

    def check_docker_available(self) -> bool:
        """Check if Docker is available on the system."""
        if self._docker_available is not None:
            return self._docker_available

        try:
            result = subprocess.run(
                ["docker", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            self._docker_available = result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            self._docker_available = False

        return self._docker_available

    def check_docker_daemon(self) -> bool:
        """Check if Docker daemon is running."""
        try:
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def pull_image(self, tool_name: str) -> bool:
        """Pull Docker image for a specific tool."""
        if tool_name not in self.tools:
            logger.error(f"Unknown tool: {tool_name}")
            return False

        tool = self.tools[tool_name]
        logger.info(f"Pulling image: {tool.image}")

        try:
            result = subprocess.run(
                ["docker", "pull", tool.image],
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout for large images
            )
            if result.returncode == 0:
                logger.info(f"Successfully pulled {tool.image}")
                return True
            else:
                logger.error(f"Failed to pull {tool.image}: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout pulling {tool.image}")
            return False

    def pull_all_images(self) -> Dict[str, bool]:
        """Pull all Docker images for Genesis tools."""
        results = {}
        for tool_name in self.tools:
            results[tool_name] = self.pull_image(tool_name)
        return results

    def start_service(self, tool_name: str) -> bool:
        """Start a specific Docker service using compose."""
        if tool_name not in self.tools:
            logger.error(f"Unknown tool: {tool_name}")
            return False

        try:
            result = subprocess.run(
                ["docker-compose", "-f", self.compose_file, "up", "-d", tool_name],
                capture_output=True,
                text=True,
                timeout=120
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"Failed to start {tool_name}: {e}")
            return False

    def stop_service(self, tool_name: str) -> bool:
        """Stop a specific Docker service."""
        if tool_name not in self.tools:
            logger.error(f"Unknown tool: {tool_name}")
            return False

        try:
            result = subprocess.run(
                ["docker-compose", "-f", self.compose_file, "stop", tool_name],
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"Failed to stop {tool_name}: {e}")
            return False

    def get_service_status(self, tool_name: str) -> DockerServiceStatus:
        """Get the current status of a Docker service."""
        if tool_name not in self.tools:
            return DockerServiceStatus.UNKNOWN

        tool = self.tools[tool_name]

        try:
            result = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Status}}", tool.container_name],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                return DockerServiceStatus.NOT_INSTALLED

            status = result.stdout.strip()
            status_map = {
                "running": DockerServiceStatus.RUNNING,
                "exited": DockerServiceStatus.STOPPED,
                "created": DockerServiceStatus.STOPPED,
                "restarting": DockerServiceStatus.STARTING,
            }
            return status_map.get(status, DockerServiceStatus.UNKNOWN)

        except (subprocess.TimeoutExpired, FileNotFoundError):
            return DockerServiceStatus.UNKNOWN

    def get_connection_info(self, tool_name: str) -> Dict[str, Any]:
        """Get connection information for a tool (for agent integration)."""
        if tool_name not in self.tools:
            return {}

        tool = self.tools[tool_name]

        return {
            "name": tool.name,
            "container": tool.container_name,
            "ports": tool.ports,
            "health_endpoint": tool.health_endpoint,
            "target_agents": tool.target_agents,
            "status": self.get_service_status(tool_name).value,
        }

    def get_tools_for_agent(self, agent_name: str) -> List[str]:
        """Get list of tools that an agent should use."""
        tools = []
        for tool_name, config in self.tools.items():
            if agent_name in config.target_agents:
                tools.append(tool_name)
        return tools

    def get_all_required_env_vars(self) -> List[str]:
        """Get all environment variables required by Docker tools."""
        env_vars = set()
        for tool in self.tools.values():
            env_vars.update(tool.requires_api_keys)

        # Add external API keys
        for api_config in EXTERNAL_API_KEYS.values():
            if "env_var" in api_config:
                env_vars.add(api_config["env_var"])
            if "env_vars" in api_config:
                env_vars.update(api_config["env_vars"])

        return sorted(list(env_vars))


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_docker_manager() -> GenesisDockerManager:
    """Get a singleton instance of the Docker manager."""
    if not hasattr(get_docker_manager, "_instance"):
        get_docker_manager._instance = GenesisDockerManager()
    return get_docker_manager._instance


def check_docker_ready() -> bool:
    """Quick check if Docker is ready to use."""
    manager = get_docker_manager()
    return manager.check_docker_available() and manager.check_docker_daemon()


def get_tool_config(tool_name: str) -> Optional[DockerToolConfig]:
    """Get configuration for a specific tool."""
    return GENESIS_DOCKER_TOOLS.get(tool_name)


if __name__ == "__main__":
    # Self-test when run directly
    logging.basicConfig(level=logging.INFO)

    manager = GenesisDockerManager()

    print("=== Genesis Docker Tools Configuration ===\n")

    # Check Docker availability
    docker_available = manager.check_docker_available()
    docker_running = manager.check_docker_daemon() if docker_available else False

    print(f"Docker installed: {docker_available}")
    print(f"Docker daemon running: {docker_running}")
    print()

    # List all tools
    print("Configured Tools:")
    print("-" * 60)
    for name, config in GENESIS_DOCKER_TOOLS.items():
        print(f"\n{config.name} ({name})")
        print(f"  Image: {config.image}")
        print(f"  Agents: {', '.join(config.target_agents)}")
        print(f"  Purpose: {config.purpose}")
        print(f"  Ports: {config.ports}")

    print("\n" + "=" * 60)
    print("Required Environment Variables:")
    for var in manager.get_all_required_env_vars():
        print(f"  - {var}")
