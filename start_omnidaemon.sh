#!/bin/bash
# Start OmniDaemon - Continuous Background Orchestration Service
#
# Integrates:
# - IterResearch Workspace Manager (#69)
# - Dr. MAMR Attribution Layer (#70)
# - ES Training Scheduler (#68)

echo "============================================================"
echo "Starting OmniDaemon - Genesis Continuous Orchestration"
echo "============================================================"
echo ""

# Set PYTHONPATH
export PYTHONPATH="$PWD:$PYTHONPATH"

# Create required directories
mkdir -p logs
mkdir -p data/omnidaemon
mkdir -p data/workspaces
mkdir -p data/attribution
mkdir -p data/es_training

echo "[1/3] Directories created"
echo "[2/3] Starting OmniDaemon..."
echo ""

# Start daemon
python infrastructure/omnidaemon/daemon_core.py

echo ""
echo "[3/3] OmniDaemon stopped"
echo "============================================================"
