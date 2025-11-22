#!/usr/bin/env python3
"""
Autonomous Business Orchestrator

Complete end-to-end autonomous business operation:
1. Genesis generates business idea
2. Agents build the business
3. Business deployed autonomously
4. Revenue tracked
5. Performance evaluated
6. Business shutdown if below threshold

NO HUMAN INTERACTION except large bill approvals (>$50).

Author: Genesis Infrastructure
Date: November 12, 2025
Status: Production Ready

Usage:
    python scripts/autonomous_business_orchestrator.py --continuous
    python scripts/autonomous_business_orchestrator.py --count 10
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
from infrastructure.autonomous_deploy import deploy_business
from infrastructure.business_lifecycle_manager import (
    get_lifecycle_manager,
    register_deployed_business,
    evaluate_all_businesses
)

# Load environment
load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AutonomousBusinessOrchestrator:
    """
    Orchestrates complete autonomous business lifecycle

    Flow:
    1. Generate business idea (via GenesisMetaAgent)
    2. Build business (via specialized agents)
    3. Deploy autonomously (via autonomous_deploy)
    4. Track metrics (revenue, users, uptime)
    5. Evaluate performance (after 30 days)
    6. Shutdown if below threshold (score < 50/100)
    """

    def __init__(self):
        """Initialize orchestrator"""
        self.lifecycle_manager = get_lifecycle_manager()
        logger.info("🤖 Autonomous Business Orchestrator initialized")

    async def create_and_deploy_business(self, business_count: int = 1) -> int:
        """
        Create and deploy businesses autonomously

        Args:
            business_count: Number of businesses to create

        Returns:
            Number of successfully deployed businesses
        """
        logger.info(f"🚀 Starting autonomous business creation (count: {business_count})")

        success_count = 0

        for i in range(business_count):
            logger.info(f"\n{'='*60}")
            logger.info(f"Business {i+1}/{business_count}")
            logger.info(f"{'='*60}\n")

            try:
                # Step 1: Generate business (using existing script)
                logger.info("🎯 Step 1: Generating business...")

                # Import here to avoid circular dependencies
                from scripts.autonomous_fully_integrated import FullyIntegratedLoop

                # Generate 1 business using FullyIntegratedLoop
                # NOTE: FullyIntegratedLoop now includes post_generation_automation
                # which handles deployment + agent delegation automatically
                loop = FullyIntegratedLoop(min_score=75.0)
                result = await loop.run_loop(count=1)

                if not result:
                    logger.error("❌ Business generation failed")
                    continue

                # Find the generated business
                businesses_dir = Path("businesses/fully_integrated")
                latest_business = max(
                    businesses_dir.glob("*/*"),
                    key=lambda p: p.stat().st_mtime
                )

                business_name = latest_business.name
                app_path = latest_business

                logger.info(f"✅ Business generated: {business_name}")
                logger.info(f"   Path: {app_path}")

                # Step 2: Check if post-generation automation already deployed
                # (This is a fallback in case post_generation_automation failed)
                logger.info("🚀 Step 2: Checking deployment status...")

                # Check for existing deployment info
                manifest_path = app_path / "business_manifest.json"
                already_deployed = False
                deployment_url = None

                if manifest_path.exists():
                    import json
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                        deployment_url = manifest.get("deployment_url")
                        if deployment_url:
                            logger.info(f"✅ Already deployed by post-generation automation: {deployment_url}")
                            already_deployed = True

                # Fallback: Deploy if not already deployed
                if not already_deployed:
                    logger.info("🔄 Fallback deployment (post-generation automation didn't deploy)...")
                    deployment_result = await deploy_business(
                        str(app_path),
                        business_name
                    )

                    if not deployment_result.success:
                        logger.error(f"❌ Deployment failed: {deployment_result.error}")
                        continue

                    logger.info(f"✅ Deployment successful!")
                    deployment_url = deployment_result.deployment_url
                else:
                    # Create deployment_result for consistency
                    from infrastructure.autonomous_deploy import DeploymentResult
                    deployment_result = DeploymentResult(
                        success=True,
                        deployment_url=deployment_url,
                        platform="github-pages",
                        cost_estimate=0.0
                    )

                logger.info(f"   URL: {deployment_url}")

                # Step 3: Register with lifecycle manager
                logger.info("📝 Step 3: Registering business...")

                await register_deployed_business(
                    business_name,
                    str(app_path),
                    deployment_result
                )

                logger.info(f"✅ Business registered for monitoring")

                success_count += 1

                logger.info(f"\n{'='*60}")
                logger.info(f"✅ Business {i+1} deployed successfully!")
                logger.info(f"   Name: {business_name}")
                logger.info(f"   URL: {deployment_result.deployment_url}")
                logger.info(f"   Platform: {deployment_result.platform}")
                logger.info(f"   Cost: ${deployment_result.cost_estimate:.2f}/month")
                logger.info(f"{'='*60}\n")

            except Exception as e:
                logger.error(f"❌ Business {i+1} failed: {e}")
                continue

        logger.info(f"\n{'='*60}")
        logger.info(f"Batch complete: {success_count}/{business_count} businesses deployed")
        logger.info(f"{'='*60}\n")

        return success_count

    async def run_evaluation_cycle(self):
        """
        Run evaluation cycle on all businesses

        Checks all businesses and:
        1. Updates metrics
        2. Calculates performance scores
        3. Shuts down businesses below threshold
        """
        logger.info("📊 Running evaluation cycle...")

        # Evaluate all businesses
        await evaluate_all_businesses()

        # Get summary
        summary = await self.lifecycle_manager.get_business_summary()

        logger.info(f"\n{'='*60}")
        logger.info(f"Business Summary:")
        logger.info(f"   Total businesses: {summary['total_businesses']}")
        logger.info(f"   Active: {summary['active_businesses']}")
        logger.info(f"   Shutdown: {summary['shutdown_businesses']}")
        logger.info(f"   Total revenue: ${summary['total_revenue']:.2f}")
        logger.info(f"   Total profit: ${summary['total_profit']:.2f}")
        logger.info(f"   Avg profit/business: ${summary['avg_profit_per_business']:.2f}")
        logger.info(f"{'='*60}\n")

    async def run_continuous(self, check_interval_hours: int = 24):
        """
        Run continuous autonomous operation

        Args:
            check_interval_hours: Hours between evaluation cycles
        """
        logger.info("🔄 Starting continuous autonomous operation")
        logger.info(f"   Evaluation interval: {check_interval_hours} hours")

        cycle_count = 0

        while True:
            cycle_count += 1

            logger.info(f"\n{'='*60}")
            logger.info(f"Cycle {cycle_count}")
            logger.info(f"{'='*60}\n")

            try:
                # Create 1 new business per cycle
                await self.create_and_deploy_business(business_count=1)

                # Evaluate all businesses
                await self.run_evaluation_cycle()

            except Exception as e:
                logger.error(f"❌ Cycle {cycle_count} error: {e}")

            # Wait for next cycle
            logger.info(f"⏳ Waiting {check_interval_hours} hours until next cycle...")
            await asyncio.sleep(check_interval_hours * 3600)


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Autonomous Business Orchestrator - End-to-end business lifecycle"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of businesses to create and deploy"
    )
    parser.add_argument(
        "--continuous",
        action="store_true",
        help="Run continuously (create 1 business per cycle, evaluate all businesses)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=24,
        help="Hours between evaluation cycles in continuous mode (default: 24)"
    )
    parser.add_argument(
        "--evaluate-only",
        action="store_true",
        help="Only evaluate existing businesses, don't create new ones"
    )

    args = parser.parse_args()

    # Create orchestrator
    orchestrator = AutonomousBusinessOrchestrator()

    if args.evaluate_only:
        # Just evaluate existing businesses
        await orchestrator.run_evaluation_cycle()

    elif args.continuous:
        # Run continuous autonomous operation
        await orchestrator.run_continuous(check_interval_hours=args.interval)

    else:
        # Create and deploy specified number of businesses
        success_count = await orchestrator.create_and_deploy_business(
            business_count=args.count
        )

        if success_count > 0:
            logger.info(f"✅ Successfully deployed {success_count} business(es)")
            sys.exit(0)
        else:
            logger.error(f"❌ No businesses deployed successfully")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
