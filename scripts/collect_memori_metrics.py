"""
Collect Memori SQL metrics for dashboard display

This script collects real-time metrics from the Memori SQL engine
and saves them to a JSON file for the dashboard to display.
"""
import asyncio
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
from infrastructure.memory.memori_sql_engine import GenesisSQLMemory

# Load environment
load_genesis_env()

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def collect_metrics():
    """Collect real-time Memori metrics"""

    logger.info("Collecting Memori SQL metrics...")

    try:
        # Initialize Memori engine for a test agent
        memory = GenesisSQLMemory(agent_id="metrics_collector")

        # Collect all metrics
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "database_stats": memory.get_database_stats(),
            "query_performance": memory.get_query_performance_stats(),
            "agent_activity": memory.get_agent_activity_stats(),
            "engine_stats": memory.get_stats()
        }

        # Ensure metrics directory exists
        metrics_dir = project_root / "metrics"
        metrics_dir.mkdir(exist_ok=True)

        # Save to metrics file
        metrics_file = metrics_dir / "memori_metrics.json"
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)

        logger.info(f"Metrics saved to {metrics_file}")
        logger.info(f"Metrics summary:")
        logger.info(f"  Total memories: {metrics['database_stats']['total_memories']}")
        logger.info(f"  Active agents: {metrics['agent_activity']['active_agents']}")
        logger.info(f"  Memories today: {metrics['agent_activity']['memories_today']}")

        # Clean up
        memory.close()

        return metrics

    except Exception as e:
        logger.error(f"Failed to collect metrics: {e}")
        # Return minimal metrics on error
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "database_stats": {
                "total_memories": 0,
                "agent_memories": 0,
                "database_backend": "unknown"
            },
            "query_performance": {
                "retrieval_count": 0,
                "avg_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "queries_per_second": 0.0
            },
            "agent_activity": {
                "active_agents": 0,
                "memories_today": 0,
                "top_agents": []
            }
        }


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("MEMORI METRICS COLLECTION")
    print("=" * 60)

    metrics = collect_metrics()

    print("\n" + "=" * 60)
    print("COLLECTION COMPLETE")
    print("=" * 60)
    print(f"\nMetrics file: metrics/memori_metrics.json")
    print(f"Timestamp: {metrics['timestamp']}")

    if "error" not in metrics:
        print(f"\nDatabase Stats:")
        print(f"  Total memories: {metrics['database_stats']['total_memories']}")
        print(f"  Backend: {metrics['database_stats']['database_backend']}")

        print(f"\nAgent Activity:")
        print(f"  Active agents: {metrics['agent_activity']['active_agents']}")
        print(f"  Memories today: {metrics['agent_activity']['memories_today']}")

        if metrics['agent_activity']['top_agents']:
            print(f"\n  Top Agents:")
            for agent in metrics['agent_activity']['top_agents'][:5]:
                print(f"    - {agent['agent_id']}: {agent['count']} memories")

        print("\nSuccess!")
    else:
        print(f"\nError: {metrics['error']}")
        print("Note: This is expected if no memories have been stored yet.")
