"""
Autonomous Business Generation Scheduler (PRODUCTION DEPLOYMENT)
================================================================

Runs Genesis Meta-Agent on a continuous schedule, generating new businesses
every 5-10 minutes automatically. No manual intervention required.

DEPLOYMENT MODES:
- Railway/Render/Fly.io: Worker process (no HTTP server)
- Docker: Standalone container
- Kubernetes: CronJob or Deployment

HEALTH MONITORING:
- Heartbeat file for process health checks
- Structured JSON logging for monitoring
- Graceful shutdown on SIGTERM/SIGINT

This is the autonomous operation mode where Genesis continuously creates
businesses without human input.
"""

import asyncio
import logging
import random
import sys
import os
import signal
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec

# Setup structured JSON logging for production
class JSONFormatter(logging.Formatter):
    """Format logs as JSON for production monitoring."""
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

# Determine if running in production
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"
LOG_FORMAT = JSONFormatter() if IS_PRODUCTION else logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Setup logging
log_handler = logging.StreamHandler()
log_handler.setFormatter(LOG_FORMAT)

logging.basicConfig(
    level=logging.INFO if IS_PRODUCTION else logging.DEBUG,
    handlers=[log_handler]
)
logger = logging.getLogger(__name__)

# Global shutdown flag
shutdown_requested = False

def signal_handler(signum, frame):
    """Handle graceful shutdown on SIGTERM/SIGINT."""
    global shutdown_requested
    signal_name = signal.Signals(signum).name
    logger.info(f"Received {signal_name} signal - initiating graceful shutdown")
    shutdown_requested = True

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Business idea templates (Genesis will expand these)
BUSINESS_IDEAS = [
    {"type": "saas", "description": "SaaS productivity tool"},
    {"type": "marketplace", "description": "Niche marketplace platform"},
    {"type": "content", "description": "Content creation platform"},
    {"type": "analytics", "description": "Data analytics dashboard"},
    {"type": "automation", "description": "Workflow automation tool"},
    {"type": "education", "description": "Online learning platform"},
    {"type": "social", "description": "Social networking app"},
    {"type": "ecommerce", "description": "E-commerce storefront"},
    {"type": "ai", "description": "AI-powered assistant"},
    {"type": "fintech", "description": "Financial technology app"},
]


async def generate_business_idea() -> BusinessSpec:
    """Generate a random business idea for Genesis to build."""
    idea = random.choice(BUSINESS_IDEAS)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    # Create unique business spec (matching actual BusinessSpec dataclass fields)
    spec = BusinessSpec(
        name=f"auto_{idea['type']}_{timestamp}",
        business_type=idea['type'],
        description=f"Automatically generated {idea['description']} created by Genesis autonomous scheduler",
        components=[
            f"{idea['type']}_core",
            "user_auth",
            "payment_system",
            "analytics_dashboard",
            "api_backend"
        ],
        output_dir=project_root / "businesses" / "autonomous" / f"{idea['type']}_{timestamp}",
        metadata={
            "auto_generated": True,
            "generation_timestamp": datetime.now(timezone.utc).isoformat(),
            "scheduler_version": "1.0",
            "team": ["builder_agent", "qa_agent", "deploy_agent", "api_agent", "marketing_agent"],
            "business_idea": idea['description'],
            "framework": "nextjs",
            "database": "mongodb",
            "deployment": "vercel"
        }
    )

    return spec


