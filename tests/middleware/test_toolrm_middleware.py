"""
Unit tests for ToolRM (Tool Reward Model) Middleware.

Tests multi-factor quality scoring, reflection triggers, execution tracking,
and tool statistics.

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from infrastructure.middleware.toolrm_middleware import ToolRMMiddleware
from infrastructure.middleware.base import ToolCall, ToolResult
from datetime import datetime


# =============================================================================
# INITIALIZATION TESTS (4 tests)
# =============================================================================

def test_toolrm_middleware_initialization():
    """Test ToolRMMiddleware initialization."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        assert middleware.reasoning_bank_dir == Path(tmpdir)
        assert middleware.enable_reflection is True
        assert isinstance(middleware.execution_history, list)
        assert isinstance(middleware.tool_stats, dict)


def test_toolrm_middleware_creates_reasoning_bank():
    """Test that reasoning bank directory is created."""
    with tempfile.TemporaryDirectory() as tmpdir:
        reasoning_dir = Path(tmpdir) / "reasoning_bank"
        middleware = ToolRMMiddleware(reasoning_bank_dir=str(reasoning_dir))

        assert reasoning_dir.exists()


def test_toolrm_middleware_scoring_factors_sum_to_one():
    """Test that scoring factors sum to 1.0."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        total = sum(middleware.scoring_factors.values())
        assert abs(total - 1.0) < 0.001  # Float comparison


def test_toolrm_middleware_disable_reflection():
    """Test initializing with reflection disabled."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(
            reasoning_bank_dir=tmpdir,
            enable_reflection=False
        )

        assert middleware.enable_reflection is False


# =============================================================================
# QUALITY SCORING TESTS (10 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_compute_quality_score_perfect():
    """Test quality scoring for perfect execution."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "x" * 100},  # Good content
            execution_time_ms=500.0,  # Fast
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        score = middleware._compute_quality_score(result)

        # Should be high score
        assert score >= 0.8


@pytest.mark.asyncio
async def test_compute_quality_score_failure():
    """Test quality scoring for failed execution."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result=None,
            execution_time_ms=100.0,
            success=False,
            error="Execution failed",
            timestamp=datetime.now()
        )

        score = middleware._compute_quality_score(result)

        # Should be very low score (failure gets 0.0 for correctness)
        assert score < 0.5


def test_score_latency_fast():
    """Test latency scoring for fast execution (<1s)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        score = middleware._score_latency(500.0)  # 500ms

        assert score == 1.0


def test_score_latency_medium():
    """Test latency scoring for medium execution (1-5s)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        score = middleware._score_latency(3000.0)  # 3s

        assert 0.5 < score < 1.0  # Should be between 0.5 and 1.0


def test_score_latency_slow():
    """Test latency scoring for slow execution (5-10s)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        score = middleware._score_latency(7000.0)  # 7s

        assert 0.2 < score < 0.5  # Should be between 0.2 and 0.5


def test_score_latency_very_slow():
    """Test latency scoring for very slow execution (>10s)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        score = middleware._score_latency(15000.0)  # 15s

        assert score == 0.0


def test_score_completeness_good_result():
    """Test completeness scoring for good result."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "This is good content with meaningful data"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        score = middleware._score_completeness(result)

        assert score > 0.5  # Should pass most checks


def test_score_completeness_empty_result():
    """Test completeness scoring for empty result."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result=None,
            execution_time_ms=100.0,
            success=False,
            error=None,
            timestamp=datetime.now()
        )

        score = middleware._score_completeness(result)

        assert score == 0.0


def test_score_accuracy_valid_result():
    """Test accuracy scoring for valid result."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"status": "success", "data": [1, 2, 3]},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        score = middleware._score_accuracy(result)

        assert score > 0.5  # Should pass most checks


def test_score_accuracy_corrupt_result():
    """Test accuracy scoring for potentially corrupt result."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result="Error: Traceback (most recent call last)...",
            execution_time_ms=100.0,
            success=True,  # Claims success but has error text
            error=None,
            timestamp=datetime.now()
        )

        score = middleware._score_accuracy(result)

        # Should detect error keywords
        assert score < 1.0


# =============================================================================
# QUALITY LEVEL TESTS (5 tests)
# =============================================================================

def test_get_quality_level_excellent():
    """Test quality level classification for excellent score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        level = middleware._get_quality_level(0.95)

        assert level == "excellent"


def test_get_quality_level_good():
    """Test quality level classification for good score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        level = middleware._get_quality_level(0.75)

        assert level == "good"


def test_get_quality_level_acceptable():
    """Test quality level classification for acceptable score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        level = middleware._get_quality_level(0.55)

        assert level == "acceptable"


def test_get_quality_level_poor():
    """Test quality level classification for poor score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        level = middleware._get_quality_level(0.35)

        assert level == "poor"


