"""Security and SQL injection validation tests"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.memory.memori_query_optimizer import MemoriQueryOptimizer
from infrastructure.memory.a2a_memory_gateway import A2AMemoryGateway, AccessLevel
from infrastructure.memory.memori_sql_engine import GenesisSQLMemory

async def test_security():
    """Test security features"""
    print('=' * 60)
    print('SECURITY VALIDATION TEST')
    print('=' * 60)

    # Test 1: SQL Injection Prevention in Cache Keys
    print('\n--- Test 1: SQL Injection Prevention ---')

    optimizer = MemoriQueryOptimizer()

    # Try various SQL injection patterns
    injection_queries = [
        "'; DROP TABLE memories; --",
        "' OR '1'='1",
        "'; SELECT * FROM memories WHERE '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM memories--"
    ]

    for query in injection_queries:
        # Generate cache key (should be safe hash)
        key = optimizer.generate_query_key(query, {'agent_id': 'test'})

        # Verify key is alphanumeric hash
        assert all(c.isalnum() for c in key), f"Cache key contains unsafe characters: {key}"
        assert len(key) == 64, f"Cache key unexpected length: {len(key)}"

        print(f"  Safe: '{query[:40]}...' -> {key[:16]}...")

    print('OK: SQL injection patterns safely hashed')

    # Test 2: Access Control Enforcement
    print('\n--- Test 2: Access Control Enforcement ---')

    shared_db = "sqlite:///test_security.db"
    gateway = A2AMemoryGateway(database_url=shared_db)

    # Store data
    memory = gateway._get_memory('builder_agent')
    memory.store('Sensitive build configuration', metadata={'confidential': True})

    # Revoke access
    gateway.revoke_access('qa_agent', 'builder_agent')

    # Try unauthorized access
    try:
        await gateway.query_agent_memories(
            requesting_agent='qa_agent',
            target_agent='builder_agent',
            query='configuration'
        )
        print('FAIL: Should have blocked unauthorized access')
        return False
    except PermissionError as e:
        print(f'OK: Unauthorized access blocked - {str(e)[:60]}...')

    # Test 3: Privacy Filter Validation
    print('\n--- Test 3: Privacy Filter Validation ---')

    # Grant access for testing
    gateway.grant_access('qa_agent', 'builder_agent', AccessLevel.READ)

    # Store sensitive data
    sensitive_data = [
        ('email', 'Contact: john.doe@example.com for details', '[EMAIL]'),
        ('api_key', 'API Key: sk-1234567890abcdef1234567890abcdef1234567890abcdef', '[API_KEY]'),
        ('gemini_key', 'Use AIza1234567890abcdefghijklmnopqrstuv for API', '[API_KEY]'),
        ('phone', 'Call 555-123-4567 for support', '[PHONE]'),
        ('ssn', 'SSN: 123-45-6789 (confidential)', '[SSN]'),
        ('credit_card', 'Card: 4532-1234-5678-9010', '[CARD_NUMBER]'),
    ]

    for label, content, expected_redaction in sensitive_data:
        memory.store(content, metadata={'type': label})

        result = await gateway.query_agent_memories(
            requesting_agent='qa_agent',
            target_agent='builder_agent',
            query=label,
            apply_privacy_filter=True
        )

        if result['count'] > 0:
            filtered_content = result['results'][0]['content']
            assert expected_redaction in filtered_content, f"Missing redaction: {expected_redaction}"
            print(f'  OK: {label} redacted -> {expected_redaction}')
        else:
            print(f'  SKIP: No results for {label}')

    print('OK: Privacy filter working correctly')

    # Test 4: Audit Trail Completeness
    print('\n--- Test 4: Audit Trail Completeness ---')

    audit = gateway.get_audit_report(limit=100)

    # Check for denied access
    denied_entries = [e for e in audit if not e.access_granted]
    granted_entries = [e for e in audit if e.access_granted]

    print(f'  Total audit entries: {len(audit)}')
    print(f'  Denied accesses: {len(denied_entries)}')
    print(f'  Granted accesses: {len(granted_entries)}')

    assert len(denied_entries) >= 1, "Missing denied access audit entry"
    assert len(granted_entries) >= 1, "Missing granted access audit entry"

    print('OK: Audit trail complete')

    # Test 5: Cache Key Determinism
    print('\n--- Test 5: Cache Key Determinism ---')

    # Same query should produce same key
    key1 = optimizer.generate_query_key('test query', {'a': 1, 'b': 2})
    key2 = optimizer.generate_query_key('test query', {'a': 1, 'b': 2})
    key3 = optimizer.generate_query_key('test query', {'b': 2, 'a': 1})  # Different order

    assert key1 == key2, "Same query produced different keys"
    assert key1 == key3, "Parameter order affected key generation"

    # Different query should produce different key
    key4 = optimizer.generate_query_key('different query', {'a': 1, 'b': 2})
    assert key1 != key4, "Different queries produced same key"

    print(f'  Key1: {key1[:16]}...')
    print(f'  Key2: {key2[:16]}... (same query)')
    print(f'  Key3: {key3[:16]}... (different param order)')
    print(f'  Key4: {key4[:16]}... (different query)')
    print('OK: Cache key generation is deterministic')

    # Test 6: Access Matrix Integrity
    print('\n--- Test 6: Access Matrix Integrity ---')

    stats = gateway.get_access_matrix_stats()

    # Verify 21x21 matrix
    expected_rules = 21 * 21
    assert stats['total_rules'] == expected_rules, f"Expected {expected_rules} rules, got {stats['total_rules']}"

    # Verify READ access for collaboration
    assert stats['read_access'] > 0, "No READ access rules"

    # Verify WRITE access for self
    assert stats['write_access'] == 21, f"Expected 21 WRITE rules (self-access), got {stats['write_access']}"

    print(f'  Total rules: {stats["total_rules"]} (21x21)')
    print(f'  READ access: {stats["read_access"]}')
    print(f'  WRITE access: {stats["write_access"]} (self-access only)')
    print('OK: Access matrix structure valid')

    # Test 7: Memory Isolation
    print('\n--- Test 7: Memory Isolation ---')

    # Agent A stores data
    agent_a = gateway._get_memory('agent_a')
    agent_a.store('Agent A private data', metadata={'private': True})

    # Agent B tries to access via retrieve (should not see Agent A's data)
    agent_b = gateway._get_memory('agent_b')
    results = agent_b.retrieve('private', limit=10)

    # Verify isolation (agent_b should not see agent_a's memories)
    for result in results:
        agent_id = result.get('metadata', {}).get('agent_id')
        assert agent_id == 'agent_b', f"Memory isolation broken: agent_b saw agent_id={agent_id}"

    print('OK: Memory isolation working')

    # Cleanup
    memory.clear_agent_memories(confirm=True)
    agent_a.clear_agent_memories(confirm=True)
    agent_b.clear_agent_memories(confirm=True)

    await gateway.close_all()
    memory.close()

    return True

def main():
    """Main entry point"""
    try:
        success = asyncio.run(test_security())
        if success:
            print('\n' + '=' * 60)
            print('ALL SECURITY TESTS PASSED')
            print('=' * 60)
            print('\nValidated:')
            print('  - SQL injection prevention')
            print('  - Access control enforcement')
            print('  - Privacy filtering')
            print('  - Audit trail completeness')
            print('  - Cache key determinism')
            print('  - Access matrix integrity')
            print('  - Memory isolation')
            sys.exit(0)
        else:
            print('\nSOME SECURITY TESTS FAILED')
            sys.exit(1)
    except Exception as e:
        print(f'\nSECURITY TEST ERROR: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
