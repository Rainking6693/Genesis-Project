"""
Health Check HTTP Server for Genesis Autonomous Scheduler
==========================================================

Provides HTTP endpoints for monitoring the autonomous scheduler worker process.
Useful for deployment platforms that require HTTP health checks (Railway, Render, Fly.io).

ENDPOINTS:
- GET /health - Overall health status
- GET /heartbeat - Last heartbeat from scheduler
- GET /metrics - Prometheus-compatible metrics

DEPLOYMENT:
This can run as a separate web service alongside the worker process.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse, PlainTextResponse
import uvicorn

app = FastAPI(title="Genesis Scheduler Health Check", version="1.0.0")

HEARTBEAT_FILE = Path("/tmp/genesis_scheduler_heartbeat.json")


def read_heartbeat() -> Dict[str, Any]:
    """Read the heartbeat file from the scheduler."""
    if not HEARTBEAT_FILE.exists():
        return {
            "status": "unknown",
            "message": "Heartbeat file not found - scheduler may not be running"
        }

    try:
        heartbeat_data = json.loads(HEARTBEAT_FILE.read_text())

        # Check if heartbeat is stale (>15 minutes old)
        heartbeat_time = datetime.fromisoformat(heartbeat_data["timestamp"])
        now = datetime.utcnow()
        age_seconds = (now - heartbeat_time).total_seconds()

        if age_seconds > 900:  # 15 minutes
            heartbeat_data["status"] = "stale"
            heartbeat_data["message"] = f"Heartbeat is {age_seconds:.0f} seconds old"

        heartbeat_data["age_seconds"] = age_seconds
        return heartbeat_data

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to read heartbeat: {str(e)}"
        }


@app.get("/")
async def root():
    """Root endpoint - redirects to health."""
    return {"message": "Genesis Autonomous Scheduler Health Check API", "endpoints": ["/health", "/heartbeat", "/metrics"]}


@app.get("/health")
async def health_check():
    """
    Health check endpoint for deployment platforms.
    Returns 200 if scheduler is healthy, 503 if unhealthy.
    """
    heartbeat = read_heartbeat()

    # Determine health status
    is_healthy = heartbeat.get("status") == "running"
    status_code = 200 if is_healthy else 503

    return JSONResponse(
        content={
            "status": "healthy" if is_healthy else "unhealthy",
            "scheduler": heartbeat,
            "timestamp": datetime.utcnow().isoformat()
        },
        status_code=status_code
    )


@app.get("/heartbeat")
async def get_heartbeat():
    """Get the latest heartbeat from the scheduler."""
    heartbeat = read_heartbeat()
    return JSONResponse(content=heartbeat)


@app.get("/metrics")
async def metrics():
    """
    Prometheus-compatible metrics endpoint.
    Exports scheduler statistics in Prometheus format.
    """
    heartbeat = read_heartbeat()

    # Build Prometheus metrics
    lines = [
        "# HELP genesis_scheduler_cycle_count Total number of cycles run",
        "# TYPE genesis_scheduler_cycle_count counter",
        f"genesis_scheduler_cycle_count {heartbeat.get('cycle_count', 0)}",
        "",
        "# HELP genesis_scheduler_success_count Total number of successful cycles",
        "# TYPE genesis_scheduler_success_count counter",
        f"genesis_scheduler_success_count {heartbeat.get('success_count', 0)}",
        "",
        "# HELP genesis_scheduler_failure_count Total number of failed cycles",
        "# TYPE genesis_scheduler_failure_count counter",
        f"genesis_scheduler_failure_count {heartbeat.get('failure_count', 0)}",
        "",
        "# HELP genesis_scheduler_success_rate Success rate (0.0 to 1.0)",
        "# TYPE genesis_scheduler_success_rate gauge",
        f"genesis_scheduler_success_rate {heartbeat.get('success_rate', 0.0)}",
        "",
        "# HELP genesis_scheduler_heartbeat_age_seconds Age of last heartbeat in seconds",
        "# TYPE genesis_scheduler_heartbeat_age_seconds gauge",
        f"genesis_scheduler_heartbeat_age_seconds {heartbeat.get('age_seconds', 0)}",
        "",
        "# HELP genesis_scheduler_up Scheduler is running (1) or not (0)",
        "# TYPE genesis_scheduler_up gauge",
        f"genesis_scheduler_up {1 if heartbeat.get('status') == 'running' else 0}",
        ""
    ]

    return PlainTextResponse(content="\n".join(lines))


@app.get("/ready")
async def readiness_check():
    """Readiness check - is the service ready to serve requests?"""
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}


@app.get("/live")
async def liveness_check():
    """Liveness check - is the service alive?"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    # Get port from environment (Railway/Render inject PORT)
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting Genesis Scheduler Health Check Server on {host}:{port}")
    print(f"Heartbeat file: {HEARTBEAT_FILE}")
    print(f"Endpoints:")
    print(f"  - http://{host}:{port}/health")
    print(f"  - http://{host}:{port}/heartbeat")
    print(f"  - http://{host}:{port}/metrics")

    uvicorn.run(app, host=host, port=port, log_level="info")
