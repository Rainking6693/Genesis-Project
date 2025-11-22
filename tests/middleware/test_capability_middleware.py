"""
Unit tests for Capability Map Middleware.

Tests capability-based tool validation, agent capability profiles,
argument schema validation, and usage tracking.

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from infrastructure.middleware.capability_middleware import CapabilityMapMiddleware
from infrastructure.middleware.base import ToolCall, ToolResult, CapabilityError, ValidationError
from datetime import datetime


# =============================================================================
# INITIALIZATION TESTS (5 tests)
# =============================================================================

def test_capability_middleware_initialization():
    """Test CapabilityMapMiddleware initialization."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        assert middleware.maps_dir == Path(tmpdir)
        assert isinstance(middleware.tool_capabilities, dict)
        assert isinstance(middleware.agent_capabilities, dict)
        assert isinstance(middleware.capability_usage, dict)


def test_capability_middleware_creates_default_maps():
    """Test that default capability maps are created."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Check default files were created
        assert (Path(tmpdir) / "tool_capabilities.json").exists()
        assert (Path(tmpdir) / "agent_capabilities.json").exists()

        # Check some default mappings exist
        assert "Read" in middleware.tool_capabilities
        assert "builder_agent" in middleware.agent_capabilities


def test_capability_middleware_loads_existing_maps():
    """Test loading existing capability maps from disk."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create custom tool capabilities
        tool_caps = {"custom_tool": "custom_capability"}
        with open(Path(tmpdir) / "tool_capabilities.json", "w") as f:
            json.dump(tool_caps, f)

        # Create custom agent capabilities
        agent_caps = {"custom_agent": ["custom_capability"]}
        with open(Path(tmpdir) / "agent_capabilities.json", "w") as f:
            json.dump(agent_caps, f)

        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        assert middleware.tool_capabilities["custom_tool"] == "custom_capability"
        assert "custom_capability" in middleware.agent_capabilities["custom_agent"]


def test_capability_middleware_default_tool_capabilities():
    """Test default tool capability mappings are comprehensive."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Check critical tools are mapped
        assert middleware.tool_capabilities["Read"] == "file_read"
        assert middleware.tool_capabilities["Write"] == "file_write"
        assert middleware.tool_capabilities["Bash"] == "code_execution"
        assert middleware.tool_capabilities["WebFetch"] == "web_access"
        assert middleware.tool_capabilities["DatabaseQuery"] == "database_read"


def test_capability_middleware_default_agent_capabilities():
    """Test default agent capability profiles are comprehensive."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Check critical agents have capabilities
        assert "file_read" in middleware.agent_capabilities["builder_agent"]
        assert "code_execution" in middleware.agent_capabilities["builder_agent"]
        assert "database_read" in middleware.agent_capabilities["backend_agent"]
        assert "deployment" in middleware.agent_capabilities["deploy_agent"]


# =============================================================================
# CAPABILITY VALIDATION TESTS (10 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_on_tool_call_allowed():
    """Test allowed tool call passes validation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Read",
            agent_name="builder_agent",
            arguments={"file_path": "/test/file.py"},
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_denied_missing_capability():
    """Test tool call denied when agent lacks capability."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Deploy",  # Requires "deployment" capability
            agent_name="qa_agent",  # QA agent doesn't have deployment capability
            arguments={},
            context={},
            timestamp=datetime.now()
        )

        with pytest.raises(CapabilityError) as exc_info:
            await middleware.on_tool_call(call)

        assert "lacks capability" in str(exc_info.value)
        assert "deployment" in str(exc_info.value)


