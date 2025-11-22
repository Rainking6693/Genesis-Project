#!/usr/bin/env python3
"""
ES Training Monitoring Dashboard
Version: 1.0
Last Updated: November 8, 2025

This script displays a real-time monitoring dashboard for Evolution Strategies
nightly training runs.

FEATURES:
- Display training metrics (fitness, iterations, time)
- Show training history graph
- Alert on fitness degradation
- Monitor VRAM usage
- Track adapter archive size

USAGE:
    # Run monitoring dashboard
    python scripts/es_training_monitor.py

    # Export metrics as JSON
    python scripts/es_training_monitor.py --export metrics.json

    # Send alert if fitness degraded
    python scripts/es_training_monitor.py --alert --slack-webhook <URL>
"""

import argparse
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [ES-MONITOR] - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


class ESTrainingMonitor:
    """Monitor Evolution Strategies training runs"""

    def __init__(
        self,
        models_dir: str = "models/lora_adapters",
        metrics_dir: str = "/app/metrics"
    ):
        self.models_dir = Path(models_dir)
        self.metrics_dir = Path(metrics_dir)
        self.archive_dir = self.models_dir / "archive"
        self.current_dir = self.models_dir / "current"

    def load_latest_metrics(self) -> Optional[Dict]:
        """Load latest training metrics"""
        metrics_file = self.metrics_dir / "es_training_metrics.json"

        if not metrics_file.exists():
            logger.warning(f"Metrics file not found: {metrics_file}")
            return None

        try:
            with open(metrics_file, 'r') as f:
                metrics = json.load(f)
            return metrics
        except Exception as e:
            logger.error(f"Failed to load metrics: {e}")
            return None

    def load_training_history(self) -> List[Dict]:
        """Load all training history files"""
        history_files = sorted(self.archive_dir.glob("history_*.json"))
        histories = []

        for history_file in history_files:
            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
                    histories.append(history)
            except Exception as e:
                logger.error(f"Failed to load history file {history_file}: {e}")

        return histories

    def get_adapter_stats(self) -> Dict:
        """Get statistics about adapter archive"""
        adapters = list(self.archive_dir.glob("adapter_iter_*.safetensors"))

        if not adapters:
            return {
                "count": 0,
                "total_size_mb": 0,
                "oldest": None,
                "newest": None
            }

        total_size = sum(f.stat().st_size for f in adapters)
        oldest = min(adapters, key=lambda f: f.stat().st_mtime)
        newest = max(adapters, key=lambda f: f.stat().st_mtime)

        return {
            "count": len(adapters),
            "total_size_mb": total_size / 1e6,
            "oldest": datetime.fromtimestamp(oldest.stat().st_mtime).isoformat(),
            "newest": datetime.fromtimestamp(newest.stat().st_mtime).isoformat(),
        }

    def get_current_adapter_info(self) -> Optional[Dict]:
        """Get info about current production adapter"""
        current_adapter = self.current_dir / "adapter.safetensors"

        if not current_adapter.exists():
            logger.warning("Current adapter not found")
            return None

        stat = current_adapter.stat()

        return {
            "path": str(current_adapter),
            "size_mb": stat.st_size / 1e6,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }

    def check_fitness_degradation(
        self,
        threshold: float = 0.05
    ) -> Dict:
        """Check if fitness has degraded compared to previous runs"""
        histories = self.load_training_history()

        if len(histories) < 2:
            return {
                "degraded": False,
                "message": "Not enough history to compare"
            }

        # Get last 2 runs
        prev_fitness = histories[-2]["best_fitness"]
        curr_fitness = histories[-1]["best_fitness"]

        degradation = (prev_fitness - curr_fitness) / prev_fitness

        if degradation > threshold:
            return {
                "degraded": True,
                "prev_fitness": prev_fitness,
                "curr_fitness": curr_fitness,
                "degradation_pct": degradation * 100,
                "message": f"Fitness degraded by {degradation*100:.2f}% (threshold: {threshold*100}%)"
            }

        return {
            "degraded": False,
            "prev_fitness": prev_fitness,
            "curr_fitness": curr_fitness,
            "improvement_pct": -degradation * 100,
            "message": f"Fitness improved by {-degradation*100:.2f}%"
        }

    def send_slack_alert(
        self,
        webhook_url: str,
        degradation_info: Dict
    ):
        """Send Slack alert for fitness degradation"""
        message = {
            "text": "🚨 ES Training Alert: Fitness Degradation Detected",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 ES Training Alert"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": degradation_info["message"]
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Previous Fitness:*\n{degradation_info['prev_fitness']:.4f}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Current Fitness:*\n{degradation_info['curr_fitness']:.4f}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Degradation:*\n{degradation_info['degradation_pct']:.2f}%"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "⚠️ *Action Required:* Consider rolling back to previous adapter using `scripts/es_rollback.py`"
                    }
                }
            ]
        }

        try:
            response = requests.post(webhook_url, json=message)
            response.raise_for_status()
            logger.info("Slack alert sent successfully")
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")

    def display_dashboard(self):
        """Display monitoring dashboard"""
        print("=" * 70)
        print("ES TRAINING MONITORING DASHBOARD")
        print("=" * 70)
        print()

        # Latest metrics
        metrics = self.load_latest_metrics()
        if metrics:
            print("📊 LATEST TRAINING RUN")
            print("-" * 70)
            print(f"Timestamp:       {metrics.get('timestamp', 'N/A')}")
            print(f"Best Fitness:    {metrics.get('best_fitness', 0):.4f}")
            print(f"Iterations:      {metrics.get('iterations', 0)}")
            print(f"Population:      {metrics.get('population_size', 0)}")
            print(f"Total Time:      {metrics.get('total_time_seconds', 0):.2f}s")
            print(f"Adapter Path:    {metrics.get('adapter_path', 'N/A')}")
            print()
        else:
            print("⚠️  No training metrics available")
            print()

        # Adapter stats
        adapter_stats = self.get_adapter_stats()
        print("📦 ADAPTER ARCHIVE")
        print("-" * 70)
        print(f"Total Adapters:  {adapter_stats['count']}")
        print(f"Total Size:      {adapter_stats['total_size_mb']:.1f} MB")
        if adapter_stats['oldest']:
            print(f"Oldest:          {adapter_stats['oldest']}")
        if adapter_stats['newest']:
            print(f"Newest:          {adapter_stats['newest']}")
        print()

        # Current adapter
        current_info = self.get_current_adapter_info()
        if current_info:
            print("🎯 CURRENT PRODUCTION ADAPTER")
            print("-" * 70)
            print(f"Path:            {current_info['path']}")
            print(f"Size:            {current_info['size_mb']:.1f} MB")
            print(f"Last Modified:   {current_info['modified']}")
            print()
        else:
            print("⚠️  No current production adapter found")
            print()

        # Fitness check
        degradation = self.check_fitness_degradation()
        print("📈 FITNESS CHECK")
        print("-" * 70)
        print(f"Status:          {'🚨 DEGRADED' if degradation['degraded'] else '✅ OK'}")
        print(f"Message:         {degradation['message']}")
        print()

        # Training history summary
        histories = self.load_training_history()
        if histories:
            print("📚 TRAINING HISTORY (Last 5 runs)")
            print("-" * 70)
            for i, history in enumerate(reversed(histories[-5:]), 1):
                iterations = len(history.get('iterations', []))
                best_fitness = history.get('best_fitness', 0)
                print(f"{i}. Best Fitness: {best_fitness:.4f}, Iterations: {iterations}")
            print()

        print("=" * 70)

    def export_metrics(self, output_file: str):
        """Export all metrics to JSON file"""
        metrics = {
            "latest_run": self.load_latest_metrics(),
            "adapter_stats": self.get_adapter_stats(),
            "current_adapter": self.get_current_adapter_info(),
            "fitness_check": self.check_fitness_degradation(),
            "training_history": self.load_training_history(),
            "timestamp": datetime.now().isoformat()
        }

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(metrics, f, indent=2)

        logger.info(f"Metrics exported to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Monitor Evolution Strategies training runs"
    )
    parser.add_argument(
        "--export",
        type=str,
        help="Export metrics to JSON file"
    )
    parser.add_argument(
        "--alert",
        action="store_true",
        help="Send alert if fitness degraded"
    )
    parser.add_argument(
        "--slack-webhook",
        type=str,
        help="Slack webhook URL for alerts"
    )
    parser.add_argument(
        "--models-dir",
        type=str,
        default="models/lora_adapters",
        help="Path to models directory (default: models/lora_adapters)"
    )
    parser.add_argument(
        "--metrics-dir",
        type=str,
        default="/app/metrics",
        help="Path to metrics directory (default: /app/metrics)"
    )

    args = parser.parse_args()

    # Create monitor
    monitor = ESTrainingMonitor(
        models_dir=args.models_dir,
        metrics_dir=args.metrics_dir
    )

    # Display dashboard (default)
    if not args.export and not args.alert:
        monitor.display_dashboard()
        return 0

    # Export metrics
    if args.export:
        monitor.export_metrics(args.export)

    # Send alert
    if args.alert:
        degradation = monitor.check_fitness_degradation()

        if degradation["degraded"]:
            if args.slack_webhook:
                monitor.send_slack_alert(args.slack_webhook, degradation)
            else:
                logger.error("Fitness degraded but no Slack webhook provided")
                logger.error(f"Degradation info: {degradation}")
                return 1
        else:
            logger.info("No fitness degradation detected")

    return 0


if __name__ == "__main__":
    exit(main())
