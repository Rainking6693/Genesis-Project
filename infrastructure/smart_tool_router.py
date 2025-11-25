import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from infrastructure.browser_automation.hybrid_automation import (
        HybridBrowserAutomation,
        AutomationMode,
        AutomationResult,
    )
except Exception:  # pragma: no cover - optional dependency
    HybridBrowserAutomation = None  # type: ignore
    AutomationMode = None  # type: ignore
    AutomationResult = None  # type: ignore

try:
    from infrastructure.mcp_chrome_devtools_client import ChromeDevToolsMCPClient
except Exception:  # pragma: no cover - optional dependency
    ChromeDevToolsMCPClient = None  # type: ignore

logger = logging.getLogger(__name__)


class SmartToolRouterMixin:
    """
    Safe, optional smart tool router.

    - load_brain(path): loads checkpoints/latest_god_mode.json (no-op if missing)
    - run_task(goal, url=None, params=None): routes to VOIX hybrid automation if available, then
      Chrome DevTools MCP, else returns a stub response.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._smart_brain: Dict[str, Any] = {}
        self._hybrid_router: Optional[Any] = None
        self._mcp_client: Optional[Any] = None

    def load_brain(self, path: str = "checkpoints/latest_god_mode.json") -> None:
        try:
            brain_path = Path(path)
            if brain_path.exists():
                self._smart_brain = json.loads(brain_path.read_text(encoding="utf-8"))
                logger.info(f"SmartToolRouter loaded brain from {brain_path}")
            else:
                logger.debug(f"SmartToolRouter brain not found at {brain_path}, continuing without it")
        except Exception as e:  # pragma: no cover - defensive
            logger.warning(f"SmartToolRouter could not load brain: {e}")
            self._smart_brain = {}

    async def run_task(
        self,
        goal: str,
        url: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Route a web task to VOIX hybrid automation, MCP, or stub.
        """
        params = params or {}

        # VOIX / Hybrid automation path
        if HybridBrowserAutomation and url:
            try:
                if not self._hybrid_router:
                    self._hybrid_router = HybridBrowserAutomation(prefer_voix=True)
                result: AutomationResult = await self._hybrid_router.execute_task(
                    url=url,
                    task=goal,
                    data=params,
                    mode=AutomationMode.AUTO if AutomationMode else None,
                )
                return {
                    "success": bool(getattr(result, "success", False)),
                    "route": "voix_hybrid",
                    "data": getattr(result, "data", None),
                    "error": getattr(result, "error", None),
                    "metadata": {
                        "mode_used": str(getattr(result, "mode_used", "")),
                        "latency_ms": getattr(result, "latency_ms", None),
                        "fallback_reason": getattr(result, "fallback_reason", None),
                    },
                }
            except Exception as e:
                logger.warning(f"SmartToolRouter VOIX path failed: {e}")

        # Chrome DevTools MCP path
        if ChromeDevToolsMCPClient and url:
            try:
                if not self._mcp_client:
                    self._mcp_client = ChromeDevToolsMCPClient(agent_name=getattr(self, "agent_type", "agent"))
                    await self._mcp_client.initialize()
                nav = await self._mcp_client.navigate(url, wait_for=None, timeout=20)
                return {
                    "success": bool(getattr(nav, "success", False)),
                    "route": "mcp_chrome_devtools",
                    "data": nav.__dict__ if hasattr(nav, "__dict__") else nav,
                    "error": getattr(nav, "error", None),
                }
            except Exception as e:
                logger.warning(f"SmartToolRouter MCP path failed: {e}")

        # Stub fallback
        logger.info("SmartToolRouter stub fallback used")
        return {
            "success": False,
            "route": "stub",
            "data": {"goal": goal, "url": url, "params": params, "brain_loaded": bool(self._smart_brain)},
            "error": "No automation backend available",
        }
