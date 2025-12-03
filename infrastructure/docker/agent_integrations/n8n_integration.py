"""
n8n Integration for HybridMarketingAgent and HybridSEOAgent

Provides no-code workflow automation for marketing and SEO tasks.

Features:
- Workflow creation and management
- Trigger-based automation
- API integrations
- Scheduled tasks
- Webhook handlers

Target Agents: HybridMarketingAgent, HybridSEOAgent
Docker Container: genesis-n8n
Port: 5678

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
class N8nConfig:
    """Configuration for n8n connection."""
    base_url: str = "http://localhost:5678"
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class N8nIntegration:
    """
    n8n integration for workflow automation.

    Provides methods for:
    - Workflow CRUD operations
    - Workflow execution
    - Webhook management
    - Credential management
    - Execution history

    Usage:
        n8n = N8nIntegration()

        # Create workflow for SEO monitoring
        workflow = await n8n.create_workflow(
            name="SEO Keyword Monitor",
            nodes=[...],
            connections={...}
        )

        # Execute workflow
        result = await n8n.execute_workflow(workflow["id"])

        # Get execution results
        executions = await n8n.get_executions(workflow["id"])
    """

    def __init__(self, config: Optional[N8nConfig] = None):
        """Initialize n8n integration."""
        self.config = config or N8nConfig()
        self._api_key = self.config.api_key or os.getenv("N8N_API_KEY")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            if self._api_key:
                self._session.headers["X-N8N-API-KEY"] = self._api_key
            self._session.headers["Content-Type"] = "application/json"
        return self._session

    def _api_url(self, path: str) -> str:
        """Build API URL."""
        return urljoin(self.config.base_url, f"/api/v1/{path.lstrip('/')}")

    def check_health(self) -> bool:
        """Check if n8n is healthy and accessible."""
        try:
            response = self.session.get(
                urljoin(self.config.base_url, "/healthz"),
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"n8n health check failed: {e}")
            return False

    # =========================================================================
    # WORKFLOW MANAGEMENT
    # =========================================================================

    async def create_workflow(
        self,
        name: str,
        nodes: List[Dict[str, Any]],
        connections: Dict[str, Any],
        settings: Optional[Dict[str, Any]] = None,
        active: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new workflow in n8n.

        Args:
            name: Workflow name
            nodes: List of node configurations
            connections: Node connection mappings
            settings: Workflow settings
            active: Whether to activate immediately

        Returns:
            Workflow data dict
        """
        payload = {
            "name": name,
            "nodes": nodes,
            "connections": connections,
            "settings": settings or {},
            "active": active
        }

        try:
            response = self.session.post(
                self._api_url("/workflows"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            workflow_data = response.json()
            logger.info(f"Created n8n workflow: {name}")
            return workflow_data

        except requests.RequestException as e:
            logger.error(f"Failed to create workflow {name}: {e}")
            raise

    async def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow by ID."""
        try:
            response = self.session.get(
                self._api_url(f"/workflows/{workflow_id}"),
                timeout=30
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get workflow {workflow_id}: {e}")
            return None

    async def list_workflows(
        self,
        active: Optional[bool] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List all workflows."""
        params = {"limit": limit}
        if active is not None:
            params["active"] = active

        try:
            response = self.session.get(
                self._api_url("/workflows"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logger.error(f"Failed to list workflows: {e}")
            return []

    async def update_workflow(
        self,
        workflow_id: str,
        **updates
    ) -> Dict[str, Any]:
        """Update workflow configuration."""
        try:
            response = self.session.patch(
                self._api_url(f"/workflows/{workflow_id}"),
                json=updates,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to update workflow {workflow_id}: {e}")
            raise

    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow."""
        try:
            response = self.session.delete(
                self._api_url(f"/workflows/{workflow_id}"),
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Deleted workflow: {workflow_id}")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to delete workflow {workflow_id}: {e}")
            return False

    async def activate_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Activate a workflow."""
        return await self.update_workflow(workflow_id, active=True)

    async def deactivate_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Deactivate a workflow."""
        return await self.update_workflow(workflow_id, active=False)

    # =========================================================================
    # WORKFLOW EXECUTION
    # =========================================================================

    async def execute_workflow(
        self,
        workflow_id: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a workflow immediately.

        Args:
            workflow_id: Workflow ID to execute
            data: Optional input data for the workflow

        Returns:
            Execution result dict
        """
        payload = {}
        if data:
            payload["data"] = data

        try:
            response = self.session.post(
                self._api_url(f"/workflows/{workflow_id}/execute"),
                json=payload,
                timeout=120  # Longer timeout for execution
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Executed workflow {workflow_id}")
            return result
        except requests.RequestException as e:
            logger.error(f"Failed to execute workflow {workflow_id}: {e}")
            raise

    async def get_executions(
        self,
        workflow_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get workflow execution history.

        Args:
            workflow_id: Filter by workflow
            status: Filter by status (running, success, error, waiting)
            limit: Maximum results

        Returns:
            List of execution records
        """
        params = {"limit": limit}
        if workflow_id:
            params["workflowId"] = workflow_id
        if status:
            params["status"] = status

        try:
            response = self.session.get(
                self._api_url("/executions"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get executions: {e}")
            return []

    async def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get specific execution details."""
        try:
            response = self.session.get(
                self._api_url(f"/executions/{execution_id}"),
                timeout=30
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get execution {execution_id}: {e}")
            return None

    # =========================================================================
    # WORKFLOW TEMPLATES
    # =========================================================================

    def get_seo_monitoring_template(self, keywords: List[str]) -> Dict[str, Any]:
        """
        Get a template workflow for SEO keyword monitoring.

        Args:
            keywords: List of keywords to monitor

        Returns:
            Workflow configuration dict
        """
        return {
            "name": "SEO Keyword Monitor",
            "nodes": [
                {
                    "name": "Schedule Trigger",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "position": [250, 300],
                    "parameters": {
                        "rule": {
                            "interval": [{"field": "hours", "value": 24}]
                        }
                    }
                },
                {
                    "name": "HTTP Request",
                    "type": "n8n-nodes-base.httpRequest",
                    "position": [450, 300],
                    "parameters": {
                        "url": "http://genesis-searxng:8080/search",
                        "method": "GET",
                        "queryParameters": {
                            "q": "={{ $json.keyword }}",
                            "format": "json"
                        }
                    }
                },
                {
                    "name": "Process Results",
                    "type": "n8n-nodes-base.code",
                    "position": [650, 300],
                    "parameters": {
                        "jsCode": """
const results = items[0].json;
return [{
    json: {
        keyword: results.keyword,
        ranking: results.results.findIndex(r => r.url.includes('yourdomain.com')),
        timestamp: new Date().toISOString()
    }
}];
"""
                    }
                }
            ],
            "connections": {
                "Schedule Trigger": {
                    "main": [[{"node": "HTTP Request", "type": "main", "index": 0}]]
                },
                "HTTP Request": {
                    "main": [[{"node": "Process Results", "type": "main", "index": 0}]]
                }
            },
            "settings": {
                "saveDataErrorExecution": "all",
                "saveDataSuccessExecution": "all"
            }
        }

    def get_marketing_email_template(self) -> Dict[str, Any]:
        """
        Get a template workflow for marketing email automation.

        Returns:
            Workflow configuration dict
        """
        return {
            "name": "Marketing Email Automation",
            "nodes": [
                {
                    "name": "Webhook Trigger",
                    "type": "n8n-nodes-base.webhook",
                    "position": [250, 300],
                    "parameters": {
                        "path": "new-subscriber",
                        "method": "POST"
                    }
                },
                {
                    "name": "Wait",
                    "type": "n8n-nodes-base.wait",
                    "position": [450, 300],
                    "parameters": {
                        "resume": "timeInterval",
                        "interval": 1,
                        "unit": "hours"
                    }
                },
                {
                    "name": "Send Email",
                    "type": "n8n-nodes-base.httpRequest",
                    "position": [650, 300],
                    "parameters": {
                        "url": "http://genesis-postal:5000/api/send",
                        "method": "POST",
                        "body": {
                            "to": "={{ $json.email }}",
                            "subject": "Welcome to Genesis!",
                            "html": "<h1>Welcome!</h1><p>Thank you for subscribing.</p>"
                        }
                    }
                }
            ],
            "connections": {
                "Webhook Trigger": {
                    "main": [[{"node": "Wait", "type": "main", "index": 0}]]
                },
                "Wait": {
                    "main": [[{"node": "Send Email", "type": "main", "index": 0}]]
                }
            }
        }


# Integration with Marketing/SEO Agents
def register_with_marketing_agent(agent: Any) -> None:
    """Register n8n integration with HybridMarketingAgent."""
    n8n = N8nIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("n8n_create_workflow", n8n.create_workflow)
        agent.register_tool("n8n_execute_workflow", n8n.execute_workflow)
        agent.register_tool("n8n_get_email_template", n8n.get_marketing_email_template)

    logger.info("n8n integration registered with HybridMarketingAgent")


def register_with_seo_agent(agent: Any) -> None:
    """Register n8n integration with HybridSEOAgent."""
    n8n = N8nIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("n8n_create_workflow", n8n.create_workflow)
        agent.register_tool("n8n_execute_workflow", n8n.execute_workflow)
        agent.register_tool("n8n_get_seo_template", n8n.get_seo_monitoring_template)

    logger.info("n8n integration registered with HybridSEOAgent")