def test_get_quality_level_failure():
    """Test quality level classification for failure score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        level = middleware._get_quality_level(0.1)

        assert level == "failure"


# =============================================================================
# EXECUTION TRACKING TESTS (8 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_on_tool_call_records_start_time():
    """Test that tool call start time is recorded."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        call = ToolCall(
            tool_name="test_tool",
            agent_name="test_agent",
            arguments={},
            context={},
            timestamp=datetime.now()
        )

        await middleware.on_tool_call(call)

        assert "toolrm_start_time" in call.context


@pytest.mark.asyncio
async def test_on_tool_result_stores_execution_record():
    """Test that execution records are stored."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "test"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check in-memory history
        assert len(middleware.execution_history) == 1
        assert middleware.execution_history[0]["agent"] == "test_agent"
        assert middleware.execution_history[0]["tool"] == "test_tool"


@pytest.mark.asyncio
async def test_on_tool_result_persists_to_disk():
    """Test that execution records are persisted to disk."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "test"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check file was created
        log_file = Path(tmpdir) / "tool_executions.jsonl"
        assert log_file.exists()

        # Check content
        with open(log_file) as f:
            lines = f.readlines()
        assert len(lines) == 1

        record = json.loads(lines[0])
        assert record["agent"] == "test_agent"
        assert record["tool"] == "test_tool"


@pytest.mark.asyncio
async def test_on_tool_result_updates_tool_stats():
    """Test that tool statistics are updated."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "test"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        assert "test_tool" in middleware.tool_stats
        assert middleware.tool_stats["test_tool"]["total_calls"] == 1
        assert middleware.tool_stats["test_tool"]["successful_calls"] == 1


@pytest.mark.asyncio
async def test_on_tool_error_records_failure():
    """Test that tool errors are recorded."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        call = ToolCall(
            tool_name="test_tool",
            agent_name="test_agent",
            arguments={},
            context={},
            timestamp=datetime.now()
        )

        error = Exception("Test error")

        await middleware.on_tool_error(call, error)

        # Check failure was recorded
        assert len(middleware.execution_history) == 1
        assert middleware.execution_history[0]["success"] is False


@pytest.mark.asyncio
async def test_on_tool_error_updates_stats():
    """Test that tool error updates statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        call = ToolCall(
            tool_name="test_tool",
            agent_name="test_agent",
            arguments={},
            context={},
            timestamp=datetime.now()
        )

        error = Exception("Test error")

        await middleware.on_tool_error(call, error)

        assert middleware.tool_stats["test_tool"]["total_calls"] == 1
        assert middleware.tool_stats["test_tool"]["failed_calls"] == 1


@pytest.mark.asyncio
async def test_update_tool_stats_multiple_calls():
    """Test statistics with multiple tool calls."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create 5 successful calls
        for i in range(5):
            result = ToolResult(
                tool_name="test_tool",
                agent_name="test_agent",
                result={"data": f"test {i}"},
                execution_time_ms=100.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        assert middleware.tool_stats["test_tool"]["total_calls"] == 5
        assert middleware.tool_stats["test_tool"]["successful_calls"] == 5
        assert middleware.tool_stats["test_tool"]["avg_score"] > 0


@pytest.mark.asyncio
async def test_update_tool_stats_calculates_average():
    """Test that average score is calculated correctly."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create calls with known scores
        for i in range(3):
            result = ToolResult(
                tool_name="test_tool",
                agent_name="test_agent",
                result={"data": "test"},
                execution_time_ms=100.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        stats = middleware.tool_stats["test_tool"]
        assert stats["total_calls"] == 3
        assert stats["avg_score"] == stats["total_score"] / stats["total_calls"]


# =============================================================================
# REFLECTION TESTS (6 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_trigger_reflection_on_poor_score():
    """Test reflection is triggered on poor scores."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(
            reasoning_bank_dir=tmpdir,
            enable_reflection=True
        )

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result=None,
            execution_time_ms=100.0,
            success=False,
            error="Failed",
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check reflection was queued
        reflection_file = Path(tmpdir) / "reflection_queue.jsonl"
        assert reflection_file.exists()


@pytest.mark.asyncio
async def test_no_reflection_on_good_score():
    """Test reflection is not triggered on good scores."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(
            reasoning_bank_dir=tmpdir,
            enable_reflection=True
        )

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result={"data": "good result"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check reflection was NOT queued
        reflection_file = Path(tmpdir) / "reflection_queue.jsonl"
        assert not reflection_file.exists()


@pytest.mark.asyncio
async def test_reflection_disabled():
    """Test reflection is not triggered when disabled."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(
            reasoning_bank_dir=tmpdir,
            enable_reflection=False  # Disabled
        )

        result = ToolResult(
            tool_name="test_tool",
            agent_name="test_agent",
            result=None,
            execution_time_ms=100.0,
            success=False,
            error="Failed",
            timestamp=datetime.now()
        )

        await middleware.on_tool_result(result)

        # Check reflection was NOT queued
        reflection_file = Path(tmpdir) / "reflection_queue.jsonl"
        assert not reflection_file.exists()


