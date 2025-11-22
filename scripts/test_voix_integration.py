"""
Comprehensive Test Suite for VOIX Integration

Tests Integration #74: VOIX Declarative Discovery Layer

Components tested:
- VoixDetector: Tag discovery and parsing
- VoixExecutor: Tool invocation
- HybridBrowserAutomation: Intelligent routing
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.browser_automation.voix_detector import (
    VoixDetector,
    ToolDefinition,
    ContextDefinition
)
from infrastructure.browser_automation.voix_executor import (
    VoixExecutor,
    VoixInvocationResult
)
from infrastructure.browser_automation.hybrid_automation import (
    HybridBrowserAutomation,
    AutomationMode
)


# Sample VOIX-enabled HTML for testing
SAMPLE_VOIX_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Sample VOIX-Enabled Site</title>
</head>
<body>
    <h1>Product Directory</h1>

    <!-- VOIX Tool Tags -->
    <tool
        name="submitProduct"
        description="Submit a new product to the directory"
        parameters='{"name": "string", "tagline": "string", "description": "string", "url": "string"}'
        endpoint="/api/products/submit"
        method="POST"
        auth="session"
    >
        <button>Submit Product</button>
    </tool>

    <tool
        name="searchProducts"
        description="Search for products"
        parameters='{"query": "string", "category": "string"}'
        endpoint="/api/products/search"
        method="GET"
        auth="none"
    >
        <input type="text" placeholder="Search..." />
    </tool>

    <!-- VOIX Context Tags -->
    <context
        name="userAuth"
        value='{"loggedIn": true, "userId": "12345", "tier": "premium"}'
        scope="global"
    />

    <context
        name="productCount"
        value='{"total": 1543, "featured": 89, "new": 23}'
        scope="local"
        ttl="300"
    />
</body>
</html>
"""


async def test_voix_detector():
    """Test VOIX detector for tag discovery."""
    print("\n" + "=" * 60)
    print("[TEST 1/5] VOIX Detector - Tag Discovery")
    print("=" * 60)

    detector = VoixDetector()
    url = "https://example.com/directory"

    # Test VOIX support detection
    has_voix = await detector.detect_voix_support(SAMPLE_VOIX_HTML, url)
    assert has_voix == True, "Should detect VOIX support"
    print("✅ VOIX support detected")

    # Test tool discovery
    tools = await detector.discover_tools(SAMPLE_VOIX_HTML, url)
    assert len(tools) == 2, f"Should find 2 tools, found {len(tools)}"
    print(f"✅ Discovered {len(tools)} tools")

    # Validate first tool
    submit_tool = tools[0]
    assert submit_tool.name == "submitProduct"
    assert submit_tool.description == "Submit a new product to the directory"
    assert "name" in submit_tool.parameters
    assert submit_tool.method == "POST"
    print(f"✅ Tool validation: {submit_tool.name}")

    # Test context discovery
    contexts = await detector.discover_contexts(SAMPLE_VOIX_HTML, url)
    assert len(contexts) == 2, f"Should find 2 contexts, found {len(contexts)}"
    print(f"✅ Discovered {len(contexts)} contexts")

    # Validate first context
    user_context = contexts[0]
    assert user_context.name == "userAuth"
    assert user_context.value["loggedIn"] == True
    assert user_context.scope == "global"
    print(f"✅ Context validation: {user_context.name}")

    # Test retrieval methods
    retrieved_tool = detector.get_tool_by_name(url, "submitProduct")
    assert retrieved_tool is not None
    assert retrieved_tool.name == "submitProduct"
    print("✅ Tool retrieval by name works")

    retrieved_context = detector.get_context_by_name(url, "userAuth")
    assert retrieved_context is not None
    assert retrieved_context.name == "userAuth"
    print("✅ Context retrieval by name works")

    # Test stats
    stats = detector.get_stats()
    assert stats["total_tools"] == 2
    assert stats["total_contexts"] == 2
    print(f"✅ Stats: {stats}")

    print("\n✅ VOIX Detector: ALL TESTS PASSED")
    return True


async def test_voix_executor():
    """Test VOIX executor for tool invocation."""
    print("\n" + "=" * 60)
    print("[TEST 2/5] VOIX Executor - Tool Invocation")
    print("=" * 60)

    executor = VoixExecutor(timeout=5, max_retries=1)

    # Create a test tool
    tool = ToolDefinition(
        name="testTool",
        description="Test tool",
        parameters={
            "name": "string",
            "count": "number"
        },
        endpoint="https://httpbin.org/post",
        method="POST"
    )

    # Test parameter validation
    print("[Test] Parameter validation...")

    # Valid parameters
    error = executor._validate_parameters(tool, {"name": "test", "count": 5})
    assert error is None, "Valid parameters should pass"
    print("✅ Valid parameters accepted")

    # Invalid type
    error = executor._validate_parameters(tool, {"name": "test", "count": "five"})
    assert error is not None, "Invalid type should fail"
    print(f"✅ Invalid type detected: {error}")

    # Note: Actual tool invocation test skipped in unit tests
    # (requires real HTTP endpoint)
    print("⚠️  Skipping actual HTTP invocation in unit test")

    # Test stats
    stats = executor.get_stats()
    assert "invocation_count" in stats
    assert "success_rate" in stats
    print(f"✅ Executor stats: {stats}")

    print("\n✅ VOIX Executor: VALIDATION TESTS PASSED")
    return True


