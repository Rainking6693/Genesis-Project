#!/usr/bin/env python3
"""
Real-Time Agent Activity Monitor

Watches agent business generation in real-time.
Shows live stats, component progress, costs, and errors.

Usage:
    python scripts/watch_agent_activity.py
    
    # Or continuous monitoring:
    watch -n 1 python scripts/watch_agent_activity.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.business_monitor import get_monitor


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        return f"{seconds/60:.1f}m"
    else:
        return f"{seconds/3600:.1f}h"


def print_dashboard():
    """Print real-time dashboard."""
    monitor = get_monitor()
    
    # Try to read snapshot if available
    snapshot_file = Path("logs/business_generation/dashboard_snapshot.json")
    if snapshot_file.exists():
        with open(snapshot_file) as f:
            data = json.load(f)
    else:
        data = monitor.get_dashboard_data()
    
    global_stats = data.get("global_stats", {})
    component_stats = data.get("component_stats", {})
    agent_usage = data.get("agent_usage", {})
    active = data.get("active_businesses", [])
    recent = data.get("recent_completions", [])
    
    # Header
    print("\n" + "="*80)
    print(" "*25 + "🤖 AGENT ACTIVITY MONITOR" + " "*28)
    print("="*80)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Global Stats
    print("\n📊 GLOBAL STATISTICS")
    print("-"*80)
    print(f"Total Businesses: {global_stats.get('total_businesses', 0)}")
    print(f"  ✅ Completed: {global_stats.get('completed', 0)}")
    print(f"  ❌ Failed: {global_stats.get('failed', 0)}")
    print(f"  ⏳ In Progress: {global_stats.get('in_progress', 0)}")
    print(f"\nComponents: {global_stats.get('total_components', 0)}")
    print(f"Files Generated: {global_stats.get('total_files', 0)}")
    print(f"Lines of Code: {global_stats.get('total_lines_of_code', 0):,}")
    print(f"Total Cost: ${global_stats.get('total_cost_usd', 0.0):.4f}")
    
    if global_stats.get('completed', 0) > 0:
        avg_cost = global_stats.get('avg_cost_per_business', 0.0)
        avg_components = global_stats.get('avg_components_per_business', 0.0)
        print(f"\nAverages:")
        print(f"  Cost per business: ${avg_cost:.4f}")
        print(f"  Components per business: {avg_components:.1f}")
    
    # Active Businesses
    if active:
        print(f"\n⏳ ACTIVE GENERATION ({len(active)} businesses)")
        print("-"*80)
        for biz in active:
            print(f"  {biz['name']} ({biz['type']})")
            print(f"    Progress: {biz['progress']} | Duration: {biz['duration']}")
    
    # Recent Completions
    if recent:
        print(f"\n✅ RECENT COMPLETIONS (last {len(recent)})")
        print("-"*80)
        for biz in recent[:5]:  # Show max 5
            print(f"  {biz['name']} ({biz['type']})")
            print(f"    Duration: {biz['duration']} | Components: {biz['components']} | Cost: {biz['cost']} | Success: {biz['success_rate']}")
    
    # Component Stats
    if component_stats:
        print(f"\n🔧 COMPONENT STATISTICS (top 10)")
        print("-"*80)
        sorted_components = sorted(
            component_stats.items(),
            key=lambda x: x[1].get("attempted", 0),
            reverse=True
        )[:10]
        
        for component, stats in sorted_components:
            attempted = stats.get("attempted", 0)
            succeeded = stats.get("succeeded", 0)
            failed = stats.get("failed", 0)
            success_rate = stats.get("success_rate", 0.0)
            
            status = "✅" if success_rate > 90 else "⚠️" if success_rate > 70 else "❌"
            print(f"  {status} {component:30s} | {succeeded:3d}/{attempted:3d} ({success_rate:5.1f}%)")
    
    # Agent Usage
    if agent_usage:
        print(f"\n🤖 AGENT USAGE")
        print("-"*80)
        for agent, count in sorted(agent_usage.items(), key=lambda x: x[1], reverse=True):
            print(f"  {agent:30s}: {count:4d} calls")
    
    print("\n" + "="*80)
    print("Press Ctrl+C to exit | Refresh: run this script again or use 'watch'")
    print("="*80 + "\n")


if __name__ == "__main__":
    try:
        print_dashboard()
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

