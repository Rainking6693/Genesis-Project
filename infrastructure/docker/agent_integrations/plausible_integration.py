"""
Plausible Analytics Integration for HybridSEOAgent

Provides privacy-first website analytics (GDPR compliant).

Features:
- Site registration and management
- Visitor analytics
- Page view tracking
- Conversion goals
- Real-time stats

Target Agent: HybridSEOAgent
Docker Container: genesis-plausible
Port: 8001

Author: Genesis Project
Date: 2025-12-03
"""

import os
import logging
import requests
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


@dataclass
class PlausibleConfig:
    """Configuration for Plausible connection."""
    base_url: str = "http://localhost:8001"
    api_key: Optional[str] = None


class PlausibleIntegration:
    """
    Plausible Analytics integration for HybridSEOAgent.

    Provides methods for:
    - Site management
    - Analytics retrieval
    - Goal tracking
    - Real-time stats
    - Export functionality

    Usage:
        plausible = PlausibleIntegration()

        # Register new site
        site = await plausible.create_site("example.com")

        # Get analytics
        stats = await plausible.get_stats("example.com", period="7d")

        # Track goal conversions
        goals = await plausible.get_goals("example.com")
    """

    def __init__(self, config: Optional[PlausibleConfig] = None):
        """Initialize Plausible integration."""
        self.config = config or PlausibleConfig()
        self._api_key = self.config.api_key or os.getenv("PLAUSIBLE_API_KEY")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            if self._api_key:
                self._session.headers["Authorization"] = f"Bearer {self._api_key}"
        return self._session

    def _api_url(self, path: str) -> str:
        """Build API URL."""
        return urljoin(self.config.base_url, f"/api/v1/{path.lstrip('/')}")

    def check_health(self) -> bool:
        """Check if Plausible is healthy and accessible."""
        try:
            response = self.session.get(
                urljoin(self.config.base_url, "/api/health"),
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Plausible health check failed: {e}")
            return False

    # =========================================================================
    # SITE MANAGEMENT
    # =========================================================================

    async def create_site(
        self,
        domain: str,
        timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Create a new site in Plausible.

        Args:
            domain: Site domain (e.g., "example.com")
            timezone: Site timezone

        Returns:
            Site data dict
        """
        payload = {
            "domain": domain,
            "timezone": timezone
        }

        try:
            response = self.session.post(
                self._api_url("/sites"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            site_data = response.json()
            logger.info(f"Created Plausible site: {domain}")
            return site_data

        except requests.RequestException as e:
            logger.error(f"Failed to create site {domain}: {e}")
            raise

    async def get_site(self, domain: str) -> Optional[Dict[str, Any]]:
        """Get site information."""
        try:
            response = self.session.get(
                self._api_url(f"/sites/{domain}"),
                timeout=30
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get site {domain}: {e}")
            return None

    async def delete_site(self, domain: str) -> bool:
        """Delete a site."""
        try:
            response = self.session.delete(
                self._api_url(f"/sites/{domain}"),
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Deleted site: {domain}")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to delete site {domain}: {e}")
            return False

    # =========================================================================
    # ANALYTICS RETRIEVAL
    # =========================================================================

    async def get_stats(
        self,
        site_id: str,
        period: str = "30d",
        metrics: Optional[List[str]] = None,
        filters: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get aggregate stats for a site.

        Args:
            site_id: Site domain
            period: Time period (e.g., "day", "7d", "30d", "month", "6mo", "12mo")
            metrics: List of metrics (visitors, visits, pageviews, bounce_rate, etc.)
            filters: Filter expression

        Returns:
            Stats dict with requested metrics
        """
        metrics = metrics or ["visitors", "pageviews", "bounce_rate", "visit_duration"]

        params = {
            "site_id": site_id,
            "period": period,
            "metrics": ",".join(metrics)
        }

        if filters:
            params["filters"] = filters

        try:
            response = self.session.get(
                self._api_url("/stats/aggregate"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("results", {})
        except requests.RequestException as e:
            logger.error(f"Failed to get stats for {site_id}: {e}")
            return {}

    async def get_realtime_visitors(self, site_id: str) -> int:
        """Get current realtime visitor count."""
        try:
            response = self.session.get(
                self._api_url(f"/stats/realtime/visitors"),
                params={"site_id": site_id},
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get realtime visitors for {site_id}: {e}")
            return 0

    async def get_timeseries(
        self,
        site_id: str,
        period: str = "30d",
        metrics: Optional[List[str]] = None,
        interval: str = "date"
    ) -> List[Dict[str, Any]]:
        """
        Get time-series data for a site.

        Args:
            site_id: Site domain
            period: Time period
            metrics: List of metrics
            interval: Data interval (date, month)

        Returns:
            List of data points
        """
        metrics = metrics or ["visitors", "pageviews"]

        params = {
            "site_id": site_id,
            "period": period,
            "metrics": ",".join(metrics),
            "interval": interval
        }

        try:
            response = self.session.get(
                self._api_url("/stats/timeseries"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get timeseries for {site_id}: {e}")
            return []

    async def get_breakdown(
        self,
        site_id: str,
        property_name: str,
        period: str = "30d",
        metrics: Optional[List[str]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get breakdown by property (e.g., page, source, country).

        Args:
            site_id: Site domain
            property_name: Property to break down by (visit:source, visit:page, etc.)
            period: Time period
            metrics: List of metrics
            limit: Maximum results

        Returns:
            List of breakdown items
        """
        metrics = metrics or ["visitors", "pageviews"]

        params = {
            "site_id": site_id,
            "period": period,
            "property": property_name,
            "metrics": ",".join(metrics),
            "limit": limit
        }

        try:
            response = self.session.get(
                self._api_url("/stats/breakdown"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get breakdown for {site_id}: {e}")
            return []

    # =========================================================================
    # GOAL MANAGEMENT
    # =========================================================================

    async def create_goal(
        self,
        site_id: str,
        goal_type: str,
        goal_value: str
    ) -> Dict[str, Any]:
        """
        Create a conversion goal.

        Args:
            site_id: Site domain
            goal_type: "event" or "page"
            goal_value: Event name or page path

        Returns:
            Goal data dict
        """
        payload = {
            "site_id": site_id,
            "goal_type": goal_type,
        }

        if goal_type == "event":
            payload["event_name"] = goal_value
        else:
            payload["page_path"] = goal_value

        try:
            response = self.session.put(
                self._api_url("/sites/goals"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to create goal: {e}")
            raise

    async def get_goals(self, site_id: str) -> List[Dict[str, Any]]:
        """List all goals for a site."""
        try:
            response = self.session.get(
                self._api_url(f"/sites/{site_id}/goals"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("goals", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get goals for {site_id}: {e}")
            return []

    async def delete_goal(self, site_id: str, goal_id: int) -> bool:
        """Delete a goal."""
        try:
            response = self.session.delete(
                self._api_url(f"/sites/{site_id}/goals/{goal_id}"),
                timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to delete goal: {e}")
            return False

    # =========================================================================
    # TRACKING SCRIPT
    # =========================================================================

    def get_tracking_script(self, site_id: str) -> str:
        """
        Get the Plausible tracking script for a site.

        Args:
            site_id: Site domain

        Returns:
            HTML script tag
        """
        return f'''<script defer data-domain="{site_id}" src="{self.config.base_url}/js/script.js"></script>'''

    # =========================================================================
    # SEO METRICS
    # =========================================================================

    async def get_seo_metrics(self, site_id: str, period: str = "30d") -> Dict[str, Any]:
        """
        Get SEO-relevant metrics for a site.

        Combines multiple API calls to provide a comprehensive SEO view.

        Args:
            site_id: Site domain
            period: Time period

        Returns:
            SEO metrics dict
        """
        # Get basic stats
        stats = await self.get_stats(
            site_id,
            period=period,
            metrics=["visitors", "pageviews", "bounce_rate", "visit_duration"]
        )

        # Get top pages
        top_pages = await self.get_breakdown(
            site_id,
            property_name="event:page",
            period=period,
            limit=10
        )

        # Get traffic sources
        sources = await self.get_breakdown(
            site_id,
            property_name="visit:source",
            period=period,
            limit=10
        )

        # Get countries
        countries = await self.get_breakdown(
            site_id,
            property_name="visit:country",
            period=period,
            limit=10
        )

        return {
            "summary": stats,
            "top_pages": top_pages,
            "traffic_sources": sources,
            "top_countries": countries,
            "period": period,
            "site_id": site_id
        }


# Integration with SEO Agent
def register_with_seo_agent(agent: Any) -> None:
    """Register Plausible integration with HybridSEOAgent."""
    plausible = PlausibleIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("plausible_create_site", plausible.create_site)
        agent.register_tool("plausible_get_stats", plausible.get_stats)
        agent.register_tool("plausible_get_seo_metrics", plausible.get_seo_metrics)
        agent.register_tool("plausible_get_tracking_script", plausible.get_tracking_script)

    logger.info("Plausible integration registered with HybridSEOAgent")