async def run_generation_cycle():
    """Run one complete business generation cycle."""
    cycle_start = datetime.now(timezone.utc)
    logger.info("=" * 80)
    logger.info(f"🚀 AUTONOMOUS GENERATION CYCLE STARTING")
    logger.info(f"   Timestamp: {cycle_start.isoformat()}")
    logger.info("=" * 80)

    try:
        # Generate business idea
        spec = await generate_business_idea()
        logger.info(f"\n📋 Generated Business Idea:")
        logger.info(f"   Name: {spec.name}")
        logger.info(f"   Type: {spec.business_type}")
        logger.info(f"   Description: {spec.description}")

        # Initialize Genesis Meta-Agent
        logger.info(f"\n🤖 Initializing Genesis Meta-Agent...")
        genesis = GenesisMetaAgent()

        # Generate business
        logger.info(f"\n⚙️  Starting business generation...")
        result = await genesis.generate_business(spec)

        # Log results
        if result.success:
            logger.info(f"\n✅ BUSINESS GENERATION SUCCESSFUL")
            logger.info(f"   Output Directory: {result.output_directory}")
            logger.info(f"   Components Generated: {len(result.components_generated)}")
            logger.info(f"   Files Created: {len(result.generated_files)}")

            # Run post-generation automation (deploy + billing)
            logger.info(f"\n🚀 Running post-generation automation...")
            automation_result = await genesis.post_generation_automation(
                business_spec=spec,
                generation_result=result,
                auto_deploy=True,  # Deploy to Vercel
                setup_billing=True  # Setup Stripe tracking
            )

            if automation_result.get('fully_autonomous'):
                logger.info(f"\n🎉 FULLY AUTONOMOUS BUSINESS DEPLOYED!")
                logger.info(f"   Deployment URL: {automation_result.get('deployment_url')}")
                logger.info(f"   GitHub URL: {automation_result.get('github_url')}")
                logger.info(f"   Billing Configured: {automation_result.get('billing_configured')}")
            else:
                logger.warning(f"\n⚠️  Automation incomplete:")
                for error in automation_result.get('errors', []):
                    logger.warning(f"   - {error}")
        else:
            logger.error(f"\n❌ BUSINESS GENERATION FAILED")
            logger.error(f"   Error: {result.error}")

        # Calculate duration
        cycle_end = datetime.now(timezone.utc)
        duration = (cycle_end - cycle_start).total_seconds()
        logger.info(f"\n⏱️  Cycle Duration: {duration:.2f} seconds")

        return result.success

    except Exception as e:
        logger.error(f"\n❌ CYCLE FAILED WITH EXCEPTION: {e}", exc_info=True)
        return False


def write_heartbeat(cycle_count: int, success_count: int, failure_count: int):
    """Write heartbeat file for health monitoring."""
    heartbeat_file = Path("/tmp/genesis_scheduler_heartbeat.json")
    heartbeat_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "status": "running",
        "cycle_count": cycle_count,
        "success_count": success_count,
        "failure_count": failure_count,
        "success_rate": success_count / cycle_count if cycle_count > 0 else 0,
        "pid": os.getpid()
    }
    try:
        heartbeat_file.write_text(json.dumps(heartbeat_data, indent=2))
    except Exception as e:
        logger.warning(f"Failed to write heartbeat: {e}")


