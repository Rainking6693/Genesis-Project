"""
Deployment Monitor Agent

Actively monitors deployed sites and auto-fixes issues:
- Continuous health checks every 5 minutes
- Auto-recovery when sites go down
- Re-deployment on 404 errors
- Alert Genesis when manual intervention needed

This agent ensures "the deploy agent sees everything through until it is 100% running how he built it"

Author: Genesis Deploy Agent
Date: November 21, 2025
Status: PRODUCTION READY
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
import aiohttp

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)


@dataclass
class SiteHealth:
    """Health status of a deployed site"""
    deployment_url: str
    business_name: str
    platform: str
    last_check: datetime
    status_code: Optional[int] = None
    is_healthy: bool = False
    consecutive_failures: int = 0
    error_message: Optional[str] = None
    auto_recovery_attempts: int = 0
    last_recovery_attempt: Optional[datetime] = None


@dataclass
class MonitoredDeployment:
    """A deployment being monitored"""
    deployment_id: str
    business_name: str
    deployment_url: str
    platform: str
    app_path: str
    health: SiteHealth = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self):
        if self.health is None:
            self.health = SiteHealth(
                deployment_url=self.deployment_url,
                business_name=self.business_name,
                platform=self.platform,
                last_check=datetime.now(timezone.utc)
            )


class DeploymentMonitorAgent:
    """
    Deployment monitoring and auto-recovery agent

    Continuously monitors all deployed sites:
    - Health checks every 5 minutes
    - Auto-recovery on failures (3 attempts)
    - Re-deployment on persistent 404s
    - Alerts Genesis when manual intervention needed
    """

    def __init__(self, check_interval: int = 300):
        """
        Initialize monitor agent

        Args:
            check_interval: Seconds between health checks (default 300 = 5 minutes)
        """
        self.check_interval = check_interval
        self.monitored_sites: Dict[str, MonitoredDeployment] = {}
        self.running = False
        self.monitor_task: Optional[asyncio.Task] = None

        logger.info(f"🔍 DeploymentMonitorAgent initialized (check_interval: {check_interval}s)")

    async def add_deployment(
        self,
        deployment_id: str,
        business_name: str,
        deployment_url: str,
        platform: str,
        app_path: str
    ):
        """Add a deployment to monitoring"""
        logger.info(f"➕ Adding deployment to monitoring: {business_name}")
        logger.info(f"   URL: {deployment_url}")

        deployment = MonitoredDeployment(
            deployment_id=deployment_id,
            business_name=business_name,
            deployment_url=deployment_url,
            platform=platform,
            app_path=app_path
        )

        self.monitored_sites[deployment_id] = deployment

        # Perform immediate health check
        await self._check_site_health(deployment)

        logger.info(f"✅ Monitoring started for {business_name}")

    async def _check_site_health(self, deployment: MonitoredDeployment):
        """Check health of a single site"""
        health = deployment.health
        health.last_check = datetime.now(timezone.utc)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    deployment.deployment_url,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    health.status_code = response.status

                    if response.status == 200:
                        health.is_healthy = True
                        health.consecutive_failures = 0
                        health.error_message = None
                        logger.info(f"✅ {deployment.business_name}: Healthy (200)")
                    else:
                        health.is_healthy = False
                        health.consecutive_failures += 1
                        health.error_message = f"HTTP {response.status}"
                        logger.warning(f"⚠️ {deployment.business_name}: Unhealthy ({response.status})")

                        # Trigger auto-recovery after 3 consecutive failures
                        if health.consecutive_failures >= 3:
                            await self._auto_recover(deployment)

        except asyncio.TimeoutError:
            health.is_healthy = False
            health.consecutive_failures += 1
            health.error_message = "Timeout"
            logger.warning(f"⚠️ {deployment.business_name}: Timeout")

            if health.consecutive_failures >= 3:
                await self._auto_recover(deployment)

        except Exception as e:
            health.is_healthy = False
            health.consecutive_failures += 1
            health.error_message = str(e)
            logger.warning(f"⚠️ {deployment.business_name}: {e}")

            if health.consecutive_failures >= 3:
                await self._auto_recover(deployment)

    async def _auto_recover(self, deployment: MonitoredDeployment):
        """Auto-recover a failing deployment"""
        health = deployment.health

        # Limit recovery attempts
        if health.auto_recovery_attempts >= 3:
            logger.error(f"❌ {deployment.business_name}: Auto-recovery failed after 3 attempts")
            logger.error(f"   Manual intervention required!")
            await self._alert_genesis(deployment, "Manual intervention required")
            return

        # Check if we recently attempted recovery (cooldown)
        if health.last_recovery_attempt:
            time_since_last = (datetime.now(timezone.utc) - health.last_recovery_attempt).total_seconds()
            if time_since_last < 600:  # 10 minute cooldown
                logger.info(f"⏳ {deployment.business_name}: Recovery cooldown ({time_since_last:.0f}s)")
                return

        logger.info("=" * 80)
        logger.info(f"🔧 AUTO-RECOVERY: {deployment.business_name}")
        logger.info(f"   Attempt: {health.auto_recovery_attempts + 1}/3")
        logger.info(f"   Issue: {health.error_message}")
        logger.info("=" * 80)

        health.auto_recovery_attempts += 1
        health.last_recovery_attempt = datetime.now(timezone.utc)

        # Re-deploy based on platform
        if deployment.platform == "piku":
            await self._redeploy_piku(deployment)
        else:
            logger.warning(f"⚠️ Auto-recovery not implemented for platform: {deployment.platform}")
            await self._alert_genesis(deployment, f"Platform {deployment.platform} recovery not implemented")

    async def _redeploy_piku(self, deployment: MonitoredDeployment):
        """Re-deploy a Piku site"""
        try:
            from infrastructure.piku_deployer import PikuDeployer

            logger.info(f"📦 Re-deploying {deployment.business_name} to Piku...")

            piku = PikuDeployer()
            result = await piku.deploy(
                deployment.app_path,
                deployment.business_name
            )

            if result.get("success"):
                logger.info(f"✅ Re-deployment successful: {deployment.business_name}")
                deployment.health.is_healthy = True
                deployment.health.consecutive_failures = 0
                deployment.health.error_message = None
            else:
                logger.error(f"❌ Re-deployment failed: {result.get('error')}")
                await self._alert_genesis(deployment, f"Re-deployment failed: {result.get('error')}")

        except Exception as e:
            logger.error(f"❌ Re-deployment exception: {e}")
            await self._alert_genesis(deployment, f"Re-deployment exception: {e}")

    async def _alert_genesis(self, deployment: MonitoredDeployment, message: str):
        """Alert Genesis Meta Agent about deployment issues"""
        logger.error("=" * 80)
        logger.error(f"🚨 ALERT TO GENESIS: {deployment.business_name}")
        logger.error(f"   Issue: {message}")
        logger.error(f"   URL: {deployment.deployment_url}")
        logger.error(f"   Platform: {deployment.platform}")
        logger.error(f"   Status: {deployment.health.status_code}")
        logger.error(f"   Failures: {deployment.health.consecutive_failures}")
        logger.error("=" * 80)

        # Save alert to file for Genesis to pick up
        alerts_dir = Path("data/deployment_alerts")
        alerts_dir.mkdir(parents=True, exist_ok=True)

        alert_file = alerts_dir / f"{deployment.deployment_id}_alert.json"
        with open(alert_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "deployment_id": deployment.deployment_id,
                "business_name": deployment.business_name,
                "deployment_url": deployment.deployment_url,
                "platform": deployment.platform,
                "message": message,
                "health": {
                    "status_code": deployment.health.status_code,
                    "consecutive_failures": deployment.health.consecutive_failures,
                    "error_message": deployment.health.error_message,
                    "auto_recovery_attempts": deployment.health.auto_recovery_attempts
                }
            }, f, indent=2)

    async def start_monitoring(self):
        """Start continuous monitoring loop"""
        if self.running:
            logger.warning("⚠️  Monitor already running, ignoring duplicate start request")
            return

        self.running = True
        logger.info("=" * 80)
        logger.info("🔍 DEPLOYMENT MONITORING LOOP STARTED")
        logger.info(f"   Check interval: {self.check_interval}s ({self.check_interval / 60:.1f} minutes)")
        logger.info(f"   Monitored sites: {len(self.monitored_sites)}")
        logger.info(f"   Auto-recovery: ENABLED (max 3 attempts)")
        logger.info(f"   Re-deployment: ENABLED for persistent 404s")
        logger.info("=" * 80)

        while self.running:
            try:
                # Check all monitored sites
                if self.monitored_sites:
                    logger.info(f"🔍 Running health checks for {len(self.monitored_sites)} sites...")
                    for deployment_id, deployment in self.monitored_sites.items():
                        await self._check_site_health(deployment)
                    logger.info(f"✅ Health check cycle completed")
                else:
                    logger.debug("No sites to monitor yet")

                # Wait before next check cycle
                await asyncio.sleep(self.check_interval)

            except Exception as e:
                logger.error(f"❌ Monitor loop error: {e}", exc_info=True)
                await asyncio.sleep(60)  # Short sleep on error

    async def stop_monitoring(self):
        """Stop monitoring loop"""
        logger.info("🛑 Stopping deployment monitoring...")
        self.running = False

        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass

    def get_health_summary(self) -> Dict:
        """Get health summary for all monitored sites"""
        healthy = sum(1 for d in self.monitored_sites.values() if d.health.is_healthy)
        total = len(self.monitored_sites)

        return {
            "total_sites": total,
            "healthy": healthy,
            "unhealthy": total - healthy,
            "sites": {
                deployment_id: {
                    "business_name": deployment.business_name,
                    "url": deployment.deployment_url,
                    "platform": deployment.platform,
                    "is_healthy": deployment.health.is_healthy,
                    "status_code": deployment.health.status_code,
                    "consecutive_failures": deployment.health.consecutive_failures,
                    "last_check": deployment.health.last_check.isoformat(),
                    "error": deployment.health.error_message
                }
                for deployment_id, deployment in self.monitored_sites.items()
            }
        }


# Singleton instance
_monitor_instance = None


def get_deployment_monitor() -> DeploymentMonitorAgent:
    """
    Get singleton monitor instance

    Returns the same instance across all calls to ensure
    monitoring state is shared globally.
    """
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = DeploymentMonitorAgent()
        logger.info("🔧 Created new DeploymentMonitorAgent singleton instance")
    else:
        logger.debug("♻️  Returning existing DeploymentMonitorAgent singleton")
    return _monitor_instance


def is_monitoring_active() -> bool:
    """Check if monitoring loop is currently running"""
    global _monitor_instance
    if _monitor_instance is None:
        return False
    return _monitor_instance.running


# Convenience functions
async def monitor_deployment(
    deployment_id: str,
    business_name: str,
    deployment_url: str,
    platform: str,
    app_path: str
):
    """Add deployment to monitoring (convenience function)"""
    monitor = get_deployment_monitor()
    await monitor.add_deployment(deployment_id, business_name, deployment_url, platform, app_path)


async def start_monitoring():
    """Start monitoring all deployments (convenience function)"""
    monitor = get_deployment_monitor()
    await monitor.start_monitoring()


def get_health_summary() -> Dict:
    """Get health summary (convenience function)"""
    monitor = get_deployment_monitor()
    return monitor.get_health_summary()
