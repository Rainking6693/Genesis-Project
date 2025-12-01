"""
Grafana Dashboard Integration - Dashboard generation and management.

Provides programmatic Grafana dashboard creation for Genesis monitoring:
- Dashboard templates for common metrics
- Panel generation (graphs, gauges, tables)
- Alert rule configuration
- Dashboard provisioning
- Snapshot creation

Integrates with Prometheus metrics for complete observability stack.
"""

import json
import logging
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class PanelType(Enum):
    """Grafana panel types"""
    GRAPH = "graph"
    STAT = "stat"
    GAUGE = "gauge"
    TABLE = "table"
    HEATMAP = "heatmap"
    TIMESERIES = "timeseries"


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Target:
    """Prometheus query target"""
    expr: str
    legendFormat: str = ""
    refId: str = "A"
    interval: str = ""


@dataclass
class Panel:
    """Grafana panel definition"""
    id: int
    title: str
    type: str
    gridPos: Dict[str, int]
    targets: List[Target]
    description: str = ""
    transparent: bool = False
    options: Dict[str, Any] = field(default_factory=dict)
    fieldConfig: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    condition: str
    frequency: str
    for_duration: str
    severity: AlertSeverity
    message: str
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class Dashboard:
    """Grafana dashboard definition"""
    uid: str
    title: str
    tags: List[str]
    panels: List[Panel]
    timezone: str = "browser"
    refresh: str = "30s"
    time_from: str = "now-6h"
    time_to: str = "now"
    editable: bool = True
    version: int = 1

    def to_json(self) -> str:
        """Convert dashboard to Grafana JSON format"""
        dashboard_dict = {
            "uid": self.uid,
            "title": self.title,
            "tags": self.tags,
            "timezone": self.timezone,
            "editable": self.editable,
            "refresh": self.refresh,
            "time": {
                "from": self.time_from,
                "to": self.time_to
            },
            "panels": [self._panel_to_dict(p) for p in self.panels],
            "version": self.version,
            "schemaVersion": 36
        }

        return json.dumps({"dashboard": dashboard_dict}, indent=2)

    def _panel_to_dict(self, panel: Panel) -> Dict[str, Any]:
        """Convert panel to dictionary"""
        return {
            "id": panel.id,
            "title": panel.title,
            "type": panel.type,
            "gridPos": panel.gridPos,
            "targets": [asdict(t) for t in panel.targets],
            "description": panel.description,
            "transparent": panel.transparent,
            "options": panel.options,
            "fieldConfig": panel.fieldConfig
        }


