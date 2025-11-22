"""
AgentEvolver Daily Job Script

Runs daily scenario generation and ingestion.

Usage:
    python scripts/agentevolver_daily_job.py [--count 100] [--dry-run]

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import asyncio
import logging
import argparse
from datetime import datetime

from infrastructure.load_env import load_genesis_env
from infrastructure.agentevolver.scheduling import get_daily_scheduler
from infrastructure.agentevolver.coverage_tracker import get_coverage_tracker

load_genesis_env()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/agentevolver_daily_job.log"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)


async def main():
    """Run daily job."""
    parser = argparse.ArgumentParser(description="AgentEvolver Daily Job")
    parser.add_argument("--count", type=int, default=100, help="Number of scenarios to generate")
    parser.add_argument("--dry-run", action="store_true", help="Dry run mode (no actual changes)")
    args = parser.parse_args()

    logger.info("=" * 80)
    logger.info("AGENTEVOLVER DAILY JOB STARTED")
    logger.info(f"Target: {args.count} scenarios")
    logger.info(f"Dry Run: {args.dry_run}")
    logger.info("=" * 80)

    try:
        # Initialize components
        scheduler = get_daily_scheduler(daily_target=args.count)
        coverage_tracker = get_coverage_tracker()

        # Run daily generation
        if not args.dry_run:
            metrics = await scheduler.run_daily_generation()

            logger.info(f"Generated: {metrics.scenarios_generated}/{args.count}")
            logger.info(f"Pushed: {metrics.scenarios_pushed}")
            logger.info(f"Archived: {metrics.scenarios_archived}")

            # Print coverage
            coverage = coverage_tracker.get_coverage()
            logger.info(f"Overall Coverage: {coverage:.1%}")

            scheduler.print_metrics()
            coverage_tracker.print_coverage_summary()
        else:
            logger.info("DRY RUN: No changes made")

        logger.info("DAILY JOB COMPLETED SUCCESSFULLY")

    except Exception as e:
        logger.error(f"Daily job failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
