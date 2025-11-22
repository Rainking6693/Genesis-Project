"""
Migration Script: JSONL to SQL
Migrates existing JSONL-based trajectory and case data to Memori SQL backend

Usage:
    python scripts/migrate_jsonl_to_sql.py --trajectories data/trajectories.jsonl --cases data/cases.jsonl
    python scripts/migrate_jsonl_to_sql.py --auto-discover
    python scripts/migrate_jsonl_to_sql.py --dry-run
"""
import argparse
import json
import logging
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus
from infrastructure.casebank import CaseBank

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MigrationStats:
    """Track migration statistics"""
    def __init__(self):
        self.trajectories_found = 0
        self.trajectories_migrated = 0
        self.trajectories_failed = 0
        self.cases_found = 0
        self.cases_migrated = 0
        self.cases_failed = 0
        self.start_time = datetime.now()
        self.errors: List[str] = []

    def summary(self) -> Dict[str, Any]:
        """Get migration summary"""
        duration = (datetime.now() - self.start_time).total_seconds()
        return {
            "trajectories": {
                "found": self.trajectories_found,
                "migrated": self.trajectories_migrated,
                "failed": self.trajectories_failed,
                "success_rate": f"{self.trajectories_migrated / max(self.trajectories_found, 1) * 100:.1f}%"
            },
            "cases": {
                "found": self.cases_found,
                "migrated": self.cases_migrated,
                "failed": self.cases_failed,
                "success_rate": f"{self.cases_migrated / max(self.cases_found, 1) * 100:.1f}%"
            },
            "duration_seconds": duration,
            "errors": self.errors[:10]  # Show first 10 errors
        }


def discover_jsonl_files(base_dir: str = ".") -> Dict[str, List[Path]]:
    """
    Auto-discover JSONL files in repository

    Args:
        base_dir: Base directory to search

    Returns:
        Dictionary of file type to list of paths
    """
    discovered = {
        "trajectories": [],
        "cases": []
    }

    search_paths = [
        "data",
        "logs",
        "output",
        "businesses",
        "fixtures"
    ]

    for search_path in search_paths:
        full_path = Path(base_dir) / search_path
        if not full_path.exists():
            continue

        # Find trajectory files
        for traj_file in full_path.rglob("*trajectory*.jsonl"):
            discovered["trajectories"].append(traj_file)

        # Find case files
        for case_file in full_path.rglob("*case*.jsonl"):
            discovered["cases"].append(case_file)

    logger.info(
        f"Discovered {len(discovered['trajectories'])} trajectory files, "
        f"{len(discovered['cases'])} case files"
    )

    return discovered