async def autonomous_scheduler(
    min_interval_minutes: int = 5,
    max_interval_minutes: int = 10,
    max_cycles: int = None
):
    """
    Run autonomous business generation on a continuous schedule.

    PRODUCTION FEATURES:
    - Graceful shutdown on SIGTERM/SIGINT
    - Heartbeat file for health monitoring (/tmp/genesis_scheduler_heartbeat.json)
    - Structured JSON logging in production
    - Environment-based configuration

    Args:
        min_interval_minutes: Minimum time between cycles (default: 5)
        max_interval_minutes: Maximum time between cycles (default: 10)
        max_cycles: Maximum number of cycles to run (None = infinite)
    """
    global shutdown_requested

    logger.info("=" * 80)
    logger.info("🌟 GENESIS AUTONOMOUS SCHEDULER STARTING")
    logger.info("=" * 80)
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Interval: {min_interval_minutes}-{max_interval_minutes} minutes")
    logger.info(f"Max Cycles: {'Infinite' if max_cycles is None else max_cycles}")
    logger.info(f"PID: {os.getpid()}")
    logger.info("=" * 80)

    cycle_count = 0
    success_count = 0
    failure_count = 0

    try:
        while not shutdown_requested:
            cycle_count += 1

            # Write heartbeat before cycle
            write_heartbeat(cycle_count, success_count, failure_count)

            # Run generation cycle
            success = await run_generation_cycle()

            if success:
                success_count += 1
            else:
                failure_count += 1

            # Write heartbeat after cycle
            write_heartbeat(cycle_count, success_count, failure_count)

            # Log statistics
            logger.info(f"\n📊 SCHEDULER STATISTICS:")
            logger.info(f"   Total Cycles: {cycle_count}")
            logger.info(f"   Successful: {success_count} ({100*success_count/cycle_count:.1f}%)")
            logger.info(f"   Failed: {failure_count} ({100*failure_count/cycle_count:.1f}%)")

            # Check if we've hit max cycles
            if max_cycles and cycle_count >= max_cycles:
                logger.info(f"\n🏁 Reached maximum cycles ({max_cycles}). Stopping scheduler.")
                break

            # Check shutdown flag
            if shutdown_requested:
                logger.info(f"\n🛑 Shutdown requested - stopping scheduler")
                break

            # Calculate next cycle delay (random between min and max)
            delay_minutes = random.uniform(min_interval_minutes, max_interval_minutes)
            delay_seconds = delay_minutes * 60

            next_cycle = datetime.now(timezone.utc).timestamp() + delay_seconds
            next_cycle_time = datetime.fromtimestamp(next_cycle, tz=timezone.utc)

            logger.info(f"\n⏰ Next cycle in {delay_minutes:.1f} minutes")
            logger.info(f"   Next cycle time: {next_cycle_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            logger.info("=" * 80)

            # Wait until next cycle (with shutdown checks every 10 seconds)
            elapsed = 0
            check_interval = 10  # Check shutdown flag every 10 seconds
            while elapsed < delay_seconds and not shutdown_requested:
                sleep_time = min(check_interval, delay_seconds - elapsed)
                await asyncio.sleep(sleep_time)
                elapsed += sleep_time

    except KeyboardInterrupt:
        logger.info(f"\n\n⚠️  Scheduler stopped by user (Ctrl+C)")
    except Exception as e:
        logger.error(f"\n\n❌ Scheduler crashed: {e}", exc_info=True)
    finally:
        # Write final heartbeat
        heartbeat_file = Path("/tmp/genesis_scheduler_heartbeat.json")
        final_heartbeat = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "stopped",
            "cycle_count": cycle_count,
            "success_count": success_count,
            "failure_count": failure_count,
            "success_rate": success_count / cycle_count if cycle_count > 0 else 0,
            "pid": os.getpid()
        }
        try:
            heartbeat_file.write_text(json.dumps(final_heartbeat, indent=2))
        except Exception as e:
            logger.warning(f"Failed to write final heartbeat: {e}")

        logger.info(f"\n📊 FINAL STATISTICS:")
        logger.info(f"   Total Cycles: {cycle_count}")
        logger.info(f"   Successful: {success_count}")
        logger.info(f"   Failed: {failure_count}")
        logger.info(f"   Success Rate: {100*success_count/cycle_count:.1f}%" if cycle_count > 0 else "N/A")
        logger.info("=" * 80)
        logger.info("🌟 GENESIS AUTONOMOUS SCHEDULER STOPPED")
        logger.info("=" * 80)


def main():
    """Main entry point for autonomous scheduler."""
    import argparse

    parser = argparse.ArgumentParser(description='Genesis Autonomous Business Scheduler')
    parser.add_argument('--min-interval', type=int, default=5, help='Minimum minutes between cycles (default: 5)')
    parser.add_argument('--max-interval', type=int, default=10, help='Maximum minutes between cycles (default: 10)')
    parser.add_argument('--max-cycles', type=int, default=None, help='Maximum cycles to run (default: infinite)')

    args = parser.parse_args()

    # Run scheduler
    asyncio.run(autonomous_scheduler(
        min_interval_minutes=args.min_interval,
        max_interval_minutes=args.max_interval,
        max_cycles=args.max_cycles
    ))


if __name__ == "__main__":
    main()
