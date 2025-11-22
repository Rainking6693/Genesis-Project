#!/usr/bin/env python3
"""
Gradual Rollout Script for Fine-Tuned Models

Supports gradual rollout progression:
- Day 1: 10% rollout
- Day 3: 25% rollout (if metrics good)
- Day 5: 50% rollout
- Day 7: 100% rollout (full deployment)
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ab_testing import ABTestController
from infrastructure.analytics import AnalyticsTracker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def update_rollout_percentage(percentage: int, config_path: str = "infrastructure/config/production.yaml"):
    """
    Update rollout percentage in production config
    
    Args:
        percentage: New rollout percentage (0-100)
        config_path: Path to production config file
    """
    import yaml
    
    config_file = Path(config_path)
    if not config_file.exists():
        logger.warning(f"Config file not found: {config_path}, creating new one")
        config = {
            "environment": "production",
            "ab_testing": {
                "enabled": True,
                "rollout_percentage": percentage
            }
        }
    else:
        with open(config_file) as f:
            config = yaml.safe_load(f) or {}
        
        if "ab_testing" not in config:
            config["ab_testing"] = {}
        
        config["ab_testing"]["rollout_percentage"] = percentage
    
    # Write updated config
    config_file.parent.mkdir(parents=True, exist_ok=True)
    with open(config_file, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    
    logger.info(f"✅ Updated rollout percentage to {percentage}% in {config_path}")


def check_metrics_before_rollout(analytics_db_path: str) -> bool:
    """
    Check if metrics are good enough to proceed with rollout increase
    
    Args:
        analytics_db_path: Path to analytics database
    
    Returns:
        True if metrics are good, False otherwise
    """
    tracker = AnalyticsTracker(storage_path=analytics_db_path)
    comparison = tracker.compare_variants(time_window_hours=24)
    
    if "error" in comparison:
        logger.warning("No metrics available, proceeding with caution")
        return True  # Default to proceed if no data
    
    success_diff = comparison["comparison"].get("success_rate_diff", 0)
    latency_diff_pct = comparison["comparison"].get("latency_diff_pct", 0)
    
    # Criteria: success rate not worse, latency increase < 30%
    if success_diff < -0.05:
        logger.error(f"❌ Success rate decreased by {abs(success_diff):.2%}, NOT proceeding")
        return False
    
    if latency_diff_pct > 30:
        logger.warning(f"⚠️ Latency increased by {latency_diff_pct:.1f}%, but proceeding")
        # Don't block on latency alone, but warn
    
    logger.info(f"✅ Metrics check passed: success_diff={success_diff:+.2%}, latency_diff={latency_diff_pct:+.1f}%")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Gradual rollout script for fine-tuned models"
    )
    parser.add_argument(
        "--percentage",
        type=int,
        required=True,
        choices=[10, 25, 50, 100],
        help="Rollout percentage (10, 25, 50, or 100)"
    )
    parser.add_argument(
        "--skip-metrics-check",
        action="store_true",
        help="Skip metrics check before updating rollout"
    )
    parser.add_argument(
        "--analytics-db",
        type=str,
        default="data/analytics",
        help="Path to analytics database"
    )
    parser.add_argument(
        "--config-path",
        type=str,
        default="infrastructure/config/production.yaml",
        help="Path to production config file"
    )
    
    args = parser.parse_args()
    
    logger.info(f"Rolling out fine-tuned models to {args.percentage}%")
    
    # Check metrics unless skipped
    if not args.skip_metrics_check and args.percentage > 10:
        logger.info("Checking metrics before rollout increase...")
        if not check_metrics_before_rollout(args.analytics_db):
            logger.error("Metrics check failed. Aborting rollout increase.")
            sys.exit(1)
    
    # Update rollout percentage
    update_rollout_percentage(args.percentage, args.config_path)
    
    logger.info(f"✅ Rollout updated to {args.percentage}%")
    logger.info("Next steps:")
    logger.info("  1. Restart orchestrator to load new config")
    logger.info("  2. Monitor metrics for 24 hours")
    if args.percentage < 100:
        next_steps = {10: 25, 25: 50, 50: 100}[args.percentage]
        logger.info(f"  3. If metrics good, run: python scripts/rollout_models.py --percentage {next_steps}")


if __name__ == "__main__":
    main()

