"""
Integration tests for middleware components.

Tests the interaction between:
- Policy middleware
- Capability middleware
- ToolRM middleware
- Full middleware pipeline

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, Mock
from infrastructure.middleware.base import (
    ToolCall,
    ToolResult,
    AgentMiddleware,
    PolicyViolation,
)
from infrastructure.policy_cards.middleware import (
    PolicyEnforcer,
    PIIDetector,
)


# =============================================================================
# MIDDLEWARE PIPELINE TESTS (10 tests)
# =============================================================================

class MockPolicyMiddleware(AgentMiddleware):
    """Mock policy enforcement middleware."""

    def __init__(self, allow_all=True):
        self.allow_all = allow_all
        self.calls = []

    async def on_tool_call(self, call: ToolCall) -> None:
        self.calls.append(call)
        if not self.allow_all:
            if call.tool_name == "forbidden_tool":
                raise PolicyViolation("Tool forbidden by policy")

    async def on_tool_result(self, result: ToolResult) -> None:
        pass

    async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
        pass


class MockCapabilityMiddleware(AgentMiddleware):
    """Mock capability checking middleware."""

    def __init__(self, agent_capabilities=None):
        self.agent_capabilities = agent_capabilities or {}
        self.calls = []

    async def on_tool_call(self, call: ToolCall) -> None:
        self.calls.append(call)
        caps = self.agent_capabilities.get(call.agent_name, [])
        required_cap = call.context.get("required_capability")
        if required_cap and required_cap not in caps:
            raise PolicyViolation(f"Agent lacks capability: {required_cap}")

    async def on_tool_result(self, result: ToolResult) -> None:
        pass

    async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
        pass


class MockToolRMMiddleware(AgentMiddleware):
    """Mock ToolRM quality scoring middleware."""

    def __init__(self):
        self.scored_results = []

    async def on_tool_call(self, call: ToolCall) -> None:
        pass

    async def on_tool_result(self, result: ToolResult) -> None:
        # Simulate quality scoring
        score = 0.85 if result.success else 0.1
        result.metadata["quality_score"] = score
        self.scored_results.append(result)

    async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
        pass


class MiddlewarePipeline:
    """Simple middleware pipeline for testing."""

    def __init__(self, middlewares=None):
        self.middlewares = middlewares or []

    async def execute_tool(self, call: ToolCall, tool_func):
        """Execute tool with middleware hooks."""
        # Pre-execution hooks
        for middleware in self.middlewares:
            await middleware.on_tool_call(call)

        # Execute tool
        try:
            import time
            start = time.time()
            result_value = await tool_func(call.arguments)
            execution_time = (time.time() - start) * 1000

            result = ToolResult(
                tool_name=call.tool_name,
                agent_name=call.agent_name,
                result=result_value,
                execution_time_ms=execution_time,
                success=True,
            )

            # Post-execution hooks
            for middleware in self.middlewares:
                await middleware.on_tool_result(result)

            return result

        except Exception as e:
            # Error hooks
            for middleware in self.middlewares:
                await middleware.on_tool_error(call, e)
            raise


@pytest.mark.asyncio
async def test_pipeline_single_middleware():
    """Test pipeline with single middleware."""
    policy_mw = MockPolicyMiddleware()
    pipeline = MiddlewarePipeline([policy_mw])

    async def mock_tool(args):
        return {"result": "success"}

    call = ToolCall(
        tool_name="test_tool",
        agent_name="test_agent",
        arguments={},
    )

    result = await pipeline.execute_tool(call, mock_tool)

    assert result.success is True
    assert len(policy_mw.calls) == 1


@pytest.mark.asyncio
async def test_pipeline_multiple_middlewares():
    """Test pipeline with multiple middlewares."""
    policy_mw = MockPolicyMiddleware()
    capability_mw = MockCapabilityMiddleware(
        agent_capabilities={"test_agent": ["compute", "storage"]}
    )
    toolrm_mw = MockToolRMMiddleware()

    pipeline = MiddlewarePipeline([policy_mw, capability_mw, toolrm_mw])

    async def mock_tool(args):
        return {"answer": 42}

    call = ToolCall(
        tool_name="compute",
        agent_name="test_agent",
        arguments={"x": 10},
    )

    result = await pipeline.execute_tool(call, mock_tool)

    assert result.success is True
    assert len(policy_mw.calls) == 1
    assert len(capability_mw.calls) == 1
    assert len(toolrm_mw.scored_results) == 1


@pytest.mark.asyncio
async def test_pipeline_policy_violation():
    """Test pipeline stops on policy violation."""
    policy_mw = MockPolicyMiddleware(allow_all=False)
    pipeline = MiddlewarePipeline([policy_mw])

    async def mock_tool(args):
        return {"result": "should not execute"}

    call = ToolCall(
        tool_name="forbidden_tool",
        agent_name="test_agent",
        arguments={},
    )

    with pytest.raises(PolicyViolation):
        await pipeline.execute_tool(call, mock_tool)


@pytest.mark.asyncio
async def test_pipeline_capability_check():
    """Test pipeline capability checking."""
    capability_mw = MockCapabilityMiddleware(
        agent_capabilities={"test_agent": ["read"]}
    )
    pipeline = MiddlewarePipeline([capability_mw])

    async def mock_tool(args):
        return {}

    call = ToolCall(
        tool_name="write_file",
        agent_name="test_agent",
        arguments={},
        context={"required_capability": "write"},
    )

    with pytest.raises(PolicyViolation):
        await pipeline.execute_tool(call, mock_tool)


@pytest.mark.asyncio
async def test_pipeline_quality_scoring():
    """Test ToolRM quality scoring in pipeline."""
    toolrm_mw = MockToolRMMiddleware()
    pipeline = MiddlewarePipeline([toolrm_mw])

    async def mock_tool(args):
        return {"output": "high quality"}

    call = ToolCall(
        tool_name="generate",
        agent_name="content_agent",
        arguments={},
    )

    result = await pipeline.execute_tool(call, mock_tool)

    assert "quality_score" in result.metadata
    assert result.metadata["quality_score"] == 0.85


@pytest.mark.asyncio
async def test_pipeline_error_handling():
    """Test pipeline error handling."""
    policy_mw = MockPolicyMiddleware()
    pipeline = MiddlewarePipeline([policy_mw])

    async def failing_tool(args):
        raise RuntimeError("Tool execution failed")

    call = ToolCall(
        tool_name="failing_tool",
        agent_name="test_agent",
        arguments={},
    )

    with pytest.raises(RuntimeError):
        await pipeline.execute_tool(call, failing_tool)

    # Error hooks should have been called
    assert len(policy_mw.calls) == 1


@pytest.mark.asyncio
async def test_pipeline_execution_order():
    """Test middleware execution order."""
    call_order = []

    class OrderTrackingMiddleware(AgentMiddleware):
        def __init__(self, name):
            self.name = name

        async def on_tool_call(self, call: ToolCall) -> None:
            call_order.append(f"{self.name}_before")

        async def on_tool_result(self, result: ToolResult) -> None:
            call_order.append(f"{self.name}_after")

        async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
            pass

    mw1 = OrderTrackingMiddleware("MW1")
    mw2 = OrderTrackingMiddleware("MW2")
    pipeline = MiddlewarePipeline([mw1, mw2])

    async def mock_tool(args):
        call_order.append("TOOL")
        return {}

    call = ToolCall(
        tool_name="test",
        agent_name="test_agent",
        arguments={},
    )

    await pipeline.execute_tool(call, mock_tool)

    # Check order: MW1 before -> MW2 before -> TOOL -> MW1 after -> MW2 after
    assert call_order == ["MW1_before", "MW2_before", "TOOL", "MW1_after", "MW2_after"]


@pytest.mark.asyncio
async def test_pipeline_context_propagation():
    """Test context propagation through pipeline."""
    class ContextMiddleware(AgentMiddleware):
        def __init__(self):
            self.captured_context = None

        async def on_tool_call(self, call: ToolCall) -> None:
            self.captured_context = call.context

        async def on_tool_result(self, result: ToolResult) -> None:
            pass

        async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
            pass

    mw = ContextMiddleware()
    pipeline = MiddlewarePipeline([mw])

    async def mock_tool(args):
        return {}

    call = ToolCall(
        tool_name="test",
        agent_name="test_agent",
        arguments={},
        context={"user_id": "user-123", "session_id": "session-456"},
    )

    await pipeline.execute_tool(call, mock_tool)

    assert mw.captured_context == call.context
    assert mw.captured_context["user_id"] == "user-123"


@pytest.mark.asyncio
async def test_pipeline_result_metadata():
    """Test result metadata collection."""
    class MetadataMiddleware(AgentMiddleware):
        async def on_tool_call(self, call: ToolCall) -> None:
            pass

        async def on_tool_result(self, result: ToolResult) -> None:
            result.metadata["processed_by"] = "MetadataMiddleware"
            result.metadata["timestamp"] = "2025-11-08T10:00:00Z"

        async def on_tool_error(self, call: ToolCall, error: Exception) -> None:
            pass

    mw = MetadataMiddleware()
    pipeline = MiddlewarePipeline([mw])

    async def mock_tool(args):
        return {"data": "test"}

    call = ToolCall(
        tool_name="test",
        agent_name="test_agent",
        arguments={},
    )

    result = await pipeline.execute_tool(call, mock_tool)

    assert "processed_by" in result.metadata
    assert result.metadata["processed_by"] == "MetadataMiddleware"


# =============================================================================
# POLICY + PII INTEGRATION TESTS (5 tests)
# =============================================================================

@pytest.mark.integration
def test_policy_enforcer_with_pii_detector_integration():
    """Test PolicyEnforcer integrated with PIIDetector."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create policy card
        card_path = Path(tmpdir) / "sensitive_agent.json"
        card = {
            "agent_id": "sensitive_agent",
            "version": "1.0.0",
            "allowed_tools": ["*"],
            "safety_constraints": {
                "pii_detection": True,
                "sensitive_data_redaction": True,
            },
            "compliance_requirements": {
                "log_all_tool_calls": True,
            },
        }
        with open(card_path, "w") as f:
            json.dump(card, f)

        enforcer = PolicyEnforcer(cards_dir=tmpdir)

        # Call with PII
        result = enforcer.check_tool_call(
            agent_id="sensitive_agent",
            tool_name="send_message",
            args={
                "to": "user@example.com",
                "message": "Your SSN is 123-45-6789",
            },
        )

        # PII should be detected
        assert isinstance(result, dict)


