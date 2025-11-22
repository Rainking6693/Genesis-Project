"""
Memori Performance Monitoring Script
====================================

Tracks Memori SQL backend performance metrics:
- Query execution times
- Database size growth
- Memory footprint
- Cost vs Vector DB baseline

Usage:
    python monitor_memori_performance.py [--duration 3600] [--interval 5]
"""

import asyncio
import json
import logging
import os
import sqlite3
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class QueryMetric:
    """Single query execution metric"""
    query_type: str
    execution_time_ms: float
    row_count: int
    timestamp: datetime
    table: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query_type": self.query_type,
            "execution_time_ms": self.execution_time_ms,
            "row_count": self.row_count,
            "timestamp": self.timestamp.isoformat(),
            "table": self.table,
        }


@dataclass
class PerformanceSnapshot:
    """Snapshot of performance metrics at a point in time"""
    timestamp: datetime
    db_size_bytes: int
    total_records: int
    avg_query_time_ms: float
    max_query_time_ms: float
    slowest_query: Optional[str]
    memory_estimates: Dict[str, int]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "db_size_bytes": self.db_size_bytes,
            "total_records": self.total_records,
            "avg_query_time_ms": self.avg_query_time_ms,
            "max_query_time_ms": self.max_query_time_ms,
            "slowest_query": self.slowest_query,
            "memory_estimates": self.memory_estimates,
        }


class MemoriPerformanceMonitor:
    """Monitors Memori SQL backend performance"""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(
            db_path or os.getenv("MEMORI_DB_PATH", "data/memori/genesis_memori.db")
        )
        self.metrics: List[QueryMetric] = []
        self.snapshots: List[PerformanceSnapshot] = []
        self.conn: Optional[sqlite3.Connection] = None

    def connect(self) -> None:
        """Establish database connection"""
        if not self.db_path.exists():
            logger.warning(f"Database not found at {self.db_path}")
            return

        try:
            self.conn = sqlite3.connect(str(self.db_path))
            self.conn.row_factory = sqlite3.Row
            logger.info(f"Connected to Memori database at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            self.conn = None

    def measure_query(
        self, query_type: str, query: str, table: str
    ) -> Optional[QueryMetric]:
        """Execute query and measure performance"""
        if not self.conn:
            return None

        try:
            start = time.time()
            cursor = self.conn.execute(query)
            rows = cursor.fetchall()
            elapsed_ms = (time.time() - start) * 1000

            metric = QueryMetric(
                query_type=query_type,
                execution_time_ms=elapsed_ms,
                row_count=len(rows),
                timestamp=datetime.now(timezone.utc),
                table=table,
            )
            self.metrics.append(metric)
            return metric
        except Exception as e:
            logger.error(f"Query failed ({query_type}): {e}")
            return None

    def get_db_size(self) -> int:
        """Get database file size in bytes"""
        try:
            return self.db_path.stat().st_size
        except Exception:
            return 0

    def count_records(self) -> Dict[str, int]:
        """Count records in each table"""
        if not self.conn:
            return {}

        counts = {}
        tables = ["memories", "trajectories", "cases", "a2a_events"]
        for table in tables:
            try:
                cursor = self.conn.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                counts[table] = count
            except Exception:
                counts[table] = 0

        return counts

    def measure_table_sizes(self) -> Dict[str, int]:
        """Estimate memory usage per table"""
        if not self.conn:
            return {}

        sizes = {}
        tables = ["memories", "trajectories", "cases", "a2a_events"]
        for table in tables:
            try:
                cursor = self.conn.execute(f"SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size() WHERE tbl_name='{table}'")
                # Simplified: estimate based on row count
                cursor = self.conn.execute(f"SELECT COUNT(*) FROM {table}")
                row_count = cursor.fetchone()[0]
                # Rough estimate: 500 bytes per row average
                sizes[table] = row_count * 500
            except Exception:
                sizes[table] = 0

        return sizes

    def take_snapshot(self) -> PerformanceSnapshot:
        """Take comprehensive performance snapshot"""
        # Run representative queries
        queries = [
            ("SELECT_MEMORY", "SELECT * FROM memories LIMIT 100", "memories"),
            ("SELECT_TRAJECTORY", "SELECT * FROM trajectories LIMIT 100", "trajectories"),
            ("SELECT_CASES", "SELECT * FROM cases LIMIT 100", "cases"),
            ("FULL_SCAN_MEMORIES", "SELECT COUNT(*) FROM memories", "memories"),
        ]

        for query_type, query, table in queries:
            self.measure_query(query_type, query, table)

        # Calculate statistics
        recent_metrics = [m for m in self.metrics if
                         m.timestamp > datetime.now(timezone.utc) - timedelta(minutes=1)]

        if recent_metrics:
            times = [m.execution_time_ms for m in recent_metrics]
            avg_time = sum(times) / len(times)
            max_time = max(times)
            slowest = max(recent_metrics, key=lambda m: m.execution_time_ms)
            slowest_query = slowest.query_type
        else:
            avg_time = 0
            max_time = 0
            slowest_query = None

        counts = self.count_records()
        total_records = sum(counts.values())
        memory_est = self.measure_table_sizes()

        snapshot = PerformanceSnapshot(
            timestamp=datetime.now(timezone.utc),
            db_size_bytes=self.get_db_size(),
            total_records=total_records,
            avg_query_time_ms=avg_time,
            max_query_time_ms=max_time,
            slowest_query=slowest_query,
            memory_estimates=memory_est,
        )
        self.snapshots.append(snapshot)
        return snapshot

    def report_summary(self) -> Dict[str, Any]:
        """Generate performance report"""
        if not self.snapshots:
            return {"status": "No measurements taken"}

        first_snapshot = self.snapshots[0]
        latest_snapshot = self.snapshots[-1]

        # Calculate growth
        db_growth = latest_snapshot.db_size_bytes - first_snapshot.db_size_bytes
        record_growth = latest_snapshot.total_records - first_snapshot.total_records

        # Cost estimation: Vector DB baseline
        # Typical vector DB: $0.10 per GB per month + query costs
        # Memori SQL: flat file I/O + CPU (minimal)
        vector_db_monthly_cost = (latest_snapshot.db_size_bytes / (1024**3)) * 0.10
        memori_cost_estimate = 0.01  # Minimal cost

        cost_reduction = ((vector_db_monthly_cost - memori_cost_estimate) /
                         vector_db_monthly_cost * 100) if vector_db_monthly_cost > 0 else 0

        return {
            "monitoring_duration_minutes": (
                latest_snapshot.timestamp - first_snapshot.timestamp
            ).total_seconds() / 60,
            "database": {
                "current_size_mb": round(latest_snapshot.db_size_bytes / (1024**2), 2),
                "total_growth_mb": round(db_growth / (1024**2), 2),
                "total_records": latest_snapshot.total_records,
                "record_growth": record_growth,
            },
            "query_performance": {
                "avg_execution_time_ms": round(latest_snapshot.avg_query_time_ms, 2),
                "max_execution_time_ms": round(latest_snapshot.max_query_time_ms, 2),
                "slowest_query_type": latest_snapshot.slowest_query,
                "total_queries_measured": len(self.metrics),
            },
            "cost_analysis": {
                "vector_db_baseline_monthly": round(vector_db_monthly_cost, 3),
                "memori_sql_estimated_monthly": round(memori_cost_estimate, 3),
                "cost_reduction_percent": round(cost_reduction, 1),
            },
            "memory_estimates": latest_snapshot.memory_estimates,
            "snapshots_collected": len(self.snapshots),
        }

    def save_metrics(self, output_path: str = "memori_performance_metrics.json") -> None:
        """Save metrics to file"""
        data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": [m.to_dict() for m in self.metrics],
            "snapshots": [s.to_dict() for s in self.snapshots],
            "summary": self.report_summary(),
        }

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Metrics saved to {output}")

    def close(self) -> None:
        """Close database connection"""
        if self.conn:
            self.conn.close()


