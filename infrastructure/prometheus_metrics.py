"""
Prometheus Metrics - Metrics collection and export for Genesis.

Provides Prometheus-compatible metrics collection for:
- Agent performance tracking
- System health monitoring
- Business metrics
- Resource utilization
- SLA tracking

Exports metrics in Prometheus format for scraping and visualization.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set
from collections import defaultdict
from enum import Enum
import threading

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Prometheus metric types"""
    COUNTER = "counter"          # Monotonically increasing
    GAUGE = "gauge"              # Can go up or down
    HISTOGRAM = "histogram"      # Distribution of values
    SUMMARY = "summary"          # Similar to histogram


@dataclass
class Metric:
    """Single metric definition"""
    name: str
    metric_type: MetricType
    description: str
    labels: Dict[str, str] = field(default_factory=dict)
    value: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class HistogramBucket:
    """Histogram bucket"""
    le: float  # Less than or equal
    count: int = 0


class PrometheusMetrics:
    """
    Prometheus metrics collector for Genesis.

    Collects and exports metrics in Prometheus format.
    """

    def __init__(self, namespace: str = "genesis", enable_default_metrics: bool = True):
        """
        Initialize Prometheus metrics.

        Args:
            namespace: Metric namespace prefix
            enable_default_metrics: Enable default system metrics
        """
        self.namespace = namespace
        self.enable_default_metrics = enable_default_metrics

        # Metric storage
        self._counters: Dict[str, float] = defaultdict(float)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        self._summaries: Dict[str, List[float]] = defaultdict(list)

        # Metric metadata
        self._metric_info: Dict[str, Metric] = {}

        # Thread safety
        self._lock = threading.Lock()

        # Initialize default metrics
        if self.enable_default_metrics:
            self._init_default_metrics()

        logger.info(f"Prometheus metrics initialized (namespace={namespace})")

    def _init_default_metrics(self) -> None:
        """Initialize default Genesis metrics"""

        # Agent metrics
        self.register_counter(
            "agent_invocations_total",
            "Total number of agent invocations",
            labels={"agent": ""}
        )

        self.register_counter(
            "agent_errors_total",
            "Total number of agent errors",
            labels={"agent": "", "error_type": ""}
        )

        self.register_histogram(
            "agent_duration_seconds",
            "Agent execution duration in seconds",
            labels={"agent": ""}
        )

        # Business metrics
        self.register_counter(
            "businesses_created_total",
            "Total number of businesses created",
            labels={"type": ""}
        )

        self.register_gauge(
            "active_businesses",
            "Number of currently active businesses"
        )

        self.register_histogram(
            "business_score",
            "Business evaluation scores",
            labels={"business_id": ""}
        )

        # System metrics
        self.register_gauge(
            "system_health",
            "Overall system health score (0-100)"
        )

        self.register_counter(
            "api_requests_total",
            "Total API requests",
            labels={"endpoint": "", "method": "", "status": ""}
        )

        self.register_histogram(
            "api_latency_seconds",
            "API request latency",
            labels={"endpoint": ""}
        )

        # Resource metrics
        self.register_gauge(
            "llm_tokens_used",
            "Total LLM tokens used",
            labels={"model": ""}
        )

        self.register_counter(
            "cost_usd_total",
            "Total cost in USD",
            labels={"category": ""}
        )

        logger.info("Initialized default metrics")

    def register_counter(
        self,
        name: str,
        description: str,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Register a counter metric"""
        full_name = f"{self.namespace}_{name}"

        self._metric_info[full_name] = Metric(
            name=full_name,
            metric_type=MetricType.COUNTER,
            description=description,
            labels=labels or {}
        )

    def register_gauge(
        self,
        name: str,
        description: str,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Register a gauge metric"""
        full_name = f"{self.namespace}_{name}"

        self._metric_info[full_name] = Metric(
            name=full_name,
            metric_type=MetricType.GAUGE,
            description=description,
            labels=labels or {}
        )

    def register_histogram(
        self,
        name: str,
        description: str,
        labels: Optional[Dict[str, str]] = None,
        buckets: Optional[List[float]] = None
    ) -> None:
        """Register a histogram metric"""
        full_name = f"{self.namespace}_{name}"

        self._metric_info[full_name] = Metric(
            name=full_name,
            metric_type=MetricType.HISTOGRAM,
            description=description,
            labels=labels or {}
        )

    def inc_counter(self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment counter"""
        full_name = f"{self.namespace}_{name}"
        key = self._make_key(full_name, labels)

        with self._lock:
            self._counters[key] += value

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Set gauge value"""
        full_name = f"{self.namespace}_{name}"
        key = self._make_key(full_name, labels)

        with self._lock:
            self._gauges[key] = value

    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Add observation to histogram"""
        full_name = f"{self.namespace}_{name}"
        key = self._make_key(full_name, labels)

        with self._lock:
            self._histograms[key].append(value)

    def observe_summary(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Add observation to summary"""
        full_name = f"{self.namespace}_{name}"
        key = self._make_key(full_name, labels)

        with self._lock:
            self._summaries[key].append(value)

    def _make_key(self, name: str, labels: Optional[Dict[str, str]]) -> str:
        """Create metric key with labels"""
        if not labels:
            return name

        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def export_text(self) -> str:
        """
        Export metrics in Prometheus text format.

        Returns:
            Metrics in Prometheus format
        """
        lines = []

        with self._lock:
            # Export counters
            for key, value in sorted(self._counters.items()):
                name = key.split('{')[0]
                if name in self._metric_info:
                    metric = self._metric_info[name]
                    lines.append(f"# HELP {name} {metric.description}")
                    lines.append(f"# TYPE {name} counter")

                lines.append(f"{key} {value}")

            # Export gauges
            for key, value in sorted(self._gauges.items()):
                name = key.split('{')[0]
                if name in self._metric_info:
                    metric = self._metric_info[name]
                    lines.append(f"# HELP {name} {metric.description}")
                    lines.append(f"# TYPE {name} gauge")

                lines.append(f"{key} {value}")

            # Export histograms
            for key, values in sorted(self._histograms.items()):
                if not values:
                    continue

                name = key.split('{')[0]
                if name in self._metric_info:
                    metric = self._metric_info[name]
                    lines.append(f"# HELP {name} {metric.description}")
                    lines.append(f"# TYPE {name} histogram")

                # Calculate buckets
                buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
                cumulative = 0

                for bucket in buckets:
                    count = sum(1 for v in values if v <= bucket)
                    cumulative = count
                    bucket_key = key.replace('}', f',le="{bucket}"}}') if '{' in key else f'{key}{{le="{bucket}"}}'
                    lines.append(f"{name}_bucket{bucket_key[len(name):]} {cumulative}")

                # +Inf bucket
                inf_key = key.replace('}', ',le="+Inf"}') if '{' in key else f'{key}{{le="+Inf"}}'
                lines.append(f"{name}_bucket{inf_key[len(name):]} {len(values)}")

                # Sum and count
                lines.append(f"{name}_sum{key[len(name):]} {sum(values)}")
                lines.append(f"{name}_count{key[len(name):]} {len(values)}")

        return '\n'.join(lines)

    def get_metrics_dict(self) -> Dict[str, Any]:
        """Get metrics as dictionary"""
        with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {k: {"values": v, "count": len(v), "sum": sum(v)}
                               for k, v in self._histograms.items()},
                "summaries": {k: {"values": v, "count": len(v), "sum": sum(v)}
                              for k, v in self._summaries.items()}
            }

    def reset(self) -> None:
        """Reset all metrics"""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._summaries.clear()

        logger.info("Reset all metrics")


# Context manager for timing
class MetricTimer:
    """Context manager for timing operations"""

    def __init__(self, metrics: PrometheusMetrics, histogram_name: str, labels: Optional[Dict[str, str]] = None):
        """
        Initialize metric timer.

        Args:
            metrics: PrometheusMetrics instance
            histogram_name: Name of histogram to record duration
            labels: Optional labels
        """
        self.metrics = metrics
        self.histogram_name = histogram_name
        self.labels = labels
        self.start_time = None

    def __enter__(self):
        """Start timer"""
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop timer and record duration"""
        if self.start_time:
            duration = time.time() - self.start_time
            self.metrics.observe_histogram(self.histogram_name, duration, self.labels)


# Global instance
_prometheus_metrics = None


def get_prometheus_metrics() -> PrometheusMetrics:
    """
    Get global Prometheus metrics instance.

    Returns:
        PrometheusMetrics instance
    """
    global _prometheus_metrics
    if _prometheus_metrics is None:
        _prometheus_metrics = PrometheusMetrics()
    return _prometheus_metrics


def track_agent_invocation(agent_name: str, duration: float, success: bool = True) -> None:
    """
    Convenience function to track agent invocation.

    Args:
        agent_name: Name of agent
        duration: Execution duration in seconds
        success: Whether invocation succeeded
    """
    metrics = get_prometheus_metrics()

    metrics.inc_counter("agent_invocations_total", labels={"agent": agent_name})

    if not success:
        metrics.inc_counter("agent_errors_total", labels={"agent": agent_name, "error_type": "execution"})

    metrics.observe_histogram("agent_duration_seconds", duration, labels={"agent": agent_name})
