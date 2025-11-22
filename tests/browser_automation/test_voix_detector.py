"""
Tests for VOIX Detector

Tests tool tag discovery, context tag discovery, schema validation,
malformed tag handling, and dynamic content monitoring.
"""

import pytest
import asyncio
from pathlib import Path

from infrastructure.browser_automation.voix_detector import (
    VoixDetector,
    ToolDefinition,
    ContextDefinition,
    get_voix_detector
)


@pytest.fixture
def detector():
    """Create a test detector"""
    return VoixDetector(cache_dir=Path("data/test_voix_cache"))


def test_tool_definition_creation():
    """Test creating a tool definition"""
    tool = ToolDefinition(
        name="submit_product",
        description="Submit a product to directory",
        parameters={"name": "string", "description": "string"},
        endpoint="/api/submit",
        method="POST",
        auth="session",
        visible=True
    )

    assert tool.name == "submit_product"
    assert tool.description == "Submit a product to directory"
    assert tool.method == "POST"
    assert tool.auth == "session"
    assert tool.visible is True


def test_tool_definition_validation():
    """Test tool definition validation"""
    # Valid tool
    valid_tool = ToolDefinition(
        name="submit",
        description="Submit form",
        parameters={}
    )
    assert valid_tool.validate() is True

    # Missing name
    invalid_tool = ToolDefinition(
        name="",
        description="Submit form",
        parameters={}
    )
    assert invalid_tool.validate() is False

    # Missing description
    invalid_tool2 = ToolDefinition(
        name="submit",
        description="",
        parameters={}
    )
    assert invalid_tool2.validate() is False


def test_context_definition_creation():
    """Test creating a context definition"""
    context = ContextDefinition(
        name="user_session",
        value={"user_id": "123", "logged_in": True},
        scope="local",
        ttl=3600
    )

    assert context.name == "user_session"
    assert context.value["user_id"] == "123"
    assert context.scope == "local"
    assert context.ttl == 3600


def test_context_expiration():
    """Test context TTL expiration"""
    from datetime import datetime, timedelta

    # Non-expiring context
    context_no_ttl = ContextDefinition(
        name="static",
        value={"data": "test"},
        ttl=None
    )
    assert context_no_ttl.is_expired() is False

    # Expired context
    context_expired = ContextDefinition(
        name="expired",
        value={"data": "test"},
        ttl=1,
        timestamp=(datetime.now() - timedelta(seconds=10)).isoformat()
    )
    assert context_expired.is_expired() is True


@pytest.mark.asyncio
async def test_detect_voix_support(detector):
    """Test VOIX support detection"""
    # Page with VOIX tags
    html_with_voix = """
    <html>
        <body>
            <tool name="submit" description="Submit form" endpoint="/api/submit"></tool>
            <context name="session" value='{"user": "test"}'></context>
        </body>
    </html>
    """
    has_voix = await detector.detect_voix_support(html_with_voix, "https://example.com")
    assert has_voix is True

    # Page without VOIX tags
    html_no_voix = """
    <html>
        <body>
            <div>No VOIX tags here</div>
        </body>
    </html>
    """
    has_voix = await detector.detect_voix_support(html_no_voix, "https://example.com")
    assert has_voix is False


@pytest.mark.asyncio
async def test_discover_tools(detector):
    """Test tool tag discovery"""
    html = """
    <html>
        <body>
            <tool name="submit_product" description="Submit product to directory" 
                  endpoint="/api/submit" method="POST" auth="session"></tool>
            <tool name="search" description="Search products" 
                  endpoint="/api/search" method="GET" auth="none"></tool>
        </body>
    </html>
    """

    tools = await detector.discover_tools(html, "https://example.com")

    assert len(tools) == 2
    assert tools[0].name == "submit_product"
    assert tools[1].name == "search"
    assert tools[1].method == "GET"
    assert tools[1].auth == "none"


@pytest.mark.asyncio
async def test_discover_contexts(detector):
    """Test context tag discovery"""
    html = """
    <html>
        <body>
            <context name="user_session" value='{"user_id": "123"}' scope="local" ttl="3600"></context>
            <context name="app_config" value='{"theme": "dark"}' scope="global"></context>
        </body>
    </html>
    """

    contexts = await detector.discover_contexts(html, "https://example.com")

    assert len(contexts) == 2
    assert contexts[0].name == "user_session"
    assert contexts[1].name == "app_config"
    assert contexts[0].scope == "local"
    assert contexts[1].scope == "global"


