#!/usr/bin/env python3
"""
Monitor Multi-Agent Evolve + FP16 Training Metrics

Real-time monitoring script for production deployment of:
1. Multi-Agent Evolve co-evolution system
2. FP16 training acceleration

Tracks convergence rates, overflow rates, and alerts on anomalies.

Usage:
    python scripts/monitor_coevolution_fp16.py --interval 10 --alert-threshold 5.0
"""

import argparse
import asyncio
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure import get_logger

logger = get_logger("monitor_coevolution_fp16")

try:
    from prometheus_client import CollectorRegistry, Gauge, Counter, Histogram, push_to_gateway
    from prometheus_client.parser import text_string_to_metric_families
    import requests
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("Prometheus client not available - install with: pip install prometheus-client requests")


class CoEvolutionFP16Monitor:
    """Monitor Multi-Agent Evolve + FP16 training metrics"""
    
    def __init__(
        self,
        prometheus_url: str = "http://localhost:9090",
        alert_overflow_threshold: float = 5.0,
        alert_convergence_threshold: int = 10,
        check_interval: int = 10
    ):
        """
        Initialize monitoring system
        
        Args:
            prometheus_url: Prometheus server URL
            alert_overflow_threshold: Alert if overflow rate > this percentage
            alert_convergence_threshold: Alert if convergence not detected after N iterations
            check_interval: Check metrics every N seconds
        """
        self.prometheus_url = prometheus_url
        self.alert_overflow_threshold = alert_overflow_threshold
        self.alert_convergence_threshold = alert_convergence_threshold
        self.check_interval = check_interval
        
        self.last_check = datetime.now()
        self.alerts_sent = []
        
        logger.info(f"Monitor initialized: prometheus={prometheus_url}, overflow_threshold={alert_overflow_threshold}%, convergence_threshold={alert_convergence_threshold} iterations")
    
    async def check_multi_agent_evolve_metrics(self) -> Dict[str, Any]:
        """Query Multi-Agent Evolve metrics from Prometheus"""
        if not PROMETHEUS_AVAILABLE:
            return {}
        
        metrics = {}
        
        try:
            # Solver metrics
            solver_trajectories = self._query_prometheus("solver_trajectories_generated_total")
            solver_diversity = self._query_prometheus("solver_diversity_score")
            solver_feedback = self._query_prometheus("solver_feedback_incorporated_total")
            
            # Verifier metrics
            verifier_trajectories = self._query_prometheus("verifier_trajectories_verified_total")
            verifier_shortcuts = self._query_prometheus("verifier_shortcuts_detected_total")
            
            # Co-evolution metrics
            coevo_iterations = self._query_prometheus("coevolution_iterations_completed_total")
            coevo_convergence = self._query_prometheus("coevolution_convergence_detected_total")
            coevo_best_score = self._query_prometheus("coevolution_best_score")
            
            metrics = {
                "solver_trajectories_generated": solver_trajectories,
                "solver_diversity_score": solver_diversity,
                "solver_feedback_incorporated": solver_feedback,
                "verifier_trajectories_verified": verifier_trajectories,
                "verifier_shortcuts_detected": verifier_shortcuts,
                "coevolution_iterations": coevo_iterations,
                "coevolution_convergence_count": coevo_convergence,
                "coevolution_best_score": coevo_best_score,
            }
            
            # Check convergence
            if coevo_iterations and coevo_convergence is not None:
                if coevo_iterations > self.alert_convergence_threshold and coevo_convergence == 0:
                    self._send_alert(
                        "CONVERGENCE_SLOW",
                        f"No convergence detected after {coevo_iterations} iterations (threshold: {self.alert_convergence_threshold})"
                    )
            
            logger.info(f"[Multi-Agent Evolve] Iterations: {coevo_iterations}, Convergence: {coevo_convergence}, Best Score: {coevo_best_score:.3f}" if coevo_best_score else f"[Multi-Agent Evolve] Iterations: {coevo_iterations}, Convergence: {coevo_convergence}")
            
        except Exception as e:
            logger.error(f"Error querying Multi-Agent Evolve metrics: {e}")
        
        return metrics
    
    async def check_fp16_training_metrics(self) -> Dict[str, Any]:
        """Query FP16 training metrics from Prometheus"""
        if not PROMETHEUS_AVAILABLE:
            return {}
        
        metrics = {}
        
        try:
            # FP16 metrics
            training_steps = self._query_prometheus("fp16_training_steps_total")
            overflow_steps = self._query_prometheus("fp16_overflow_steps_total")
            gradient_scale = self._query_prometheus("fp16_gradient_scale")
            training_speedup = self._query_prometheus("fp16_training_speedup")
            
            # Calculate overflow rate
            overflow_rate = 0.0
            if training_steps and overflow_steps:
                overflow_rate = (overflow_steps / training_steps) * 100
            
            metrics = {
                "training_steps": training_steps,
                "overflow_steps": overflow_steps,
                "overflow_rate": overflow_rate,
                "gradient_scale": gradient_scale,
                "training_speedup": training_speedup,
            }
            
            # Check overflow rate
            if overflow_rate > self.alert_overflow_threshold:
                self._send_alert(
                    "FP16_OVERFLOW_HIGH",
                    f"FP16 overflow rate is {overflow_rate:.2f}% (threshold: {self.alert_overflow_threshold}%). Consider reducing loss scale."
                )
            
            logger.info(f"[FP16 Training] Steps: {training_steps}, Overflow: {overflow_rate:.2f}%, Scale: {gradient_scale:.0f}, Speedup: {training_speedup:.2f}x" if training_speedup else f"[FP16 Training] Steps: {training_steps}, Overflow: {overflow_rate:.2f}%, Scale: {gradient_scale:.0f}" if gradient_scale else f"[FP16 Training] Steps: {training_steps}, Overflow: {overflow_rate:.2f}%")
            
        except Exception as e:
            logger.error(f"Error querying FP16 training metrics: {e}")
        
        return metrics
    
    def _query_prometheus(self, metric_name: str) -> Optional[float]:
        """Query single metric from Prometheus"""
        try:
            query_url = f"{self.prometheus_url}/api/v1/query"
            params = {"query": metric_name}
            
            response = requests.get(query_url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            if data["status"] == "success" and data["data"]["result"]:
                # Return latest value
                result = data["data"]["result"][0]
                value = float(result["value"][1])
                return value
            
            return None
            
        except Exception as e:
            logger.debug(f"Error querying metric {metric_name}: {e}")
            return None
    
    def _send_alert(self, alert_type: str, message: str):
        """Send alert (log + prevent duplicates)"""
        alert_key = f"{alert_type}_{datetime.now().strftime('%Y%m%d_%H')}"
        
        if alert_key not in self.alerts_sent:
            logger.warning(f"🚨 ALERT [{alert_type}]: {message}")
            self.alerts_sent.append(alert_key)
            
            # Keep only last 100 alerts
            if len(self.alerts_sent) > 100:
                self.alerts_sent = self.alerts_sent[-100:]
    
    async def run_monitoring_loop(self):
        """Main monitoring loop"""
        logger.info("Starting monitoring loop...")
        
        while True:
            try:
                logger.info(f"\n{'='*80}")
                logger.info(f"Monitoring Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"{'='*80}")
                
                # Check Multi-Agent Evolve metrics
                mae_metrics = await self.check_multi_agent_evolve_metrics()
                
                # Check FP16 training metrics
                fp16_metrics = await self.check_fp16_training_metrics()
                
                # Summary
                if mae_metrics or fp16_metrics:
                    logger.info("\n📊 Summary:")
                    if mae_metrics:
                        logger.info(f"   Multi-Agent Evolve: {mae_metrics.get('coevolution_iterations', 0)} iterations, {mae_metrics.get('coevolution_convergence_count', 0)} convergences")
                    if fp16_metrics:
                        logger.info(f"   FP16 Training: {fp16_metrics.get('training_steps', 0)} steps, {fp16_metrics.get('overflow_rate', 0):.2f}% overflow rate")
                else:
                    logger.warning("   No metrics available (Prometheus may not be running or no training active)")
                
                # Wait for next check
                await asyncio.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                logger.info("\nMonitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Monitor Multi-Agent Evolve + FP16 Training")
    parser.add_argument(
        "--prometheus-url",
        type=str,
        default="http://localhost:9090",
        help="Prometheus server URL"
    )
    parser.add_argument(
        "--alert-overflow-threshold",
        type=float,
        default=5.0,
        help="Alert if FP16 overflow rate exceeds this percentage (default: 5.0)"
    )
    parser.add_argument(
        "--alert-convergence-threshold",
        type=int,
        default=10,
        help="Alert if no convergence detected after N iterations (default: 10)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=10,
        help="Check metrics every N seconds (default: 10)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    if not PROMETHEUS_AVAILABLE:
        logger.error("Prometheus client not available. Install with: pip install prometheus-client requests")
        sys.exit(1)
    
    # Initialize monitor
    monitor = CoEvolutionFP16Monitor(
        prometheus_url=args.prometheus_url,
        alert_overflow_threshold=args.alert_overflow_threshold,
        alert_convergence_threshold=args.alert_convergence_threshold,
        check_interval=args.interval
    )
    
    # Run monitoring loop
    try:
        asyncio.run(monitor.run_monitoring_loop())
    except KeyboardInterrupt:
        logger.info("Monitoring stopped")


if __name__ == "__main__":
    main()

