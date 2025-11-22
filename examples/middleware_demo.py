"""
Middleware Demo - Complete Example

This script demonstrates the full middleware stack in action:
1. PolicyCardMiddleware - Policy enforcement
2. CapabilityMapMiddleware - Capability validation
3. ToolRMMiddleware - Quality scoring

Author: Shane (Backend API Specialist)
Date: November 8, 2025
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from infrastructure.halo_router import HALORouter
from infrastructure.middleware.base import ToolCall, ToolResult


async def demo_middleware():
    """Demonstrate middleware in action."""

    print("=" * 60)
    print("GENESIS MIDDLEWARE DEMO")
    print("=" * 60)
    print()

    # Initialize HALO router with default middleware
    print("[1/6] Initializing HALO router with middleware...")
    router = HALORouter()

    print(f"   - Router initialized with {len(router.middlewares)} middleware")
    for i, mw in enumerate(router.middlewares):
        print(f"   - [{i+1}] {mw.__class__.__name__}")
    print()

    # Demo 1: Execute valid tool call
    print("[2/6] Demo: Valid tool execution (should succeed)")
    print("-" * 60)

    async def valid_executor(call: ToolCall):
        """Mock executor that succeeds."""
        await asyncio.sleep(0.1)  # Simulate work
        return {"status": "success", "data": "File contents here..."}

    try:
        result = await router.execute_with_middleware(
            tool_name="Read",
            agent_name="builder_agent",
            arguments={"file_path": "example.py"},
            context={},
            executor=valid_executor,
        )
        print(f"   SUCCESS: {result}")
    except Exception as e:
        print(f"   ERROR: {e}")
    print()

    # Demo 2: Get middleware statistics
    print("[3/6] Demo: Middleware statistics")
    print("-" * 60)

    # Policy stats
    policy_stats = router.middlewares[0].get_statistics()
    print(f"   Policy Cards: {policy_stats['total_calls']} total calls")

    # Capability stats
    capability_stats = router.middlewares[1].get_statistics()
    print(f"   Capabilities: {capability_stats['total_usage']} total usage")

    # ToolRM stats
    toolrm_stats = router.middlewares[2].get_tool_statistics("Read")
    if toolrm_stats:
        print(f"   ToolRM (Read): {toolrm_stats.get('total_calls', 0)} calls, "
              f"avg score {toolrm_stats.get('avg_score', 0):.2f}")
    print()

    # Demo 3: Execute slow tool (low latency score)
    print("[4/6] Demo: Slow tool execution (low latency score)")
    print("-" * 60)

    async def slow_executor(call: ToolCall):
        """Mock executor that is slow."""
        await asyncio.sleep(6.0)  # Slow execution (>5s)
        return {"status": "success", "data": "Slow result"}

    try:
        result = await router.execute_with_middleware(
            tool_name="Bash",
            agent_name="builder_agent",
            arguments={"command": "sleep 5"},
            context={},
            executor=slow_executor,
        )
        print(f"   SUCCESS (but slow): {result}")
    except Exception as e:
        print(f"   ERROR: {e}")
    print()

    # Demo 4: Execute failing tool
    print("[5/6] Demo: Failing tool execution")
    print("-" * 60)

    async def failing_executor(call: ToolCall):
        """Mock executor that fails."""
        raise RuntimeError("Simulated tool failure")

    try:
        result = await router.execute_with_middleware(
            tool_name="Write",
            agent_name="builder_agent",
            arguments={"file_path": "test.txt", "content": "test"},
            context={},
            executor=failing_executor,
        )
        print(f"   SUCCESS: {result}")
    except Exception as e:
        print(f"   EXPECTED ERROR: {type(e).__name__}: {e}")
    print()

    # Demo 5: View reasoning bank
    print("[6/6] Demo: Reasoning bank (execution history)")
    print("-" * 60)

    toolrm = router.middlewares[2]
    recent = toolrm.get_recent_executions(limit=5)

    print(f"   Recent executions ({len(recent)} total):")
    for exec_record in recent:
        print(
            f"     - {exec_record['agent']} -> {exec_record['tool']}: "
            f"score={exec_record['score']:.2f} ({exec_record['quality_level']}), "
            f"latency={exec_record['execution_time_ms']:.0f}ms"
        )
    print()

    # Demo 6: View reflection queue
    print("[BONUS] Reflection queue (low-quality executions)")
    print("-" * 60)

    reflection_queue = toolrm.get_reflection_queue()
    if reflection_queue:
        print(f"   Pending reflections ({len(reflection_queue)}):")
        for item in reflection_queue:
            print(
                f"     - {item['agent']} -> {item['tool']}: "
                f"score={item['score']:.2f}, reason={item['reason']}"
            )
    else:
        print("   No pending reflections (all executions above threshold)")
    print()

    print("=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  - Executed 3 tools (Read, Bash, Write)")
    print(f"  - 2 succeeded, 1 failed (expected)")
    print(f"  - Middleware validated policies, capabilities, and scored quality")
    print(f"  - All executions logged to reasoning bank")
    print()


async def demo_custom_middleware():
    """Demonstrate custom middleware stack."""

    print("=" * 60)
    print("CUSTOM MIDDLEWARE DEMO")
    print("=" * 60)
    print()

    # Create custom middleware stack (only ToolRM)
    from infrastructure.middleware import ToolRMMiddleware

    print("[1/2] Creating router with custom middleware (ToolRM only)...")
    router = HALORouter(middlewares=[
        ToolRMMiddleware(enable_reflection=True)
    ])

    print(f"   - Router initialized with {len(router.middlewares)} middleware")
    for i, mw in enumerate(router.middlewares):
        print(f"   - [{i+1}] {mw.__class__.__name__}")
    print()

    # Execute tool with custom middleware
    print("[2/2] Executing tool with custom middleware...")

    async def executor(call: ToolCall):
        await asyncio.sleep(0.05)
        return {"status": "success"}

    try:
        result = await router.execute_with_middleware(
            tool_name="Read",
            agent_name="qa_agent",
            arguments={"file_path": "test.py"},
            executor=executor,
        )
        print(f"   SUCCESS: {result}")
    except Exception as e:
        print(f"   ERROR: {e}")
    print()

    print("=" * 60)
    print("CUSTOM MIDDLEWARE DEMO COMPLETE")
    print("=" * 60)
    print()


def main():
    """Run all demos."""
    print()
    print("GENESIS MIDDLEWARE SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 60)
    print()

    # Run default middleware demo
    asyncio.run(demo_middleware())

    print()
    print()

    # Run custom middleware demo
    asyncio.run(demo_custom_middleware())

    print()
    print("ALL DEMOS COMPLETE")
    print()


if __name__ == "__main__":
    main()
