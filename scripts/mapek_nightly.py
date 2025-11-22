#!/usr/bin/env python
"""MAPE-K Nightly Job: Run one complete Monitor-Analyze-Plan-Execute cycle.

This script is designed to be run as a nightly cron job (e.g., at 2 AM).
It performs one complete MAPE-K cycle and proposes exactly one change via shadow traffic.

Usage:
    python scripts/mapek_nightly.py

Setup cron job:
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/genesis/genesis-rebuild/scripts/mapek_nightly.py >> /home/genesis/logs/mapek.log 2>&1") | crontab -
"""

import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/mapek.log"),
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger(__name__)


async def main():
    """Run MAPE-K nightly cycle."""
    logger.info("=" * 70)
    logger.info("Starting MAPE-K Nightly Job")
    logger.info("=" * 70)

    cycle_start = datetime.now()

    try:
        # Import after logging is configured
        from infrastructure.mapek.loop import MAPEKLoop

        # Create loop instance
        loop = MAPEKLoop(
            log_dir="logs/tool_traces",
            kb_path=".mapek_kb.json",
        )

        # Run one complete cycle
        result = await loop.run()

        # Log results
        logger.info(f"Cycle Result: {json.dumps(result, indent=2, default=str)}")

        # Print summary
        logger.info("")
        logger.info("SUMMARY:")
        logger.info(f"  Action: {result.get('action', 'unknown')}")
        logger.info(f"  Success: {result.get('success', False)}")

        if result.get("action") == "shadow_deployed":
            logger.info(f"  Shadow ID: {result.get('shadow_id')}")
            logger.info(f"  Issue Type: {result.get('issue_type')}")
            logger.info(f"  Issue Severity: {result.get('issue_severity')}")
            logger.info(f"  Change Type: {result.get('change_type')}")
            logger.info(f"  Issues Detected: {result.get('issues_detected', 0)}")

        elif result.get("action") == "no_changes_proposed":
            logger.info(f"  Reason: {result.get('reason')}")
            logger.info("  System is healthy, no changes needed")

        if result.get("error"):
            logger.error(f"  Error: {result.get('error')}")

        # Log cycle time
        cycle_time = result.get("cycle_time", 0)
        logger.info(f"  Cycle Time: {cycle_time:.2f}s")

        # Get and log summary statistics
        summary = loop.get_cycle_summary()
        if summary["total_cycles"] > 0:
            logger.info("")
            logger.info("HISTORICAL STATISTICS:")
            logger.info(f"  Total Cycles: {summary['total_cycles']}")
            logger.info(f"  Successful Changes: {summary['successful_changes']}")
            logger.info(f"  Failed Changes: {summary['failed_changes']}")
            logger.info(f"  Success Rate: {summary['success_rate']:.1%}")

            if summary["most_common_issues"]:
                logger.info("")
                logger.info("  Most Common Issues:")
                for issue_type, count in list(summary["most_common_issues"].items())[:3]:
                    logger.info(f"    - {issue_type}: {count}")

            if summary["most_effective_changes"]:
                logger.info("")
                logger.info("  Most Effective Changes:")
                for change_type, success_rate in list(summary["most_effective_changes"].items())[:3]:
                    logger.info(f"    - {change_type}: {success_rate:.1%} success rate")

        logger.info("=" * 70)
        logger.info(f"MAPE-K Nightly Job Complete ({cycle_time:.2f}s)")
        logger.info("=" * 70)

        return 0 if result.get("success") else 1

    except Exception as e:
        logger.error(f"MAPE-K Nightly Job Failed: {e}", exc_info=True)
        logger.info("=" * 70)
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("MAPE-K Nightly Job interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
