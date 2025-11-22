"""
Functional Deployment Verification Module

Comprehensive verification that deployments ACTUALLY work, not just return HTTP 200.
Prevents false positives from Jekyll/GitHub Pages default content being deployed instead of real apps.

Author: Genesis Infrastructure
Date: November 22, 2025
Status: Production Ready
"""

import asyncio
import logging
import re
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

import aiohttp

from infrastructure.load_env import load_genesis_env

# Load environment
load_genesis_env()

logger = logging.getLogger(__name__)


@dataclass
class FunctionalCheck:
    """Individual functional check result"""
    name: str
    passed: bool
    details: str
    critical: bool = False  # If true, failure blocks deployment


@dataclass
class FunctionalVerificationResult:
    """Complete functional verification result"""
    url: str
    functional: bool
    score: float  # 0-100 percentage
    checks: List[FunctionalCheck]
    error: Optional[str] = None
    app_type: str = "nextjs"

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "url": self.url,
            "functional": self.functional,
            "score": self.score,
            "checks": [
                {
                    "name": c.name,
                    "passed": c.passed,
                    "details": c.details,
                    "critical": c.critical
                }
                for c in self.checks
            ],
            "error": self.error,
            "app_type": self.app_type
        }


class FunctionalVerifier:
    """
    Comprehensive functional deployment verifier

    Verifies that deployments are ACTUALLY functional:
    - HTTP 200 status
    - Correct content type (not Jekyll/default pages)
    - Framework-specific markers (React/Next.js/Vue)
    - Assets load correctly
    - No 404/error pages
    - Platform matches expected (not GitHub default)
    """

    def __init__(self, timeout: int = 30):
        """
        Initialize functional verifier

        Args:
            timeout: HTTP request timeout in seconds
        """
        self.timeout = timeout

    async def verify_deployment_functional(
        self,
        url: str,
        app_type: str = "nextjs",
        expected_platform: Optional[str] = None
    ) -> FunctionalVerificationResult:
        """
        Verify deployment is actually functional

        Args:
            url: Deployment URL to verify
            app_type: Expected app type (nextjs, react, vue, static, etc.)
            expected_platform: Expected platform (railway, render, github-pages, etc.)

        Returns:
            FunctionalVerificationResult with detailed check results
        """
        logger.info(f"🔍 Starting functional verification: {url} (type: {app_type})")

        checks: List[FunctionalCheck] = []

        try:
            async with aiohttp.ClientSession() as session:
                # CHECK 1: HTTP 200 (CRITICAL)
                http_check = await self._check_http_200(session, url)
                checks.append(http_check)

                if not http_check.passed:
                    # If HTTP check fails, abort (can't verify further)
                    return self._build_result(url, app_type, checks)

                # Fetch HTML for content checks
                html = await self._fetch_html(session, url)

                # CHECK 2: Has HTML content (CRITICAL)
                content_check = self._check_has_html_content(html)
                checks.append(content_check)

                # CHECK 3: NOT Jekyll/GitHub default (CRITICAL)
                platform_check = self._check_not_jekyll(html)
                checks.append(platform_check)

                # CHECK 4: Has framework markers (React/Next.js/Vue)
                framework_check = self._check_framework_markers(html, app_type)
                checks.append(framework_check)

                # CHECK 5: Not a 404/error page (CRITICAL)
                error_check = self._check_not_error_page(html)
                checks.append(error_check)

                # CHECK 6: Assets load correctly
                asset_check = await self._check_assets_load(session, url, html, app_type)
                checks.append(asset_check)

                # CHECK 7: Has expected platform markers
                if expected_platform:
                    expected_platform_check = self._check_expected_platform(
                        html, expected_platform
                    )
                    checks.append(expected_platform_check)

                # CHECK 8: No placeholder content
                placeholder_check = self._check_no_placeholder_content(html)
                checks.append(placeholder_check)

        except Exception as e:
            logger.error(f"❌ Functional verification error: {e}")
            return FunctionalVerificationResult(
                url=url,
                functional=False,
                score=0.0,
                checks=checks,
                error=str(e),
                app_type=app_type
            )

        # Build final result
        return self._build_result(url, app_type, checks)

    async def _check_http_200(
        self,
        session: aiohttp.ClientSession,
        url: str
    ) -> FunctionalCheck:
        """Check HTTP 200 status"""
        try:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                status = response.status
                passed = 200 <= status < 300

                return FunctionalCheck(
                    name="http_200",
                    passed=passed,
                    details=f"HTTP status: {status}",
                    critical=True
                )
        except Exception as e:
            return FunctionalCheck(
                name="http_200",
                passed=False,
                details=f"HTTP request failed: {str(e)}",
                critical=True
            )

    async def _fetch_html(
        self,
        session: aiohttp.ClientSession,
        url: str
    ) -> str:
        """Fetch HTML content"""
        try:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                return await response.text()
        except Exception as e:
            logger.warning(f"Failed to fetch HTML: {e}")
            return ""

    def _check_has_html_content(self, html: str) -> FunctionalCheck:
        """Check if HTML has meaningful content"""
        has_content = len(html) > 100

        return FunctionalCheck(
            name="has_html_content",
            passed=has_content,
            details=f"HTML length: {len(html)} chars (min: 100)",
            critical=True
        )

    def _check_not_jekyll(self, html: str) -> FunctionalCheck:
        """Check that content is NOT Jekyll/GitHub Pages default"""
        html_lower = html.lower()

        # Jekyll markers
        jekyll_markers = [
            "jekyll",
            "github-pages",
            "powered by jekyll",
            "site.github.url"
        ]

        # GitHub default page markers
        github_markers = [
            "404.html",
            "there isn't a github pages site here",
            "github pages is not enabled",
            "readme.md"
        ]

        found_markers = []

        for marker in jekyll_markers + github_markers:
            if marker in html_lower:
                found_markers.append(marker)

        is_jekyll = len(found_markers) > 0

        return FunctionalCheck(
            name="not_jekyll",
            passed=not is_jekyll,
            details=f"Jekyll markers found: {found_markers}" if is_jekyll else "No Jekyll markers",
            critical=True
        )

    def _check_framework_markers(self, html: str, app_type: str) -> FunctionalCheck:
        """Check for framework-specific markers"""
        markers_found = []

        if app_type in ["nextjs", "react"]:
            # Next.js markers
            if '<div id="__next">' in html or '<div id="__next" ' in html:
                markers_found.append("Next.js root div")
            if "_next/static" in html:
                markers_found.append("Next.js static assets")
            if "/_next/data/" in html:
                markers_found.append("Next.js data")

            # React markers (fallback)
            if '<div id="root">' in html or '<div id="root" ' in html:
                markers_found.append("React root div")
            if "react" in html.lower():
                markers_found.append("React reference")

        elif app_type == "vue":
            # Vue.js markers
            if '<div id="app">' in html or '<div id="app" ' in html:
                markers_found.append("Vue root div")
            if "vue" in html.lower():
                markers_found.append("Vue reference")

        # For static sites, just check for basic HTML structure
        elif app_type == "static":
            if "<html" in html.lower() and "<body" in html.lower():
                markers_found.append("Valid HTML structure")

        has_markers = len(markers_found) > 0

        return FunctionalCheck(
            name="framework_markers",
            passed=has_markers,
            details=f"Markers found: {', '.join(markers_found)}" if has_markers else f"No {app_type} markers",
            critical=False
        )

    def _check_not_error_page(self, html: str) -> FunctionalCheck:
        """Check that page is not a 404/error page"""
        html_lower = html.lower()

        error_indicators = [
            "404",
            "not found",
            "page not found",
            "this page could not be found",
            "error 404",
            "file not found",
            "page does not exist"
        ]

        found_errors = []
        for indicator in error_indicators:
            if indicator in html_lower:
                found_errors.append(indicator)

        is_error = len(found_errors) > 0

        return FunctionalCheck(
            name="not_error_page",
            passed=not is_error,
            details=f"Error indicators: {found_errors}" if is_error else "No error indicators",
            critical=True
        )

    async def _check_assets_load(
        self,
        session: aiohttp.ClientSession,
        url: str,
        html: str,
        app_type: str
    ) -> FunctionalCheck:
        """Check if assets load correctly"""
        assets_to_check = []

        # Extract common asset paths
        if app_type in ["nextjs", "react"]:
            # Next.js static chunks
            next_static = re.findall(r'/_next/static/[^"\']+', html)
            assets_to_check.extend(next_static[:3])  # Check first 3

        # Check favicon (common to all)
        assets_to_check.append("/favicon.ico")

        # Try loading assets
        loaded_count = 0
        failed_assets = []

        for asset_path in assets_to_check[:5]:  # Limit to 5 checks
            asset_url = urljoin(url, asset_path)

            try:
                async with session.get(
                    asset_url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        loaded_count += 1
                    else:
                        failed_assets.append(f"{asset_path} ({response.status})")
            except Exception as e:
                failed_assets.append(f"{asset_path} (error)")

        # Pass if at least 1 asset loads (or no assets to check)
        passed = loaded_count > 0 or len(assets_to_check) == 0

        return FunctionalCheck(
            name="assets_load",
            passed=passed,
            details=f"Loaded {loaded_count}/{len(assets_to_check)} assets" + (
                f" (failed: {', '.join(failed_assets[:3])})" if failed_assets else ""
            ),
            critical=False
        )

    def _check_expected_platform(
        self,
        html: str,
        expected_platform: str
    ) -> FunctionalCheck:
        """Check if deployment is on expected platform"""
        platform_markers = {
            "railway": ["railway.app", "railway"],
            "render": ["onrender.com", "render"],
            "github-pages": ["github.io"],
            "vercel": ["vercel.app", "vercel"],
            "netlify": ["netlify.app", "netlify"]
        }

        markers = platform_markers.get(expected_platform, [])
        found = any(marker in html.lower() for marker in markers)

        return FunctionalCheck(
            name="expected_platform",
            passed=True,  # Not critical - just informational
            details=f"Platform markers for '{expected_platform}': {'found' if found else 'not found'}",
            critical=False
        )

    def _check_no_placeholder_content(self, html: str) -> FunctionalCheck:
        """Check for placeholder/template content"""
        html_lower = html.lower()

        placeholders = [
            "lorem ipsum",
            "placeholder text",
            "coming soon",
            "under construction",
            "welcome to your new site",
            "edit this page",
            "your site is ready"
        ]

        found_placeholders = []
        for placeholder in placeholders:
            if placeholder in html_lower:
                found_placeholders.append(placeholder)

        has_placeholders = len(found_placeholders) > 0

        return FunctionalCheck(
            name="no_placeholder_content",
            passed=not has_placeholders,
            details=f"Placeholders: {found_placeholders}" if has_placeholders else "No placeholders",
            critical=False
        )

    def _build_result(
        self,
        url: str,
        app_type: str,
        checks: List[FunctionalCheck]
    ) -> FunctionalVerificationResult:
        """Build final verification result"""
        # Calculate score
        total_checks = len(checks)
        passed_checks = sum(1 for c in checks if c.passed)
        score = (passed_checks / total_checks * 100) if total_checks > 0 else 0.0

        # Determine if functional (all critical checks must pass)
        critical_checks = [c for c in checks if c.critical]
        all_critical_pass = all(c.passed for c in critical_checks)

        # At least 70% overall score required
        score_threshold_met = score >= 70.0

        functional = all_critical_pass and score_threshold_met

        # Log results
        if functional:
            logger.info(f"✅ Functional verification PASSED: {url} (score: {score:.1f}%)")
        else:
            failed_critical = [c.name for c in critical_checks if not c.passed]
            logger.warning(
                f"❌ Functional verification FAILED: {url} (score: {score:.1f}%) - "
                f"Failed critical: {failed_critical}"
            )

        return FunctionalVerificationResult(
            url=url,
            functional=functional,
            score=score,
            checks=checks,
            app_type=app_type
        )


# Singleton instance
_verifier_instance = None


def get_functional_verifier() -> FunctionalVerifier:
    """Get singleton functional verifier instance"""
    global _verifier_instance
    if _verifier_instance is None:
        _verifier_instance = FunctionalVerifier()
    return _verifier_instance


# Convenience function
async def verify_deployment_functional(
    url: str,
    app_type: str = "nextjs",
    expected_platform: Optional[str] = None
) -> FunctionalVerificationResult:
    """
    Verify deployment is functional (convenience function)

    Args:
        url: Deployment URL
        app_type: Expected app type
        expected_platform: Expected platform

    Returns:
        FunctionalVerificationResult
    """
    verifier = get_functional_verifier()
    return await verifier.verify_deployment_functional(url, app_type, expected_platform)
