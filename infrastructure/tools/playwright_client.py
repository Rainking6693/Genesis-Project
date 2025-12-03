"""
Playwright Client - Browser Automation Integration

Integration with Playwright for browser testing and automation.
Supports HybridQAAgent and HybridSupportAgent workflows.

Features:
- Multi-browser support (Chromium, Firefox, WebKit)
- Sync and async APIs
- Screenshot and PDF capture
- Network interception
- Mobile emulation
- Accessibility testing

Installation verified: playwright 1.56.0
Browsers installed: Chromium 141.0, Firefox 142.0, WebKit 26.0
"""

import logging
from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass
from contextlib import contextmanager, asynccontextmanager

try:
    from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    sync_playwright = None
    async_playwright = None
    Browser = None
    Page = None
    BrowserContext = None

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)

BrowserType = Literal["chromium", "firefox", "webkit"]


@dataclass
class BrowserConfig:
    """Configuration for browser instance."""
    browser_type: BrowserType = "chromium"
    headless: bool = True
    slow_mo: int = 0  # Milliseconds to slow down operations
    viewport: Optional[Dict[str, int]] = None
    user_agent: Optional[str] = None
    proxy: Optional[Dict[str, str]] = None
    extra_http_headers: Optional[Dict[str, str]] = None


@dataclass
class NavigationResult:
    """Result from page navigation."""
    success: bool
    url: str
    status_code: Optional[int] = None
    error: Optional[str] = None
    screenshot_path: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class PlaywrightClient:
    """
    Unified Playwright client for Genesis agents.

    Provides simplified interface for browser automation tasks:
    - Web scraping and testing
    - QA automation (HybridQAAgent)
    - Support ticket reproduction (HybridSupportAgent)
    - Screenshot/PDF generation
    - Network monitoring

    Example:
        client = PlaywrightClient()
        with client.browser_context() as context:
            page = context.new_page()
            result = client.navigate(page, "https://example.com")
            screenshot = client.capture_screenshot(page, "output.png")
    """

    def __init__(self, config: Optional[BrowserConfig] = None):
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "Playwright not installed. Run: pip install playwright && "
                "python -m playwright install"
            )

        self.config = config or BrowserConfig()
        self._playwright = None
        self._browser = None

        logger.info(
            f"Initialized PlaywrightClient with {self.config.browser_type} "
            f"(headless={self.config.headless})"
        )

    def start(self):
        """Start Playwright and launch browser."""
        if self._playwright is None:
            self._playwright = sync_playwright().start()

        if self._browser is None:
            browser_launcher = getattr(self._playwright, self.config.browser_type)
            self._browser = browser_launcher.launch(
                headless=self.config.headless,
                slow_mo=self.config.slow_mo,
                proxy=self.config.proxy
            )
            logger.info(f"Launched {self.config.browser_type} browser")

    def stop(self):
        """Stop browser and Playwright."""
        if self._browser:
            self._browser.close()
            self._browser = None
            logger.info("Closed browser")

        if self._playwright:
            self._playwright.stop()
            self._playwright = None
            logger.info("Stopped Playwright")

    @contextmanager
    def browser_context(self, **kwargs):
        """
        Context manager for browser context with automatic cleanup.

        Args:
            **kwargs: Additional context options (viewport, user_agent, etc.)

        Yields:
            BrowserContext: Isolated browser context
        """
        self.start()

        context_options = {}
        if self.config.viewport:
            context_options["viewport"] = self.config.viewport
        if self.config.user_agent:
            context_options["user_agent"] = self.config.user_agent
        if self.config.extra_http_headers:
            context_options["extra_http_headers"] = self.config.extra_http_headers

        context_options.update(kwargs)

        context = self._browser.new_context(**context_options)
        try:
            yield context
        finally:
            context.close()

    def navigate(
        self,
        page: Page,
        url: str,
        wait_until: str = "load",
        timeout: int = 30000
    ) -> NavigationResult:
        """
        Navigate to URL and return result.

        Args:
            page: Playwright page object
            url: Target URL
            wait_until: When to consider navigation complete
                       ("load", "domcontentloaded", "networkidle")
            timeout: Navigation timeout in milliseconds

        Returns:
            NavigationResult with success status and metadata
        """
        try:
            response = page.goto(url, wait_until=wait_until, timeout=timeout)

            return NavigationResult(
                success=True,
                url=page.url,
                status_code=response.status if response else None,
                metrics={
                    "title": page.title(),
                    "load_state": wait_until
                }
            )
        except Exception as e:
            logger.error(f"Navigation failed for {url}: {e}")
            return NavigationResult(
                success=False,
                url=url,
                error=str(e)
            )

    def capture_screenshot(
        self,
        page: Page,
        path: str,
        full_page: bool = False
    ) -> bool:
        """
        Capture page screenshot.

        Args:
            page: Playwright page object
            path: Output file path
            full_page: Capture full scrollable page

        Returns:
            True if successful, False otherwise
        """
        try:
            page.screenshot(path=path, full_page=full_page)
            logger.info(f"Screenshot saved to {path}")
            return True
        except Exception as e:
            logger.error(f"Screenshot capture failed: {e}")
            return False

    def capture_pdf(self, page: Page, path: str) -> bool:
        """
        Capture page as PDF (Chromium only).

        Args:
            page: Playwright page object
            path: Output file path

        Returns:
            True if successful, False otherwise
        """
        if self.config.browser_type != "chromium":
            logger.warning("PDF capture only supported in Chromium")
            return False

        try:
            page.pdf(path=path)
            logger.info(f"PDF saved to {path}")
            return True
        except Exception as e:
            logger.error(f"PDF capture failed: {e}")
            return False

    def get_accessibility_tree(self, page: Page) -> Optional[Dict[str, Any]]:
        """
        Get accessibility tree for the page.

        Useful for testing accessibility compliance and
        integration with DOM accessibility parser.

        Args:
            page: Playwright page object

        Returns:
            Accessibility tree snapshot or None on failure
        """
        try:
            snapshot = page.accessibility.snapshot()
            return snapshot
        except Exception as e:
            logger.error(f"Failed to get accessibility tree: {e}")
            return None

    def wait_for_selector(
        self,
        page: Page,
        selector: str,
        timeout: int = 30000,
        state: str = "visible"
    ) -> bool:
        """
        Wait for element matching selector.

        Args:
            page: Playwright page object
            selector: CSS selector
            timeout: Wait timeout in milliseconds
            state: Element state ("attached", "detached", "visible", "hidden")

        Returns:
            True if element found, False on timeout
        """
        try:
            page.wait_for_selector(selector, timeout=timeout, state=state)
            return True
        except Exception as e:
            logger.error(f"Selector wait failed for {selector}: {e}")
            return False

    def execute_script(self, page: Page, script: str) -> Any:
        """
        Execute JavaScript in page context.

        Args:
            page: Playwright page object
            script: JavaScript code to execute

        Returns:
            Script return value
        """
        try:
            return page.evaluate(script)
        except Exception as e:
            logger.error(f"Script execution failed: {e}")
            return None


# Singleton instance
_playwright_client: Optional[PlaywrightClient] = None


def get_playwright_client(config: Optional[BrowserConfig] = None) -> PlaywrightClient:
    """
    Get singleton Playwright client instance.

    Args:
        config: Optional browser configuration

    Returns:
        PlaywrightClient instance
    """
    global _playwright_client

    if _playwright_client is None:
        _playwright_client = PlaywrightClient(config)

    return _playwright_client


# Integration with existing VOIX framework
def integrate_with_voix():
    """
    Integration point for VOIX browser automation.

    This function bridges Playwright with the existing VOIX
    detector/executor in infrastructure/browser_automation/.

    VOIX uses declarative <tool> discovery for 10-25x faster
    automation vs. traditional DOM traversal.
    """
    try:
        from infrastructure.browser_automation.voix_executor import VoixExecutor
        logger.info("VOIX integration available - Playwright acts as fallback")
        return True
    except ImportError:
        logger.info("VOIX not available - using Playwright as primary automation")
        return False
