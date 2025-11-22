#!/bin/bash
# Research Discovery Agent - Weekly Cron Job Script
# Automatically discovers cutting-edge AI research papers
# Schedule: Every Monday 00:00 UTC

# Exit on error
set -e

# Navigate to project directory
cd /home/genesis/genesis-rebuild

# Activate virtual environment
source venv/bin/activate

# Run discovery agent
python -m agents.research_discovery_agent

# Log timestamp
echo "[$(date)] Research discovery cycle completed successfully"