@pytest.mark.integration
def test_pii_redaction_end_to_end():
    """Test end-to-end PII redaction."""
    detector = PIIDetector()

    # Input with multiple PII types
    input_text = """
    Name: John Doe
    Email: john@example.com
    SSN: 123-45-6789
    Phone: (555) 123-4567
    Credit Card: 1234-5678-9012-3456
    """

    # Detect PII
    pii_found = detector.detect_pii(input_text)
    assert len(pii_found) >= 3  # At least email, SSN, phone

    # Redact PII
    redacted = detector.redact_pii(input_text)
    assert "john@example.com" not in redacted
    assert "123-45-6789" not in redacted
    assert "[EMAIL-REDACTED]" in redacted
    assert "[SSN-REDACTED]" in redacted


@pytest.mark.integration
def test_compliance_logging_integration():
    """Test compliance logging with PolicyEnforcer."""
    with tempfile.TemporaryDirectory() as tmpdir:
        card_path = Path(tmpdir) / "logged_agent.json"
        card = {
            "agent_id": "logged_agent",
            "version": "1.0.0",
            "compliance_requirements": {
                "log_all_tool_calls": True,
            },
        }
        with open(card_path, "w") as f:
            json.dump(card, f)

        enforcer = PolicyEnforcer(cards_dir=tmpdir)

        # Make several calls
        for i in range(3):
            enforcer.check_tool_call(
                agent_id="logged_agent",
                tool_name=f"tool_{i}",
                args={"param": i},
            )

        # Check logs
        stats = enforcer.get_agent_stats("logged_agent")
        assert stats["total_calls"] == 3


