#!/usr/bin/env python3
"""
Genesis Dashboard Launcher

Installs dependencies and launches the Streamlit dashboard.
One-command start: python scripts/launch_dashboard.py
"""

import subprocess
import sys
import os
from pathlib import Path

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"

print("🚀 Genesis Dashboard Launcher")
print("=" * 50)

# Step 1: Install dependencies
print("\n📦 Installing dashboard dependencies...")
requirements_file = DASHBOARD_DIR / "requirements.txt"

if requirements_file.exists():
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            check=True,
            cwd=str(PROJECT_ROOT)
        )
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)
else:
    print(f"⚠️ Requirements file not found: {requirements_file}")
    sys.exit(1)

# Step 2: Check Prometheus connection
print("\n🔍 Checking Prometheus connection...")
try:
    import requests
    response = requests.get("http://localhost:9090/-/healthy", timeout=5)
    if response.status_code == 200:
        print("✅ Prometheus is running at http://localhost:9090")
    else:
        print("⚠️ Prometheus responded but may not be healthy")
except Exception as e:
    print("❌ Cannot connect to Prometheus at localhost:9090")
    print("   Dashboard will run but show default values")
    print("   To start Prometheus: docker start prometheus")

# Step 3: Launch Streamlit
print("\n🚀 Launching Genesis Dashboard...")
print("   Dashboard will open at: http://localhost:8501")
print("   Press Ctrl+C to stop")
print("=" * 50)

dashboard_file = DASHBOARD_DIR / "genesis_dashboard.py"

if not dashboard_file.exists():
    print(f"❌ Dashboard file not found: {dashboard_file}")
    sys.exit(1)

try:
    subprocess.run(
        ["streamlit", "run", str(dashboard_file), "--server.port", "8501"],
        cwd=str(DASHBOARD_DIR),
        check=True
    )
except KeyboardInterrupt:
    print("\n\n✅ Dashboard stopped by user")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Dashboard failed to start: {e}")
    sys.exit(1)
