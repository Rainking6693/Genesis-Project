"""
Matomo Integration for SEOAgent

Provides full-featured analytics with heatmaps and conversion tracking.

Features:
- Website analytics
- Heatmaps and session recordings
- Conversion funnels
- A/B testing
- SEO reports

Target Agent: SEOAgent
Docker Container: genesis-matomo
Port: 8082

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
class MatomoConfig:
    """Configuration for Matomo connection."""
    base_url: str = "http://localhost:8082"
    auth_token: Optional[str] = None
    site_id: int = 1


class MatomoIntegration:
    """
    Matomo integration for SEOAgent.

    Provides methods for:
    - Site management
    - Visitor analytics
    - SEO reports
    - Goal tracking
    - Heatmaps (Premium)

    Usage:
        matomo = MatomoIntegration()

        # Get site stats
        stats = await matomo.get_visits("today")

        # Get SEO keywords
        keywords = await matomo.get_seo_keywords("month")

        # Track conversion goal
        await matomo.add_goal("Signup", "url", "thank-you")
    """

    def __init__(self, config: Optional[MatomoConfig] = None):
        """Initialize Matomo integration."""
        self.config = config or MatomoConfig()
        self._auth_token = self.config.auth_token or os.getenv("MATOMO_AUTH_TOKEN")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
        return self._session

    def _api_params(self, method: str, **kwargs) -> Dict[str, Any]:
        """Build API request parameters."""
        params = {
            "module": "API",
            "method": method,
            "idSite": kwargs.pop("site_id", self.config.site_id),
            "format": "json",
        }

        if self._auth_token:
            params["token_auth"] = self._auth_token

        params.update(kwargs)
        return params

    def check_health(self) -> bool:
        """Check if Matomo is healthy and accessible."""
        try:
            response = self.session.get(
                self.config.base_url,
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Matomo health check failed: {e}")
            return False

    # =========================================================================
    # SITE MANAGEMENT
    # =========================================================================

    async def add_site(
        self,
        site_name: str,
        urls: List[str],
        timezone: str = "UTC",
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Add a new site to Matomo.

        Args:
            site_name: Name of the site
            urls: List of site URLs
            timezone: Site timezone
            currency: Site currency

        Returns:
            Site creation result
        """
        params = self._api_params(
            "SitesManager.addSite",
            siteName=site_name,
            urls=",".join(urls),
            timezone=timezone,
            currency=currency
        )

        try:
            response = self.session.post(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Added Matomo site: {site_name}")
            return {"site_id": result.get("value"), "name": site_name}

        except requests.RequestException as e:
            logger.error(f"Failed to add site {site_name}: {e}")
            raise

    async def get_sites(self) -> List[Dict[str, Any]]:
        """Get all sites in Matomo."""
        params = self._api_params("SitesManager.getAllSites")

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get sites: {e}")
            return []

    # =========================================================================
    # VISITOR ANALYTICS
    # =========================================================================

    async def get_visits(
        self,
        period: str = "day",
        date: str = "today",
        site_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get visit statistics.

        Args:
            period: Period (day, week, month, year)
            date: Date or date range
            site_id: Site ID (uses default if not specified)

        Returns:
            Visit statistics dict
        """
        params = self._api_params(
            "VisitsSummary.get",
            period=period,
            date=date,
            site_id=site_id
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get visits: {e}")
            return {}

    async def get_visit_evolution(
        self,
        period: str = "day",
        date: str = "last30",
        site_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get visit evolution over time.

        Args:
            period: Period (day, week, month)
            date: Date range (e.g., "last30", "previous30")
            site_id: Site ID

        Returns:
            List of visit data points
        """
        params = self._api_params(
            "VisitsSummary.get",
            period=period,
            date=date,
            site_id=site_id
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            # Convert to list format
            if isinstance(data, dict):
                return [{"date": k, **v} for k, v in data.items()]
            return data
        except requests.RequestException as e:
            logger.error(f"Failed to get visit evolution: {e}")
            return []

    async def get_page_urls(
        self,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get page URL analytics.

        Args:
            period: Period
            date: Date
            site_id: Site ID
            limit: Maximum results

        Returns:
            List of page analytics
        """
        params = self._api_params(
            "Actions.getPageUrls",
            period=period,
            date=date,
            site_id=site_id,
            filter_limit=limit,
            expanded=1
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get page URLs: {e}")
            return []

    # =========================================================================
    # SEO REPORTS
    # =========================================================================

    async def get_seo_keywords(
        self,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get SEO keywords from search engines.

        Args:
            period: Period
            date: Date
            site_id: Site ID
            limit: Maximum results

        Returns:
            List of keyword data
        """
        params = self._api_params(
            "Referrers.getKeywords",
            period=period,
            date=date,
            site_id=site_id,
            filter_limit=limit
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get SEO keywords: {e}")
            return []

    async def get_search_engines(
        self,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get traffic from search engines.

        Args:
            period: Period
            date: Date
            site_id: Site ID

        Returns:
            List of search engine data
        """
        params = self._api_params(
            "Referrers.getSearchEngines",
            period=period,
            date=date,
            site_id=site_id
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get search engines: {e}")
            return []

    async def get_referrers(
        self,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get referrer websites.

        Args:
            period: Period
            date: Date
            site_id: Site ID
            limit: Maximum results

        Returns:
            List of referrer data
        """
        params = self._api_params(
            "Referrers.getWebsites",
            period=period,
            date=date,
            site_id=site_id,
            filter_limit=limit
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get referrers: {e}")
            return []

    # =========================================================================
    # GOAL MANAGEMENT
    # =========================================================================

    async def add_goal(
        self,
        name: str,
        match_attribute: str,
        pattern: str,
        pattern_type: str = "contains",
        revenue: float = 0,
        site_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Add a conversion goal.

        Args:
            name: Goal name
            match_attribute: What to match (url, title, event, etc.)
            pattern: Pattern to match
            pattern_type: Match type (contains, exact, regex)
            revenue: Revenue value
            site_id: Site ID

        Returns:
            Goal creation result
        """
        params = self._api_params(
            "Goals.addGoal",
            name=name,
            matchAttribute=match_attribute,
            pattern=pattern,
            patternType=pattern_type,
            revenue=revenue,
            site_id=site_id
        )

        try:
            response = self.session.post(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Added Matomo goal: {name}")
            return {"goal_id": result.get("value"), "name": name}
        except requests.RequestException as e:
            logger.error(f"Failed to add goal {name}: {e}")
            raise

    async def get_goals(
        self,
        site_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get all goals for a site."""
        params = self._api_params("Goals.getGoals", site_id=site_id)

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get goals: {e}")
            return []

    async def get_goal_conversions(
        self,
        goal_id: int,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get conversion data for a goal."""
        params = self._api_params(
            "Goals.get",
            idGoal=goal_id,
            period=period,
            date=date,
            site_id=site_id
        )

        try:
            response = self.session.get(
                self.config.base_url,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get goal conversions: {e}")
            return {}

    # =========================================================================
    # TRACKING CODE
    # =========================================================================

    def get_tracking_code(self, site_id: Optional[int] = None) -> str:
        """
        Get the Matomo tracking code for a site.

        Args:
            site_id: Site ID

        Returns:
            JavaScript tracking code
        """
        site_id = site_id or self.config.site_id
        return f'''<!-- Matomo -->
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {{
    var u="{self.config.base_url}/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '{site_id}']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  }})();
</script>
<!-- End Matomo -->'''

    # =========================================================================
    # COMPREHENSIVE SEO REPORT
    # =========================================================================

    async def get_seo_report(
        self,
        period: str = "month",
        date: str = "today",
        site_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive SEO report.

        Combines multiple metrics for a full SEO overview.

        Args:
            period: Period
            date: Date
            site_id: Site ID

        Returns:
            Comprehensive SEO report dict
        """
        # Gather all SEO-relevant data
        visits = await self.get_visits(period, date, site_id)
        keywords = await self.get_seo_keywords(period, date, site_id)
        search_engines = await self.get_search_engines(period, date, site_id)
        referrers = await self.get_referrers(period, date, site_id)
        top_pages = await self.get_page_urls(period, date, site_id, limit=20)

        return {
            "period": period,
            "date": date,
            "summary": visits,
            "seo_metrics": {
                "top_keywords": keywords[:10] if keywords else [],
                "search_engines": search_engines,
                "organic_visits": sum(
                    se.get("nb_visits", 0) for se in search_engines
                ) if search_engines else 0,
            },
            "top_pages": top_pages[:10] if top_pages else [],
            "referrers": referrers[:10] if referrers else [],
        }


# Integration with SEO Agent
def register_with_seo_agent(agent: Any) -> None:
    """Register Matomo integration with SEOAgent."""
    matomo = MatomoIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("matomo_add_site", matomo.add_site)
        agent.register_tool("matomo_get_visits", matomo.get_visits)
        agent.register_tool("matomo_get_seo_report", matomo.get_seo_report)
        agent.register_tool("matomo_get_tracking_code", matomo.get_tracking_code)

    logger.info("Matomo integration registered with SEOAgent")
