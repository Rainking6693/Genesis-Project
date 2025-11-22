import asyncio
import logging

import pytest

from infrastructure.a2a_connector import A2AConnector, A2AExecutionResult
from infrastructure.halo_router import RoutingPlan
from infrastructure.observability import CorrelationContext
from infrastructure.task_dag import Task, TaskDAG


def _build_parallel_dag() -> tuple[TaskDAG, RoutingPlan]:
    """Create a DAG with two roots to exercise AsyncThink concurrency."""
    dag = TaskDAG()
    tasks = {
        "alpha": Task(task_id="alpha", task_type="design", description="root alpha"),
        "beta": Task(task_id="beta", task_type="design", description="root beta"),
        "gamma": Task(task_id="gamma", task_type="code", description="child of alpha"),
        "delta": Task(task_id="delta", task_type="code", description="child of beta"),
        "epsilon": Task(task_id="epsilon", task_type="deploy", description="merge child"),
    }

    for task in tasks.values():
        dag.add_task(task)

    dag.add_dependency("alpha", "gamma")
    dag.add_dependency("beta", "delta")
    dag.add_dependency("gamma", "epsilon")
    dag.add_dependency("delta", "epsilon")

    routing_plan = RoutingPlan(
        assignments={task_id: "builder_agent" for task_id in tasks}
    )
    return dag, routing_plan


def _stub_result(task_id: str, agent_name: str) -> A2AExecutionResult:
    return A2AExecutionResult(
        task_id=task_id,
        agent_name=agent_name,
        tool_name="test_tool",
        status="success",
        result={"task": task_id},
        execution_time_ms=1.0,
    )


def _make_connector(monkeypatch) -> A2AConnector:
    """Factory that relaxes HTTPS requirement for local unit tests."""
    monkeypatch.setenv("A2A_ALLOW_HTTP", "true")
    monkeypatch.setenv("ENVIRONMENT", "test")
    return A2AConnector(base_url="http://localhost", verify_ssl=False)


@pytest.mark.asyncio
async def test_asyncthink_parallel_execution_respects_dependencies(monkeypatch):
    dag, routing_plan = _build_parallel_dag()
    connector = _make_connector(monkeypatch)
    connector.enable_asyncthink = True
    connector.asyncthink_max_concurrency = 4

    execution_order: list[str] = []

    async def fake_execute_single_task(task, agent_name, dependency_results, correlation_context):
        execution_order.append(task.task_id)
        await asyncio.sleep(0.01)
        return _stub_result(task.task_id, agent_name)

    monkeypatch.setattr(connector, "_execute_single_task", fake_execute_single_task)

    summary = await connector.execute_routing_plan(
        routing_plan,
        dag,
        CorrelationContext(user_request="test"),
    )

    assert summary["successful"] == 5
    assert set(execution_order) == {"alpha", "beta", "gamma", "delta", "epsilon"}
    assert execution_order.index("gamma") > execution_order.index("alpha")
    assert execution_order.index("delta") > execution_order.index("beta")
    assert execution_order.index("epsilon") > execution_order.index("gamma")
    assert execution_order.index("epsilon") > execution_order.index("delta")
    assert connector._last_asyncthink_stats["max_parallel"] >= 2
    assert connector._last_asyncthink_stats["total_tasks"] == 5


@pytest.mark.asyncio
async def test_asyncthink_emits_concurrency_metrics(monkeypatch, caplog):
    dag, routing_plan = _build_parallel_dag()
    connector = _make_connector(monkeypatch)
    connector.enable_asyncthink = True
    connector.asyncthink_max_concurrency = 4

    async def fake_execute_single_task(task, agent_name, dependency_results, correlation_context):
        await asyncio.sleep(0)
        return _stub_result(task.task_id, agent_name)

    monkeypatch.setattr(connector, "_execute_single_task", fake_execute_single_task)

    caplog.set_level(logging.INFO)

    summary = await connector.execute_routing_plan(
        routing_plan,
        dag,
        CorrelationContext(user_request="metrics"),
    )

    assert summary["successful"] == 5
    stats = connector._last_asyncthink_stats
    assert pytest.approx(stats["success_rate"]) == 1.0
    assert stats["latency_ms"] == summary["execution_time_ms"]

    metric_logs = [
        record.message for record in caplog.records if "METRIC" in record.message
    ]
    assert any("asyncthink.max_parallel" in msg for msg in metric_logs)
    assert any("asyncthink.latency_ms" in msg for msg in metric_logs)
    assert any("asyncthink.success_rate" in msg for msg in metric_logs)
