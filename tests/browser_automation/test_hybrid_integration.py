"""
Integration Tests for Hybrid Automation (VOIX + Skyvern)

Tests full integration scenarios:
- VOIX-enabled sample sites
- Non-VOIX sites (Skyvern fallback)
- Mixed sites (partial VOIX support)
- Dynamic content updates
- Error handling and recovery
"""

import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from typing import Dict, Any

from infrastructure.browser_automation.hybrid_automation import (
    HybridBrowserAutomation,
    AutomationMode,
    AutomationResult
)
from infrastructure.browser_automation.voix_detector import (
    ToolDefinition,
    ContextDefinition,
    VoixDetector
)
from infrastructure.browser_automation.voix_executor import (
    VoixExecutor,
    VoixInvocationResult
)


@pytest.fixture
def hybrid_automation():
    """Create HybridBrowserAutomation instance"""
    return HybridBrowserAutomation(prefer_voix=True)


@pytest.fixture
def voix_enabled_html():
    """Sample HTML with VOIX tags"""
    return """
    <html>
    <head><title>VOIX-Enabled Site</title></head>
    <body>
        <tool name="submit_product" 
              description="Submit a product to directory"
              method="POST"
              endpoint="/api/submit"
              auth="session">
            <parameter name="name" type="string" required="true" />
            <parameter name="description" type="string" required="true" />
        </tool>
        <context name="product_id" value="12345" ttl="3600" />
    </body>
    </html>
    """


@pytest.fixture
def non_voix_html():
    """Sample HTML without VOIX tags"""
    return """
    <html>
    <head><title>Regular Site</title></head>
    <body>
        <form action="/submit" method="post">
            <input name="product_name" type="text" />
            <input name="description" type="text" />
            <button type="submit">Submit</button>
        </form>
    </body>
    </html>
    """


@pytest.mark.asyncio
async def test_voix_enabled_site_detection(hybrid_automation, voix_enabled_html):
    """Test VOIX-enabled site detection"""
    url = "https://voix-enabled.example.com"
    
    # Mock detector to return VOIX tools
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', return_value=[
             ToolDefinition(
                 name="submit_product",
                 description="Submit a product",
                 method="POST",
                 endpoint="/api/submit",
                 auth="session",
                 visible=True,
                 parameters={"name": {"type": "string", "required": True}}
             )
         ]), \
         patch.object(hybrid_automation, '_fetch_page_content', return_value=voix_enabled_html):
        
        tools = await hybrid_automation.detect_voix_tools(url)
        assert tools is not None
        assert len(tools) > 0
        assert tools[0].name == "submit_product"


@pytest.mark.asyncio
async def test_non_voix_site_fallback(hybrid_automation, non_voix_html):
    """Test fallback to Skyvern for non-VOIX sites"""
    url = "https://regular.example.com"
    task = "Submit product to directory"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock detector to return no VOIX support
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=False), \
         patch.object(hybrid_automation, '_fetch_page_content', return_value=non_voix_html), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=AutomationResult(
             success=True,
             mode_used=AutomationMode.SKYVERN,
             data={"submission_id": "12345"},
             latency_ms=2500.0
         )) as mock_skyvern:
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.AUTO
        )
        
        assert result.success is True
        assert result.mode_used == AutomationMode.SKYVERN
        assert result.data is not None
        assert result.data["submission_id"] == "12345"
        mock_skyvern.assert_called_once()