@pytest.mark.asyncio
async def test_on_tool_call_no_capability_requirement():
    """Test tool call allowed when no capability requirement is defined."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="UnknownTool",  # No capability requirement
            agent_name="any_agent",
            arguments={},
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception (permissive default)
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_prefix_matching():
    """Test tool name prefix matching for capability lookup."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Bash tool should match "Bash" prefix
        call = ToolCall(
            tool_name="Bash",
            agent_name="builder_agent",
            arguments={"command": "echo test"},
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_argument_validation_missing_field():
    """Test argument validation detects missing required fields."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Read",
            agent_name="builder_agent",
            arguments={},  # Missing "file_path" argument
            context={},
            timestamp=datetime.now()
        )

        with pytest.raises(ValidationError) as exc_info:
            await middleware.on_tool_call(call)

        assert "Missing required argument" in str(exc_info.value)
        assert "file_path" in str(exc_info.value)


@pytest.mark.asyncio
async def test_on_tool_call_argument_validation_wrong_type():
    """Test argument validation detects wrong argument types."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Read",
            agent_name="builder_agent",
            arguments={"file_path": 123},  # Should be string, not int
            context={},
            timestamp=datetime.now()
        )

        with pytest.raises(ValidationError) as exc_info:
            await middleware.on_tool_call(call)

        assert "Invalid type" in str(exc_info.value)


@pytest.mark.asyncio
async def test_on_tool_call_argument_validation_all_fields():
    """Test argument validation passes with all required fields."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Write",
            agent_name="builder_agent",
            arguments={
                "file_path": "/test/file.py",
                "content": "print('hello')"
            },
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_no_schema_defined():
    """Test argument validation skipped when no schema is defined."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Add tool with capability that has no schema
        middleware.add_tool_capability("CustomTool", "custom_capability")
        middleware.add_agent_capability("test_agent", "custom_capability")

        call = ToolCall(
            tool_name="CustomTool",
            agent_name="test_agent",
            arguments={"any_arg": "any_value"},  # No schema validation
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_multiple_arguments():
    """Test argument validation with multiple required fields."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Edit",
            agent_name="builder_agent",
            arguments={
                "file_path": "/test/file.py",
                "old_string": "old",
                "new_string": "new"
            },
            context={},
            timestamp=datetime.now()
        )

        # Should not raise exception
        await middleware.on_tool_call(call)


@pytest.mark.asyncio
async def test_on_tool_call_unknown_agent():
    """Test tool call from unknown agent (should deny)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="DatabaseWrite",
            agent_name="unknown_agent",  # Not in agent_capabilities
            arguments={"query": "INSERT INTO test VALUES (1)"},
            context={},
            timestamp=datetime.now()
        )

        with pytest.raises(CapabilityError):
            await middleware.on_tool_call(call)


# =============================================================================
# USAGE TRACKING TESTS (7 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_on_tool_result_tracks_usage():
    """Test successful tool execution is tracked."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        result = ToolResult(
            tool_name="Read",
            agent_name="builder_agent",
            result={"content": "file contents"},
            execution_time_ms=50.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check usage was tracked
        assert "builder_agent" in middleware.capability_usage
        assert "file_read" in middleware.capability_usage["builder_agent"]
        assert middleware.capability_usage["builder_agent"]["file_read"]["total"] == 1
        assert middleware.capability_usage["builder_agent"]["file_read"]["success"] == 1


@pytest.mark.asyncio
async def test_on_tool_result_tracks_failure():
    """Test failed tool execution is tracked."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        result = ToolResult(
            tool_name="Write",
            agent_name="builder_agent",
            result=None,
            execution_time_ms=100.0,
            success=False,
            error="Permission denied",
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check failure was tracked
        assert middleware.capability_usage["builder_agent"]["file_write"]["total"] == 1
        assert middleware.capability_usage["builder_agent"]["file_write"]["failure"] == 1
        assert middleware.capability_usage["builder_agent"]["file_write"]["success"] == 0


@pytest.mark.asyncio
async def test_on_tool_result_multiple_executions():
    """Test tracking multiple executions of same capability."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        for i in range(5):
            result = ToolResult(
                tool_name="Read",
                agent_name="builder_agent",
                result={"content": f"file {i}"},
                execution_time_ms=50.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        # Check total count
        assert middleware.capability_usage["builder_agent"]["file_read"]["total"] == 5
        assert middleware.capability_usage["builder_agent"]["file_read"]["success"] == 5


@pytest.mark.asyncio
async def test_on_tool_result_no_capability_requirement():
    """Test tracking skipped when tool has no capability requirement."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        result = ToolResult(
            tool_name="UnknownTool",
            agent_name="test_agent",
            result={"data": "test"},
            execution_time_ms=50.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # No usage should be tracked
        assert "test_agent" not in middleware.capability_usage


