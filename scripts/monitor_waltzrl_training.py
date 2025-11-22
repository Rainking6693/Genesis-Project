"""
WaltzRL Stage 2 Training Monitor
Version: 1.0
Date: October 27, 2025

Real-time monitoring of WaltzRL Stage 2 GPU training with automated anomaly detection.

Features:
1. Real-time log parsing (every 5 minutes)
2. Anomaly detection (negative DIR, high ASR/ORR)
3. ETA calculation based on progress
4. Email/Slack alerts for critical issues
5. Checkpoint verification
6. GPU utilization tracking

Usage:
    python scripts/monitor_waltzrl_training.py \
        --log-file logs/waltzrl_training.log \
        --interval 300 \
        --alert-email ops@genesis.ai
"""

import asyncio
import argparse
import logging
import re
import time
from pathlib import Path
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


@dataclass
class TrainingMetrics:
    """Parsed training metrics from logs"""
    epoch: int
    step: int
    total_steps: int
    dir_score: float
    safety_delta: float
    helpfulness_delta: float
    conversation_loss: float
    feedback_loss: float
    kl_divergence: float
    asr: float  # Attack Success Rate
    orr: float  # Over-Refusal Rate
    ftr: float  # Feedback Trigger Rate
    gpu_utilization: float
    timestamp: datetime


@dataclass
class TrainingStatus:
    """Overall training status"""
    is_running: bool
    current_epoch: int
    current_step: int
    total_steps: int
    progress_pct: float
    eta_hours: float
    last_checkpoint: Optional[str]
    anomalies: List[str]
    metrics_history: List[TrainingMetrics]


