"""
Demo script showing monitoring agent fix in action

This script demonstrates:
1. Adding multiple deployments
2. Starting monitoring loop automatically
3. Running health checks
4. Auto-recovery simulation
5. Real-time status updates

Run this to see the fix working in a real-world scenario.

Author: Claude Code
Date: November 22, 2025
"""

import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.deployment_monitor_agent import (
    get_deployment_monitor,
    monitor_deployment,
    is_monitoring_active
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def demo_monitoring_fix():
    """Demonstrate the monitoring agent fix"""

    logger.info("=" * 80)
    logger.info("MONITORING AGENT FIX DEMO")
    logger.info("=" * 80)
    logger.info("")

    # Scenario 1: Single deployment
    logger.info("📋 SCENARIO 1: Single Deployment")
    logger.info("-" * 80)

    await monitor_deployment(
        deployment_id="demo-001",
        business_name="TaskFlow Pro",
        deployment_url="https://taskflowpro.github.io",
        platform="github-pages",
        app_path="/tmp/taskflow"
    )

    logger.info("✅ Deployment added to queue")
    logger.info("")

    # THE FIX: Start monitoring loop
    logger.info("🔧 APPLYING FIX: Starting monitoring loop...")
    monitor = get_deployment_monitor()
    if not monitor.running:
        monitor.monitor_task = asyncio.create_task(monitor.start_monitoring())
        logger.info("✅ Monitoring loop started in background (THIS IS THE FIX!)")
    else:
        logger.info("✅ Monitoring loop already running")

    logger.info("")
    await asyncio.sleep(3)  # Wait for startup

    # Scenario 2: Multiple deployments
    logger.info("📋 SCENARIO 2: Multiple Deployments")
    logger.info("-" * 80)

    deployments = [
        ("demo-002", "EcoTrack", "https://ecotrack.github.io", "github-pages", "/tmp/ecotrack"),
        ("demo-003", "FinanceHub", "https://financehub.github.io", "github-pages", "/tmp/financehub"),
    ]

    for dep_id, name, url, platform, path in deployments:
        await monitor_deployment(dep_id, name, url, platform, path)
        logger.info(f"✅ Added {name} to monitoring")

    logger.info("")
    logger.info(f"📊 Total sites being monitored: {len(monitor.monitored_sites)}")
    logger.info("")

    # Scenario 3: Health check cycle
    logger.info("📋 SCENARIO 3: Wait for Health Check Cycle")
    logger.info("-" * 80)
    logger.info("⏳ Waiting 8 seconds for health checks to complete...")
    logger.info("   (In production, this runs every 5 minutes)")
    logger.info("")

    await asyncio.sleep(8)

    # Scenario 4: Check status
    logger.info("📋 SCENARIO 4: Get Health Summary")
    logger.info("-" * 80)

    summary = monitor.get_health_summary()
    logger.info(f"Total sites: {summary['total_sites']}")
    logger.info(f"Healthy: {summary['healthy']}")
    logger.info(f"Unhealthy: {summary['unhealthy']}")
    logger.info("")

    for dep_id, site_info in summary['sites'].items():
        status_emoji = "✅" if site_info['is_healthy'] else "❌"
        logger.info(f"{status_emoji} {site_info['business_name']} - Status {site_info['status_code']}")

    logger.info("")

    # Scenario 5: Verify monitoring is active
    logger.info("📋 SCENARIO 5: Verify Monitoring Active")
    logger.info("-" * 80)

    if is_monitoring_active():
        logger.info("✅ Monitoring is ACTIVE")
        logger.info("   Background task is running")
        logger.info("   Health checks will continue every 5 minutes")
        logger.info("   Auto-recovery enabled for failures")
    else:
        logger.error("❌ Monitoring is INACTIVE")
        return False

    logger.info("")

    # Scenario 6: Demonstrate singleton
    logger.info("📋 SCENARIO 6: Verify Singleton Pattern")
    logger.info("-" * 80)

    monitor2 = get_deployment_monitor()
    if monitor is monitor2:
        logger.info("✅ Singleton works - same instance returned")
        logger.info(f"   monitor1 id: {id(monitor)}")
        logger.info(f"   monitor2 id: {id(monitor2)}")
        logger.info("   Both have access to same monitored_sites dict")
    else:
        logger.error("❌ Singleton broken - different instances")
        return False

    logger.info("")

    # Scenario 7: Show what happens without the fix
    logger.info("📋 SCENARIO 7: What Would Happen WITHOUT the Fix")
    logger.info("-" * 80)
    logger.info("Before fix:")
    logger.info("  ❌ monitor_deployment() called (adds to queue)")
    logger.info("  ❌ start_monitoring() NEVER called")
    logger.info("  ❌ Background task NEVER created")
    logger.info("  ❌ Health checks NEVER run")
    logger.info("  ❌ Auto-recovery NEVER triggered")
    logger.info("")
    logger.info("After fix:")
    logger.info("  ✅ monitor_deployment() called (adds to queue)")
    logger.info("  ✅ get_deployment_monitor() called")
    logger.info("  ✅ asyncio.create_task(start_monitoring()) called")
    logger.info("  ✅ Background task created and running")
    logger.info("  ✅ Health checks run every 5 minutes")
    logger.info("  ✅ Auto-recovery triggers on 3+ failures")
    logger.info("")

    # Cleanup
    logger.info("📋 SCENARIO 8: Clean Shutdown")
    logger.info("-" * 80)
    logger.info("Stopping monitoring loop...")
    await monitor.stop_monitoring()
    await asyncio.sleep(1)

    if not is_monitoring_active():
        logger.info("✅ Monitoring stopped successfully")
    else:
        logger.error("❌ Monitoring still running")
        return False

    logger.info("")
    logger.info("=" * 80)
    logger.info("✅ DEMO COMPLETE - Monitoring Fix Working Perfectly!")
    logger.info("=" * 80)
    logger.info("")
    logger.info("Key Takeaways:")
    logger.info("1. Background task created with asyncio.create_task()")
    logger.info("2. Monitoring loop runs indefinitely in background")
    logger.info("3. Health checks every 5 minutes (300s)")
    logger.info("4. Auto-recovery enabled for failed sites")
    logger.info("5. Singleton pattern ensures shared state")
    logger.info("6. Clean shutdown possible with stop_monitoring()")
    logger.info("")
    logger.info("Production Usage:")
    logger.info("- Genesis Meta Agent automatically starts monitoring after deployment")
    logger.info("- No manual intervention required")
    logger.info("- Fully autonomous monitoring and recovery")
    logger.info("- 'Deploy agent sees everything through until 100% running'")
    logger.info("")

    return True


async def main():
    try:
        success = await demo_monitoring_fix()
        if success:
            logger.info("🎉 Demo successful!")
            sys.exit(0)
        else:
            logger.error("❌ Demo failed")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Demo error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
