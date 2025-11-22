#!/bin/bash
#
# WaltzRL Real LLM Testing - Setup and Execution Script
# Phase 6 Day 8 - October 24, 2025
#
# This script helps configure and run WaltzRL real LLM tests with Claude Sonnet 4.5
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PROJECT_ROOT/tests"
SCREENSHOTS_DIR="$PROJECT_ROOT/tests/screenshots/waltzrl"

# Load .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs)
fi

echo "=================================================="
echo "WaltzRL Real LLM Testing - Setup & Execution"
echo "=================================================="
echo ""

# Step 1: Check API key
echo "[1/5] Checking Anthropic API key..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY environment variable not set"
    echo ""
    echo "To set your API key:"
    echo "  export ANTHROPIC_API_KEY=\"sk-ant-api03-YOUR-KEY-HERE\""
    echo ""
    echo "Get your API key from: https://console.anthropic.com/"
    echo ""
    exit 1
else
    echo "✅ ANTHROPIC_API_KEY is set"
fi

# Step 2: Check dependencies
echo ""
echo "[2/5] Checking Python dependencies..."
if ! python -c "import anthropic" 2>/dev/null; then
    echo "⚠️  anthropic package not installed, installing..."
    pip install anthropic
else
    echo "✅ anthropic package installed"
fi

if ! python -c "import pytest" 2>/dev/null; then
    echo "⚠️  pytest package not installed, installing..."
    pip install pytest pytest-asyncio pytest-html
else
    echo "✅ pytest package installed"
fi

if ! python -c "import tqdm" 2>/dev/null; then
    echo "⚠️  tqdm package not installed, installing..."
    pip install tqdm
else
    echo "✅ tqdm package installed"
fi

# Step 3: Verify test files exist
echo ""
echo "[3/5] Verifying test files..."
if [ ! -f "$PROJECT_ROOT/tests/waltzrl_safety_scenarios.json" ]; then
    echo "❌ ERROR: waltzrl_safety_scenarios.json not found"
    exit 1
else
    echo "✅ Safety scenarios JSON found (50 scenarios)"
fi

if [ ! -f "$PROJECT_ROOT/tests/test_waltzrl_real_llm.py" ]; then
    echo "❌ ERROR: test_waltzrl_real_llm.py not found"
    exit 1
else
    echo "✅ Test file found"
fi

# Step 4: Create screenshots directory
echo ""
echo "[4/5] Creating screenshots directory..."
mkdir -p "$SCREENSHOTS_DIR"
echo "✅ Screenshots directory: $SCREENSHOTS_DIR"

# Step 5: Run tests
echo ""
echo "[5/5] Running WaltzRL real LLM tests..."
echo ""
echo "This will:"
echo "  - Test 50 safety scenarios"
echo "  - Use Claude Sonnet 4.5 for real LLM evaluation"
echo "  - Generate 10+ screenshots"
echo "  - Calculate metrics (unsafe detection, over-refusal, accuracy)"
echo "  - Save results to tests/waltzrl_real_llm_results.json"
echo ""
echo "Estimated time: 5-10 minutes"
echo "Estimated cost: $0.50-1.00 (Claude Sonnet 4.5 API)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting tests..."
echo ""

cd "$PROJECT_ROOT"

# Run full 50-scenario test
pytest tests/test_waltzrl_real_llm.py::test_waltzrl_real_llm_50_scenarios \
    -v -s \
    --html=tests/waltzrl_test_report.html \
    --self-contained-html

TEST_EXIT_CODE=$?

echo ""
echo "=================================================="
echo "Test Execution Complete"
echo "=================================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "Results:"
echo "  - JSON results: tests/waltzrl_real_llm_results.json"
echo "  - HTML report: tests/waltzrl_test_report.html"
echo "  - Screenshots: tests/screenshots/waltzrl/"
echo ""
echo "View validation report:"
echo "  cat docs/WALTZRL_REAL_LLM_VALIDATION.md"
echo ""
echo "View results:"
echo "  cat tests/waltzrl_real_llm_results.json | python -m json.tool"
echo ""

exit $TEST_EXIT_CODE