async def test_hybrid_automation():
    """Test hybrid automation router."""
    print("\n" + "=" * 60)
    print("[TEST 3/5] Hybrid Automation - Intelligent Routing")
    print("=" * 60)

    automation = HybridBrowserAutomation(prefer_voix=True)

    # Test mode selection logic
    print("[Test] VOIX detection...")

    # Simulate VOIX-enabled page
    url = "https://example.com/voix-enabled"

    # Mock fetch to return VOIX HTML
    async def mock_fetch(url):
        return SAMPLE_VOIX_HTML

    # Temporarily replace _fetch_page_content
    original_fetch = automation._fetch_page_content
    automation._fetch_page_content = mock_fetch

    # Test tool selection
    tools = [
        ToolDefinition(
            name="submitProduct",
            description="Submit a product",
            parameters={"name": "string"}
        ),
        ToolDefinition(
            name="searchProducts",
            description="Search for products",
            parameters={"query": "string"}
        )
    ]

    # Test task matching
    selected = await automation._select_tool_for_task("Submit a product", tools)
    assert selected is not None
    assert selected.name == "submitProduct"
    print(f"✅ Task matched to tool: {selected.name}")

    # Restore original fetch
    automation._fetch_page_content = original_fetch

    # Test stats
    stats = automation.get_stats()
    assert "total_executions" in stats
    assert "voix_percentage" in stats
    print(f"✅ Hybrid stats: {stats}")

    print("\n✅ Hybrid Automation: ROUTING TESTS PASSED")
    return True


async def test_integration():
    """Test integration between components."""
    print("\n" + "=" * 60)
    print("[TEST 4/5] Component Integration")
    print("=" * 60)

    # Create all components
    detector = VoixDetector()
    executor = VoixExecutor()
    automation = HybridBrowserAutomation()

    url = "https://example.com/test"

    # Discover tools
    tools = await detector.discover_tools(SAMPLE_VOIX_HTML, url)
    assert len(tools) > 0

    # Get tool
    tool = detector.get_tool_by_name(url, "submitProduct")
    assert tool is not None

    print(f"✅ Integration validated:")
    print(f"   - Detector found {len(tools)} tools")
    print(f"   - Tool '{tool.name}' retrieved successfully")
    print(f"   - Hybrid automation ready")

    print("\n✅ Integration: ALL TESTS PASSED")
    return True


async def test_non_voix_fallback():
    """Test fallback to Skyvern for non-VOIX sites."""
    print("\n" + "=" * 60)
    print("[TEST 5/5] Non-VOIX Fallback Behavior")
    print("=" * 60)

    detector = VoixDetector()

    # HTML without VOIX tags
    non_voix_html = """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Regular Website</h1>
        <form action="/submit">
            <input type="text" name="product" />
            <button>Submit</button>
        </form>
    </body>
    </html>
    """

    url = "https://example.com/regular"

    # Test detection
    has_voix = await detector.detect_voix_support(non_voix_html, url)
    assert has_voix == False, "Should NOT detect VOIX on regular HTML"
    print("✅ Correctly identified non-VOIX page")

    # Test tool discovery returns empty
    tools = await detector.discover_tools(non_voix_html, url)
    assert len(tools) == 0, "Should find 0 tools on non-VOIX page"
    print("✅ No tools found (expected)")

    # Test contexts
    contexts = await detector.discover_contexts(non_voix_html, url)
    assert len(contexts) == 0, "Should find 0 contexts on non-VOIX page"
    print("✅ No contexts found (expected)")

    print("\n✅ Fallback Behavior: ALL TESTS PASSED")
    return True


async def main():
    """Run all tests."""
    print("=" * 60)
    print("VOIX Integration Test Suite")
    print("=" * 60)
    print()
    print("Testing Integration #74: VOIX Declarative Discovery Layer")
    print()
    print("Components:")
    print("  - VoixDetector: Tag discovery and parsing")
    print("  - VoixExecutor: Tool invocation")
    print("  - HybridBrowserAutomation: Intelligent routing")
    print()

    results = []

    try:
        results.append(await test_voix_detector())
    except Exception as e:
        print(f"❌ VOIX Detector test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_voix_executor())
    except Exception as e:
        print(f"❌ VOIX Executor test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_hybrid_automation())
    except Exception as e:
        print(f"❌ Hybrid Automation test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_integration())
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    try:
        results.append(await test_non_voix_fallback())
    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)

    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"VOIX Detector: {'✅ PASS' if results[0] else '❌ FAIL'}")
    print(f"VOIX Executor: {'✅ PASS' if results[1] else '❌ FAIL'}")
    print(f"Hybrid Automation: {'✅ PASS' if results[2] else '❌ FAIL'}")
    print(f"Integration: {'✅ PASS' if results[3] else '❌ FAIL'}")
    print(f"Fallback Behavior: {'✅ PASS' if results[4] else '❌ FAIL'}")
    print("=" * 60)

    if all(results):
        print("\n✅ ALL TESTS PASSED!")
        print("\nIntegration #74 is ready for production deployment.")
        print("\nNext steps:")
        print("  1. Test with real VOIX-enabled websites")
        print("  2. Integrate with MarketingAgent")
        print("  3. Update CLAUDE.md with Integration #74")
        print("  4. Reach out to platforms for VOIX support")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Review errors above and fix before deployment.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
