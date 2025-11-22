"""
Pytest configuration for browser automation tests.

These tests exercise only the VOIX/Skyvern stack, so the global coverage
configuration (which targets AP2 services) would otherwise fail with zero data.
When the invocation explicitly targets this directory we disable coverage so
the focused suite can run cleanly.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence


def _is_browser_suite(args: Sequence[object]) -> bool:
    """Return True if pytest was invoked exclusively for this directory."""
    if not args:
        return False

    for arg in args:
        arg_str = str(arg)
        if not arg_str:
            return False

        # Normalize to forward slashes for Windows paths as well
        normalized = Path(arg_str).as_posix()
        if not normalized.startswith("tests/browser_automation"):
            return False

    return True


def pytest_configure(config) -> None:
    """Disable project-wide coverage when running this focused suite."""
    args = getattr(config.invocation_params, "args", ())
    if _is_browser_suite(args):
        # Remove pytest-cov plugin so coverage is not enforced for this focused run
        for plugin_name in ("cov", "_cov"):
            cov_plugin = config.pluginmanager.getplugin(plugin_name)
            if cov_plugin:
                config.pluginmanager.unregister(cov_plugin)
                break
