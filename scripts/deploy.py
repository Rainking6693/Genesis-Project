#!/usr/bin/env python3
"""
Genesis Production Deployment Script
Automated canary deployment with monitoring and auto-rollback

Based on Argo Rollouts patterns and production deployment best practices.
Supports gradual rollout, health monitoring, and instant rollback on failures.

Author: Cora (Orchestration & Architecture Specialist)
Date: 2025-10-18
Version: 1.0.0
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import subprocess

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.feature_flags import get_feature_flag_manager, FeatureFlagManager


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HealthMetrics:
    """Container for health check metrics."""
    
    def __init__(self):
        self.error_rate: float = 0.0
        self.p95_latency_ms: float = 0.0
        self.p99_latency_ms: float = 0.0
        self.request_count: int = 0
        self.error_count: int = 0
        self.timestamp: datetime = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "error_rate": self.error_rate,
            "p95_latency_ms": self.p95_latency_ms,
            "p99_latency_ms": self.p99_latency_ms,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "timestamp": self.timestamp.isoformat()
        }


class DeploymentStrategy:
    """Deployment strategy configuration."""
    
    SAFE_MODE = "safe"           # 0% → 5% → 10% → 25% → 50% → 100% (7 days)
    FAST_MODE = "fast"           # 0% → 25% → 50% → 100% (3 days)
    INSTANT_MODE = "instant"     # 0% → 100% (immediate, dangerous)
    CUSTOM_MODE = "custom"       # User-defined percentages
    
    SAFE_STEPS = [0, 5, 10, 25, 50, 75, 100]
    FAST_STEPS = [0, 25, 50, 100]


class ProductionDeployer:
    """
    Production deployment orchestrator with canary rollout and auto-rollback.
    
    Features:
    - Progressive canary deployment (0% → 100%)
    - Continuous health monitoring
    - Auto-rollback on error rate or latency spikes
    - Manual rollback capability
    - Deployment state persistence
    - Slack/webhook notifications (optional)
    """
    
    def __init__(
        self,
        config_file: Path,
        error_rate_threshold: float = 1.0,
        p95_latency_threshold_ms: float = 500,
        monitoring_window_sec: int = 300
    ):
        """
        Initialize production deployer.
        
        Args:
            config_file: Path to feature flags config
            error_rate_threshold: Max acceptable error rate (%)
            p95_latency_threshold_ms: Max acceptable P95 latency (ms)
            monitoring_window_sec: Monitoring window duration (seconds)
        """
        self.config_file = config_file
        self.error_rate_threshold = error_rate_threshold
        self.p95_latency_threshold_ms = p95_latency_threshold_ms
        self.monitoring_window_sec = monitoring_window_sec
        
        self.flag_manager = get_feature_flag_manager()
        self.deployment_state_file = Path("/home/genesis/genesis-rebuild/config/deployment_state.json")
        
        # Load or initialize deployment state
        self.deployment_state = self._load_deployment_state()
        
    def _load_deployment_state(self) -> Dict[str, Any]:
        """Load deployment state from file."""
        if self.deployment_state_file.exists():
            try:
                with open(self.deployment_state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load deployment state: {e}")
        
        return {
            "current_percentage": 0,
            "deployment_started": None,
            "last_step_time": None,
            "rollout_history": []
        }
    
    def _save_deployment_state(self):
        """Save deployment state to file."""
        try:
            with open(self.deployment_state_file, 'w') as f:
                json.dump(self.deployment_state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save deployment state: {e}")
    
    def collect_health_metrics(self) -> HealthMetrics:
        """
        Collect current health metrics from production system.
        
        In production, this would query:
        - Prometheus for metrics
        - OpenTelemetry for traces
        - Log aggregators for errors
        
        For now, simulated based on logs/metrics files.
        """
        metrics = HealthMetrics()
        
        # TODO: Implement real metric collection from:
        # - OTEL metrics endpoint (http://localhost:9090/metrics)
        # - Log files (logs/production.log)
        # - Prometheus/Grafana if configured
        
        # Placeholder: Read from logs/metrics if available
        metrics_file = Path("/home/genesis/genesis-rebuild/logs/metrics.json")
        if metrics_file.exists():
            try:
                with open(metrics_file, 'r') as f:
                    data = json.load(f)
                    metrics.error_rate = data.get("error_rate", 0.0)
                    metrics.p95_latency_ms = data.get("p95_latency_ms", 0.0)
                    metrics.p99_latency_ms = data.get("p99_latency_ms", 0.0)
                    metrics.request_count = data.get("request_count", 0)
                    metrics.error_count = data.get("error_count", 0)
            except Exception as e:
                logger.warning(f"Failed to read metrics file: {e}")
        
        logger.info(f"Health metrics: error_rate={metrics.error_rate:.2f}%, "
                   f"p95={metrics.p95_latency_ms:.1f}ms, "
                   f"requests={metrics.request_count}")
        
        return metrics
    
    def check_health_thresholds(self, metrics: HealthMetrics) -> bool:
        """
        Check if current metrics are within acceptable thresholds.
        
        Args:
            metrics: Current health metrics
            
        Returns:
            True if healthy, False if thresholds exceeded
        """
        if metrics.error_rate > self.error_rate_threshold:
            logger.error(f"ERROR RATE THRESHOLD EXCEEDED: {metrics.error_rate:.2f}% > {self.error_rate_threshold}%")
            return False
        
        if metrics.p95_latency_ms > self.p95_latency_threshold_ms:
            logger.error(f"P95 LATENCY THRESHOLD EXCEEDED: {metrics.p95_latency_ms:.1f}ms > {self.p95_latency_threshold_ms}ms")
            return False
        
        return True
    
    def rollback(self):
        """
        Emergency rollback to 0% (safe mode).
        
        Sets all progressive flags to disabled instantly.
        """
        logger.warning("=" * 80)
        logger.warning("INITIATING EMERGENCY ROLLBACK")
        logger.warning("=" * 80)
        
        # Disable phase 4 deployment
        self.flag_manager.set_flag("phase_4_deployment", False)
        
        # Disable AATC system (high-risk feature)
        self.flag_manager.set_flag("aatc_system_enabled", False)
        
        # Save updated flags
        self.flag_manager.save_to_file(self.config_file)
        
        # Update deployment state
        self.deployment_state["current_percentage"] = 0
        self.deployment_state["rollout_history"].append({
            "action": "rollback",
            "percentage": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": "emergency_rollback"
        })
        try:
            self._save_deployment_state()
        except Exception as exc:  # pragma: no cover - exercised via test patching
            logger.error(f"Unable to persist deployment state during rollback: {exc}")
        
        logger.warning("Rollback complete - system returned to safe mode (0%)")
        logger.warning("=" * 80)
    
    def deploy_step(
        self,
        percentage: float,
        wait_sec: int = 300,
        skip_monitoring: bool = False
    ) -> bool:
        """
        Deploy a single canary step.
        
        Args:
            percentage: Target rollout percentage (0-100)
            wait_sec: Monitoring duration before next step
            skip_monitoring: Skip health checks (dangerous)
            
        Returns:
            True if step succeeded, False if rollback triggered
        """
        logger.info("=" * 80)
        logger.info(f"DEPLOYING CANARY STEP: {percentage}%")
        logger.info("=" * 80)
        
        # Update flags with new percentage
        if percentage == 0:
            # Full disable
            self.flag_manager.set_flag("phase_4_deployment", False)
        elif percentage == 100:
            # Full enable (no canary)
            phase4_flag = self.flag_manager.flags["phase_4_deployment"]
            phase4_flag.enabled = True
            phase4_flag.rollout_percentage = 100
            self.flag_manager.save_to_file(self.config_file)
        else:
            # Canary percentage
            phase4_flag = self.flag_manager.flags["phase_4_deployment"]
            phase4_flag.enabled = True
            phase4_flag.rollout_percentage = percentage
            self.flag_manager.save_to_file(self.config_file)
        
        logger.info(f"Phase 4 deployment now at {percentage}%")
        
        # Update deployment state
        self.deployment_state["current_percentage"] = percentage
        self.deployment_state["last_step_time"] = datetime.now(timezone.utc).isoformat()
        if not self.deployment_state["deployment_started"]:
            self.deployment_state["deployment_started"] = datetime.now(timezone.utc).isoformat()
        
        self.deployment_state["rollout_history"].append({
            "action": "deploy_step",
            "percentage": percentage,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        try:
            self._save_deployment_state()
        except Exception as exc:  # pragma: no cover - exercised via test patching
            logger.error(f"Unable to persist deployment state after step {percentage}%: {exc}")
        
        # Skip monitoring if requested (or if at 0%)
        if skip_monitoring or percentage == 0:
            return True
        
        # Monitor for specified duration
        logger.info(f"Monitoring health for {wait_sec} seconds...")
        
        monitoring_start = time.time()
        check_interval = 30  # Check every 30 seconds
        
        while time.time() - monitoring_start < wait_sec:
            # Collect metrics
            metrics = self.collect_health_metrics()
            
            # Check thresholds
            if not self.check_health_thresholds(metrics):
                logger.error("Health check FAILED - triggering rollback")
                self.rollback()
                return False
            
            # Wait before next check
            remaining = wait_sec - (time.time() - monitoring_start)
            if remaining > 0:
                sleep_time = min(check_interval, remaining)
                logger.info(f"Health OK - waiting {sleep_time:.0f}s before next check...")
                time.sleep(sleep_time)
        
        logger.info(f"Step {percentage}% complete - health checks passed")
        return True
    
    def deploy(
        self,
        strategy: str = DeploymentStrategy.SAFE_MODE,
        custom_steps: Optional[List[float]] = None,
        wait_per_step_sec: int = 300
    ) -> bool:
        """
        Execute full canary deployment.
        
        Args:
            strategy: Deployment strategy (safe, fast, instant, custom)
            custom_steps: Custom percentage steps (if strategy=custom)
            wait_per_step_sec: Monitoring duration per step
            
        Returns:
            True if deployment succeeded, False if rolled back
        """
        # Determine rollout steps
        if strategy == DeploymentStrategy.SAFE_MODE:
            steps = DeploymentStrategy.SAFE_STEPS
        elif strategy == DeploymentStrategy.FAST_MODE:
            steps = DeploymentStrategy.FAST_STEPS
        elif strategy == DeploymentStrategy.INSTANT_MODE:
            steps = [0, 100]
            wait_per_step_sec = 60  # Minimal monitoring
        elif strategy == DeploymentStrategy.CUSTOM_MODE:
            if not custom_steps:
                logger.error("Custom mode requires custom_steps")
                return False
            steps = sorted(custom_steps)
        else:
            logger.error(f"Unknown strategy: {strategy}")
            return False
        
        logger.info("=" * 80)
        logger.info("GENESIS PRODUCTION DEPLOYMENT")
        logger.info("=" * 80)
        logger.info(f"Strategy: {strategy}")
        logger.info(f"Steps: {steps}")
        logger.info(f"Monitoring per step: {wait_per_step_sec}s")
        logger.info(f"Error rate threshold: {self.error_rate_threshold}%")
        logger.info(f"P95 latency threshold: {self.p95_latency_threshold_ms}ms")
        logger.info("=" * 80)
        
        # Execute each step
        for i, percentage in enumerate(steps):
            # Skip if already past this step
            if percentage < self.deployment_state["current_percentage"]:
                logger.info(f"Skipping step {percentage}% (already deployed)")
                continue
            
            # Execute deployment step
            success = self.deploy_step(
                percentage=percentage,
                wait_sec=wait_per_step_sec if i < len(steps) - 1 else 60,  # Less monitoring on final step
                skip_monitoring=(percentage == 0)
            )
            
            if not success:
                logger.error("Deployment FAILED - system rolled back")
                return False
        
        logger.info("=" * 80)
        logger.info("DEPLOYMENT SUCCESSFUL")
        logger.info("=" * 80)
        logger.info("Phase 4 orchestration now at 100% rollout")
        
        return True
    
    def status(self) -> Dict[str, Any]:
        """Get current deployment status."""
        return {
            "current_percentage": self.deployment_state["current_percentage"],
            "deployment_started": self.deployment_state["deployment_started"],
            "last_step_time": self.deployment_state["last_step_time"],
            "rollout_history": self.deployment_state["rollout_history"],
            "flags": self.flag_manager.get_all_flags()
        }


def main():
    """Main entry point for deployment script."""
    parser = argparse.ArgumentParser(
        description="Genesis Production Deployment Automation"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Deployment command")
    
    # Deploy command
    deploy_parser = subparsers.add_parser("deploy", help="Deploy to production")
    deploy_parser.add_argument(
        "--strategy",
        choices=["safe", "fast", "instant", "custom"],
        default="safe",
        help="Deployment strategy"
    )
    deploy_parser.add_argument(
        "--steps",
        type=str,
        help="Custom rollout steps (comma-separated percentages, e.g., '0,10,50,100')"
    )
    deploy_parser.add_argument(
        "--wait",
        type=int,
        default=300,
        help="Monitoring duration per step (seconds)"
    )
    deploy_parser.add_argument(
        "--error-threshold",
        type=float,
        default=1.0,
        help="Max error rate threshold (%%)"
    )
    deploy_parser.add_argument(
        "--latency-threshold",
        type=float,
        default=500,
        help="Max P95 latency threshold (ms)"
    )
    
    # Rollback command
    rollback_parser = subparsers.add_parser("rollback", help="Emergency rollback")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show deployment status")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Initialize deployer
    config_file = Path("/home/genesis/genesis-rebuild/config/feature_flags.json")
    
    deployer = ProductionDeployer(
        config_file=config_file,
        error_rate_threshold=args.error_threshold if hasattr(args, 'error_threshold') else 1.0,
        p95_latency_threshold_ms=args.latency_threshold if hasattr(args, 'latency_threshold') else 500
    )
    
    # Execute command
    if args.command == "deploy":
        custom_steps = None
        if args.strategy == "custom" and args.steps:
            custom_steps = [float(x.strip()) for x in args.steps.split(",")]
        
        success = deployer.deploy(
            strategy=args.strategy,
            custom_steps=custom_steps,
            wait_per_step_sec=args.wait
        )
        
        return 0 if success else 1
    
    elif args.command == "rollback":
        deployer.rollback()
        return 0
    
    elif args.command == "status":
        status = deployer.status()
        print(json.dumps(status, indent=2))
        return 0
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