@pytest.mark.asyncio
async def test_mixed_site_partial_voix(hybrid_automation):
    """Test site with partial VOIX support (some tools, not all)"""
    url = "https://mixed.example.com"
    task = "Submit product to directory"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock partial VOIX support (only one tool, but task needs different tool)
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', return_value=[
             ToolDefinition(
                 name="get_status",
                 description="Get product status",
                 method="GET",
                 endpoint="/api/status",
                 auth="none",
                 visible=True,
                 parameters={}
             )
         ]), \
         patch.object(hybrid_automation.voix_executor, 'invoke_tool', side_effect=Exception("Tool not found")), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=AutomationResult(
             success=True,
             mode_used=AutomationMode.SKYVERN,
             data={"submission_id": "12345"},
             latency_ms=2500.0,
             fallback_reason="Required tool not available via VOIX"
         )) as mock_skyvern:
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.AUTO
        )
        
        # Should fallback to Skyvern when VOIX tool not available
        assert result.success is True
        assert result.mode_used == AutomationMode.SKYVERN
        assert result.fallback_reason is not None
        mock_skyvern.assert_called_once()


@pytest.mark.asyncio
async def test_dynamic_content_updates(hybrid_automation):
    """Test handling of dynamic content updates (MutationObserver)"""
    url = "https://dynamic.example.com"
    
    # Mock dynamic content discovery
    initial_tools = [
        ToolDefinition(
            name="initial_tool",
            description="Initial tool",
            method="GET",
            endpoint="/api/initial",
            auth="none",
            visible=True,
            parameters={}
        )
    ]
    
    updated_tools = [
        ToolDefinition(
            name="initial_tool",
            description="Initial tool",
            method="GET",
            endpoint="/api/initial",
            auth="none",
            visible=True,
            parameters={}
        ),
        ToolDefinition(
            name="dynamic_tool",
            description="Dynamically added tool",
            method="POST",
            endpoint="/api/dynamic",
            auth="session",
            visible=True,
            parameters={"value": {"type": "string", "required": True}}
        )
    ]
    
    # Simulate dynamic content discovery
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', side_effect=[
             initial_tools,
             updated_tools
         ]):
        
        # First discovery
        tools1 = await hybrid_automation.detect_voix_tools(url)
        assert len(tools1) == 1
        
        # Clear cache to simulate re-discovery after DOM update
        hybrid_automation.voix_detector.clear_cache()
        
        # Second discovery (after dynamic content)
        tools2 = await hybrid_automation.detect_voix_tools(url)
        assert len(tools2) == 2
        assert any(tool.name == "dynamic_tool" for tool in tools2)


@pytest.mark.asyncio
async def test_error_handling_voix_failure(hybrid_automation):
    """Test error handling when VOIX invocation fails"""
    url = "https://error.example.com"
    task = "Submit product"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock VOIX detection success but invocation failure
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', return_value=[
             ToolDefinition(
                 name="submit_product",
                 description="Submit product",
                 method="POST",
                 endpoint="/api/submit",
                 auth="session",
                 visible=True,
                 parameters={"name": {"type": "string", "required": True}}
             )
         ]), \
         patch.object(hybrid_automation.voix_executor, 'invoke_tool', return_value=VoixInvocationResult(
             success=False,
             tool_name="submit_product",
             error="HTTP 500 Internal Server Error",
             status_code=500
         )), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=AutomationResult(
             success=True,
             mode_used=AutomationMode.SKYVERN,
             data={"submission_id": "12345"},
             latency_ms=2500.0,
             fallback_reason="VOIX invocation failed: HTTP 500 Internal Server Error"
         )) as mock_skyvern:
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.AUTO
        )
        
        # Should fallback to Skyvern on VOIX failure
        assert result.success is True
        assert result.mode_used == AutomationMode.SKYVERN
        assert result.fallback_reason is not None
        assert "VOIX invocation failed" in result.fallback_reason
        mock_skyvern.assert_called_once()


@pytest.mark.asyncio
async def test_error_handling_skyvern_fallback_failure(hybrid_automation):
    """Test error handling when both VOIX and Skyvern fail"""
    url = "https://both-fail.example.com"
    task = "Submit product"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock both VOIX and Skyvern failure
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=False), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=AutomationResult(
             success=False,
             mode_used=AutomationMode.SKYVERN,
             error="Skyvern vision analysis failed",
             latency_ms=5000.0
         )):
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.AUTO
        )
        
        # Should return failure result
        assert result.success is False
        assert result.mode_used == AutomationMode.SKYVERN
        assert result.error is not None
        assert "Skyvern" in result.error


