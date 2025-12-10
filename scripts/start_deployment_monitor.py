#!/usr/bin/env python3
"""
Start DeploymentMonitorAgent to watch all deployed GitHub Pages sites.

Usage:
    python scripts/start_deployment_monitor.py
    python scripts/start_deployment_monitor.py --interval 300  # 5 min checks
    python scripts/start_deployment_monitor.py --results logs/deployment_results_20251208_135554.json
"""
import asyncio
import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
from infrastructure.deployment_monitor_agent import DeploymentMonitorAgent

load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/deployment_monitor.log')
    ]
)
logger = logging.getLogger(__name__)


def find_latest_results():
    """Find the most recent deployment results file."""
    results_dir = project_root / "logs"
    results_files = list(results_dir.glob("deployment_results_*.json"))
    if not results_files:
        return None
    return sorted(results_files)[-1]


async def load_deployments_from_results(monitor: DeploymentMonitorAgent, results_file: Path):
    """Load deployments from results file into monitor."""
    logger.info(f"Loading deployments from: {results_file}")

    with open(results_file, 'r') as f:
        data = json.load(f)

    deployments = data.get('deployments', [])
    successful = [d for d in deployments if d.get('status') == 'deployed']

    logger.info(f"Found {len(successful)} successful deployments to monitor")

    for i, deployment in enumerate(successful, 1):
        business_name = deployment['business_name']
        deployment_url = deployment.get('deployment_url', '')
        repo_url = deployment.get('repo_url', '')
        app_path = deployment.get('path', '')

        if not deployment_url:
            logger.warning(f"Skipping {business_name}: no deployment URL")
            continue

        deployment_id = f"ghp-{business_name}"

        await monitor.add_deployment(
            deployment_id=deployment_id,
            business_name=business_name,
            deployment_url=deployment_url,
            platform="github-pages",
            app_path=app_path
        )

        if i % 20 == 0:
            logger.info(f"Loaded {i}/{len(successful)} deployments...")

    logger.info(f"Successfully loaded {len(monitor.monitored_sites)} sites for monitoring")


async def main():
    parser = argparse.ArgumentParser(description='Start Deployment Monitor Agent')
    parser.add_argument('--interval', type=int, default=300,
                       help='Check interval in seconds (default: 300 = 5 min)')
    parser.add_argument('--results', type=str, default=None,
                       help='Path to deployment results JSON file')
    args = parser.parse_args()

    print("=" * 80)
    print("DEPLOYMENT MONITOR AGENT")
    print("=" * 80)
    print(f"Check interval: {args.interval}s ({args.interval / 60:.1f} minutes)")
    print(f"Auto-recovery: ENABLED (max 3 attempts)")
    print(f"Re-deployment: ENABLED for persistent failures")
    print("=" * 80)
    print()

    # Find results file
    if args.results:
        results_file = Path(args.results)
    else:
        results_file = find_latest_results()

    if not results_file or not results_file.exists():
        logger.error("No deployment results file found!")
        logger.error("Run deploy_to_github_pages.py first or specify --results path")
        return

    # Initialize monitor
    monitor = DeploymentMonitorAgent(check_interval=args.interval)

    # Load deployments
    await load_deployments_from_results(monitor, results_file)

    # Print initial summary
    summary = monitor.get_health_summary()
    print()
    print("=" * 80)
    print("INITIAL HEALTH CHECK COMPLETE")
    print("=" * 80)
    print(f"Total sites: {summary['total_sites']}")
    print(f"Healthy (HTTP 200): {summary['healthy']}")
    print(f"Unhealthy: {summary['unhealthy']}")
    print("=" * 80)
    print()

    # List any unhealthy sites
    unhealthy = [s for s in summary['sites'].values() if not s['is_healthy']]
    if unhealthy:
        print(f"Unhealthy sites ({len(unhealthy)}):")
        for site in unhealthy[:10]:  # Show first 10
            print(f"  - {site['business_name']}: {site['error']} (code: {site['status_code']})")
        if len(unhealthy) > 10:
            print(f"  ... and {len(unhealthy) - 10} more")
        print()

    print("Starting continuous monitoring...")
    print("Press Ctrl+C to stop")
    print()

    # Start monitoring loop
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
        await monitor.stop_monitoring()
        print()
        print("Monitor stopped.")


if __name__ == "__main__":
    asyncio.run(main())
