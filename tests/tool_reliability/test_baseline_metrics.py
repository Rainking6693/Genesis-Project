"""
Tests for DeepEyesV2 Tool Reliability - Baseline Metrics

Tests baseline metrics collection and reporting.
"""

import pytest
import asyncio
import json
from pathlib import Path
import tempfile

from infrastructure.tool_reliability.baseline_metrics import (
    BaselineMetricsCollector,
    ToolInvocation,
    ToolFailureType,
    AgentToolMetrics,
)


@pytest.fixture
def collector():
    """Create a test collector"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield BaselineMetricsCollector(metrics_dir=tmpdir)


@pytest.mark.asyncio
async def test_record_invocation_success(collector):
    """Test recording successful invocation"""
    invocation = await collector.record_invocation(
        agent_name="builder_agent",
        tool_name="code_executor",
        task="Execute Python code",
        parameters={"code": "print('hello')"},
        success=True,
        status_code=200,
        latency_ms=45.2,
        result={"output": "hello"},
    )

    assert invocation.success is True
    assert invocation.agent_name == "builder_agent"
    assert invocation.tool_name == "code_executor"
    assert invocation.latency_ms == 45.2
    assert len(collector.invocations) == 1


@pytest.mark.asyncio
async def test_record_invocation_failure(collector):
    """Test recording failed invocation"""
    invocation = await collector.record_invocation(
        agent_name="deploy_agent",
        tool_name="railway_api",
        task="Deploy application",
        parameters={"app_name": "test"},
        success=False,
        status_code=500,
        error_message="Connection timeout",
        failure_type=ToolFailureType.TIMEOUT,
        latency_ms=30000.0,
    )

    assert invocation.success is False
    assert invocation.failure_type == ToolFailureType.TIMEOUT
    assert invocation.error_message == "Connection timeout"


@pytest.mark.asyncio
async def test_multiple_invocations(collector):
    """Test recording multiple invocations"""
    for i in range(10):
        await collector.record_invocation(
            agent_name="builder_agent",
            tool_name="code_executor",
            task=f"Execute task {i}",
            parameters={"code": f"print({i})"},
            success=i % 2 == 0,  # 50% success
            latency_ms=float(i * 10),
        )

    assert len(collector.invocations) == 10
    metrics = collector.get_agent_metrics("builder_agent")
    assert metrics.total_invocations == 10
    assert metrics.successful_invocations == 5
    assert metrics.failed_invocations == 5
    assert metrics.success_rate == 0.5


@pytest.mark.asyncio
async def test_agent_metrics_calculation(collector):
    """Test agent metrics are calculated correctly"""
    for i in range(20):
        await collector.record_invocation(
            agent_name="qa_agent",
            tool_name="test_runner",
            task=f"Run test {i}",
            parameters={"test_id": i},
            success=True,
            latency_ms=10.0 + i,
        )

    metrics = collector.get_agent_metrics("qa_agent")
    assert metrics.total_invocations == 20
    assert metrics.success_rate == 1.0
    assert metrics.average_latency_ms > 10.0


@pytest.mark.asyncio
async def test_get_invocations_filter(collector):
    """Test filtering invocations"""
    for i in range(5):
        await collector.record_invocation(
            agent_name="builder_agent",
            tool_name="code_executor",
            task="Execute code",
            parameters={},
            success=True,
            latency_ms=10.0,
        )

    for i in range(5):
        await collector.record_invocation(
            agent_name="deploy_agent",
            tool_name="railway_api",
            task="Deploy app",
            parameters={},
            success=False,
            latency_ms=5000.0,
            failure_type=ToolFailureType.TIMEOUT,
        )

    # Filter by agent
    builder_invocations = collector.get_invocations(agent_name="builder_agent")
    assert len(builder_invocations) == 5

    # Filter by success
    successful = collector.get_invocations(success_only=True)
    assert len(successful) == 5

    # Filter by tool
    railway_invocations = collector.get_invocations(tool_name="railway_api")
    assert len(railway_invocations) == 5


@pytest.mark.asyncio
async def test_failure_categorization(collector):
    """Test failure type categorization"""
    failure_types = [
        ToolFailureType.TIMEOUT,
        ToolFailureType.API_ERROR,
        ToolFailureType.INVALID_PARAMS,
        ToolFailureType.AUTHENTICATION,
    ]

    for ft in failure_types:
        await collector.record_invocation(
            agent_name="builder_agent",  # Use existing agent
            tool_name="test_tool",
            task="Test task",
            parameters={},
            success=False,
            failure_type=ft,
            error_message=f"Error: {ft.value}",
        )

    metrics = collector.get_agent_metrics("builder_agent")
    assert metrics is not None
    assert len(metrics.failure_breakdown) == 4
    assert all(ft.value in metrics.failure_breakdown for ft in failure_types)


@pytest.mark.asyncio
async def test_report_generation(collector):
    """Test baseline metrics report generation"""
    # Add some data
    for i in range(50):
        success = i % 10 != 0  # 90% success rate
        await collector.record_invocation(
            agent_name="builder_agent" if i % 2 == 0 else "qa_agent",
            tool_name="tool_a" if i % 3 == 0 else "tool_b",
            task=f"Task {i}",
            parameters={},
            success=success,
            latency_ms=float(i),
            failure_type=ToolFailureType.TIMEOUT if not success else None,
        )

    report = collector.generate_report()

    assert "summary" in report
    assert "failure_distribution" in report
    assert "tool_metrics" in report
    assert "agent_breakdown" in report

    assert report["summary"]["total_invocations"] == 50
    assert report["summary"]["overall_success_rate"] == 0.9


@pytest.mark.asyncio
async def test_save_report(collector, tmp_path):
    """Test saving report to file"""
    # Add some data
    for i in range(10):
        await collector.record_invocation(
            agent_name="test_agent",
            tool_name="test_tool",
            task="Test task",
            parameters={},
            success=True,
            latency_ms=10.0,
        )

    # Save with custom path
    collector.metrics_dir = tmp_path
    report_path = await collector.save_report("test_report.json")

    assert report_path.exists()
    with open(report_path) as f:
        data = json.load(f)
    assert data["summary"]["total_invocations"] == 10


@pytest.mark.asyncio
async def test_save_invocations(collector, tmp_path):
    """Test saving detailed invocations to JSONL"""
    # Add some data
    for i in range(5):
        await collector.record_invocation(
            agent_name="builder_agent",
            tool_name="code_executor",
            task=f"Task {i}",
            parameters={"code": f"print({i})"},
            success=True,
            latency_ms=10.0 + i,
        )

    # Save with custom path
    collector.metrics_dir = tmp_path
    invocations_path = await collector.save_invocations("test_invocations.jsonl")

    assert invocations_path.exists()
    with open(invocations_path) as f:
        lines = f.readlines()
    assert len(lines) == 5

    # Verify JSONL format
    for line in lines:
        data = json.loads(line)
        assert "agent_name" in data
        assert "tool_name" in data


@pytest.mark.asyncio
async def test_metrics_reset(collector):
    """Test resetting metrics"""
    # Add data
    for i in range(10):
        await collector.record_invocation(
            agent_name="builder_agent",
            tool_name="test_tool",
            task="Test task",
            parameters={},
            success=True,
            latency_ms=10.0,
        )

    assert len(collector.invocations) == 10
    collector.reset_metrics()
    assert len(collector.invocations) == 0
    metrics = collector.get_agent_metrics("builder_agent")
    assert metrics is not None
    assert metrics.total_invocations == 0


@pytest.mark.asyncio
async def test_21_agents_initialized(collector):
    """Test that all 21 Genesis agents are initialized"""
    expected_agents = [
        "spec_agent",
        "architect_agent",
        "builder_agent",
        "frontend_agent",
        "backend_agent",
        "qa_agent",
        "security_agent",
        "deploy_agent",
        "monitoring_agent",
        "maintenance_agent",
        "marketing_agent",
        "sales_agent",
        "support_agent",
        "analytics_agent",
        "finance_agent",
        "content_agent",
        "legal_agent",
        "analyst_agent",
        "research_agent",
        "darwin_agent",
        "domain_name_agent",
    ]

    for agent in expected_agents:
        assert agent in collector.agent_metrics
        assert collector.agent_metrics[agent].agent_name == agent


@pytest.mark.asyncio
async def test_average_latency_calculation(collector):
    """Test that average latency is calculated correctly"""
    latencies = [10.0, 20.0, 30.0, 40.0, 50.0]

    for latency in latencies:
        await collector.record_invocation(
            agent_name="builder_agent",
            tool_name="test_tool",
            task="Test task",
            parameters={},
            success=True,
            latency_ms=latency,
        )

    metrics = collector.get_agent_metrics("builder_agent")
    assert metrics is not None
    expected_avg = sum(latencies) / len(latencies)
    assert abs(metrics.average_latency_ms - expected_avg) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
