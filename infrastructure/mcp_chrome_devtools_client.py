"""
Chrome DevTools MCP Client - Phase 1
Provides browser automation and DOM inspection via Chrome DevTools MCP server

Integration with Genesis agents for:
- Marketing Agent: Directory submissions, social media automation
- SEO Agent: Website analysis, ranking checks
- Billing Agent: Payment flow testing
- Deploy Agent: Deployment verification
"""

import os
import asyncio
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

try:
    from infrastructure.mcp_client import MCPClient, get_mcp_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    logging.warning("MCP client not available - Chrome DevTools integration disabled")

logger = logging.getLogger(__name__)


@dataclass
class ChromeDevToolsResult:
    """Result from Chrome DevTools operation"""
    success: bool
    data: Any
    screenshot: Optional[bytes] = None
    error: Optional[str] = None
    latency_ms: float = 0.0


class ChromeDevToolsMCPClient:
    """
    Chrome DevTools MCP client for browser automation.
    
    Provides methods for:
    - Browser navigation
    - DOM inspection
    - Form filling
    - Screenshot capture
    - Network monitoring
    """
    
    def __init__(self, agent_name: str = "unknown"):
        """
        Initialize Chrome DevTools MCP client.
        
        Args:
            agent_name: Name of agent using this client (for logging)
        """
        self.agent_name = agent_name
        self.mcp_client: Optional[MCPClient] = None
        self._initialized = False
        
        # Chrome DevTools MCP server URL
        self.server_url = os.getenv('CHROME_DEVTOOLS_MCP_URL', 'http://localhost:9222')
        
        # Allowed tools for Chrome DevTools
        self.allowed_tools = [
            'chrome_navigate',
            'chrome_click',
            'chrome_type',
            'chrome_screenshot',
            'chrome_get_html',
            'chrome_evaluate',
            'chrome_network_monitor',
            'chrome_get_cookies',
            'chrome_set_cookies'
        ]
    
    async def initialize(self) -> bool:
        """
        Initialize connection to Chrome DevTools MCP server.
        
        Returns:
            True if initialized successfully
        """
        if not MCP_AVAILABLE:
            logger.warning(f"Chrome DevTools MCP not available for {self.agent_name}")
            return False
        
        try:
            self.mcp_client = get_mcp_client(
                user_id=f"agent-{self.agent_name}",
                agent_role=self.agent_name,
                allowed_tools=self.allowed_tools
            )
            
            # Discover Chrome DevTools MCP server
            await self.mcp_client.discover_servers([self.server_url])
            self._initialized = True
            logger.info(f"✅ Chrome DevTools MCP initialized for {self.agent_name}")
            return True
        except Exception as e:
            logger.warning(f"⚠️  Chrome DevTools MCP initialization failed for {self.agent_name}: {e}")
            self._initialized = False
            return False
    
    async def navigate(self, url: str, wait_for: Optional[str] = None, timeout: int = 30) -> ChromeDevToolsResult:
        """
        Navigate to URL.
        
        Args:
            url: URL to navigate to
            wait_for: Optional selector to wait for (e.g., "#submit-button")
            timeout: Timeout in seconds
            
        Returns:
            ChromeDevToolsResult with navigation status
        """
        if not self._initialized:
            await self.initialize()
        
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_navigate',
                {
                    'url': url,
                    'wait_for': wait_for,
                    'timeout': timeout
                }
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome navigation failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def click(self, selector: str, wait_for: Optional[str] = None) -> ChromeDevToolsResult:
        """
        Click element by selector.
        
        Args:
            selector: CSS selector (e.g., "#submit-button", ".btn-primary")
            wait_for: Optional selector to wait for after click
            
        Returns:
            ChromeDevToolsResult
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_click',
                {
                    'selector': selector,
                    'wait_for': wait_for
                }
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome click failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def type_text(self, selector: str, text: str, clear_first: bool = True) -> ChromeDevToolsResult:
        """
        Type text into input field.
        
        Args:
            selector: CSS selector for input field
            text: Text to type
            clear_first: Clear field before typing
            
        Returns:
            ChromeDevToolsResult
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_type',
                {
                    'selector': selector,
                    'text': text,
                    'clear_first': clear_first
                }
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome type failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def screenshot(self, full_page: bool = False) -> ChromeDevToolsResult:
        """
        Capture screenshot.
        
        Args:
            full_page: Capture full page (scroll) or just viewport
            
        Returns:
            ChromeDevToolsResult with screenshot bytes
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_screenshot',
                {
                    'full_page': full_page
                }
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Screenshot is base64 encoded in result
            screenshot_bytes = None
            if isinstance(result, dict) and 'screenshot' in result:
                import base64
                screenshot_bytes = base64.b64decode(result['screenshot'])
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                screenshot=screenshot_bytes,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome screenshot failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def get_html(self, selector: Optional[str] = None) -> ChromeDevToolsResult:
        """
        Get HTML content.
        
        Args:
            selector: Optional CSS selector (if None, returns full page HTML)
            
        Returns:
            ChromeDevToolsResult with HTML content
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_get_html',
                {
                    'selector': selector
                } if selector else {}
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome get HTML failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def evaluate(self, javascript: str) -> ChromeDevToolsResult:
        """
        Evaluate JavaScript in page context.
        
        Args:
            javascript: JavaScript code to execute
            
        Returns:
            ChromeDevToolsResult with evaluation result
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_evaluate',
                {
                    'javascript': javascript
                }
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome evaluate failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )
    
    async def monitor_network(self, filter_pattern: Optional[str] = None) -> ChromeDevToolsResult:
        """
        Monitor network requests.
        
        Args:
            filter_pattern: Optional URL pattern to filter requests
            
        Returns:
            ChromeDevToolsResult with network requests
        """
        if not self._initialized or not self.mcp_client:
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error="Chrome DevTools MCP not initialized"
            )
        
        start_time = datetime.utcnow()
        
        try:
            result = await self.mcp_client.call_tool(
                'chrome_network_monitor',
                {
                    'filter_pattern': filter_pattern
                } if filter_pattern else {}
            )
            
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return ChromeDevToolsResult(
                success=True,
                data=result,
                latency_ms=latency
            )
        except Exception as e:
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Chrome network monitor failed: {e}")
            return ChromeDevToolsResult(
                success=False,
                data=None,
                error=str(e),
                latency_ms=latency
            )


def get_chrome_devtools_client(agent_name: str = "unknown") -> ChromeDevToolsMCPClient:
    """
    Get Chrome DevTools MCP client instance.
    
    Args:
        agent_name: Name of agent using this client
        
    Returns:
        ChromeDevToolsMCPClient instance
    """
    return ChromeDevToolsMCPClient(agent_name=agent_name)

