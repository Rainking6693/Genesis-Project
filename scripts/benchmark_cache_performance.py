"""Benchmark cache performance"""
import asyncio
import time
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.memory.memori_sql_engine import GenesisSQLMemory

async def benchmark():
    print('Performance Benchmark: Cache Speedup Test')
    print('=' * 60)

    # Initialize with caching
    memory = GenesisSQLMemory(agent_id='benchmark_agent', enable_caching=True)

    # Store test data
    print('Storing 100 test memories...')
    for i in range(100):
        memory.store(
            content=f'Memory {i}: AI and machine learning content for testing',
            metadata={'index': i, 'test': True}
        )

    # Warm up
    await memory.query_memory_optimized('machine learning', limit=10)

    # Benchmark: 10 cold queries
    print('\nBenchmark 1: Cold Queries (no cache)')
    memory.query_optimizer.l1_cache.clear()

    cold_times = []
    for i in range(10):
        start = time.time()
        results = await memory.query_memory_optimized('AI', limit=10, use_cache=False)
        cold_times.append((time.time() - start) * 1000)

    avg_cold = sum(cold_times) / len(cold_times)
    print(f'  Avg cold query: {avg_cold:.2f}ms')

    # Benchmark: 10 warm queries
    print('\nBenchmark 2: Warm Queries (with cache)')

    # Prime cache
    await memory.query_memory_optimized('AI', limit=10, use_cache=True)

    warm_times = []
    for i in range(10):
        start = time.time()
        results = await memory.query_memory_optimized('AI', limit=10, use_cache=True)
        warm_times.append((time.time() - start) * 1000)

    avg_warm = sum(warm_times) / len(warm_times)
    print(f'  Avg warm query: {avg_warm:.2f}ms')

    # Calculate speedup
    if avg_warm > 0.001:
        speedup = avg_cold / avg_warm
    else:
        speedup = float('inf')

    if speedup == float('inf'):
        print(f'\nSpeedup: Cache effectively instant')
    else:
        print(f'\nSpeedup: {speedup:.1f}x faster')

    # Performance stats
    stats = memory.query_optimizer.get_performance_stats()
    print(f'\nCache Statistics:')
    print(f'  Hit rate: {stats["cache_hit_rate"]*100:.1f}%')
    print(f'  Total queries: {stats["total_queries"]}')
    print(f'  Avg duration: {stats["avg_duration_ms"]:.2f}ms')

    # Cleanup
    memory.clear_agent_memories(confirm=True)
    memory.close()

    return speedup >= 5.0 or speedup == float('inf')

if __name__ == "__main__":
    success = asyncio.run(benchmark())
    print('\n' + '=' * 60)
    if success:
        print('PERFORMANCE VALIDATION: PASSED')
    else:
        print('PERFORMANCE VALIDATION: NEEDS IMPROVEMENT')

    sys.exit(0 if success else 1)
