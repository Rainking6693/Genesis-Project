"""
Tests for Hybrid Browser Automation

Tests VOIX detection logic, routing to VOIX path, fallback to Skyvern path,
and performance metrics collection.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from infrastructure.browser_automation.hybrid_automation import (
    HybridBrowserAutomation,
    AutomationMode,
    AutomationResult,
    get_hybrid_automation
)
from infrastructure.browser_automation.voix_detector import ToolDefinition


@pytest.fixture
def automation():
    """Create a test automation instance"""
    return HybridBrowserAutomation(prefer_voix=True)


@pytest.mark.asyncio
async def test_voix_detection_logic(automation):
    """Test VOIX detection logic"""
    # Mock page with VOIX tags
    html_with_voix = """
    <html>
        <body>
            <tool name="submit" description="Submit form" endpoint="/api/submit"></tool>
        </body>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html_with_voix):
        with patch.object(automation, '_execute_with_voix') as mock_voix:
            mock_voix.return_value = AutomationResult(
                success=True,
                mode_used=AutomationMode.VOIX,
                data={"result": "success"}
            )

            result = await automation.execute_task(
                url="https://voix-enabled.com",
                task="Submit form",
                mode=AutomationMode.AUTO
            )

            # Should detect VOIX and use it
            assert result.mode_used == AutomationMode.VOIX
            assert result.success is True


@pytest.mark.asyncio
async def test_routing_to_voix_path(automation):
    """Test routing to VOIX path"""
    html_with_voix = """
    <html>
        <tool name="submit" description="Submit" endpoint="/api/submit"></tool>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html_with_voix):
        with patch.object(automation, '_execute_with_voix') as mock_voix:
            mock_voix.return_value = AutomationResult(
                success=True,
                mode_used=AutomationMode.VOIX,
                data={"id": "123"}
            )

            result = await automation.execute_task(
                url="https://example.com",
                task="Submit product",
                mode=AutomationMode.VOIX
            )

            assert result.mode_used == AutomationMode.VOIX
            mock_voix.assert_called_once()
            assert automation.voix_count == 1


@pytest.mark.asyncio
async def test_fallback_to_skyvern_path(automation):
    """Test fallback to Skyvern path"""
    # No VOIX tags
    html_no_voix = """
    <html>
        <body>No VOIX tags here</body>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html_no_voix):
        with patch.object(automation, '_execute_with_skyvern') as mock_skyvern:
            mock_skyvern.return_value = AutomationResult(
                success=True,
                mode_used=AutomationMode.SKYVERN,
                data={"extracted": "data"}
            )

            result = await automation.execute_task(
                url="https://example.com",
                task="Extract data",
                mode=AutomationMode.AUTO
            )

            # Should fallback to Skyvern
            assert result.mode_used == AutomationMode.SKYVERN
            mock_skyvern.assert_called_once()
            assert automation.skyvern_count == 1


@pytest.mark.asyncio
async def test_fallback_on_voix_failure(automation):
    """Test fallback to Skyvern when VOIX fails"""
    html_with_voix = """
    <html>
        <tool name="submit" description="Submit" endpoint="/api/submit"></tool>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html_with_voix):
        with patch.object(automation, '_execute_with_voix') as mock_voix:
            with patch.object(automation, '_execute_with_skyvern') as mock_skyvern:
                # VOIX fails
                mock_voix.return_value = AutomationResult(
                    success=False,
                    mode_used=AutomationMode.VOIX,
                    error="VOIX execution failed"
                )

                # Skyvern succeeds
                mock_skyvern.return_value = AutomationResult(
                    success=True,
                    mode_used=AutomationMode.SKYVERN,
                    data={"result": "success"}
                )

                # Mock skyvern_client property
                automation._skyvern_client = MagicMock()

                result = await automation.execute_task(
                    url="https://example.com",
                    task="Submit form",
                    mode=AutomationMode.VOIX
                )

                # Should fallback to Skyvern
                assert result.mode_used == AutomationMode.SKYVERN
                assert result.success is True
                assert result.fallback_reason == "VOIX execution failed"
                assert automation.fallback_count == 1


@pytest.mark.asyncio
async def test_performance_metrics_collection(automation):
    """Test performance metrics collection"""
    html_with_voix = """
    <html>
        <tool name="submit" description="Submit" endpoint="/api/submit"></tool>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html_with_voix):
        with patch.object(automation, '_execute_with_voix') as mock_voix:
            mock_voix.return_value = AutomationResult(
                success=True,
                mode_used=AutomationMode.VOIX,
                data={}
            )

            # Execute multiple tasks
            for i in range(5):
                await automation.execute_task(
                    url=f"https://example{i}.com",
                    task="Submit",
                    mode=AutomationMode.AUTO
                )

            stats = automation.get_stats()

            assert stats["voix_count"] == 5
            assert stats["total_executions"] == 5
            assert "avg_voix_discovery_time_ms" in stats
            assert "voix_success_rate" in stats


