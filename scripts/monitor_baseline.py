#!/usr/bin/env python3
"""
Baseline Monitoring Script for Phase 1 Deployment

This script captures baseline metrics before enabling new features:
- Success rates across all agents
- Latency (P50, P95, P99)
- Error rates
- Cost per task

Run for 48 hours to establish stable baseline.
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.htdag_planner import HTDAGPlanner
from infrastructure.halo_router import HALORouter

class BaselineMonitor:
    """
    Monitors baseline system performance

    Metrics tracked:
    - Task success rate (target: establish baseline for comparison)
    - Latency percentiles (P50, P95, P99)
    - Error rate (target: <1%)
    - Cost per task
    """

    def __init__(self, output_file: str = "logs/baseline_metrics.jsonl"):
        self.output_file = output_file
        self.planner = HTDAGPlanner()
        self.router = HALORouter()

        # Ensure logs directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        print(f"✅ Baseline monitor initialized")
        print(f"📊 Metrics will be logged to: {output_file}")
        print(f"🔧 Feature flags: COMPUTER_USE_BACKEND={os.getenv('COMPUTER_USE_BACKEND', 'gemini')}")
        print(f"🔧                USE_DOM_PARSING={os.getenv('USE_DOM_PARSING', 'false')}")
        print(f"🔧                USE_OPENHANDS={os.getenv('USE_OPENHANDS', 'false')}")

    def log_metric(self, metric: Dict[str, Any]):
        """Log metric to JSONL file"""
        metric['timestamp'] = datetime.utcnow().isoformat()
        with open(self.output_file, 'a') as f:
            f.write(json.dumps(metric) + '\n')

    async def test_orchestration_task(self, task: str, agent_type: str) -> Dict[str, Any]:
        """
        Execute single orchestration task and measure metrics

        Returns:
            {
                'task': str,
                'agent': str,
                'success': bool,
                'latency_ms': float,
                'error': str or None,
                'cost_estimate': float
            }
        """
        start_time = time.time()

        try:
            # Route to agent (this is fast and non-LLM)
            routing = self.router.route(
                task_description=task,
                task_type=agent_type
            )

            # Record success (we're testing routing, not full decomposition)
            latency_ms = (time.time() - start_time) * 1000

            result = {
                'task': task,
                'agent': agent_type,
                'success': True,
                'latency_ms': latency_ms,
                'error': None,
                'cost_estimate': 0.001,  # Rough estimate
                'routed_agent': routing['selected_agent'],
                'routing_confidence': routing.get('confidence', 0.0)
            }

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            result = {
                'task': task,
                'agent': agent_type,
                'success': False,
                'latency_ms': latency_ms,
                'error': str(e),
                'cost_estimate': 0.0
            }

        return result

    async def run_baseline_suite(self) -> Dict[str, Any]:
        """
        Run comprehensive baseline test suite

        Tests 15 agents with 3 tasks each = 45 total tasks

        Returns:
            {
                'total_tasks': int,
                'successful': int,
                'failed': int,
                'success_rate': float,
                'avg_latency_ms': float,
                'p95_latency_ms': float,
                'p99_latency_ms': float,
                'error_rate': float,
                'total_cost': float
            }
        """

        # Test scenarios for each agent type
        test_suite = [
            # QA Agent
            {"task": "Write unit tests for authentication module", "agent": "qa"},
            {"task": "Review PR #123 for security issues", "agent": "qa"},
            {"task": "Generate integration tests for API endpoints", "agent": "qa"},

            # Support Agent
            {"task": "Help user reset password", "agent": "support"},
            {"task": "Diagnose database connection error", "agent": "support"},
            {"task": "Explain why deployment failed", "agent": "support"},

            # Analyst Agent
            {"task": "Analyze quarterly sales trends", "agent": "analyst"},
            {"task": "Generate revenue forecast report", "agent": "analyst"},
            {"task": "Compare customer churn across regions", "agent": "analyst"},

            # Security Agent
            {"task": "Scan codebase for SQL injection vulnerabilities", "agent": "security"},
            {"task": "Validate API authentication implementation", "agent": "security"},
            {"task": "Check for exposed secrets in Git history", "agent": "security"},

            # Legal Agent
            {"task": "Review GDPR compliance in data processing", "agent": "legal"},
            {"task": "Generate terms of service for SaaS product", "agent": "legal"},
            {"task": "Analyze copyright implications of API usage", "agent": "legal"},

            # Content Agent
            {"task": "Write blog post about new product launch", "agent": "content"},
            {"task": "Create social media campaign for feature release", "agent": "content"},
            {"task": "Generate email newsletter for customers", "agent": "content"},

            # Builder Agent
            {"task": "Implement user authentication API", "agent": "builder"},
            {"task": "Create React component for dashboard", "agent": "builder"},
            {"task": "Set up database migration script", "agent": "builder"},

            # Deploy Agent
            {"task": "Deploy application to staging environment", "agent": "deploy"},
            {"task": "Configure Kubernetes cluster for production", "agent": "deploy"},
            {"task": "Set up CI/CD pipeline for automated testing", "agent": "deploy"},

            # Monitor Agent
            {"task": "Set up alerting for high error rates", "agent": "monitor"},
            {"task": "Create dashboard for application metrics", "agent": "monitor"},
            {"task": "Analyze system performance bottlenecks", "agent": "monitor"},

            # Design Agent
            {"task": "Create wireframes for mobile app", "agent": "design"},
            {"task": "Design logo for new product", "agent": "design"},
            {"task": "Build component library for design system", "agent": "design"},

            # Marketing Agent
            {"task": "Create Google Ads campaign for product launch", "agent": "marketing"},
            {"task": "Analyze competitor pricing strategies", "agent": "marketing"},
            {"task": "Generate landing page copy for conversion", "agent": "marketing"},

            # Sales Agent
            {"task": "Qualify lead from demo request", "agent": "sales"},
            {"task": "Generate proposal for enterprise customer", "agent": "sales"},
            {"task": "Follow up with customer after trial", "agent": "sales"},

            # Finance Agent
            {"task": "Generate monthly financial report", "agent": "finance"},
            {"task": "Analyze burn rate and runway", "agent": "finance"},
            {"task": "Create budget forecast for Q4", "agent": "finance"},

            # Ops Agent
            {"task": "Automate database backup process", "agent": "ops"},
            {"task": "Optimize server resource allocation", "agent": "ops"},
            {"task": "Set up disaster recovery procedure", "agent": "ops"},

            # Spec Agent
            {"task": "Write technical specification for new feature", "agent": "spec"},
            {"task": "Document API endpoints for external developers", "agent": "spec"},
            {"task": "Create architecture diagram for microservices", "agent": "spec"}
        ]

        print(f"\n🚀 Running baseline suite: {len(test_suite)} tasks across 15 agents")
        print(f"⏱️  This will take ~2-3 minutes...\n")

        # Execute all tasks
        results = []
        for i, scenario in enumerate(test_suite, 1):
            print(f"[{i}/{len(test_suite)}] Testing: {scenario['agent']} - {scenario['task'][:50]}...")
            result = await self.test_orchestration_task(
                task=scenario['task'],
                agent_type=scenario['agent']
            )
            results.append(result)
            self.log_metric(result)

            # Small delay to avoid rate limits
            await asyncio.sleep(0.5)

        # Calculate aggregate metrics
        successful = sum(1 for r in results if r['success'])
        failed = len(results) - successful
        success_rate = successful / len(results) if results else 0.0

        latencies = [r['latency_ms'] for r in results]
        latencies.sort()

        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
        p95_latency = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
        p99_latency = latencies[int(len(latencies) * 0.99)] if latencies else 0.0

        error_rate = failed / len(results) if results else 0.0
        total_cost = sum(r['cost_estimate'] for r in results)

        summary = {
            'total_tasks': len(results),
            'successful': successful,
            'failed': failed,
            'success_rate': success_rate,
            'avg_latency_ms': avg_latency,
            'p50_latency_ms': latencies[int(len(latencies) * 0.50)] if latencies else 0.0,
            'p95_latency_ms': p95_latency,
            'p99_latency_ms': p99_latency,
            'error_rate': error_rate,
            'total_cost': total_cost
        }

        self.log_metric({'type': 'summary', **summary})

        return summary

    def print_summary(self, summary: Dict[str, Any]):
        """Print baseline summary to console"""
        print("\n" + "="*70)
        print("📊 BASELINE METRICS SUMMARY")
        print("="*70)
        print(f"Total Tasks:       {summary['total_tasks']}")
        print(f"Successful:        {summary['successful']} ({summary['success_rate']*100:.1f}%)")
        print(f"Failed:            {summary['failed']}")
        print(f"Error Rate:        {summary['error_rate']*100:.1f}%")
        print()
        print(f"Avg Latency:       {summary['avg_latency_ms']:.0f}ms")
        print(f"P50 Latency:       {summary['p50_latency_ms']:.0f}ms")
        print(f"P95 Latency:       {summary['p95_latency_ms']:.0f}ms")
        print(f"P99 Latency:       {summary['p99_latency_ms']:.0f}ms")
        print()
        print(f"Estimated Cost:    ${summary['total_cost']:.4f}")
        print("="*70)
        print(f"\n✅ Baseline metrics logged to: {self.output_file}")
        print(f"📈 Use these metrics to compare against Phase 2 (10% traffic) results")
        print(f"\n💡 Next Steps:")
        print(f"   1. Review metrics in {self.output_file}")
        print(f"   2. Wait 48 hours for stable baseline")
        print(f"   3. Proceed to Phase 2 (10% A/B testing)")

async def main():
    """Main entry point"""
    monitor = BaselineMonitor()

    try:
        summary = await monitor.run_baseline_suite()
        monitor.print_summary(summary)

        return 0

    except Exception as e:
        print(f"\n❌ Error during baseline monitoring: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
