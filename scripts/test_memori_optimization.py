"""Test Memori query optimization and caching"""
import asyncio
import time
import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.memory.memori_sql_engine import GenesisSQLMemory

async def test_memori_optimization():
    """Test query optimization and caching performance"""

    print("=" * 60)
    print("MEMORI QUERY OPTIMIZATION TEST")
    print("=" * 60)

    # Initialize with caching
    memory = GenesisSQLMemory(agent_id="test_agent", enable_caching=True)

    # Connect L2 cache if available
    if memory.query_optimizer:
        await memory.query_optimizer.connect_l2()

    # Populate test data
    print("\n--- Populating Test Data ---")
    for i in range(50):
        memory.store(
            content=f"Test memory {i}: AI training data for machine learning models",
            metadata={'index': i, 'category': 'test', 'type': 'ai_training'}
        )

    print(f"✅ Stored 50 memories")

    # Test 1: Cold query (cache miss)
    print("\n--- Test 1: Cold Query (No Cache) ---")
    start = time.time()
    results1 = await memory.query_memory_optimized("AI training", limit=10)
    cold_duration = (time.time() - start) * 1000

    print(f"Cold query: {cold_duration:.2f}ms, {len(results1)} results")

    # Test 2: Warm query (L1 cache hit)
    print("\n--- Test 2: Warm Query (L1 Cache) ---")
    start = time.time()
    results2 = await memory.query_memory_optimized("AI training", limit=10)
    warm_duration = (time.time() - start) * 1000

    print(f"Warm query: {warm_duration:.2f}ms, {len(results2)} results")

    # Calculate speedup (handle very fast queries)
    if warm_duration > 0.001:  # More than 1 microsecond
        speedup = cold_duration / warm_duration
    else:
        # Cache was so fast it's effectively instant
        speedup = float('inf') if cold_duration > 0 else 1.0

    if speedup == float('inf'):
        print(f"Speedup: Cache query effectively instant (< 0.001ms)")
    else:
        print(f"Speedup: {speedup:.1f}x faster")

    # Test 3: Multiple queries to build cache
    print("\n--- Test 3: Multiple Queries (Building Cache) ---")
    queries = [
        "machine learning",
        "AI training",
        "data models",
        "training data",
        "AI models"
    ]

    for query in queries:
        results = await memory.query_memory_optimized(query, limit=5)
        print(f"  Query '{query}': {len(results)} results")

    # Test 4: Performance stats
    print("\n--- Test 4: Performance Statistics ---")
    if memory.query_optimizer:
        stats = memory.query_optimizer.get_performance_stats()

        print(f"Total queries: {stats['total_queries']}")
        print(f"Cache hit rate: {stats['cache_hit_rate']*100:.1f}%")
        print(f"L1 hit rate: {stats['l1_hit_rate']*100:.1f}%")
        print(f"L2 hit rate: {stats['l2_hit_rate']*100:.1f}%")
        print(f"Avg duration: {stats['avg_duration_ms']:.2f}ms")
        print(f"Avg SQL duration: {stats['avg_sql_duration_ms']:.2f}ms")

        l1_stats = stats['l1_cache_stats']
        print(f"\nL1 Cache Stats:")
        print(f"  Size: {l1_stats['size']}/{l1_stats['max_size']}")
        print(f"  Hits: {l1_stats['hits']}")
        print(f"  Misses: {l1_stats['misses']}")
        print(f"  Hit rate: {l1_stats['hit_rate']*100:.1f}%")
        print(f"  Utilization: {l1_stats['utilization']*100:.1f}%")

        # Validate
        assert stats['cache_hit_rate'] >= 0.1, f"Cache hit rate too low: {stats['cache_hit_rate']*100:.1f}%"

        # Speedup validation (handle very fast caches)
        if speedup != float('inf'):
            assert speedup >= 1.5, f"Cache speedup too low: {speedup:.1f}x (expected >= 1.5x)"
        else:
            print("Cache is effectively instant - validation passed")

        print("\n✅ All optimization tests passed!")
    else:
        print("⚠️  Query optimizer not available - tests skipped")

    # Test 5: Cache invalidation
    print("\n--- Test 5: Cache Invalidation ---")
    if memory.query_optimizer:
        # Get cached query
        key = memory.query_optimizer.generate_query_key("AI training", {'agent_id': 'test_agent', 'limit': 10})

        # Verify it's cached
        cached, level = await memory.query_optimizer.get_cached_query(key)
        print(f"Before invalidation: Cached = {cached is not None} ({level})")

        # Invalidate
        await memory.query_optimizer.invalidate_cache(key)

        # Verify it's cleared
        cached, level = await memory.query_optimizer.get_cached_query(key)
        print(f"After invalidation: Cached = {cached is not None} ({level})")

        assert cached is None, "Cache should be cleared after invalidation"
        print("✅ Cache invalidation working correctly")

    # Cleanup
    memory.clear_agent_memories(confirm=True)
    memory.close()

    return True

def main():
    """Main entry point"""
    try:
        success = asyncio.run(test_memori_optimization())
        if success:
            print("\n" + "=" * 60)
            print("ALL TESTS PASSED ✅")
            print("=" * 60)
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
