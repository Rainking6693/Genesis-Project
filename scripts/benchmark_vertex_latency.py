#!/usr/bin/env python3
"""
Vertex AI Latency Benchmarking Script

Measures end-to-end latency for Vertex AI endpoints with:
- P50, P95, P99 percentiles
- Average, min, max latency
- Cost estimation
- Throughput testing
- Concurrent request testing
"""

import asyncio
import os
import time
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass, field

try:
    from infrastructure.vertex_router import VertexModelRouter
    from infrastructure.vertex_deployment import VertexDeploymentManager
except ImportError:
    print("❌ Error: Cannot import Genesis infrastructure modules")
    print("   Run from project root: python scripts/benchmark_vertex_latency.py")
    exit(1)


@dataclass
class BenchmarkResult:
    """Results from a latency benchmark."""
    
    role: str
    endpoint_id: str
    num_requests: int
    latencies_ms: List[float] = field(default_factory=list)
    successful_requests: int = 0
    failed_requests: int = 0
    fallback_requests: int = 0
    total_cost_usd: float = 0.0
    
    @property
    def avg_latency_ms(self) -> float:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0.0
    
    @property
    def min_latency_ms(self) -> float:
        return min(self.latencies_ms) if self.latencies_ms else 0.0
    
    @property
    def max_latency_ms(self) -> float:
        return max(self.latencies_ms) if self.latencies_ms else 0.0
    
    @property
    def p50_latency_ms(self) -> float:
        return statistics.median(self.latencies_ms) if self.latencies_ms else 0.0
    
    @property
    def p95_latency_ms(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_latencies = sorted(self.latencies_ms)
        idx = int(len(sorted_latencies) * 0.95)
        return sorted_latencies[idx]
    
    @property
    def p99_latency_ms(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_latencies = sorted(self.latencies_ms)
        idx = int(len(sorted_latencies) * 0.99)
        return sorted_latencies[idx]
    
    @property
    def success_rate(self) -> float:
        total = self.successful_requests + self.failed_requests
        return self.successful_requests / total if total > 0 else 0.0
    
    @property
    def meets_sla(self) -> bool:
        """Check if meets <100ms target latency (P95)."""
        return self.p95_latency_ms < 100.0


class VertexLatencyBenchmark:
    """Benchmark Vertex AI endpoint latency."""
    
    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        enable_vertex: bool = True,
    ):
        self.router = VertexModelRouter(
            project_id=project_id,
            location=location,
            enable_vertex=enable_vertex,
            enable_cost_tracking=True,
            enable_latency_tracking=True,
        )
        self.deployment_manager = VertexDeploymentManager(
            project_id=project_id,
            location=location,
            enable_vertex=enable_vertex,
        )
    
    def run_sequential_benchmark(
        self,
        role: str,
        num_requests: int = 100,
        prompt: str = "Analyze this customer support ticket: User cannot log in.",
    ) -> BenchmarkResult:
        """
        Run sequential latency benchmark.
        
        Args:
            role: Agent role to test (e.g., 'qa', 'support')
            num_requests: Number of requests to send
            prompt: Test prompt
        
        Returns:
            BenchmarkResult with latency statistics
        """
        print(f"\n🔄 Running sequential benchmark for role '{role}'...")
        print(f"   Requests: {num_requests}")
        print(f"   Prompt length: {len(prompt)} chars")
        
        result = BenchmarkResult(
            role=role,
            endpoint_id=self.router._select_endpoint(role) or "fallback",  # type: ignore
            num_requests=num_requests,
        )
        
        for i in range(num_requests):
            start_time = time.time()
            
            try:
                response = self.router.route(role=role, prompt=prompt)
                latency_ms = (time.time() - start_time) * 1000
                
                result.latencies_ms.append(latency_ms)
                
                if response:
                    result.successful_requests += 1
                else:
                    result.failed_requests += 1
                
                # Progress indicator
                if (i + 1) % 10 == 0:
                    print(f"   Progress: {i+1}/{num_requests} requests ({latency_ms:.1f}ms)")
            
            except Exception as e:
                result.failed_requests += 1
                print(f"   ❌ Request {i+1} failed: {e}")
        
        # Get cost from router
        stats = self.router.get_usage_stats(role=role)
        if stats and role in stats:
            result.total_cost_usd = stats[role]['total_cost_usd']
        
        return result
    
    async def _async_request(self, role: str, prompt: str) -> tuple[float, bool]:
        """Make an async request and return (latency_ms, success)."""
        start_time = time.time()
        
        try:
            # Run sync router in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.router.route(role=role, prompt=prompt)
            )
            latency_ms = (time.time() - start_time) * 1000
            return (latency_ms, bool(response))
        except Exception:
            latency_ms = (time.time() - start_time) * 1000
            return (latency_ms, False)
    
    async def run_concurrent_benchmark(
        self,
        role: str,
        num_requests: int = 100,
        concurrency: int = 10,
        prompt: str = "Analyze this customer support ticket: User cannot log in.",
    ) -> BenchmarkResult:
        """
        Run concurrent latency benchmark.
        
        Args:
            role: Agent role to test
            num_requests: Total number of requests
            concurrency: Number of concurrent requests
            prompt: Test prompt
        
        Returns:
            BenchmarkResult with latency statistics
        """
        print(f"\n🔄 Running concurrent benchmark for role '{role}'...")
        print(f"   Total requests: {num_requests}")
        print(f"   Concurrency: {concurrency}")
        print(f"   Prompt length: {len(prompt)} chars")
        
        result = BenchmarkResult(
            role=role,
            endpoint_id=self.router._select_endpoint(role) or "fallback",  # type: ignore
            num_requests=num_requests,
        )
        
        # Create batches
        batches = [
            [i for i in range(start, min(start + concurrency, num_requests))]
            for start in range(0, num_requests, concurrency)
        ]
        
        completed = 0
        for batch_idx, batch in enumerate(batches):
            tasks = [
                self._async_request(role, prompt)
                for _ in batch
            ]
            
            results = await asyncio.gather(*tasks)
            
            for latency_ms, success in results:
                result.latencies_ms.append(latency_ms)
                if success:
                    result.successful_requests += 1
                else:
                    result.failed_requests += 1
            
            completed += len(batch)
            avg_latency = statistics.mean([lat for lat, _ in results])
            print(f"   Batch {batch_idx+1}/{len(batches)}: {completed}/{num_requests} requests ({avg_latency:.1f}ms avg)")
        
        # Get cost from router
        stats = self.router.get_usage_stats(role=role)
        if stats and role in stats:
            result.total_cost_usd = stats[role]['total_cost_usd']
        
        return result
    
    def print_results(self, result: BenchmarkResult) -> None:
        """Print formatted benchmark results."""
        print("\n" + "="*80)
        print(f"BENCHMARK RESULTS: {result.role.upper()}")
        print("="*80)
        
        print(f"\n📊 Latency Statistics")
        print(f"   Average:     {result.avg_latency_ms:>8.2f} ms")
        print(f"   Median (P50): {result.p50_latency_ms:>8.2f} ms")
        print(f"   P95:         {result.p95_latency_ms:>8.2f} ms")
        print(f"   P99:         {result.p99_latency_ms:>8.2f} ms")
        print(f"   Min:         {result.min_latency_ms:>8.2f} ms")
        print(f"   Max:         {result.max_latency_ms:>8.2f} ms")
        
        print(f"\n✅ Success Metrics")
        print(f"   Successful:  {result.successful_requests:>8} / {result.num_requests}")
        print(f"   Failed:      {result.failed_requests:>8} / {result.num_requests}")
        print(f"   Success Rate: {result.success_rate*100:>7.2f}%")
        
        print(f"\n💰 Cost")
        print(f"   Total Cost:  ${result.total_cost_usd:>8.4f}")
        print(f"   Cost/Request: ${result.total_cost_usd/result.num_requests:>8.6f}")
        
        print(f"\n🎯 SLA Compliance")
        sla_target = 100.0  # 100ms P95 target
        if result.meets_sla:
            print(f"   ✅ PASS: P95 latency ({result.p95_latency_ms:.2f}ms) < {sla_target}ms")
        else:
            print(f"   ❌ FAIL: P95 latency ({result.p95_latency_ms:.2f}ms) ≥ {sla_target}ms")
        
        print("\n" + "="*80)


