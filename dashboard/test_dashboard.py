"""
Test script for Genesis Dashboard
Creates sample log data and tests metrics collection
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dashboard.metrics_collector import MetricsCollector


def create_sample_logs():
    """Create sample log files for testing."""
    base_path = Path(__file__).parent.parent
    logs_path = base_path / "logs"
    logs_path.mkdir(exist_ok=True)

    # Create sample system log
    system_log = logs_path / "system.log"
    with open(system_log, 'w') as f:
        now = datetime.utcnow()

        # Write various log entries over past 7 days
        for day in range(7):
            log_date = now - timedelta(days=day)
            timestamp = log_date.strftime('%Y-%m-%d %H:%M:%S')

            # Success entries
            for i in range(50):
                f.write(f"{timestamp} - Task completed successfully\n")

            # Failures
            for i in range(5):
                f.write(f"{timestamp} - Task failed with error\n")

            # HTDAG entries
            f.write(f"{timestamp} - HTDAG decomposition complete depth=3 nodes=8\n")
            f.write(f"{timestamp} - HTDAG decomposition complete depth=4 nodes=12\n")

            # HALO entries
            f.write(f"{timestamp} - HALO routed to Builder agent routing_time=110.5ms\n")
            f.write(f"{timestamp} - HALO routed to Marketer agent routing_time=95.2ms\n")
            f.write(f"{timestamp} - Load balancing triggered\n")

            # AOP entries
            f.write(f"{timestamp} - AOP validation passed\n")
            f.write(f"{timestamp} - AOP validation passed\n")

            # SE-Darwin entries
            f.write(f"{timestamp} - SE-Darwin evolution started\n")
            f.write(f"{timestamp} - SE-Darwin improvement accepted quality_improvement=12.5%\n")
            f.write(f"{timestamp} - SE-Darwin archive_size=47\n")

            # ATLAS entries
            f.write(f"{timestamp} - ATLAS online update learning_rate=0.15\n")
            f.write(f"{timestamp} - ATLAS knowledge_items=234\n")

            # AgentGit entries
            f.write(f"{timestamp} - AgentGit commit versions_tracked=89\n")

            # Safety entries
            f.write(f"{timestamp} - Human approval requested\n")
            f.write(f"{timestamp} - Human approval granted approval_time=8min\n")
            f.write(f"{timestamp} - WaltzRL safety_score=94.2\n")

    # Create sample agent logs
    agents_log = logs_path / "agents.log"
    with open(agents_log, 'w') as f:
        agents = [
            "Builder", "Marketer", "Support", "Analyst", "Deployer",
            "QA", "Legal", "Designer", "Content", "Sales",
            "DevOps", "Security", "Finance", "HR", "Product"
        ]

        for day in range(7):
            log_date = now - timedelta(days=day)
            timestamp = log_date.strftime('%Y-%m-%d %H:%M:%S')

            for agent in agents:
                # Success entries
                for i in range(10):
                    latency = 100 + (hash(agent + str(i)) % 100)
                    cost = 0.03 + (hash(agent + str(i)) % 10) / 100
                    quality = 7.5 + (hash(agent + str(i)) % 25) / 10
                    f.write(f"{timestamp} - {agent} agent success latency={latency}ms cost=${cost:.3f} quality={quality:.1f}\n")

                # Some failures
                if hash(agent) % 5 == 0:
                    f.write(f"{timestamp} - {agent} agent failed\n")

    # Create LLM usage log
    llm_log = logs_path / "llm.log"
    with open(llm_log, 'w') as f:
        for day in range(30):
            log_date = now - timedelta(days=day)
            timestamp = log_date.strftime('%Y-%m-%d %H:%M:%S')

            # GPT-4o calls (expensive, fewer)
            for i in range(20):
                f.write(f"{timestamp} - LLM call gpt-4o tokens=2500\n")

            # Gemini Flash calls (cheap, more)
            for i in range(100):
                f.write(f"{timestamp} - LLM call gemini-flash tokens=1800\n")

            # Claude calls (moderate)
            for i in range(30):
                f.write(f"{timestamp} - LLM call claude-sonnet tokens=2200\n")

    print(f"Created sample logs in {logs_path}")


def create_sample_businesses():
    """Create sample business directories."""
    base_path = Path(__file__).parent.parent
    businesses_path = base_path / "businesses"
    businesses_path.mkdir(exist_ok=True)

    # Create 5 sample businesses
    for i in range(5):
        business_dir = businesses_path / f"business_{i+1}"
        business_dir.mkdir(exist_ok=True)

        # Create business config
        config = {
            "name": f"Business {i+1}",
            "created_at": (datetime.utcnow() - timedelta(days=i*10)).isoformat(),
            "status": "active",
            "revenue": 100.0 + (i * 50)
        }

        with open(business_dir / "config.json", 'w') as f:
            json.dump(config, f, indent=2)

    print(f"Created sample businesses in {businesses_path}")


def test_metrics_collection():
    """Test metrics collection."""
    print("\nTesting Metrics Collection\n")

    base_path = Path(__file__).parent.parent
    collector = MetricsCollector(base_path=base_path)

    # Collect all metrics
    metrics = collector.collect_all_metrics()

    # Print results
    print("=" * 70)
    print("EXECUTIVE OVERVIEW")
    print("=" * 70)
    exec_data = metrics['executive_overview']
    print(f"Revenue (Monthly):        ${exec_data['revenue_monthly']:.2f}")
    print(f"Costs (Monthly):          ${exec_data['costs_monthly']:.2f}")
    print(f"Profit (Monthly):         ${exec_data['profit_monthly']:.2f}")
    print(f"Active Businesses:        {exec_data['active_businesses']}")
    print(f"Tasks Completed (30d):    {exec_data['tasks_completed_30d']}")
    print(f"Success Rate:             {exec_data['success_rate']}%")

    print("\n" + "=" * 70)
    print("AGENT PERFORMANCE (Top 5)")
    print("=" * 70)
    agents = metrics['agent_performance']['agents'][:5]
    print(f"{'Agent':<15} {'Success':<10} {'Latency':<12} {'Cost':<10} {'Quality':<10}")
    print("-" * 70)
    for agent in agents:
        print(f"{agent['name']:<15} {agent['success_rate']:<10}% {agent['avg_latency_ms']:<12.1f}ms ${agent['cost_per_task']:<9.3f} {agent['quality_score']:<10.1f}/10")

    print("\n" + "=" * 70)
    print("ORCHESTRATION METRICS")
    print("=" * 70)
    orch = metrics['orchestration_metrics']
    print(f"HTDAG Decompositions:     {orch['htdag']['decompositions_total']}")
    print(f"HALO Routing Decisions:   {orch['halo']['routing_decisions']}")
    print(f"AOP Validations:          {orch['aop']['validations_total']}")
    print(f"Circuit Breaker Status:   {orch['circuit_breaker']['status']}")

    print("\n" + "=" * 70)
    print("COST OPTIMIZATION")
    print("=" * 70)
    cost = metrics['cost_optimization']
    print(f"Baseline Cost:            ${cost['monthly_cost_baseline']:.2f}")
    print(f"Current Cost:             ${cost['monthly_cost_actual']:.2f}")
    print(f"Cost Reduction:           {cost['cost_reduction_pct']}%")
    print(f"\nLLM Usage Distribution:")
    print(f"  GPT-4o:                 {cost['llm_usage']['gpt4o']['percentage']}% (${cost['llm_usage']['gpt4o']['cost']:.2f})")
    print(f"  Gemini Flash:           {cost['llm_usage']['gemini']['percentage']}% (${cost['llm_usage']['gemini']['cost']:.2f})")
    print(f"  Claude Sonnet:          {cost['llm_usage']['claude']['percentage']}% (${cost['llm_usage']['claude']['cost']:.2f})")

    print("\n" + "=" * 70)
    print("EVOLUTION & LEARNING")
    print("=" * 70)
    evol = metrics['evolution_learning']
    print(f"SE-Darwin Runs:           {evol['se_darwin']['evolution_runs']}")
    print(f"Improvements Generated:   {evol['se_darwin']['improvements_generated']}")
    print(f"Avg Quality Improvement:  {evol['se_darwin']['avg_quality_improvement']}%")
    print(f"ATLAS Learning Updates:   {evol['atlas']['online_learning_updates']}")

    print("\n" + "=" * 70)
    print("SAFETY & GOVERNANCE")
    print("=" * 70)
    safety = metrics['safety_governance']
    print(f"Policy Violations (7d):   {safety['policy_violations']['total_7d']}")
    print(f"  Critical:               {safety['policy_violations']['by_severity']['critical']}")
    print(f"  High:                   {safety['policy_violations']['by_severity']['high']}")
    print(f"  Medium:                 {safety['policy_violations']['by_severity']['medium']}")
    print(f"Human Approvals Granted:  {safety['human_oversight']['approvals_granted']}")
    print(f"WaltzRL Safety Score:     {safety['waltzrl']['safety_score']}")

    # Save snapshot
    print("\n" + "=" * 70)
    print("SAVING SNAPSHOT")
    print("=" * 70)
    saved_path = collector.save_metrics_snapshot()
    print(f"Metrics saved to: {saved_path}")

    print("\nAll tests passed!")


def test_api_endpoints():
    """Test Flask API endpoints."""
    print("\nTesting API Endpoints\n")
    print("To test API endpoints, run:")
    print("  1. python app.py")
    print("  2. Open http://localhost:5000")
    print("  3. Check API at http://localhost:5000/api/metrics")


if __name__ == "__main__":
    import sys
    import io

    # Fix encoding for Windows console
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("Genesis Dashboard Test Suite\n")

    # Create sample data
    create_sample_logs()
    create_sample_businesses()

    # Test metrics collection
    test_metrics_collection()

    # Show API testing instructions
    test_api_endpoints()

    print("\nAll setup complete! Dashboard is ready to use.")
    print("\nNext steps:")
    print("  1. Install dependencies: pip install -r requirements.txt")
    print("  2. Run dashboard: python app.py")
    print("  3. Open browser: http://localhost:5000")