@pytest.mark.asyncio
async def test_error_recovery_retry_logic(hybrid_automation):
    """Test retry logic for transient errors"""
    url = "https://retry.example.com"
    task = "Submit product"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock VOIX invocation with transient failure then success
    invocation_results = [
        VoixInvocationResult(
            success=False,
            tool_name="submit_product",
            error="HTTP 503 Service Unavailable",
            status_code=503
        ),
        VoixInvocationResult(
            success=True,
            tool_name="submit_product",
            response_data={"submission_id": "12345"},
            status_code=200
        )
    ]
    
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', return_value=[
             ToolDefinition(
                 name="submit_product",
                 description="Submit product",
                 method="POST",
                 endpoint="/api/submit",
                 auth="session",
                 visible=True,
                 parameters={"name": {"type": "string", "required": True}}
             )
         ]), \
         patch.object(hybrid_automation.voix_executor, 'invoke_tool', side_effect=invocation_results):
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.VOIX
        )
        
        # Should eventually succeed after retry
        assert result.success is True
        assert result.mode_used == AutomationMode.VOIX
        assert result.data is not None


@pytest.mark.asyncio
async def test_performance_comparison_voix_vs_skyvern(hybrid_automation):
    """Test performance comparison between VOIX and Skyvern"""
    url = "https://performance.example.com"
    task = "Submit product"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock VOIX with fast execution
    voix_result = AutomationResult(
        success=True,
        mode_used=AutomationMode.VOIX,
        data={"submission_id": "12345"},
        latency_ms=150.0,
        voix_tools_found=1
    )
    
    # Mock Skyvern with slower execution
    skyvern_result = AutomationResult(
        success=True,
        mode_used=AutomationMode.SKYVERN,
        data={"submission_id": "12345"},
        latency_ms=2800.0
    )
    
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=True), \
         patch.object(hybrid_automation.voix_detector, 'discover_tools', return_value=[
             ToolDefinition(
                 name="submit_product",
                 description="Submit product",
                 method="POST",
                 endpoint="/api/submit",
                 auth="session",
                 visible=True,
                 parameters={"name": {"type": "string", "required": True}}
             )
         ]), \
         patch.object(hybrid_automation, '_execute_with_voix', return_value=voix_result), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=skyvern_result):
        
        # Test VOIX performance
        voix_result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.VOIX
        )
        
        # Test Skyvern performance
        hybrid_automation.voix_detector.clear_cache()
        skyvern_result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.SKYVERN
        )
        
        # VOIX should be significantly faster
        assert voix_result.latency_ms < skyvern_result.latency_ms
        assert voix_result.latency_ms < 200  # VOIX should be < 200ms
        assert skyvern_result.latency_ms > 2000  # Skyvern typically > 2s


@pytest.mark.asyncio
async def test_backward_compatibility_skyvern_only(hybrid_automation):
    """Test backward compatibility - ensure Skyvern still works when VOIX unavailable"""
    url = "https://legacy.example.com"
    task = "Submit product"
    data = {"name": "MyApp", "description": "A cool app"}
    
    # Mock no VOIX support, only Skyvern
    with patch.object(hybrid_automation.voix_detector, 'detect_voix_support', return_value=False), \
         patch.object(hybrid_automation, '_execute_with_skyvern', return_value=AutomationResult(
             success=True,
             mode_used=AutomationMode.SKYVERN,
             data={"submission_id": "12345"},
             latency_ms=2800.0
         )) as mock_skyvern:
        
        result = await hybrid_automation.execute_task(
            url=url,
            task=task,
            data=data,
            mode=AutomationMode.AUTO
        )
        
        # Should use Skyvern and succeed
        assert result.success is True
        assert result.mode_used == AutomationMode.SKYVERN
        assert result.data is not None
        mock_skyvern.assert_called_once()

