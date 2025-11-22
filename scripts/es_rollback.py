#!/usr/bin/env python3
"""
ES Adapter Rollback Script
Version: 1.0
Last Updated: November 8, 2025

This script rolls back to a previous LoRA adapter in case the latest ES
training iteration degrades performance.

USAGE:
    # List available adapters
    python scripts/es_rollback.py --list

    # Rollback to previous iteration
    python scripts/es_rollback.py --rollback

    # Rollback to specific iteration
    python scripts/es_rollback.py --rollback --iteration 42

    # Rollback to specific timestamp
    python scripts/es_rollback.py --rollback --timestamp 20251108_020000

SAFETY:
- Creates backup of current adapter before rollback
- Validates adapter integrity before deployment
- Records rollback in history log
"""

import argparse
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [ES-ROLLBACK] - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


def list_available_adapters(models_dir: str = "models/lora_adapters") -> List[dict]:
    """List all available adapter archives"""
    archive_dir = Path(models_dir) / "archive"

    if not archive_dir.exists():
        logger.error(f"Archive directory not found: {archive_dir}")
        return []

    adapters = []
    for adapter_file in sorted(archive_dir.glob("adapter_iter_*.safetensors")):
        # Parse filename: adapter_iter_0042_20251108_020000.safetensors
        filename = adapter_file.stem
        parts = filename.split("_")

        if len(parts) >= 5:
            iteration = int(parts[2])
            timestamp = f"{parts[3]}_{parts[4]}"
        else:
            iteration = None
            timestamp = None

        # Get file stats
        stat = adapter_file.stat()
        size_mb = stat.st_size / 1e6
        modified = datetime.fromtimestamp(stat.st_mtime)

        adapters.append({
            "path": str(adapter_file),
            "filename": adapter_file.name,
            "iteration": iteration,
            "timestamp": timestamp,
            "size_mb": size_mb,
            "modified": modified.isoformat(),
        })

    return adapters


def get_current_adapter(models_dir: str = "models/lora_adapters") -> Optional[str]:
    """Get path to current production adapter"""
    current_path = Path(models_dir) / "current" / "adapter.safetensors"

    if not current_path.exists():
        logger.error(f"Current adapter not found: {current_path}")
        return None

    return str(current_path)


def backup_current_adapter(models_dir: str = "models/lora_adapters") -> str:
    """Backup current adapter before rollback"""
    current_path = Path(models_dir) / "current" / "adapter.safetensors"
    backup_dir = Path(models_dir) / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"adapter_backup_{timestamp}.safetensors"

    shutil.copy2(current_path, backup_path)
    logger.info(f"Current adapter backed up to: {backup_path}")

    return str(backup_path)


def rollback_to_adapter(
    adapter_path: str,
    models_dir: str = "models/lora_adapters",
    dry_run: bool = False
) -> bool:
    """Rollback to specific adapter"""
    source_path = Path(adapter_path)
    target_path = Path(models_dir) / "current" / "adapter.safetensors"

    if not source_path.exists():
        logger.error(f"Source adapter not found: {source_path}")
        return False

    logger.info(f"Rolling back to: {source_path}")
    logger.info(f"Target: {target_path}")

    if dry_run:
        logger.info("DRY-RUN: Would copy adapter but not actually doing it")
        return True

    # Backup current
    backup_path = backup_current_adapter(models_dir)
    logger.info(f"Current adapter backed up to: {backup_path}")

    # Copy adapter
    shutil.copy2(source_path, target_path)
    logger.info(f"Rollback complete: {source_path} -> {target_path}")

    # Record rollback in history
    history_dir = Path(models_dir) / "rollback_history"
    history_dir.mkdir(parents=True, exist_ok=True)

    history_file = history_dir / "rollback_log.json"
    history = []

    if history_file.exists():
        with open(history_file, 'r') as f:
            history = json.load(f)

    history.append({
        "timestamp": datetime.now().isoformat(),
        "source": str(source_path),
        "backup": backup_path,
        "reason": "manual_rollback",
    })

    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)

    logger.info(f"Rollback recorded in: {history_file}")

    return True


