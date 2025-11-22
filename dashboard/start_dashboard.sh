#!/bin/bash
# Genesis Dashboard Launcher for macOS/Linux

echo "========================================"
echo "Genesis Monitoring Dashboard"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.10+ from https://www.python.org"
    exit 1
fi

echo "[1/4] Checking dependencies..."
if ! python3 -c "import flask" &> /dev/null; then
    echo "Installing Flask..."
    pip3 install -r requirements.txt
else
    echo "Dependencies OK"
fi

echo ""
echo "[2/4] Creating sample data..."
python3 test_dashboard.py

echo ""
echo "[3/4] Starting dashboard server..."
echo ""
echo "========================================"
echo "Dashboard will be available at:"
echo "http://localhost:5000"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Flask app
python3 app.py
