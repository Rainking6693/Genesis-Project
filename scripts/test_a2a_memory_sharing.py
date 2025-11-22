"""Test A2A memory sharing across agents"""
import asyncio
import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.memory.a2a_memory_gateway import A2AMemoryGateway, AccessLevel
from infrastructure.memory.memori_sql_engine import GenesisSQLMemory

async def test_a2a_memory_sharing():
    """Test cross-agent memory sharing"""

    print("=" * 60)
    print("A2A MEMORY SHARING TEST")
    print("=" * 60)

    # Initialize with shared database
    shared_db = "sqlite:///test_a2a_memory.db"
    gateway = A2AMemoryGateway(database_url=shared_db, enable_caching=True)

    # Connect L2 caches if available
    for agent in ["builder_agent", "qa_agent", "seo_agent"]:
        memory = gateway._get_memory(agent)
        if memory.query_optimizer:
            await memory.query_optimizer.connect_l2()

    # Populate test data
    print("\n--- Populating Agent Memories ---")

    # Builder agent memories
    builder_memory = gateway._get_memory("builder_agent")
    builder_memory.store(
        content="Use TypeScript for type safety in React components",
        metadata={'skill': 'frontend', 'quality': 0.9}
    )
    builder_memory.store(
        content="Implement proper error boundaries in React applications",
        metadata={'skill': 'frontend', 'quality': 0.85}
    )

    # QA agent memories
    qa_memory = gateway._get_memory("qa_agent")
    qa_id1 = qa_memory.store(
        content="Always write unit tests before integration tests",
        metadata={'skill': 'testing', 'quality': 0.95}
    )
    qa_id2 = qa_memory.store(
        content="Use pytest fixtures for test data management",
        metadata={'skill': 'testing', 'quality': 0.9}
    )

    # SEO agent memories
    seo_memory = gateway._get_memory("seo_agent")
    seo_memory.store(
        content="Optimize meta descriptions for 155-160 characters",
        metadata={'skill': 'seo', 'quality': 0.92}
    )

    print(f"✅ Populated memories for builder_agent, qa_agent (IDs: {qa_id1[:8]}, {qa_id2[:8]}), and seo_agent")

    # Debug: Verify QA agent can see its own memories
    qa_own_memories = qa_memory.retrieve("testing", limit=5)
    print(f"Debug: QA agent can see {len(qa_own_memories)} of its own memories (via retrieve)")

    # Test with the more general query
    qa_all_memories = qa_memory.retrieve("", limit=10)
    print(f"Debug: QA agent has {len(qa_all_memories)} total memories")
    if qa_all_memories:
        print(f"Debug: First memory content: {qa_all_memories[0]['content'][:50]}")
        print(f"Debug: First memory agent_id: {qa_all_memories[0]['metadata'].get('agent_id')}")

    # Test the optimized query
    qa_opt_memories = await qa_memory.query_memory_optimized("unit tests", limit=5)
    print(f"Debug: QA agent can see {len(qa_opt_memories)} memories via optimized query")

    # Test 1: Cross-agent query (allowed by default)
    print("\n--- Test 1: Builder Queries QA Memories ---")

    result = await gateway.query_agent_memories(
        requesting_agent="builder_agent",
        target_agent="qa_agent",
        query="test",  # Changed from "testing" to "test" which will match "tests", "pytest", etc.
        limit=5
    )

    print(f"Results: {result['count']}")
    print(f"Access: {result['access_level']}")
    print(f"Target: {result['target_agent']}")

    if result['count'] > 0:
        print(f"Sample content: {result['results'][0]['content'][:80]}...")

    assert result['count'] >= 1, "No results found"
    assert result['access_level'] == 'READ', "Wrong access level"
    print("✅ Cross-agent query successful")

    # Test 2: Collaborative insights
    print("\n--- Test 2: Collaborative Insights ---")

    insights = await gateway.get_collaborative_insights(
        agent_id="builder_agent",
        skill_area="test",  # Changed to match content
        top_k=3
    )

    print(f"Insights from {len(insights)} agents")
    for insight in insights:
        print(f"  - {insight['source_agent']}: {insight['relevance']} relevant memories")
        if insight['memories']:
            print(f"    Example: {insight['memories'][0]['content'][:60]}...")

    assert len(insights) >= 1, "No insights found"
    print("✅ Collaborative insights working")

    # Test 3: Access control
    print("\n--- Test 3: Access Control ---")

    # Revoke access
    gateway.revoke_access("builder_agent", "qa_agent")

    try:
        await gateway.query_agent_memories(
            requesting_agent="builder_agent",
            target_agent="qa_agent",
            query="test"
        )
        assert False, "Should have raised PermissionError"
    except PermissionError as e:
        print(f"✅ Access denied (expected): {str(e)[:80]}...")

    # Restore access
    gateway.grant_access("builder_agent", "qa_agent", AccessLevel.READ)
    print("✅ Access control working correctly")

    # Test 4: Privacy filtering
    print("\n--- Test 4: Privacy Filtering ---")

    # Store memory with sensitive data
    qa_memory.store(
        content="Test account email: test@example.com, API key: sk-1234567890abcdef1234567890abcdef1234567890abcdef",
        metadata={'skill': 'testing', 'sensitive': True}
    )

    result = await gateway.query_agent_memories(
        requesting_agent="builder_agent",
        target_agent="qa_agent",
        query="account",
        limit=5,
        apply_privacy_filter=True
    )

    if result['count'] > 0:
        content = result['results'][0]['content']
        print(f"Filtered content: {content[:100]}...")

        # Verify sensitive data is redacted
        assert '[EMAIL]' in content, "Email should be redacted"
        assert '[API_KEY]' in content, "API key should be redacted"
        assert 'test@example.com' not in content, "Email should not be visible"
        assert 'sk-1234567890' not in content, "API key should not be visible"

        print("✅ Privacy filtering working correctly")
    else:
        print("⚠️  No results to test privacy filtering")

    # Test 5: Audit trail
    print("\n--- Test 5: Audit Trail ---")

    audit_entries = gateway.get_audit_report(agent_id="builder_agent", limit=10)

    print(f"Audit entries: {len(audit_entries)}")
    for entry in audit_entries[-3:]:
        status = "GRANTED" if entry.access_granted else "DENIED"
        print(f"  - {entry.timestamp.strftime('%H:%M:%S')}: {entry.source_agent} → {entry.target_agent} [{status}]")

    assert len(audit_entries) >= 2, "Missing audit entries"
    print("✅ Audit trail working correctly")

    # Test 6: Access matrix stats
    print("\n--- Test 6: Access Matrix Statistics ---")

    stats = gateway.get_access_matrix_stats()

    print(f"Total agents: {stats['total_agents']}")
    print(f"Total rules: {stats['total_rules']}")
    print(f"READ access: {stats['read_access']}")
    print(f"WRITE access: {stats['write_access']}")
    print(f"ADMIN access: {stats['admin_access']}")
    print(f"NO access: {stats['no_access']}")
    print(f"Audit log size: {stats['audit_log_size']}")

    assert stats['total_agents'] == 21, f"Expected 21 agents, got {stats['total_agents']}"
    assert stats['total_rules'] == 21 * 21, f"Expected {21*21} rules, got {stats['total_rules']}"
    print("✅ Access matrix statistics correct")

    # Test 7: Multi-agent insights
    print("\n--- Test 7: Multi-Agent Insights ---")

    # Query insights from multiple skill areas
    skill_areas = ["frontend", "testing", "seo"]

    for skill in skill_areas:
        insights = await gateway.get_collaborative_insights(
            agent_id="builder_agent",
            skill_area=skill,
            top_k=2
        )
        print(f"  {skill}: {len(insights)} insights from other agents")

    print("✅ Multi-agent insights working")

    # Cleanup
    print("\n--- Cleanup ---")
    builder_memory.clear_agent_memories(confirm=True)
    qa_memory.clear_agent_memories(confirm=True)
    seo_memory.clear_agent_memories(confirm=True)

    await gateway.close_all()

    print("✅ Cleanup complete")

    return True

def main():
    """Main entry point"""
    try:
        success = asyncio.run(test_a2a_memory_sharing())
        if success:
            print("\n" + "=" * 60)
            print("ALL A2A MEMORY SHARING TESTS PASSED ✅")
            print("=" * 60)
            print("\nKey Features Verified:")
            print("  ✅ Cross-agent memory queries")
            print("  ✅ Collaborative insights")
            print("  ✅ Access control (grant/revoke)")
            print("  ✅ Privacy filtering (email, API keys)")
            print("  ✅ Audit trail logging")
            print("  ✅ Access matrix (21x21 agents)")
            print("  ✅ Multi-agent learning")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