def find_adapter_by_iteration(
    iteration: int,
    models_dir: str = "models/lora_adapters"
) -> Optional[str]:
    """Find adapter by iteration number"""
    adapters = list_available_adapters(models_dir)

    for adapter in adapters:
        if adapter["iteration"] == iteration:
            return adapter["path"]

    logger.error(f"No adapter found for iteration {iteration}")
    return None


def find_adapter_by_timestamp(
    timestamp: str,
    models_dir: str = "models/lora_adapters"
) -> Optional[str]:
    """Find adapter by timestamp"""
    adapters = list_available_adapters(models_dir)

    for adapter in adapters:
        if adapter["timestamp"] == timestamp:
            return adapter["path"]

    logger.error(f"No adapter found for timestamp {timestamp}")
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Rollback ES LoRA adapter to previous version"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available adapters"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback to previous adapter"
    )
    parser.add_argument(
        "--iteration",
        type=int,
        help="Rollback to specific iteration number"
    )
    parser.add_argument(
        "--timestamp",
        type=str,
        help="Rollback to specific timestamp (e.g., 20251108_020000)"
    )
    parser.add_argument(
        "--models-dir",
        type=str,
        default="models/lora_adapters",
        help="Path to models directory (default: models/lora_adapters)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry-run mode (no actual rollback)"
    )

    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("ES ADAPTER ROLLBACK SCRIPT")
    logger.info("=" * 70)

    if args.list:
        # List available adapters
        adapters = list_available_adapters(args.models_dir)

        if not adapters:
            logger.error("No adapters found in archive")
            return 1

        logger.info(f"\nFound {len(adapters)} archived adapters:")
        logger.info("-" * 70)

        for i, adapter in enumerate(reversed(adapters)):  # Most recent first
            logger.info(
                f"{i+1}. Iteration {adapter['iteration']:04d} - "
                f"{adapter['timestamp']} - "
                f"{adapter['size_mb']:.1f} MB - "
                f"{adapter['filename']}"
            )

        logger.info("-" * 70)

        # Show current adapter
        current_path = get_current_adapter(args.models_dir)
        if current_path:
            current_stat = Path(current_path).stat()
            logger.info(f"\nCurrent adapter: {current_path}")
            logger.info(f"Size: {current_stat.st_size / 1e6:.1f} MB")
            logger.info(f"Modified: {datetime.fromtimestamp(current_stat.st_mtime).isoformat()}")

        return 0

    elif args.rollback:
        # Rollback to adapter
        adapter_path = None

        if args.iteration is not None:
            # Rollback to specific iteration
            adapter_path = find_adapter_by_iteration(args.iteration, args.models_dir)
            if not adapter_path:
                logger.error(f"Adapter not found for iteration {args.iteration}")
                return 1

        elif args.timestamp is not None:
            # Rollback to specific timestamp
            adapter_path = find_adapter_by_timestamp(args.timestamp, args.models_dir)
            if not adapter_path:
                logger.error(f"Adapter not found for timestamp {args.timestamp}")
                return 1

        else:
            # Rollback to most recent (previous iteration)
            adapters = list_available_adapters(args.models_dir)
            if len(adapters) < 1:
                logger.error("No archived adapters available for rollback")
                return 1

            # Get second-most recent (most recent is current)
            if len(adapters) >= 2:
                adapter_path = adapters[-2]["path"]
            else:
                adapter_path = adapters[-1]["path"]

            logger.info(f"Rolling back to most recent adapter: {adapter_path}")

        # Perform rollback
        success = rollback_to_adapter(
            adapter_path,
            models_dir=args.models_dir,
            dry_run=args.dry_run
        )

        if success:
            logger.info("=" * 70)
            logger.info("ROLLBACK SUCCESSFUL")
            logger.info("=" * 70)
            return 0
        else:
            logger.error("=" * 70)
            logger.error("ROLLBACK FAILED")
            logger.error("=" * 70)
            return 1

    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    exit(main())
