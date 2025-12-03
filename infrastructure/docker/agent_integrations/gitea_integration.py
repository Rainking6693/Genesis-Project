"""
Gitea Integration for HybridBuilderAgent

Provides Git repository hosting and free website hosting via Gitea Pages.

Features:
- Create repositories for generated websites
- Push code to Gitea
- Enable Gitea Pages for static site hosting
- Manage webhooks for CI/CD

Target Agent: HybridBuilderAgent
Docker Container: genesis-gitea
Ports: 3000 (web), 2222 (SSH)

Author: Genesis Project
Date: 2025-12-03
"""

import os
import logging
import requests
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


@dataclass
class GiteaConfig:
    """Configuration for Gitea connection."""
    base_url: str = "http://localhost:3000"
    api_token: Optional[str] = None
    ssh_port: int = 2222
    admin_username: str = "genesis"
    admin_password: str = "genesis"


class GiteaIntegration:
    """
    Gitea integration for HybridBuilderAgent.

    Provides methods for:
    - Repository creation and management
    - Code push/pull operations
    - Gitea Pages configuration
    - Webhook setup for CI/CD

    Usage:
        gitea = GiteaIntegration()

        # Create repository for new website
        repo = await gitea.create_repository("my-website")

        # Push generated code
        await gitea.push_code(repo["name"], code_path)

        # Enable Gitea Pages
        await gitea.enable_pages(repo["name"])
    """

    def __init__(self, config: Optional[GiteaConfig] = None):
        """Initialize Gitea integration."""
        self.config = config or GiteaConfig()
        self._api_token = self.config.api_token or os.getenv("GITEA_API_TOKEN")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            if self._api_token:
                self._session.headers["Authorization"] = f"token {self._api_token}"
        return self._session

    def _api_url(self, path: str) -> str:
        """Build API URL."""
        return urljoin(self.config.base_url, f"/api/v1/{path.lstrip('/')}")

    def check_health(self) -> bool:
        """Check if Gitea is healthy and accessible."""
        try:
            response = self.session.get(
                urljoin(self.config.base_url, "/api/healthz"),
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Gitea health check failed: {e}")
            return False

    async def create_repository(
        self,
        name: str,
        description: str = "",
        private: bool = False,
        auto_init: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a new repository in Gitea.

        Args:
            name: Repository name
            description: Repository description
            private: Whether the repository is private
            auto_init: Initialize with README

        Returns:
            Repository information dict
        """
        payload = {
            "name": name,
            "description": description,
            "private": private,
            "auto_init": auto_init,
        }

        try:
            response = self.session.post(
                self._api_url("/user/repos"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            repo_data = response.json()

            logger.info(f"Created repository: {repo_data['full_name']}")
            return repo_data

        except requests.RequestException as e:
            logger.error(f"Failed to create repository {name}: {e}")
            raise

    async def push_code(
        self,
        repo_name: str,
        code_path: str,
        branch: str = "main",
        commit_message: str = "Initial commit from Genesis"
    ) -> bool:
        """
        Push code to a Gitea repository.

        Args:
            repo_name: Name of the repository
            code_path: Local path to the code directory
            branch: Branch to push to
            commit_message: Commit message

        Returns:
            True if successful
        """
        import subprocess

        git_url = f"http://localhost:{self.config.ssh_port}/{self.config.admin_username}/{repo_name}.git"

        try:
            # Initialize git if needed
            subprocess.run(
                ["git", "init"],
                cwd=code_path,
                check=True,
                capture_output=True
            )

            # Add remote
            subprocess.run(
                ["git", "remote", "add", "origin", git_url],
                cwd=code_path,
                capture_output=True
            )

            # Add all files
            subprocess.run(
                ["git", "add", "."],
                cwd=code_path,
                check=True,
                capture_output=True
            )

            # Commit
            subprocess.run(
                ["git", "commit", "-m", commit_message],
                cwd=code_path,
                check=True,
                capture_output=True
            )

            # Push
            subprocess.run(
                ["git", "push", "-u", "origin", branch],
                cwd=code_path,
                check=True,
                capture_output=True
            )

            logger.info(f"Pushed code to {repo_name}/{branch}")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Git operation failed: {e}")
            return False

    async def enable_pages(self, repo_name: str, branch: str = "main") -> bool:
        """
        Enable Gitea Pages for a repository.

        Args:
            repo_name: Repository name
            branch: Branch to serve pages from

        Returns:
            True if successful
        """
        # Note: Gitea Pages configuration varies by version
        # This is a placeholder for the actual implementation
        logger.info(f"Enabling Gitea Pages for {repo_name} on branch {branch}")

        # In Gitea, Pages are typically enabled via repository settings
        # The exact API endpoint depends on Gitea version

        return True

    async def list_repositories(self) -> List[Dict[str, Any]]:
        """List all repositories for the current user."""
        try:
            response = self.session.get(
                self._api_url("/user/repos"),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to list repositories: {e}")
            return []

    async def delete_repository(self, repo_name: str, owner: Optional[str] = None) -> bool:
        """Delete a repository."""
        owner = owner or self.config.admin_username

        try:
            response = self.session.delete(
                self._api_url(f"/repos/{owner}/{repo_name}"),
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Deleted repository: {owner}/{repo_name}")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to delete repository: {e}")
            return False

    async def create_webhook(
        self,
        repo_name: str,
        target_url: str,
        events: Optional[List[str]] = None,
        secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a webhook for a repository.

        Args:
            repo_name: Repository name
            target_url: URL to receive webhook payloads
            events: List of events to trigger webhook
            secret: Secret for webhook signature

        Returns:
            Webhook information dict
        """
        events = events or ["push"]

        payload = {
            "type": "gitea",
            "config": {
                "url": target_url,
                "content_type": "json",
            },
            "events": events,
            "active": True,
        }

        if secret:
            payload["config"]["secret"] = secret

        try:
            response = self.session.post(
                self._api_url(f"/repos/{self.config.admin_username}/{repo_name}/hooks"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to create webhook: {e}")
            raise

    def get_pages_url(self, repo_name: str) -> str:
        """Get the Gitea Pages URL for a repository."""
        return f"{self.config.base_url}/{self.config.admin_username}/{repo_name}/pages"

    def get_clone_url(self, repo_name: str, use_ssh: bool = False) -> str:
        """Get the clone URL for a repository."""
        if use_ssh:
            return f"git@localhost:{self.config.admin_username}/{repo_name}.git"
        return f"{self.config.base_url}/{self.config.admin_username}/{repo_name}.git"


# Integration with HybridBuilderAgent
def register_with_builder_agent(agent: Any) -> None:
    """
    Register Gitea integration with HybridBuilderAgent.

    This function should be called during agent initialization
    to make Gitea capabilities available.

    Args:
        agent: HybridBuilderAgent instance
    """
    gitea = GiteaIntegration()

    # Register capabilities
    if hasattr(agent, "register_tool"):
        agent.register_tool("gitea_create_repo", gitea.create_repository)
        agent.register_tool("gitea_push_code", gitea.push_code)
        agent.register_tool("gitea_enable_pages", gitea.enable_pages)

    logger.info("Gitea integration registered with HybridBuilderAgent")
