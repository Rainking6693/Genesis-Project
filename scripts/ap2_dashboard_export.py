"""
AP2 Dashboard Exporter
======================

CLI utility that dumps batch approval balances + circuit breaker states for
Grafana/PowerBI ingestion.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def build_dashboard_payload(ap2_service) -> Dict[str, Any]:
    batch_summary = ap2_service.batch_manager.get_summary() if ap2_service.batch_manager else {}
    circuit_summary = ap2_service.circuit_registry.summary()
    return {
        "batch_mandates": batch_summary,
        "circuit_breakers": {
            agent: {
                "state": metrics.state.value,
                "failure_count": metrics.failure_count,
                "last_failure": metrics.last_failure,
                "last_success": metrics.last_success,
            }
            for agent, metrics in circuit_summary.items()
        },
    }


def export_dashboard(ap2_service, output_path: Path) -> None:
    payload = build_dashboard_payload(ap2_service)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    import sys
    from pathlib import Path as _Path

    root = _Path(__file__).resolve().parents[1]
    sys.path.append(str(root))
    from infrastructure.ap2_service import AP2Service  # pylint: disable=C0413

    service = AP2Service()
    export_dashboard(service, _Path("artifacts/ap2_dashboard.json"))

