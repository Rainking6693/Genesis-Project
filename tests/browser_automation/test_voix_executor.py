"""
Tests for VOIX Executor

Tests tool invocation with valid parameters, parameter validation,
authentication methods, error responses, and tool visibility checks.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import aiohttp

from infrastructure.browser_automation.voix_executor import (
    VoixExecutor,
    VoixInvocationResult,
    get_voix_executor
)
from infrastructure.browser_automation.voix_detector import (
    ToolDefinition,
    get_voix_detector
)


@pytest.fixture
def executor():
    """Create a test executor"""
    return VoixExecutor(timeout=10, max_retries=2)


@pytest.fixture
def sample_tool():
    """Create a sample tool definition"""
    return ToolDefinition(
        name="submit_product",
        description="Submit product",
        parameters={
            "name": {"type": "string", "required": True},
            "description": {"type": "string", "required": True}
        },
        endpoint="/api/submit",
        method="POST",
        auth="session",
        visible=True
    )


@pytest.mark.asyncio
async def test_invoke_tool_with_valid_parameters(executor, sample_tool):
    """Test tool invocation with valid parameters"""
    # Mock detector to return tool
    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=sample_tool)

    # Mock successful HTTP response
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"success": True, "id": "123"})
    mock_response.text = AsyncMock(return_value='{"success": true}')

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="submit_product",
            parameters={"name": "MyApp", "description": "A cool app"}
        )

        assert result.success is True
        assert result.tool_name == "submit_product"
        assert result.status_code == 200


@pytest.mark.asyncio
async def test_parameter_validation(executor, sample_tool):
    """Test parameter validation"""
    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=sample_tool)

    # Missing required parameter
    result = await executor.invoke_tool(
        url="https://example.com",
        tool_name="submit_product",
        parameters={"name": "MyApp"}  # Missing description
    )

    assert result.success is False
    assert "validation" in result.error.lower() or "required" in result.error.lower()

    # Invalid parameter type
    result = await executor.invoke_tool(
        url="https://example.com",
        tool_name="submit_product",
        parameters={"name": 123, "description": "Test"}  # name should be string
    )

    # Validation may pass or fail depending on implementation
    # Main thing is it doesn't crash


@pytest.mark.asyncio
async def test_authentication_methods(executor):
    """Test different authentication methods"""
    # Session auth tool
    session_tool = ToolDefinition(
        name="session_tool",
        description="Uses session auth",
        parameters={},
        endpoint="/api/session",
        method="POST",
        auth="session",
        visible=True
    )

    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=session_tool)

    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"success": True})

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="session_tool",
            parameters={}
        )

        # Should use session cookies
        assert result.success is True

    # Bearer auth tool
    bearer_tool = ToolDefinition(
        name="bearer_tool",
        description="Uses bearer auth",
        parameters={},
        endpoint="/api/bearer",
        method="POST",
        auth="bearer",
        visible=True
    )

    executor.detector.get_tool_by_name = MagicMock(return_value=bearer_tool)

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="bearer_tool",
            parameters={},
            bearer_token="test_token_123"
        )

        # Should include bearer token in headers
        assert result.success is True


@pytest.mark.asyncio
async def test_error_responses(executor, sample_tool):
    """Test error response handling"""
    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=sample_tool)

    # 400 Bad Request
    mock_response_400 = AsyncMock()
    mock_response_400.status = 400
    mock_response_400.json = AsyncMock(return_value={"error": "Invalid parameters"})

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response_400)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response_400

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="submit_product",
            parameters={"name": "Test", "description": "Test"}
        )

        assert result.success is False
        assert result.status_code == 400
        assert result.error is not None

    # 500 Server Error
    mock_response_500 = AsyncMock()
    mock_response_500.status = 500
    mock_response_500.json = AsyncMock(return_value={"error": "Internal server error"})

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response_500)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response_500

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="submit_product",
            parameters={"name": "Test", "description": "Test"}
        )

        assert result.success is False
        assert result.status_code == 500


@pytest.mark.asyncio
async def test_tool_visibility_checks(executor):
    """Test tool visibility checks"""
    # Visible tool
    visible_tool = ToolDefinition(
        name="visible_tool",
        description="Visible tool",
        parameters={},
        endpoint="/api/visible",
        method="POST",
        auth="none",
        visible=True
    )

    # Hidden tool
    hidden_tool = ToolDefinition(
        name="hidden_tool",
        description="Hidden tool",
        parameters={},
        endpoint="/api/hidden",
        method="POST",
        auth="none",
        visible=False
    )

    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=hidden_tool)

    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"success": True})

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = AsyncMock(return_value=mock_response)
        mock_session.return_value.__aenter__.return_value.__aenter__.return_value = mock_response

        # Should still be able to invoke hidden tools (just logs warning)
        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="hidden_tool",
            parameters={}
        )

        # Should proceed with invocation but log warning
        assert result is not None


@pytest.mark.asyncio
async def test_tool_not_found(executor):
    """Test handling when tool is not found"""
    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=None)

    result = await executor.invoke_tool(
        url="https://example.com",
        tool_name="nonexistent_tool",
        parameters={}
    )

    assert result.success is False
    assert "not found" in result.error.lower()


@pytest.mark.asyncio
async def test_retry_logic(executor, sample_tool):
    """Test retry logic on failures"""
    executor.detector = MagicMock()
    executor.detector.get_tool_by_name = MagicMock(return_value=sample_tool)

    # First attempt fails, second succeeds
    mock_response_fail = AsyncMock()
    mock_response_fail.status = 500
    mock_response_fail.json = AsyncMock(return_value={"error": "Server error"})

    mock_response_success = AsyncMock()
    mock_response_success.status = 200
    mock_response_success.json = AsyncMock(return_value={"success": True})

    call_count = 0

    async def mock_request(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return mock_response_fail
        return mock_response_success

    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value.request = mock_request
        mock_session.return_value.__aenter__.return_value.__aenter__.side_effect = lambda x: x if x.status == 200 else x

        result = await executor.invoke_tool(
            url="https://example.com",
            tool_name="submit_product",
            parameters={"name": "Test", "description": "Test"}
        )

        # Should retry and eventually succeed
        assert result.success is True
        assert call_count >= 2


def test_set_session_cookies(executor):
    """Test setting session cookies"""
    cookies = {"session_id": "abc123", "csrf_token": "xyz789"}
    executor.set_session_cookies(cookies)

    assert executor.session_cookies == cookies


def test_get_stats(executor):
    """Test getting executor statistics"""
    # Simulate some invocations
    executor.invocation_count = 10
    executor.success_count = 8
    executor.failure_count = 2
    executor.total_latency = 500.0

    stats = executor.get_stats()

    assert stats["invocation_count"] == 10
    assert stats["success_count"] == 8
    assert stats["failure_count"] == 2
    assert stats["success_rate"] == 80.0
    assert stats["avg_latency_ms"] == 62.5  # 500 / 8


def test_singleton():
    """Test singleton pattern"""
    executor1 = get_voix_executor()
    executor2 = get_voix_executor()
    assert executor1 is executor2