class GrafanaDashboardGenerator:
    """
    Grafana dashboard generator for Genesis metrics.

    Creates dashboards with pre-configured panels for common monitoring scenarios.
    """

    def __init__(self, datasource: str = "Prometheus"):
        """
        Initialize dashboard generator.

        Args:
            datasource: Prometheus datasource name
        """
        self.datasource = datasource
        self.panel_id_counter = 1

        logger.info(f"Grafana dashboard generator initialized (datasource={datasource})")

    def _get_next_panel_id(self) -> int:
        """Get next panel ID"""
        panel_id = self.panel_id_counter
        self.panel_id_counter += 1
        return panel_id

    def create_genesis_overview_dashboard(self) -> Dashboard:
        """Create Genesis overview dashboard"""
        panels = []

        # Row 1: System Health
        panels.append(self._create_stat_panel(
            title="System Health",
            query="genesis_system_health",
            grid_pos={"x": 0, "y": 0, "w": 6, "h": 4},
            unit="percent"
        ))

        panels.append(self._create_stat_panel(
            title="Active Businesses",
            query="genesis_active_businesses",
            grid_pos={"x": 6, "y": 0, "w": 6, "h": 4},
            unit="short"
        ))

        panels.append(self._create_stat_panel(
            title="Total Businesses Created",
            query="genesis_businesses_created_total",
            grid_pos={"x": 12, "y": 0, "w": 6, "h": 4},
            unit="short"
        ))

        panels.append(self._create_stat_panel(
            title="Total Cost (USD)",
            query="genesis_cost_usd_total",
            grid_pos={"x": 18, "y": 0, "w": 6, "h": 4},
            unit="currencyUSD"
        ))

        # Row 2: Agent Performance
        panels.append(self._create_timeseries_panel(
            title="Agent Invocations",
            query='rate(genesis_agent_invocations_total[5m])',
            legend_format="{{agent}}",
            grid_pos={"x": 0, "y": 4, "w": 12, "h": 8}
        ))

        panels.append(self._create_timeseries_panel(
            title="Agent Errors",
            query='rate(genesis_agent_errors_total[5m])',
            legend_format="{{agent}}",
            grid_pos={"x": 12, "y": 4, "w": 12, "h": 8}
        ))

        # Row 3: Latency
        panels.append(self._create_timeseries_panel(
            title="Agent Duration (P95)",
            query='histogram_quantile(0.95, rate(genesis_agent_duration_seconds_bucket[5m]))',
            legend_format="{{agent}}",
            grid_pos={"x": 0, "y": 12, "w": 12, "h": 8},
            unit="s"
        ))

        panels.append(self._create_timeseries_panel(
            title="API Latency (P95)",
            query='histogram_quantile(0.95, rate(genesis_api_latency_seconds_bucket[5m]))',
            legend_format="{{endpoint}}",
            grid_pos={"x": 12, "y": 12, "w": 12, "h": 8},
            unit="s"
        ))

        # Row 4: Business Metrics
        panels.append(self._create_timeseries_panel(
            title="Businesses Created Rate",
            query='rate(genesis_businesses_created_total[5m])',
            legend_format="{{type}}",
            grid_pos={"x": 0, "y": 20, "w": 12, "h": 8}
        ))

        panels.append(self._create_gauge_panel(
            title="Average Business Score",
            query='avg(genesis_business_score)',
            grid_pos={"x": 12, "y": 20, "w": 12, "h": 8},
            min_value=0,
            max_value=100
        ))

        dashboard = Dashboard(
            uid="genesis-overview",
            title="Genesis Overview",
            tags=["genesis", "overview"],
            panels=panels
        )

        logger.info("Created Genesis overview dashboard")

        return dashboard

    def create_agent_dashboard(self, agent_name: str) -> Dashboard:
        """Create dashboard for specific agent"""
        panels = []

        # Agent metrics
        panels.append(self._create_stat_panel(
            title=f"{agent_name} Invocations",
            query=f'genesis_agent_invocations_total{{agent="{agent_name}"}}',
            grid_pos={"x": 0, "y": 0, "w": 8, "h": 4}
        ))

        panels.append(self._create_stat_panel(
            title=f"{agent_name} Errors",
            query=f'genesis_agent_errors_total{{agent="{agent_name}"}}',
            grid_pos={"x": 8, "y": 0, "w": 8, "h": 4}
        ))

        panels.append(self._create_stat_panel(
            title=f"{agent_name} Error Rate",
            query=f'rate(genesis_agent_errors_total{{agent="{agent_name}"}}[5m]) / rate(genesis_agent_invocations_total{{agent="{agent_name}"}}[5m])',
            grid_pos={"x": 16, "y": 0, "w": 8, "h": 4},
            unit="percentunit"
        ))

        panels.append(self._create_timeseries_panel(
            title=f"{agent_name} Duration",
            query=f'genesis_agent_duration_seconds{{agent="{agent_name}"}}',
            legend_format="Duration",
            grid_pos={"x": 0, "y": 4, "w": 24, "h": 8},
            unit="s"
        ))

        dashboard = Dashboard(
            uid=f"genesis-agent-{agent_name.lower().replace('_', '-')}",
            title=f"Genesis Agent: {agent_name}",
            tags=["genesis", "agent", agent_name],
            panels=panels
        )

        logger.info(f"Created dashboard for agent: {agent_name}")

        return dashboard

    def _create_stat_panel(
        self,
        title: str,
        query: str,
        grid_pos: Dict[str, int],
        unit: str = "short"
    ) -> Panel:
        """Create stat panel"""
        panel = Panel(
            id=self._get_next_panel_id(),
            title=title,
            type="stat",
            gridPos=grid_pos,
            targets=[Target(expr=query, refId="A")],
            options={
                "reduceOptions": {
                    "values": False,
                    "calcs": ["lastNotNull"]
                },
                "orientation": "auto",
                "textMode": "auto",
                "colorMode": "value"
            },
            fieldConfig={
                "defaults": {
                    "unit": unit,
                    "mappings": []
                }
            }
        )

        return panel

    def _create_timeseries_panel(
        self,
        title: str,
        query: str,
        legend_format: str,
        grid_pos: Dict[str, int],
        unit: str = "short"
    ) -> Panel:
        """Create timeseries panel"""
        panel = Panel(
            id=self._get_next_panel_id(),
            title=title,
            type="timeseries",
            gridPos=grid_pos,
            targets=[Target(expr=query, legendFormat=legend_format, refId="A")],
            options={
                "legend": {
                    "displayMode": "list",
                    "placement": "bottom"
                },
                "tooltip": {
                    "mode": "single"
                }
            },
            fieldConfig={
                "defaults": {
                    "unit": unit,
                    "custom": {
                        "drawStyle": "line",
                        "lineInterpolation": "linear",
                        "fillOpacity": 10
                    }
                }
            }
        )

        return panel

    def _create_gauge_panel(
        self,
        title: str,
        query: str,
        grid_pos: Dict[str, int],
        min_value: float = 0,
        max_value: float = 100
    ) -> Panel:
        """Create gauge panel"""
        panel = Panel(
            id=self._get_next_panel_id(),
            title=title,
            type="gauge",
            gridPos=grid_pos,
            targets=[Target(expr=query, refId="A")],
            options={
                "reduceOptions": {
                    "values": False,
                    "calcs": ["lastNotNull"]
                },
                "showThresholdLabels": False,
                "showThresholdMarkers": True
            },
            fieldConfig={
                "defaults": {
                    "min": min_value,
                    "max": max_value,
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"value": min_value, "color": "red"},
                            {"value": (max_value - min_value) * 0.5, "color": "yellow"},
                            {"value": (max_value - min_value) * 0.8, "color": "green"}
                        ]
                    }
                }
            }
        )

        return panel

    def export_dashboard(self, dashboard: Dashboard, filepath: str) -> None:
        """Export dashboard to JSON file"""
        with open(filepath, 'w') as f:
            f.write(dashboard.to_json())

        logger.info(f"Exported dashboard to {filepath}")