def main():
    """Run Vertex AI latency benchmarks."""
    print("╔══════════════════════════════════════════════════════════════════════════════╗")
    print("║              VERTEX AI LATENCY BENCHMARK                                     ║")
    print("╚══════════════════════════════════════════════════════════════════════════════╝")
    
    # Get configuration from environment
    project_id = os.getenv("VERTEX_PROJECT_ID", "")
    location = os.getenv("VERTEX_LOCATION", "us-central1")
    enable_vertex = os.getenv("ENABLE_VERTEX", "false").lower() == "true"
    
    if not project_id:
        print("\n⚠️  VERTEX_PROJECT_ID not set. Running in MOCK mode for demonstration.")
        print("   To test live Vertex AI:")
        print("   1. export VERTEX_PROJECT_ID='your-project-id'")
        print("   2. export GOOGLE_APPLICATION_CREDENTIALS='/path/to/key.json'")
        print("   3. export ENABLE_VERTEX='true'")
        print()
        project_id = "mock-project"
        enable_vertex = False
    
    # Initialize benchmark
    benchmark = VertexLatencyBenchmark(
        project_id=project_id,
        location=location,
        enable_vertex=enable_vertex,
    )
    
    # Register test endpoints (in mock mode, these are simulated)
    test_roles = ["qa", "support", "legal"]
    for role in test_roles:
        endpoint_id = f"projects/{project_id}/locations/{location}/endpoints/mock-{role}-endpoint"
        benchmark.router.register_endpoint(role, endpoint_id, weight=1)
    
    print(f"\n✅ Configuration:")
    print(f"   Project ID:  {project_id}")
    print(f"   Location:    {location}")
    print(f"   Mode:        {'LIVE' if enable_vertex else 'MOCK'}")
    print(f"   Roles:       {', '.join(test_roles)}")
    
    # Test prompts for different roles
    test_prompts = {
        "qa": "Review this code for bugs: def calculate_total(items): return sum(item.price for item in items)",
        "support": "Handle this support ticket: Customer reports login issues after password reset.",
        "legal": "Analyze this contract clause: Party A shall indemnify Party B against all claims.",
    }
    
    # Run benchmarks
    results = []
    
    # Sequential benchmark
    for role in test_roles:
        result = benchmark.run_sequential_benchmark(
            role=role,
            num_requests=50,  # 50 requests for faster testing
            prompt=test_prompts[role],
        )
        results.append(result)
        benchmark.print_results(result)
    
    # Concurrent benchmark (async)
    print("\n" + "="*80)
    print("CONCURRENT BENCHMARKS")
    print("="*80)
    
    for role in test_roles[:1]:  # Test only first role for concurrency
        result = asyncio.run(benchmark.run_concurrent_benchmark(
            role=role,
            num_requests=50,
            concurrency=10,
            prompt=test_prompts[role],
        ))
        results.append(result)
        benchmark.print_results(result)
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    all_latencies = [lat for r in results for lat in r.latencies_ms]
    total_requests = sum(r.num_requests for r in results)
    total_cost = sum(r.total_cost_usd for r in results)
    
    print(f"\n📊 Overall Statistics")
    print(f"   Total Requests:  {total_requests}")
    print(f"   Avg Latency:     {statistics.mean(all_latencies):.2f} ms")
    print(f"   P95 Latency:     {sorted(all_latencies)[int(len(all_latencies)*0.95)]:.2f} ms")
    print(f"   Total Cost:      ${total_cost:.4f}")
    
    sla_passed = sum(1 for r in results if r.meets_sla)
    sla_total = len(results)
    print(f"\n🎯 SLA Compliance:   {sla_passed}/{sla_total} tests passed (<100ms P95)")
    
    if sla_passed == sla_total:
        print("\n✅ ALL BENCHMARKS PASSED!")
    else:
        print(f"\n⚠️  {sla_total - sla_passed} benchmark(s) failed SLA")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    main()