@pytest.mark.asyncio
async def test_navigate_and_act(automation):
    """Test navigate_and_act method"""
    with patch.object(automation, 'execute_task') as mock_execute:
        mock_execute.return_value = AutomationResult(
            success=True,
            mode_used=AutomationMode.AUTO,
            data={}
        )

        result = await automation.navigate_and_act(
            url="https://example.com",
            action="Click button"
        )

        mock_execute.assert_called_once()
        assert result.success is True


@pytest.mark.asyncio
async def test_detect_voix_tools(automation):
    """Test detect_voix_tools method"""
    html = """
    <html>
        <tool name="tool1" description="Tool 1" endpoint="/api/tool1"></tool>
        <tool name="tool2" description="Tool 2" endpoint="/api/tool2"></tool>
    </html>
    """

    with patch.object(automation, '_fetch_page_content', return_value=html):
        tools = await automation.detect_voix_tools("https://example.com")

        assert len(tools) == 2
        assert tools[0].name == "tool1"
        assert tools[1].name == "tool2"


@pytest.mark.asyncio
async def test_execute_via_voix(automation):
    """Test execute_via_voix method"""
    with patch.object(automation, '_execute_with_voix') as mock_voix:
        mock_voix.return_value = AutomationResult(
            success=True,
            mode_used=AutomationMode.VOIX,
            data={}
        )

        result = await automation.execute_via_voix(
            url="https://example.com",
            task="Submit",
            data={"name": "Test"}
        )

        mock_voix.assert_called_once_with("https://example.com", "Submit", {"name": "Test"}, None)
        assert result.success is True


@pytest.mark.asyncio
async def test_execute_via_skyvern(automation):
    """Test execute_via_skyvern method"""
    with patch.object(automation, '_execute_with_skyvern') as mock_skyvern:
        mock_skyvern.return_value = AutomationResult(
            success=True,
            mode_used=AutomationMode.SKYVERN,
            data={}
        )

        result = await automation.execute_via_skyvern(
            url="https://example.com",
            task="Extract",
            data={}
        )

        mock_skyvern.assert_called_once_with("https://example.com", "Extract", {})
        assert result.success is True


def test_get_stats(automation):
    """Test getting statistics"""
    automation.voix_count = 10
    automation.skyvern_count = 5
    automation.fallback_count = 2
    automation.voix_success_count = 9
    automation.skyvern_success_count = 4
    automation.voix_discovery_times = [100.0, 150.0, 200.0]
    automation.skyvern_discovery_times = [2000.0, 2500.0, 3000.0]

    stats = automation.get_stats()

    assert stats["total_executions"] == 15
    assert stats["voix_count"] == 10
    assert stats["skyvern_count"] == 5
    assert stats["fallback_count"] == 2
    assert stats["voix_success_rate"] == 90.0
    assert stats["skyvern_success_rate"] == 80.0
    assert stats["avg_voix_discovery_time_ms"] == 150.0
    assert stats["avg_skyvern_discovery_time_ms"] == 2500.0
    assert stats["discovery_speedup"] > 10  # VOIX should be much faster


def test_singleton():
    """Test singleton pattern"""
    auto1 = get_hybrid_automation()
    auto2 = get_hybrid_automation()
    assert auto1 is auto2

