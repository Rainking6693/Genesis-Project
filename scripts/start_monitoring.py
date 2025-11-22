#!/usr/bin/env python3
"""
Start Genesis Monitoring Stack

Starts all monitoring services:
1. Business Monitor (Prometheus metrics exporter on port 8000)
2. Prometheus (metrics database on port 9090)
3. Genesis Dashboard (Streamlit on port 8501)
"""

import subprocess
import sys
import os
import time
from pathlib import Path
import requests

PROJECT_ROOT = Path(__file__).parent.parent
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
MONITORING_DIR = PROJECT_ROOT / "monitoring"

def check_port(port, service_name):
    """Check if a service is running on the specified port"""
    try:
        response = requests.get(f"http://localhost:{port}", timeout=2)
        return True
    except:
        return False

def start_prometheus():
    """Start Prometheus if not already running"""
    print("\n[CHECK] Checking Prometheus...")

    if check_port(9090, "Prometheus"):
        print("[OK] Prometheus already running on port 9090")
        return True

    print("[START] Starting Prometheus...")

    # Check if running in Docker
    result = subprocess.run(
        ["docker", "ps", "--filter", "name=prometheus", "--format", "{{.Names}}"],
        capture_output=True,
        text=True
    )

    if "prometheus" in result.stdout:
        print("[OK] Prometheus container already running")
        return True

    # Try to start Docker container
    try:
        subprocess.run(
            ["docker", "start", "prometheus"],
            check=True,
            capture_output=True
        )
        print("[OK] Started Prometheus Docker container")
        time.sleep(3)
        return True
    except:
        print("[WARN] Prometheus Docker container not found")
        print("   Dashboard will run with default values")
        print("   To start Prometheus: docker start prometheus")
        return False

def start_business_monitor():
    """Start Business Monitor in background"""
    print("\n[CHECK] Checking Business Monitor...")

    if check_port(8000, "Business Monitor"):
        print("[OK] Business Monitor already running on port 8000")
        return True

    print("[WARN] Business Monitor not running")
    print("   Metrics will be emitted when Genesis runs business generation")
    print("   To start manually: python infrastructure/autonomous_business_generation.py")
    return False

def install_dashboard_dependencies():
    """Install dashboard dependencies"""
    print("\n[INSTALL] Installing dashboard dependencies...")

    requirements_file = DASHBOARD_DIR / "requirements.txt"

    if not requirements_file.exists():
        print(f"[ERROR] Requirements file not found: {requirements_file}")
        return False

    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            check=True,
            capture_output=True
        )
        print("[OK] Dashboard dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed to install dependencies: {e}")
        return False

def start_dashboard():
    """Start Genesis Dashboard"""
    print("\n[START] Starting Genesis Dashboard...")

    dashboard_file = DASHBOARD_DIR / "genesis_dashboard.py"

    if not dashboard_file.exists():
        print(f"[ERROR] Dashboard file not found: {dashboard_file}")
        return False

    print("   Dashboard will open at: http://localhost:8501")
    print("   Press Ctrl+C to stop")
    print("=" * 60)

    try:
        subprocess.run(
            ["streamlit", "run", str(dashboard_file), "--server.port", "8501"],
            cwd=str(DASHBOARD_DIR),
            check=True
        )
    except KeyboardInterrupt:
        print("\n\n[OK] Dashboard stopped by user")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Dashboard failed to start: {e}")
        return False
    except FileNotFoundError:
        print("\n[ERROR] Streamlit not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "streamlit"])
        print("[OK] Please run this script again")
        return False

def main():
    print("Genesis Monitoring Stack Launcher")
    print("=" * 60)

    # Step 1: Start Prometheus
    prometheus_running = start_prometheus()

    # Step 2: Check Business Monitor
    business_monitor_running = start_business_monitor()

    # Step 3: Install dashboard dependencies
    if not install_dashboard_dependencies():
        sys.exit(1)

    # Step 4: Start dashboard
    print("\n" + "=" * 60)
    print("MONITORING STATUS:")
    print("=" * 60)
    print(f"Prometheus (port 9090):      {'[OK] Running' if prometheus_running else '[FAIL] Not Running'}")
    print(f"Business Monitor (port 8000): {'[OK] Running' if business_monitor_running else '[WARN] Not Running'}")
    print(f"Dashboard (port 8501):        [START] Starting...")
    print("=" * 60)

    if not prometheus_running:
        print("\n[WARN] WARNING: Prometheus not running")
        print("   Dashboard will show default values instead of real metrics")
        print("   To fix: docker start prometheus\n")

    if not business_monitor_running:
        print("[WARN] WARNING: Business Monitor not running")
        print("   Genesis metrics will not be collected")
        print("   To fix: Run Genesis business generation\n")

    # Start dashboard (blocking)
    start_dashboard()

if __name__ == "__main__":
    main()
