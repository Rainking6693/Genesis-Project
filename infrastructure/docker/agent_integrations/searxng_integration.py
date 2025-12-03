"""
SearXNG Integration for SEOAgent

Provides privacy-respecting meta-search for keyword research and SEO analysis.

Features:
- Multi-engine search aggregation
- Keyword research
- Competitor analysis
- SERP monitoring
- Trend detection

Target Agent: SEOAgent
Docker Container: genesis-searxng
Port: 8888

Author: Genesis Project
Date: 2025-12-03
"""

import os
import logging
import requests
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from urllib.parse import urljoin, quote

logger = logging.getLogger(__name__)


@dataclass
class SearXNGConfig:
    """Configuration for SearXNG connection."""
    base_url: str = "http://localhost:8888"
    default_engines: List[str] = None
    safe_search: int = 0  # 0=off, 1=moderate, 2=strict

    def __post_init__(self):
        if self.default_engines is None:
            self.default_engines = ["google", "bing", "duckduckgo"]


class SearXNGIntegration:
    """
    SearXNG integration for SEOAgent.

    Provides methods for:
    - Web search across multiple engines
    - Keyword research
    - SERP analysis
    - Image search
    - News search

    Usage:
        searxng = SearXNGIntegration()

        # Search for keywords
        results = await searxng.search("python web scraping")

        # Get keyword suggestions
        suggestions = await searxng.get_autocomplete("python")

        # Analyze SERP for SEO
        serp_analysis = await searxng.analyze_serp("best python frameworks")
    """

    def __init__(self, config: Optional[SearXNGConfig] = None):
        """Initialize SearXNG integration."""
        self.config = config or SearXNGConfig()
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            self._session.headers["Accept"] = "application/json"
        return self._session

    def check_health(self) -> bool:
        """Check if SearXNG is healthy and accessible."""
        try:
            response = self.session.get(
                self.config.base_url,
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"SearXNG health check failed: {e}")
            return False

    # =========================================================================
    # SEARCH OPERATIONS
    # =========================================================================

    async def search(
        self,
        query: str,
        categories: Optional[List[str]] = None,
        engines: Optional[List[str]] = None,
        language: str = "en",
        page: int = 1,
        time_range: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform a search query.

        Args:
            query: Search query
            categories: Search categories (general, images, news, etc.)
            engines: Specific engines to use
            language: Search language
            page: Page number
            time_range: Time filter (day, week, month, year)

        Returns:
            Search results dict
        """
        params = {
            "q": query,
            "format": "json",
            "language": language,
            "pageno": page,
            "safesearch": self.config.safe_search
        }

        if categories:
            params["categories"] = ",".join(categories)
        if engines:
            params["engines"] = ",".join(engines)
        if time_range:
            params["time_range"] = time_range

        try:
            response = self.session.get(
                urljoin(self.config.base_url, "/search"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            logger.error(f"Search failed for '{query}': {e}")
            return {"results": [], "error": str(e)}

    async def search_images(
        self,
        query: str,
        engines: Optional[List[str]] = None,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        Search for images.

        Args:
            query: Search query
            engines: Image search engines
            page: Page number

        Returns:
            Image search results
        """
        return await self.search(
            query=query,
            categories=["images"],
            engines=engines,
            page=page
        )

    async def search_news(
        self,
        query: str,
        time_range: str = "week",
        engines: Optional[List[str]] = None,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        Search for news articles.

        Args:
            query: Search query
            time_range: Time filter
            engines: News search engines
            page: Page number

        Returns:
            News search results
        """
        return await self.search(
            query=query,
            categories=["news"],
            engines=engines,
            time_range=time_range,
            page=page
        )

    # =========================================================================
    # KEYWORD RESEARCH
    # =========================================================================

    async def get_autocomplete(
        self,
        query: str,
        engine: str = "google"
    ) -> List[str]:
        """
        Get autocomplete suggestions for keyword research.

        Args:
            query: Partial query
            engine: Autocomplete engine

        Returns:
            List of suggestion strings
        """
        params = {
            "q": query,
            "engine": engine
        }

        try:
            response = self.session.get(
                urljoin(self.config.base_url, "/autocompleter"),
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            logger.error(f"Autocomplete failed for '{query}': {e}")
            return []

    async def get_related_keywords(
        self,
        seed_keyword: str,
        depth: int = 2
    ) -> List[str]:
        """
        Get related keywords for SEO research.

        Uses autocomplete and search suggestions to find related terms.

        Args:
            seed_keyword: Starting keyword
            depth: How many levels of suggestions to explore

        Returns:
            List of related keywords
        """
        related = set()
        to_explore = [seed_keyword]
        explored = set()

        for _ in range(depth):
            new_keywords = []
            for keyword in to_explore:
                if keyword in explored:
                    continue
                explored.add(keyword)

                # Get autocomplete suggestions
                suggestions = await self.get_autocomplete(keyword)
                for suggestion in suggestions:
                    if suggestion not in related and suggestion != seed_keyword:
                        related.add(suggestion)
                        new_keywords.append(suggestion)

            to_explore = new_keywords[:10]  # Limit exploration

        return list(related)

    # =========================================================================
    # SERP ANALYSIS
    # =========================================================================

    async def analyze_serp(
        self,
        keyword: str,
        engines: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze SERP (Search Engine Results Page) for SEO insights.

        Args:
            keyword: Target keyword
            engines: Search engines to analyze

        Returns:
            SERP analysis dict
        """
        engines = engines or ["google", "bing"]

        results = await self.search(
            query=keyword,
            engines=engines,
            page=1
        )

        if not results.get("results"):
            return {"keyword": keyword, "analysis": None, "error": "No results"}

        # Analyze results
        organic_results = results.get("results", [])

        analysis = {
            "keyword": keyword,
            "total_results": len(organic_results),
            "engines_used": list(set(r.get("engine", "unknown") for r in organic_results)),
            "top_domains": [],
            "title_keywords": {},
            "avg_title_length": 0,
            "avg_snippet_length": 0,
            "https_percentage": 0,
        }

        # Extract domains
        domains = []
        title_lengths = []
        snippet_lengths = []
        https_count = 0

        for result in organic_results[:10]:
            url = result.get("url", "")
            title = result.get("title", "")
            snippet = result.get("content", "")

            # Extract domain
            if "://" in url:
                domain = url.split("://")[1].split("/")[0]
                domains.append(domain)

            # Track lengths
            title_lengths.append(len(title))
            snippet_lengths.append(len(snippet))

            # HTTPS check
            if url.startswith("https"):
                https_count += 1

            # Extract title keywords
            for word in title.lower().split():
                if len(word) > 3:
                    analysis["title_keywords"][word] = analysis["title_keywords"].get(word, 0) + 1

        # Calculate averages
        if title_lengths:
            analysis["avg_title_length"] = sum(title_lengths) / len(title_lengths)
        if snippet_lengths:
            analysis["avg_snippet_length"] = sum(snippet_lengths) / len(snippet_lengths)
        if organic_results:
            analysis["https_percentage"] = (https_count / len(organic_results[:10])) * 100

        # Top domains (unique)
        seen_domains = set()
        for domain in domains:
            if domain not in seen_domains:
                seen_domains.add(domain)
                analysis["top_domains"].append(domain)
                if len(analysis["top_domains"]) >= 5:
                    break

        # Sort keywords by frequency
        analysis["title_keywords"] = dict(
            sorted(analysis["title_keywords"].items(), key=lambda x: x[1], reverse=True)[:10]
        )

        return analysis

    async def check_ranking(
        self,
        keyword: str,
        target_domain: str,
        max_pages: int = 3
    ) -> Dict[str, Any]:
        """
        Check ranking position for a keyword.

        Args:
            keyword: Search keyword
            target_domain: Domain to look for
            max_pages: Maximum pages to search

        Returns:
            Ranking information dict
        """
        for page in range(1, max_pages + 1):
            results = await self.search(keyword, page=page)

            for idx, result in enumerate(results.get("results", []), 1):
                url = result.get("url", "")
                if target_domain.lower() in url.lower():
                    position = (page - 1) * 10 + idx
                    return {
                        "keyword": keyword,
                        "domain": target_domain,
                        "found": True,
                        "position": position,
                        "page": page,
                        "url": url,
                        "title": result.get("title", ""),
                    }

        return {
            "keyword": keyword,
            "domain": target_domain,
            "found": False,
            "position": None,
            "page": None,
            "note": f"Not found in top {max_pages * 10} results"
        }

    # =========================================================================
    # COMPETITOR ANALYSIS
    # =========================================================================

    async def analyze_competitors(
        self,
        keyword: str,
        num_competitors: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Analyze top competitors for a keyword.

        Args:
            keyword: Target keyword
            num_competitors: Number of competitors to analyze

        Returns:
            List of competitor analysis dicts
        """
        results = await self.search(keyword)

        competitors = []
        seen_domains = set()

        for result in results.get("results", []):
            url = result.get("url", "")
            if "://" not in url:
                continue

            domain = url.split("://")[1].split("/")[0]

            if domain in seen_domains:
                continue
            seen_domains.add(domain)

            competitors.append({
                "domain": domain,
                "url": url,
                "title": result.get("title", ""),
                "snippet": result.get("content", ""),
                "engine": result.get("engine", "unknown"),
            })

            if len(competitors) >= num_competitors:
                break

        return competitors


# Integration with SEO Agent
def register_with_seo_agent(agent: Any) -> None:
    """Register SearXNG integration with SEOAgent."""
    searxng = SearXNGIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("searxng_search", searxng.search)
        agent.register_tool("searxng_analyze_serp", searxng.analyze_serp)
        agent.register_tool("searxng_get_related_keywords", searxng.get_related_keywords)
        agent.register_tool("searxng_check_ranking", searxng.check_ranking)
        agent.register_tool("searxng_analyze_competitors", searxng.analyze_competitors)

    logger.info("SearXNG integration registered with SEOAgent")