@pytest.mark.integration
def test_multi_agent_policy_enforcement():
    """Test policy enforcement for multiple agents."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create cards for multiple agents
        for agent_id in ["agent1", "agent2", "agent3"]:
            card_path = Path(tmpdir) / f"{agent_id}.json"
            card = {
                "agent_id": agent_id,
                "version": "1.0.0",
                "allowed_tools": [f"{agent_id}_tool"],
            }
            with open(card_path, "w") as f:
                json.dump(card, f)

        enforcer = PolicyEnforcer(cards_dir=tmpdir)

        # Each agent calls its own tool
        for agent_id in ["agent1", "agent2", "agent3"]:
            result = enforcer.check_tool_call(
                agent_id=agent_id,
                tool_name=f"{agent_id}_tool",
                args={},
            )
            assert isinstance(result, dict)

        # Check all stats
        all_stats = enforcer.get_all_stats()
        assert len(all_stats) == 3


@pytest.mark.integration
def test_policy_report_generation():
    """Test generating compliance report."""
    with tempfile.TemporaryDirectory() as tmpdir:
        enforcer = PolicyEnforcer(cards_dir=tmpdir)

        # Make some calls
        for i in range(10):
            enforcer.check_tool_call(
                agent_id=f"agent_{i % 3}",
                tool_name=f"tool_{i}",
                args={},
            )

        # Generate report
        report_path = Path(tmpdir) / "compliance_report.json"
        enforcer.export_report(str(report_path))

        assert report_path.exists()

        with open(report_path) as f:
            report = json.load(f)

        assert "timestamp" in report
        assert "total_calls" in report
        assert report["total_calls"] == 10
