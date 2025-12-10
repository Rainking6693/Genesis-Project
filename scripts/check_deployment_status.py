#!/usr/bin/env python3
"""Quick script to check deployment status."""
import json
import os

def main():
    results_dir = "logs"
    # Find latest results file
    results_files = [f for f in os.listdir(results_dir) if f.startswith("deployment_results_")]
    if not results_files:
        print("No deployment results found")
        return

    latest = sorted(results_files)[-1]
    filepath = os.path.join(results_dir, latest)

    with open(filepath, 'r') as f:
        data = json.load(f)

    deployments = data.get('deployments', [])
    deployed = [x for x in deployments if x.get('status') == 'deployed']
    verified = [x for x in deployed if x.get('verified')]
    failed = [x for x in deployments if x.get('status') != 'deployed']

    print(f"File: {latest}")
    print(f"Started: {data.get('started_at', 'N/A')}")
    print(f"Completed: {data.get('completed_at', 'N/A')}")
    print(f"")
    print(f"Total businesses: {len(deployments)}")
    print(f"Successfully deployed: {len(deployed)}")
    print(f"Verified (HTTP 200): {len(verified)}")
    print(f"Failed: {len(failed)}")

    if data.get('total_duration_seconds'):
        duration = data['total_duration_seconds']
        print(f"Duration: {duration:.0f} seconds ({duration/60:.1f} minutes)")

    # Show a few examples
    if verified:
        print(f"\nSample verified sites:")
        for site in verified[:5]:
            print(f"  - {site['deployment_url']}")

if __name__ == "__main__":
    main()