async def run_monitoring(
    duration_seconds: int = 3600,
    interval_seconds: int = 5,
) -> Dict[str, Any]:
    """Run monitoring loop"""
    monitor = MemoriPerformanceMonitor()
    monitor.connect()

    if not monitor.conn:
        logger.error("Failed to connect to database")
        return {"status": "failed", "error": "Database connection failed"}

    logger.info(f"Starting monitoring for {duration_seconds}s with {interval_seconds}s intervals")

    start_time = time.time()
    snapshot_count = 0

    try:
        while time.time() - start_time < duration_seconds:
            try:
                snapshot = monitor.take_snapshot()
                snapshot_count += 1

                logger.info(
                    f"[Snapshot {snapshot_count}] "
                    f"DB: {snapshot.db_size_bytes / (1024**2):.1f}MB, "
                    f"Records: {snapshot.total_records}, "
                    f"Avg Query: {snapshot.avg_query_time_ms:.1f}ms"
                )

                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error during snapshot: {e}")
                await asyncio.sleep(interval_seconds)

    except KeyboardInterrupt:
        logger.info("Monitoring interrupted")
    finally:
        monitor.close()

    # Save results
    monitor.save_metrics()
    summary = monitor.report_summary()

    logger.info("=== Performance Summary ===")
    logger.info(json.dumps(summary, indent=2))

    return summary


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Monitor Memori performance")
    parser.add_argument("--duration", type=int, default=3600, help="Duration in seconds")
    parser.add_argument("--interval", type=int, default=5, help="Snapshot interval in seconds")
    parser.add_argument("--db-path", help="Path to Memori database")

    args = parser.parse_args()

    if args.db_path:
        os.environ["MEMORI_DB_PATH"] = args.db_path

    summary = asyncio.run(run_monitoring(args.duration, args.interval))

    if summary.get("status") == "failed":
        sys.exit(1)

    return 0


if __name__ == "__main__":
    sys.exit(main())