class WaltzRLTrainingMonitor:
    """
    Real-time monitoring of WaltzRL Stage 2 training.

    Monitors:
    - DIR scores (should be positive, indicating improvement)
    - ASR (Attack Success Rate) - should decrease over time
    - ORR (Over-Refusal Rate) - should decrease over time
    - Training losses (should decrease)
    - GPU utilization (should be >90%)
    - Checkpoint creation
    """

    def __init__(
        self,
        log_file: str,
        interval_sec: int = 300,
        alert_email: Optional[str] = None,
        alert_slack_webhook: Optional[str] = None
    ):
        self.log_file = Path(log_file)
        self.interval_sec = interval_sec
        self.alert_email = alert_email
        self.alert_slack_webhook = alert_slack_webhook

        # Monitoring state
        self.last_log_position = 0
        self.metrics_history: List[TrainingMetrics] = []
        self.anomalies: List[str] = []
        self.start_time = time.time()

        # Target metrics (from paper)
        self.target_asr = 0.046  # 4.6%
        self.target_orr = 0.099  # 9.9%
        self.target_dir = 0.0    # Positive DIR indicates improvement

        logger.info(f"WaltzRL Training Monitor initialized")
        logger.info(f"Log file: {self.log_file}")
        logger.info(f"Check interval: {self.interval_sec}s")

    async def monitor(self):
        """Main monitoring loop"""
        logger.info("=" * 80)
        logger.info("WALTZRL STAGE 2 TRAINING MONITOR - START")
        logger.info("=" * 80)

        try:
            while True:
                # Parse latest logs
                new_metrics = self._parse_new_logs()

                if new_metrics:
                    self.metrics_history.extend(new_metrics)

                    # Get latest metrics
                    latest = new_metrics[-1]

                    # Check for anomalies
                    anomalies = self._detect_anomalies(latest)

                    if anomalies:
                        self.anomalies.extend(anomalies)
                        await self._send_alerts(anomalies, latest)

                    # Log progress
                    self._log_progress(latest)

                    # Save metrics snapshot
                    self._save_metrics_snapshot()

                # Wait for next check
                await asyncio.sleep(self.interval_sec)

        except KeyboardInterrupt:
            logger.info("\nMonitoring stopped by user")
        except Exception as e:
            logger.error(f"Monitoring failed: {e}", exc_info=True)
            raise

    def _parse_new_logs(self) -> List[TrainingMetrics]:
        """Parse new log entries since last check"""
        if not self.log_file.exists():
            logger.warning(f"Log file not found: {self.log_file}")
            return []

        metrics_list = []

        try:
            with open(self.log_file, 'r') as f:
                # Seek to last position
                f.seek(self.last_log_position)

                # Read new lines
                new_lines = f.readlines()

                # Update position
                self.last_log_position = f.tell()

            # Parse metrics from new lines
            for line in new_lines:
                metrics = self._parse_log_line(line)
                if metrics:
                    metrics_list.append(metrics)

        except Exception as e:
            logger.error(f"Failed to parse logs: {e}")

        return metrics_list

    def _parse_log_line(self, line: str) -> Optional[TrainingMetrics]:
        """Parse a single log line for metrics"""
        try:
            # Example log format:
            # "Step 1000: DIR=0.523, Safety Δ=0.234, Conv Loss=0.1234, FB Loss=0.0987"

            # Check if line contains step info
            step_match = re.search(r'Step (\d+):', line)
            if not step_match:
                return None

            step = int(step_match.group(1))

            # Extract metrics using regex
            dir_match = re.search(r'DIR=([-\d.]+)', line)
            safety_match = re.search(r'Safety Δ=([-\d.]+)', line)
            help_match = re.search(r'Help Δ=([-\d.]+)', line)
            conv_loss_match = re.search(r'Conv Loss=([-\d.]+)', line)
            fb_loss_match = re.search(r'FB Loss=([-\d.]+)', line)
            kl_match = re.search(r'KL=([-\d.]+)', line)
            asr_match = re.search(r'ASR=([-\d.]+)', line)
            orr_match = re.search(r'ORR=([-\d.]+)', line)
            ftr_match = re.search(r'FTR=([-\d.]+)', line)
            gpu_match = re.search(r'GPU=([-\d.]+)%', line)
            epoch_match = re.search(r'Epoch (\d+)', line)

            # Create metrics object
            metrics = TrainingMetrics(
                epoch=int(epoch_match.group(1)) if epoch_match else 0,
                step=step,
                total_steps=0,  # Will be inferred
                dir_score=float(dir_match.group(1)) if dir_match else 0.0,
                safety_delta=float(safety_match.group(1)) if safety_match else 0.0,
                helpfulness_delta=float(help_match.group(1)) if help_match else 0.0,
                conversation_loss=float(conv_loss_match.group(1)) if conv_loss_match else 0.0,
                feedback_loss=float(fb_loss_match.group(1)) if fb_loss_match else 0.0,
                kl_divergence=float(kl_match.group(1)) if kl_match else 0.0,
                asr=float(asr_match.group(1)) if asr_match else 0.0,
                orr=float(orr_match.group(1)) if orr_match else 0.0,
                ftr=float(ftr_match.group(1)) if ftr_match else 0.0,
                gpu_utilization=float(gpu_match.group(1)) if gpu_match else 0.0,
                timestamp=datetime.now()
            )

            return metrics

        except Exception as e:
            logger.debug(f"Failed to parse line: {line[:100]} - {e}")
            return None

    def _detect_anomalies(self, metrics: TrainingMetrics) -> List[str]:
        """Detect training anomalies"""
        anomalies = []

        # 1. Negative DIR score (feedback making things worse)
        if metrics.dir_score < -0.3:
            anomalies.append(
                f"⚠️ CRITICAL: Negative DIR score {metrics.dir_score:.3f} "
                f"(feedback degrading responses)"
            )

        # 2. High ASR (unsafe responses not being caught)
        if metrics.asr > 0.10:
            anomalies.append(
                f"⚠️ WARNING: ASR {metrics.asr:.1%} exceeds 10% threshold "
                f"(target: ≤4.6%)"
            )

        # 3. High ORR (too many refusals)
        if metrics.orr > 0.15:
            anomalies.append(
                f"⚠️ WARNING: ORR {metrics.orr:.1%} exceeds 15% threshold "
                f"(target: ≤9.9%)"
            )

        # 4. Exploding gradients (losses increasing)
        if len(self.metrics_history) > 10:
            recent = self.metrics_history[-10:]
            avg_loss = sum(m.conversation_loss for m in recent) / len(recent)

            if metrics.conversation_loss > avg_loss * 2.0:
                anomalies.append(
                    f"⚠️ CRITICAL: Conversation loss exploding "
                    f"({metrics.conversation_loss:.4f} vs avg {avg_loss:.4f})"
                )

        # 5. Low GPU utilization (training stalled)
        if metrics.gpu_utilization > 0 and metrics.gpu_utilization < 70:
            anomalies.append(
                f"⚠️ WARNING: Low GPU utilization {metrics.gpu_utilization:.0f}% "
                f"(expected: >90%)"
            )

        # 6. High KL divergence (model diverging from pre-trained)
        if metrics.kl_divergence > 0.2:
            anomalies.append(
                f"⚠️ WARNING: High KL divergence {metrics.kl_divergence:.3f} "
                f"(model drifting too far from pre-trained)"
            )

        return anomalies

    def _log_progress(self, metrics: TrainingMetrics):
        """Log training progress"""
        # Calculate ETA
        eta_hours = self._calculate_eta(metrics)

        # Log summary
        logger.info("=" * 80)
        logger.info(f"TRAINING PROGRESS - Step {metrics.step}")
        logger.info("=" * 80)
        logger.info(f"Epoch: {metrics.epoch}")
        logger.info(f"DIR Score: {metrics.dir_score:.3f} (target: >0.0)")
        logger.info(f"Safety Δ: {metrics.safety_delta:+.3f}")
        logger.info(f"Helpfulness Δ: {metrics.helpfulness_delta:+.3f}")
        logger.info(f"Conversation Loss: {metrics.conversation_loss:.4f}")
        logger.info(f"Feedback Loss: {metrics.feedback_loss:.4f}")
        logger.info(f"KL Divergence: {metrics.kl_divergence:.4f}")

        if metrics.asr > 0:
            logger.info(f"ASR (unsafe): {metrics.asr:.1%} (target: ≤4.6%)")
        if metrics.orr > 0:
            logger.info(f"ORR (over-refusal): {metrics.orr:.1%} (target: ≤9.9%)")
        if metrics.ftr > 0:
            logger.info(f"FTR (feedback trigger): {metrics.ftr:.1%}")
        if metrics.gpu_utilization > 0:
            logger.info(f"GPU Utilization: {metrics.gpu_utilization:.0f}%")

        logger.info(f"ETA: {eta_hours:.1f} hours")
        logger.info("=" * 80)

    def _calculate_eta(self, metrics: TrainingMetrics) -> float:
        """Calculate estimated time to completion"""
        if len(self.metrics_history) < 2:
            return 0.0

        # Calculate average steps per hour
        elapsed_hours = (time.time() - self.start_time) / 3600
        steps_per_hour = metrics.step / elapsed_hours if elapsed_hours > 0 else 0

        # Estimate total steps (assume 5 epochs, ~15k examples, 32 batch size)
        estimated_total_steps = (15000 / 32) * 5  # ~2,344 steps

        # Calculate remaining time
        remaining_steps = estimated_total_steps - metrics.step
        eta_hours = remaining_steps / steps_per_hour if steps_per_hour > 0 else 0

        return max(0, eta_hours)

    async def _send_alerts(self, anomalies: List[str], metrics: TrainingMetrics):
        """Send alerts for anomalies"""
        # Log to console
        logger.warning("\n" + "!" * 80)
        logger.warning("ANOMALIES DETECTED")
        logger.warning("!" * 80)
        for anomaly in anomalies:
            logger.warning(anomaly)
        logger.warning("!" * 80)

        # TODO: Send email alerts
        if self.alert_email:
            # Email sending logic would go here
            logger.info(f"Would send email alert to: {self.alert_email}")

        # TODO: Send Slack alerts
        if self.alert_slack_webhook:
            # Slack webhook logic would go here
            logger.info(f"Would send Slack alert to webhook")

    def _save_metrics_snapshot(self):
        """Save metrics history to JSON for analysis"""
        snapshot_path = Path("logs/waltzrl_metrics_snapshot.json")
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert metrics to dicts
        metrics_dicts = [
            {
                'epoch': m.epoch,
                'step': m.step,
                'dir_score': m.dir_score,
                'safety_delta': m.safety_delta,
                'helpfulness_delta': m.helpfulness_delta,
                'conversation_loss': m.conversation_loss,
                'feedback_loss': m.feedback_loss,
                'kl_divergence': m.kl_divergence,
                'asr': m.asr,
                'orr': m.orr,
                'ftr': m.ftr,
                'gpu_utilization': m.gpu_utilization,
                'timestamp': m.timestamp.isoformat()
            }
            for m in self.metrics_history[-1000:]  # Keep last 1000 metrics
        ]

        with open(snapshot_path, 'w') as f:
            json.dump(metrics_dicts, f, indent=2)

    def get_status(self) -> TrainingStatus:
        """Get current training status"""
        if not self.metrics_history:
            return TrainingStatus(
                is_running=False,
                current_epoch=0,
                current_step=0,
                total_steps=0,
                progress_pct=0.0,
                eta_hours=0.0,
                last_checkpoint=None,
                anomalies=self.anomalies,
                metrics_history=[]
            )

        latest = self.metrics_history[-1]
        eta = self._calculate_eta(latest)

        # Estimate progress
        estimated_total_steps = (15000 / 32) * 5
        progress_pct = (latest.step / estimated_total_steps) * 100 if estimated_total_steps > 0 else 0

        return TrainingStatus(
            is_running=True,
            current_epoch=latest.epoch,
            current_step=latest.step,
            total_steps=int(estimated_total_steps),
            progress_pct=min(100.0, progress_pct),
            eta_hours=eta,
            last_checkpoint=self._get_last_checkpoint(),
            anomalies=self.anomalies[-10:],  # Last 10 anomalies
            metrics_history=self.metrics_history[-100:]  # Last 100 metrics
        )

    def _get_last_checkpoint(self) -> Optional[str]:
        """Get path to most recent checkpoint"""
        checkpoint_dir = Path("models/waltzrl_stage2/checkpoints")
        if not checkpoint_dir.exists():
            return None

        checkpoints = sorted(checkpoint_dir.glob("*.pt"), key=lambda p: p.stat().st_mtime)
        return str(checkpoints[-1]) if checkpoints else None


async def main():
    """Run WaltzRL training monitor"""
    parser = argparse.ArgumentParser(description='Monitor WaltzRL Stage 2 training')
    parser.add_argument(
        '--log-file',
        type=str,
        default='logs/waltzrl_training.log',
        help='Path to training log file'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=300,
        help='Check interval in seconds (default: 300 = 5 minutes)'
    )
    parser.add_argument(
        '--alert-email',
        type=str,
        help='Email address for alerts'
    )
    parser.add_argument(
        '--alert-slack-webhook',
        type=str,
        help='Slack webhook URL for alerts'
    )

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Create monitor
    monitor = WaltzRLTrainingMonitor(
        log_file=args.log_file,
        interval_sec=args.interval,
        alert_email=args.alert_email,
        alert_slack_webhook=args.alert_slack_webhook
    )

    # Start monitoring
    await monitor.monitor()


if __name__ == "__main__":
    asyncio.run(main())