def test_get_reflection_queue():
    """Test retrieving reflection queue."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create reflection queue file
        reflection_file = Path(tmpdir) / "reflection_queue.jsonl"
        with open(reflection_file, "w") as f:
            f.write(json.dumps({"agent": "test_agent", "tool": "test_tool"}) + "\n")
            f.write(json.dumps({"agent": "test_agent2", "tool": "test_tool2"}) + "\n")

        queue = middleware.get_reflection_queue()

        assert len(queue) == 2
        assert queue[0]["agent"] == "test_agent"


def test_clear_reflection_queue():
    """Test clearing reflection queue."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create reflection queue file
        reflection_file = Path(tmpdir) / "reflection_queue.jsonl"
        with open(reflection_file, "w") as f:
            f.write(json.dumps({"agent": "test_agent"}) + "\n")

        assert reflection_file.exists()

        middleware.clear_reflection_queue()

        assert not reflection_file.exists()


def test_get_reflection_queue_empty():
    """Test getting reflection queue when it doesn't exist."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        queue = middleware.get_reflection_queue()

        assert queue == []


# =============================================================================
# STATISTICS API TESTS (7 tests)
# =============================================================================

@pytest.mark.asyncio
async def test_get_tool_statistics_specific_tool():
    """Test getting statistics for specific tool."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        result = ToolResult(
            tool_name="specific_tool",
            agent_name="test_agent",
            result={"data": "test"},
            execution_time_ms=100.0,
            success=True,
            error=None,
            timestamp=datetime.now()
        )
        await middleware.on_tool_result(result)

        stats = middleware.get_tool_statistics("specific_tool")

        assert stats["total_calls"] == 1


@pytest.mark.asyncio
async def test_get_tool_statistics_all_tools():
    """Test getting statistics for all tools."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create executions for multiple tools
        for tool_name in ["tool1", "tool2", "tool3"]:
            result = ToolResult(
                tool_name=tool_name,
                agent_name="test_agent",
                result={"data": "test"},
                execution_time_ms=100.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        stats = middleware.get_tool_statistics()

        assert stats["total_tools"] == 3
        assert "tool1" in stats["tool_stats"]
        assert "tool2" in stats["tool_stats"]
        assert "tool3" in stats["tool_stats"]


def test_get_tool_statistics_nonexistent():
    """Test getting statistics for nonexistent tool."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        stats = middleware.get_tool_statistics("nonexistent_tool")

        assert stats == {}


@pytest.mark.asyncio
async def test_get_recent_executions():
    """Test getting recent execution records."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create 5 executions
        for i in range(5):
            result = ToolResult(
                tool_name=f"tool{i}",
                agent_name="test_agent",
                result={"data": f"test {i}"},
                execution_time_ms=100.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        recent = middleware.get_recent_executions(limit=3)

        assert len(recent) == 3


@pytest.mark.asyncio
async def test_get_recent_executions_filtered():
    """Test getting recent executions filtered by agent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create executions for different agents
        for agent in ["agent1", "agent2"]:
            for i in range(3):
                result = ToolResult(
                    tool_name="test_tool",
                    agent_name=agent,
                    result={"data": "test"},
                    execution_time_ms=100.0,
                    success=True,
                    error=None,
                    timestamp=datetime.now()
                )
                await middleware.on_tool_result(result)

        recent = middleware.get_recent_executions(agent_name="agent1")

        assert len(recent) == 3
        assert all(r["agent"] == "agent1" for r in recent)


def test_reset_statistics():
    """Test resetting all statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Add some data
        middleware.execution_history.append({"test": "data"})
        middleware.tool_stats["test_tool"] = {"total_calls": 10}

        middleware.reset_statistics()

        assert len(middleware.execution_history) == 0
        assert len(middleware.tool_stats) == 0


@pytest.mark.asyncio
async def test_get_recent_executions_default_limit():
    """Test getting recent executions with default limit."""
    with tempfile.TemporaryDirectory() as tmpdir:
        middleware = ToolRMMiddleware(reasoning_bank_dir=tmpdir)

        # Create 150 executions
        for i in range(150):
            result = ToolResult(
                tool_name="test_tool",
                agent_name="test_agent",
                result={"data": f"test {i}"},
                execution_time_ms=100.0,
                success=True,
                error=None,
                timestamp=datetime.now()
            )
            await middleware.on_tool_result(result)

        recent = middleware.get_recent_executions()  # Default limit is 100

        assert len(recent) == 100
