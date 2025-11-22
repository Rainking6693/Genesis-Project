"""
Unit tests for base middleware framework.

Tests:
- ToolCall dataclass
- ToolResult dataclass
- AgentMiddleware abstract base class
- Exception types

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock
from infrastructure.middleware.base import (
    ToolCall,
    ToolResult,
    AgentMiddleware,
    PolicyViolation,
    CapabilityError,
    ValidationError,
)


# =============================================================================
# TOOLCALL DATACLASS TESTS (4 tests)
# =============================================================================

def test_tool_call_creation():
    """Test ToolCall dataclass creation."""
    call = ToolCall(
        tool_name="test_tool",
        agent_name="test_agent",
        arguments={"arg1": "value1"},
    )

    assert call.tool_name == "test_tool"
    assert call.agent_name == "test_agent"
    assert call.arguments == {"arg1": "value1"}
    assert call.context == {}
    assert isinstance(call.timestamp, datetime)


def test_tool_call_with_context():
    """Test ToolCall with custom context."""
    context = {"execution_id": "exec-123", "user_id": "user-456"}
    call = ToolCall(
        tool_name="search",
        agent_name="analyst",
        arguments={"query": "test"},
        context=context,
    )

    assert call.context == context
    assert call.context["execution_id"] == "exec-123"


def test_tool_call_with_custom_timestamp():
    """Test ToolCall with custom timestamp."""
    custom_time = datetime(2025, 1, 1, 12, 0, 0)
    call = ToolCall(
        tool_name="tool",
        agent_name="agent",
        arguments={},
        timestamp=custom_time,
    )

    assert call.timestamp == custom_time


def test_tool_call_immutability():
    """Test ToolCall dataclass is frozen (should be mutable by default)."""
    call = ToolCall(
        tool_name="tool1",
        agent_name="agent1",
        arguments={"a": 1},
    )

    # Dataclasses are mutable by default unless frozen=True
    call.context["new_key"] = "new_value"
    assert "new_key" in call.context


# =============================================================================
# TOOLRESULT DATACLASS TESTS (3 tests)
# =============================================================================

def test_tool_result_success():
    """Test ToolResult for successful execution."""
    result = ToolResult(
        tool_name="compute",
        agent_name="builder",
        result={"answer": 42},
        execution_time_ms=125.5,
        success=True,
    )

    assert result.success is True
    assert result.error is None
    assert result.result == {"answer": 42}
    assert result.execution_time_ms == 125.5


def test_tool_result_failure():
    """Test ToolResult for failed execution."""
    result = ToolResult(
        tool_name="deploy",
        agent_name="deploy_agent",
        result=None,
        execution_time_ms=50.0,
        success=False,
        error="Connection timeout",
    )

    assert result.success is False
    assert result.error == "Connection timeout"
    assert result.result is None


def test_tool_result_with_metadata():
    """Test ToolResult with metadata."""
    metadata = {
        "model": "gpt-4o",
        "tokens_used": 150,
        "retry_count": 2,
    }
    result = ToolResult(
        tool_name="generate",
        agent_name="content",
        result="Generated content",
        execution_time_ms=500.0,
        success=True,
        metadata=metadata,
    )

    assert result.metadata == metadata
    assert result.metadata["tokens_used"] == 150


# =============================================================================
# AGENTMIDDLEWARE ABSTRACT CLASS TESTS (3 tests)
# =============================================================================

class ConcreteMiddleware(AgentMiddleware):
    """Concrete implementation for testing."""

    def __init__(self):
        self.calls_received = []
        self.results_received = []
        self.errors_received = []

    async def on_tool_call(self, call: ToolCall) -> None:
        self.calls_received.append(call)

    async def on_tool_result(self, result: ToolResult) -> None:
        self.results_received.append(result)

    async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
        self.errors_received.append((call, error))


@pytest.mark.asyncio
async def test_middleware_on_tool_call():
    """Test middleware on_tool_call hook."""
    middleware = ConcreteMiddleware()
    call = ToolCall(
        tool_name="test",
        agent_name="test_agent",
        arguments={},
    )

    await middleware.on_tool_call(call)

    assert len(middleware.calls_received) == 1
    assert middleware.calls_received[0].tool_name == "test"


@pytest.mark.asyncio
async def test_middleware_on_tool_result():
    """Test middleware on_tool_result hook."""
    middleware = ConcreteMiddleware()
    result = ToolResult(
        tool_name="test",
        agent_name="test_agent",
        result="success",
        execution_time_ms=100.0,
        success=True,
    )

    await middleware.on_tool_result(result)

    assert len(middleware.results_received) == 1
    assert middleware.results_received[0].success is True


@pytest.mark.asyncio
async def test_middleware_on_tool_error():
    """Test middleware on_tool_error hook."""
    middleware = ConcreteMiddleware()
    call = ToolCall(
        tool_name="test",
        agent_name="test_agent",
        arguments={},
    )
    error = RuntimeError("Test error")

    await middleware.on_tool_error(call, error)

    assert len(middleware.errors_received) == 1
    assert middleware.errors_received[0][1].args[0] == "Test error"


# =============================================================================
# EXCEPTION TYPES TESTS (3 tests)
# =============================================================================

def test_policy_violation_exception():
    """Test PolicyViolation exception."""
    with pytest.raises(PolicyViolation) as exc_info:
        raise PolicyViolation("Tool not allowed by policy")

    assert "not allowed" in str(exc_info.value)


def test_capability_error_exception():
    """Test CapabilityError exception."""
    with pytest.raises(CapabilityError) as exc_info:
        raise CapabilityError("Agent lacks required capability")

    assert "capability" in str(exc_info.value)


def test_validation_error_exception():
    """Test ValidationError exception."""
    with pytest.raises(ValidationError) as exc_info:
        raise ValidationError("Invalid argument type")

    assert "Invalid" in str(exc_info.value)


# =============================================================================
# EDGE CASES (2 tests)
# =============================================================================

def test_tool_call_empty_arguments():
    """Test ToolCall with empty arguments."""
    call = ToolCall(
        tool_name="no_args_tool",
        agent_name="test",
        arguments={},
    )

    assert call.arguments == {}
    assert isinstance(call.arguments, dict)


def test_tool_result_none_result():
    """Test ToolResult with None as result."""
    result = ToolResult(
        tool_name="void_tool",
        agent_name="test",
        result=None,
        execution_time_ms=10.0,
        success=True,
    )

    assert result.result is None
    assert result.success is True