def migrate_trajectories_from_jsonl(
    jsonl_file: Path,
    pool: TrajectoryPool,
    stats: MigrationStats,
    dry_run: bool = False
) -> None:
    """
    Migrate trajectories from JSONL file to SQL

    Args:
        jsonl_file: Path to JSONL file
        pool: TrajectoryPool with SQL backend
        stats: Migration statistics tracker
        dry_run: If True, don't actually migrate
    """
    logger.info(f"Migrating trajectories from: {jsonl_file}")

    try:
        with open(jsonl_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    stats.trajectories_found += 1

                    metadata = data.get("metadata", {}) or {}
                    trajectory = Trajectory(
                        trajectory_id=data.get("trajectory_id", f"traj_{line_num}"),
                        generation=data.get("generation", line_num),
                        agent_name=data.get("agent_id", "unknown"),
                        task_type=data.get("task_type", metadata.get("task_type", "general")),
                        task_description=data.get("task", metadata.get("task_description", "")),
                        focus_area=metadata.get("focus_area", ""),
                        code_changes=metadata.get("code_changes", ""),
                        problem_diagnosis=metadata.get("problem_diagnosis", ""),
                        proposed_strategy=metadata.get("proposed_strategy", ""),
                        status=data.get("status", TrajectoryStatus.SUCCESS.value),
                        success_score=data.get("quality_score", data.get("reward", 0.0)),
                        metrics=data.get("metrics", {}),
                        metadata=metadata
                    )

                    if not dry_run:
                        pool.add_trajectory(trajectory)

                    stats.trajectories_migrated += 1

                    if stats.trajectories_migrated % 100 == 0:
                        logger.info(f"Migrated {stats.trajectories_migrated} trajectories...")

                except json.JSONDecodeError as e:
                    stats.trajectories_failed += 1
                    error_msg = f"JSON error at line {line_num}: {e}"
                    stats.errors.append(error_msg)
                    logger.warning(error_msg)
                except Exception as e:
                    stats.trajectories_failed += 1
                    error_msg = f"Error at line {line_num}: {e}"
                    stats.errors.append(error_msg)
                    logger.warning(error_msg)

    except FileNotFoundError:
        logger.error(f"File not found: {jsonl_file}")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")


def migrate_cases_from_jsonl(
    jsonl_file: Path,
    casebank: CaseBank,
    stats: MigrationStats,
    dry_run: bool = False
) -> None:
    """
    Migrate cases from JSONL file to SQL

    Args:
        jsonl_file: Path to JSONL file
        casebank: CaseBank with SQL backend
        stats: Migration statistics tracker
        dry_run: If True, don't actually migrate
    """
    logger.info(f"Migrating cases from: {jsonl_file}")

    try:
        with open(jsonl_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    stats.cases_found += 1

                    payload = {
                        "case_id": data.get("case_id", f"case_{line_num}"),
                        "problem": data.get("problem", ""),
                        "solution": data.get("solution", ""),
                        "context": data.get("context", {}),
                        "outcome": data.get("outcome", {}),
                        "metadata": data.get("metadata", {}),
                        "entities": data.get("entities"),
                        "agent_id": data.get("metadata", {}).get("agent")
                    }

                    if not dry_run:
                        asyncio.run(casebank.store_case(payload))

                    stats.cases_migrated += 1

                    if stats.cases_migrated % 100 == 0:
                        logger.info(f"Migrated {stats.cases_migrated} cases...")

                except json.JSONDecodeError as e:
                    stats.cases_failed += 1
                    error_msg = f"JSON error at line {line_num}: {e}"
                    stats.errors.append(error_msg)
                    logger.warning(error_msg)
                except Exception as e:
                    stats.cases_failed += 1
                    error_msg = f"Error at line {line_num}: {e}"
                    stats.errors.append(error_msg)
                    logger.warning(error_msg)

    except FileNotFoundError:
        logger.error(f"File not found: {jsonl_file}")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")


def main():
    """Main migration function"""
    parser = argparse.ArgumentParser(description="Migrate JSONL data to Memori SQL")
    parser.add_argument(
        "--trajectories",
        type=str,
        help="Path to trajectories JSONL file"
    )
    parser.add_argument(
        "--cases",
        type=str,
        help="Path to cases JSONL file"
    )
    parser.add_argument(
        "--auto-discover",
        action="store_true",
        help="Auto-discover JSONL files in repository"
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default=None,
        help="Database URL (default: SQLite in current directory)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run - parse files but don't migrate"
    )

    args = parser.parse_args()

    # Initialize statistics
    stats = MigrationStats()

    logger.info("=" * 80)
    logger.info("MEMORI JSONL TO SQL MIGRATION")
    logger.info("=" * 80)

    if args.dry_run:
        logger.info("DRY RUN MODE - No data will be written")

    # Determine files to migrate
    trajectory_files: List[Path] = []
    case_files: List[Path] = []

    if args.auto_discover:
        discovered = discover_jsonl_files()
        trajectory_files = discovered["trajectories"]
        case_files = discovered["cases"]
    else:
        if args.trajectories:
            trajectory_files = [Path(args.trajectories)]
        if args.cases:
            case_files = [Path(args.cases)]

    if not trajectory_files and not case_files:
        logger.error("No files to migrate. Use --trajectories, --cases, or --auto-discover")
        sys.exit(1)

    # Initialize SQL backends
    logger.info(f"Database URL: {args.database_url or 'SQLite (default)'}")

    trajectory_pool = None
    casebank = None

    if trajectory_files:
        trajectory_pool = TrajectoryPool(
            sql_backend=True,
            database_url=args.database_url
        )
        logger.info("Initialized TrajectoryPool SQL backend")

    if case_files:
        casebank = CaseBank(
            sql_backend=True,
            database_url=args.database_url
        )
        logger.info("Initialized CaseBank SQL backend")

    # Migrate trajectories
    for traj_file in trajectory_files:
        migrate_trajectories_from_jsonl(traj_file, trajectory_pool, stats, args.dry_run)

    # Migrate cases
    for case_file in case_files:
        migrate_cases_from_jsonl(case_file, casebank, stats, args.dry_run)

    # Print summary
    logger.info("=" * 80)
    logger.info("MIGRATION COMPLETE")
    logger.info("=" * 80)

    summary = stats.summary()
    logger.info(f"Trajectories: {summary['trajectories']['migrated']}/{summary['trajectories']['found']} "
                f"({summary['trajectories']['success_rate']})")
    logger.info(f"Cases: {summary['cases']['migrated']}/{summary['cases']['found']} "
                f"({summary['cases']['success_rate']})")
    logger.info(f"Duration: {summary['duration_seconds']:.1f} seconds")

    if stats.errors:
        logger.warning(f"Encountered {len(stats.errors)} errors (showing first 10):")
        for error in summary['errors']:
            logger.warning(f"  - {error}")

    # Write summary to file
    summary_file = Path("migration_summary.json")
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    logger.info(f"Summary written to: {summary_file}")


if __name__ == "__main__":
    main()