# Global instance
_grafana_generator = None


def get_grafana_generator() -> GrafanaDashboardGenerator:
    """
    Get global Grafana dashboard generator.

    Returns:
        GrafanaDashboardGenerator instance
    """
    global _grafana_generator
    if _grafana_generator is None:
        _grafana_generator = GrafanaDashboardGenerator()
    return _grafana_generator


def create_default_dashboards(output_dir: str = "dashboards") -> List[str]:
    """
    Create default Genesis dashboards.

    Args:
        output_dir: Output directory for dashboard files

    Returns:
        List of created dashboard file paths
    """
    import os
    os.makedirs(output_dir, exist_ok=True)

    generator = get_grafana_generator()
    created_files = []

    # Overview dashboard
    overview = generator.create_genesis_overview_dashboard()
    overview_path = os.path.join(output_dir, "genesis_overview.json")
    generator.export_dashboard(overview, overview_path)
    created_files.append(overview_path)

    # Agent dashboards
    common_agents = [
        "builder_agent",
        "deploy_agent",
        "marketing_agent",
        "security_agent"
    ]

    for agent in common_agents:
        dashboard = generator.create_agent_dashboard(agent)
        filepath = os.path.join(output_dir, f"genesis_agent_{agent}.json")
        generator.export_dashboard(dashboard, filepath)
        created_files.append(filepath)

    logger.info(f"Created {len(created_files)} default dashboards")

    return created_files
