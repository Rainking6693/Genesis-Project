"""
Launch Distributed DreamGym Worker

Starts a worker process that pulls rollout generation tasks from Redis queue,
processes them using M_exp model, and pushes results back.

This enables horizontal scaling: run multiple workers across different
machines to parallelize rollout generation.

Usage:
    # Start single worker
    python scripts/start_dreamgym_worker.py

    # Start worker with custom ID
    python scripts/start_dreamgym_worker.py --worker-id worker_001

    # Start worker with custom Redis URL
    python scripts/start_dreamgym_worker.py --redis-url redis://remote-host:6379

    # Start worker with specific model
    python scripts/start_dreamgym_worker.py --model claude-sonnet-4

    # Start multiple workers (PowerShell)
    1..5 | ForEach-Object { Start-Process python -ArgumentList "scripts/start_dreamgym_worker.py --worker-id worker_$_" }
"""
import asyncio
import argparse
import sys
import os
import logging

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.evolution_strategies.distributed_dreamgym import (
    DistributedDreamGymWorker,
    REDIS_AVAILABLE
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Start Distributed DreamGym Worker',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start single worker
  python scripts/start_dreamgym_worker.py

  # Custom worker ID
  python scripts/start_dreamgym_worker.py --worker-id production_worker_01

  # Custom Redis URL
  python scripts/start_dreamgym_worker.py --redis-url redis://10.0.0.5:6379

  # Use Sonnet 4 model (higher quality, higher cost)
  python scripts/start_dreamgym_worker.py --model claude-sonnet-4

  # Start 5 workers (PowerShell)
  1..5 | ForEach-Object { Start-Process python -ArgumentList "scripts/start_dreamgym_worker.py --worker-id worker_$_" }
        """
    )

    parser.add_argument(
        '--redis-url',
        default='redis://localhost:6379',
        help='Redis connection URL (default: redis://localhost:6379)'
    )

    parser.add_argument(
        '--worker-id',
        default=None,
        help='Worker ID (auto-generated if not specified)'
    )

    parser.add_argument(
        '--model',
        default='claude-haiku-4.5',
        choices=['claude-haiku-4.5', 'claude-sonnet-4', 'claude-opus-4'],
        help='LLM model to use (default: claude-haiku-4.5 for cost efficiency)'
    )

    parser.add_argument(
        '--task-queue',
        default='dreamgym:rollout_tasks',
        help='Redis task queue key (default: dreamgym:rollout_tasks)'
    )

    parser.add_argument(
        '--result-queue',
        default='dreamgym:rollout_results',
        help='Redis result queue key (default: dreamgym:rollout_results)'
    )

    args = parser.parse_args()

    # Check Redis availability
    if not REDIS_AVAILABLE:
        logger.error("=" * 60)
        logger.error("ERROR: Redis library not available")
        logger.error("=" * 60)
        logger.error("To use distributed workers, install Redis:")
        logger.error("  pip install redis")
        logger.error("")
        logger.error("Then start Redis server:")
        logger.error("  redis-server")
        logger.error("=" * 60)
        sys.exit(1)

    # Display startup banner
    logger.info("=" * 60)
    logger.info("DISTRIBUTED DREAMGYM WORKER")
    logger.info("=" * 60)
    logger.info(f"Redis URL: {args.redis_url}")
    logger.info(f"Worker ID: {args.worker_id or 'auto-generated'}")
    logger.info(f"Model: {args.model}")
    logger.info(f"Task queue: {args.task_queue}")
    logger.info(f"Result queue: {args.result_queue}")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Press Ctrl+C to stop worker")
    logger.info("")

    # Initialize worker
    worker = DistributedDreamGymWorker(
        redis_url=args.redis_url,
        task_queue=args.task_queue,
        result_queue=args.result_queue,
        worker_id=args.worker_id,
        model=args.model
    )

    # Start worker (blocking)
    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("\n⏹️  Worker stopped by user")
    except Exception as e:
        logger.error(f"\n❌ Worker error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\nWorker stopped")
        sys.exit(0)