@pytest.mark.asyncio
async def test_on_tool_error_tracks_failure():
    """Test tool error is tracked as failure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        call = ToolCall(
            tool_name="Read",
            agent_name="builder_agent",
            arguments={"file_path": "/nonexistent.py"},
            context={},
            timestamp=datetime.now()
        )

        error = FileNotFoundError("File not found")

        await middleware.on_tool_error(call, error)

        # Check error was tracked
        assert middleware.capability_usage["builder_agent"]["file_read"]["total"] == 1
        assert middleware.capability_usage["builder_agent"]["file_read"]["failure"] == 1


@pytest.mark.asyncio
async def test_get_statistics():
    """Test retrieving capability usage statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Create some usage
        for i in range(3):
            result = ToolResult(
                tool_name="Read",
                agent_name="builder_agent",
                result={"content": f"file {i}"},
                execution_time_ms=50.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        stats = middleware.get_statistics()

        assert stats["total_agents"] == 1
        assert stats["total_usage"] == 3
        assert "builder_agent" in stats["agent_usage"]


@pytest.mark.asyncio
async def test_reset_statistics():
    """Test resetting usage statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Create some usage
        result = ToolResult(
            tool_name="Read",
            agent_name="builder_agent",
            result={"content": "test"},
            execution_time_ms=50.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )
        await middleware.on_tool_result(result)

        assert len(middleware.capability_usage) > 0

        middleware.reset_statistics()

        assert len(middleware.capability_usage) == 0


# =============================================================================
# CAPABILITY MANAGEMENT TESTS (8 tests)
# =============================================================================

def test_add_tool_capability():
    """Test adding a new tool capability mapping."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        middleware.add_tool_capability("NewTool", "new_capability")

        assert middleware.tool_capabilities["NewTool"] == "new_capability"

        # Check it was saved to disk
        with open(Path(tmpdir) / "tool_capabilities.json") as f:
            saved = json.load(f)
        assert saved["NewTool"] == "new_capability"


def test_add_agent_capability():
    """Test adding a capability to an agent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        middleware.add_agent_capability("test_agent", "new_capability")

        assert "new_capability" in middleware.agent_capabilities["test_agent"]

        # Check it was saved to disk
        with open(Path(tmpdir) / "agent_capabilities.json") as f:
            saved = json.load(f)
        assert "new_capability" in saved["test_agent"]


def test_add_agent_capability_to_new_agent():
    """Test adding capability to previously unknown agent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        middleware.add_agent_capability("new_agent", "some_capability")

        assert "new_agent" in middleware.agent_capabilities
        assert "some_capability" in middleware.agent_capabilities["new_agent"]


def test_add_agent_capability_duplicate():
    """Test adding duplicate capability is idempotent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        middleware.add_agent_capability("test_agent", "capability1")
        middleware.add_agent_capability("test_agent", "capability1")  # Duplicate

        # Should only have one instance
        assert middleware.agent_capabilities["test_agent"].count("capability1") == 1


def test_remove_agent_capability():
    """Test removing a capability from an agent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Add then remove
        middleware.add_agent_capability("test_agent", "temp_capability")
        assert "temp_capability" in middleware.agent_capabilities["test_agent"]

        middleware.remove_agent_capability("test_agent", "temp_capability")
        assert "temp_capability" not in middleware.agent_capabilities["test_agent"]


def test_remove_agent_capability_nonexistent():
    """Test removing nonexistent capability doesn't error."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Should not raise exception
        middleware.remove_agent_capability("test_agent", "nonexistent_capability")


def test_remove_agent_capability_from_nonexistent_agent():
    """Test removing capability from nonexistent agent doesn't error."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Should not raise exception
        middleware.remove_agent_capability("nonexistent_agent", "some_capability")


def test_update_tool_capability():
    """Test updating an existing tool capability mapping."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = CapabilityMapMiddleware(maps_dir=tmpdir)

        # Add initial mapping
        middleware.add_tool_capability("Tool1", "capability1")
        assert middleware.tool_capabilities["Tool1"] == "capability1"

        # Update to new capability
        middleware.add_tool_capability("Tool1", "capability2")
        assert middleware.tool_capabilities["Tool1"] == "capability2"