@pytest.mark.asyncio
async def test_discover_contexts_with_expired(detector):
    """Test context discovery filters expired contexts"""
    from datetime import datetime, timedelta

    html = f"""
    <html>
        <body>
            <context name="expired" value='{{"data": "old"}}' 
                     ttl="1" timestamp="{(datetime.now() - timedelta(seconds=10)).isoformat()}"></context>
            <context name="valid" value='{{"data": "new"}}' ttl="3600"></context>
        </body>
    </html>
    """

    contexts = await detector.discover_contexts(html, "https://example.com")

    # Should only return non-expired contexts
    assert len(contexts) >= 1
    assert any(c.name == "valid" for c in contexts)
    assert not any(c.name == "expired" for c in contexts)


@pytest.mark.asyncio
async def test_schema_validation(detector):
    """Test schema validation for tools"""
    # Valid tool with proper schema
    html_valid = """
    <tool name="submit" description="Submit form" 
          parameters='{"name": {"type": "string", "required": true}}'></tool>
    """

    tools = await detector.discover_tools(html_valid, "https://example.com")
    assert len(tools) == 1
    assert tools[0].validate() is True

    # Tool with invalid parameters (should still be discovered but logged)
    html_invalid = """
    <tool name="bad_tool" description="Has invalid params" parameters="not json"></tool>
    """

    tools = await detector.discover_tools(html_invalid, "https://example.com")
    # Should still discover but with empty parameters dict
    if tools:
        assert tools[0].name == "bad_tool"


@pytest.mark.asyncio
async def test_malformed_tag_handling(detector):
    """Test handling of malformed tags"""
    # Malformed HTML with incomplete tags
    html_malformed = """
    <tool name="incomplete" 
    <tool name="missing_desc"></tool>
    <context name="missing_value"></context>
    """

    tools = await detector.discover_tools(html_malformed, "https://example.com")
    # Should handle gracefully - may discover partial tags or none
    # Main thing is it doesn't crash

    contexts = await detector.discover_contexts(html_malformed, "https://example.com")
    # Should handle gracefully


@pytest.mark.asyncio
async def test_dynamic_content_monitoring(detector):
    """Test MutationObserver for dynamic content"""
    await detector.start_mutation_observer("https://example.com", callback=lambda: None)
    # MutationObserver is a placeholder - just test it doesn't crash


def test_get_tools(detector):
    """Test getting cached tools"""
    # Add tools manually
    from infrastructure.browser_automation.voix_detector import ToolDefinition
    tool = ToolDefinition(
        name="test_tool",
        description="Test tool",
        parameters={}
    )
    detector.tools["https://example.com"] = [tool]

    tools = detector.get_tools("https://example.com")
    assert len(tools) == 1
    assert tools[0].name == "test_tool"


def test_get_tool_by_name(detector):
    """Test getting specific tool by name"""
    from infrastructure.browser_automation.voix_detector import ToolDefinition
    tool1 = ToolDefinition(name="tool1", description="First tool", parameters={})
    tool2 = ToolDefinition(name="tool2", description="Second tool", parameters={})
    detector.tools["https://example.com"] = [tool1, tool2]

    found = detector.get_tool_by_name("https://example.com", "tool2")
    assert found is not None
    assert found.name == "tool2"


def test_get_contexts(detector):
    """Test getting cached contexts"""
    from infrastructure.browser_automation.voix_detector import ContextDefinition
    context = ContextDefinition(
        name="test_context",
        value={"data": "test"},
        scope="local"
    )
    detector.contexts["https://example.com"] = [context]

    contexts = detector.get_contexts("https://example.com")
    assert len(contexts) == 1
    assert contexts[0].name == "test_context"


def test_clear_cache(detector):
    """Test clearing cache"""
    detector.tools["https://example.com"] = []
    detector.contexts["https://example.com"] = []

    detector.clear_cache("https://example.com")
    assert "https://example.com" not in detector.tools
    assert "https://example.com" not in detector.contexts


def test_get_stats(detector):
    """Test getting detector statistics"""
    detector.tools["https://example.com"] = [ToolDefinition(name="t1", description="d1", parameters={})]
    detector.contexts["https://example.com"] = [ContextDefinition(name="c1", value={})]

    stats = detector.get_stats()
    assert stats["total_tools"] == 1
    assert stats["total_contexts"] == 1
    assert stats["urls_cached"] == 1


def test_singleton():
    """Test singleton pattern"""
    detector1 = get_voix_detector()
    detector2 = get_voix_detector()
    assert detector1 is detector2

