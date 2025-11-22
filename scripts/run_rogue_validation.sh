#!/bin/bash
#
# Quick Rogue Validation Script
# Companion script to ROGUE_EXECUTION_RUNBOOK.md
#
# Usage:
#   ./scripts/run_rogue_validation.sh [p0|full]
#
# Examples:
#   ./scripts/run_rogue_validation.sh p0      # Run P0 only (~15 min, $8)
#   ./scripts/run_rogue_validation.sh full    # Run full suite (~30 min, $24)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/genesis/genesis-rebuild"
SCENARIOS_DIR="${PROJECT_ROOT}/tests/rogue/scenarios"
REPORTS_DIR="${PROJECT_ROOT}/reports/rogue"
LOGS_DIR="${PROJECT_ROOT}/logs"
PARALLEL_WORKERS=5

# Parse arguments
MODE="${1:-full}"  # Default to full validation

if [[ "$MODE" != "p0" && "$MODE" != "full" ]]; then
    echo -e "${RED}Error: Invalid mode '${MODE}'${NC}"
    echo "Usage: $0 [p0|full]"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================"
echo "ROGUE VALIDATION AUTOMATION"
echo "========================================${NC}"
echo ""
echo "Mode: $MODE"
echo "Project: $PROJECT_ROOT"
echo "Scenarios: $SCENARIOS_DIR"
echo ""

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo -e "${YELLOW}[1/6] Pre-Flight Checks${NC}"
echo ""

# Check port 8000
echo -n "  Checking port 8000... "
if lsof -i :8000 > /dev/null 2>&1; then
    echo -e "${RED}BUSY${NC}"
    echo "    Port 8000 is in use. Kill it with: kill \$(lsof -t -i:8000)"
    exit 1
else
    echo -e "${GREEN}FREE${NC}"
fi

# Check scenario files
echo -n "  Checking scenario files... "
SCENARIO_COUNT=$(ls -1 "$SCENARIOS_DIR"/*.yaml 2>/dev/null | grep -v template | wc -l)
if [ "$SCENARIO_COUNT" -lt 18 ]; then
    echo -e "${RED}MISSING${NC}"
    echo "    Expected 18+ files, found $SCENARIO_COUNT"
    exit 1
else
    echo -e "${GREEN}OK (${SCENARIO_COUNT} files)${NC}"
fi

# Check uvx
echo -n "  Checking Rogue CLI (uvx)... "
if which uvx > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
    echo "    Install with: pip install uvx"
    exit 1
fi

# Check disk space
echo -n "  Checking disk space... "
mkdir -p "$REPORTS_DIR"
AVAILABLE_MB=$(df -m "$REPORTS_DIR" | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_MB" -lt 500 ]; then
    echo -e "${YELLOW}LOW (${AVAILABLE_MB}MB)${NC}"
    echo "    WARNING: Need 500MB+, have ${AVAILABLE_MB}MB"
else
    echo -e "${GREEN}OK (${AVAILABLE_MB}MB)${NC}"
fi

# Check API keys
echo -n "  Checking OpenAI API key... "
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}MISSING${NC}"
    echo "    Set with: export OPENAI_API_KEY='your-key-here'"
    exit 1
else
    echo -e "${GREEN}OK (${OPENAI_API_KEY:0:7}...)${NC}"
fi

# Check Redis (optional)
echo -n "  Checking Redis... "
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}RUNNING${NC}"
    USE_CACHE="--use-cache"
else
    echo -e "${YELLOW}NOT RUNNING${NC}"
    echo "    Caching disabled (Redis not available)"
    USE_CACHE=""
fi

echo ""
echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo ""

# ============================================================================
# START A2A SERVICE
# ============================================================================

echo -e "${YELLOW}[2/6] Starting A2A Service${NC}"
echo ""

# Create logs directory
mkdir -p "$LOGS_DIR"

# Kill any existing service
if lsof -i :8000 > /dev/null 2>&1; then
    echo "  Killing existing service on port 8000..."
    kill $(lsof -t -i:8000) 2>/dev/null || true
    sleep 2
fi

# Start service
echo "  Starting A2A service on port 8000..."
bash scripts/start_a2a_service.sh > "$LOGS_DIR/a2a_service.log" 2>&1 &
A2A_PID=$!
echo $A2A_PID > /tmp/a2a_service.pid
echo "  PID: $A2A_PID"

# Wait for startup
echo -n "  Waiting for startup"
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}✓ Service ready (${i}s)${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${RED}✗ Service failed to start after 30s${NC}"
        echo "Check logs: tail -50 $LOGS_DIR/a2a_service.log"
        exit 1
    fi
done

# Verify agents
AGENT_COUNT=$(curl -s http://localhost:8000/a2a/agents | jq '.agents | length' 2>/dev/null || echo "0")
echo "  Agents registered: $AGENT_COUNT/15"
if [ "$AGENT_COUNT" -lt 15 ]; then
    echo -e "  ${YELLOW}WARNING: Only $AGENT_COUNT agents registered${NC}"
fi

echo ""
echo -e "${GREEN}✓ A2A service operational${NC}"
echo ""

# ============================================================================
# RUN VALIDATION
# ============================================================================

if [ "$MODE" == "p0" ]; then
    echo -e "${YELLOW}[3/6] Running P0 Validation${NC}"
    echo ""
    echo "  Scenarios: ~260 P0 critical tests"
    echo "  Expected Time: 15 minutes"
    echo "  Expected Cost: $8"
    echo ""

    OUTPUT_DIR="$REPORTS_DIR/p0_baseline"
    PRIORITY="P0"
    P0_THRESHOLD=0.90
else
    echo -e "${YELLOW}[3/6] Running Full Validation${NC}"
    echo ""
    echo "  Scenarios: 501 (260 P0 + 241 P1)"
    echo "  Expected Time: 30 minutes"
    echo "  Expected Cost: $24"
    echo ""

    OUTPUT_DIR="$REPORTS_DIR/full_baseline"
    PRIORITY="P0,P1"
    P0_THRESHOLD=0.80
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run validation
echo "  Starting validation..."
echo "  (Monitor: tail -f $OUTPUT_DIR/execution.log)"
echo ""

python3 infrastructure/testing/rogue_runner.py \
    --scenarios-dir "$SCENARIOS_DIR" \
    --output-dir "$OUTPUT_DIR" \
    --priority "$PRIORITY" \
    --parallel "$PARALLEL_WORKERS" \
    --rogue-server http://localhost:8000 \
    $USE_CACHE \
    --p0-threshold "$P0_THRESHOLD" \
    2>&1 | tee "$OUTPUT_DIR/execution.log"

VALIDATION_EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Validation completed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Validation completed with warnings (exit code: $VALIDATION_EXIT_CODE)${NC}"
fi
echo ""

# ============================================================================
# ANALYZE RESULTS
# ============================================================================

echo -e "${YELLOW}[4/6] Analyzing Results${NC}"
echo ""

if [ ! -f "$OUTPUT_DIR/results.json" ]; then
    echo -e "${RED}✗ Results file not found: $OUTPUT_DIR/results.json${NC}"
    echo "Check execution log: less $OUTPUT_DIR/execution.log"
    exit 1
fi

# Parse results
python3 << EOF
import json
import sys

with open('$OUTPUT_DIR/results.json') as f:
    data = json.load(f)

summary = data['summary']
results = data['results']

# Calculate stats
total = summary['total_scenarios']
passed = summary['passed']
failed = summary['failed']
pass_rate = summary['pass_rate']
cost = summary['cost_summary']['total_cost_usd']
runtime = summary['total_execution_time']

# Priority breakdown
p0_results = [r for r in results if r['priority'] == 'P0']
p0_passed = sum(1 for r in p0_results if r['passed'])
p0_total = len(p0_results)
p0_rate = (p0_passed / p0_total * 100) if p0_total > 0 else 0

print("="*60)
print("VALIDATION RESULTS")
print("="*60)
print(f"Total Scenarios:  {total}")
print(f"Passed:           {passed} ({pass_rate:.1f}%)")
print(f"Failed:           {failed}")
print(f"Runtime:          {runtime:.1f}s ({runtime/60:.1f} minutes)")
print(f"Cost:             \${cost:.2f}")
print("")
print("Priority Breakdown:")
print(f"  P0 Critical:    {p0_passed}/{p0_total} ({p0_rate:.1f}%)")
print("")
print("Thresholds:")
print(f"  Overall:        {pass_rate:.1f}% (target: ≥85%)")
print(f"  P0 Critical:    {p0_rate:.1f}% (target: ≥90%)")
print("")

# Decision
if pass_rate >= 85 and p0_rate >= 90:
    print("✅ APPROVED FOR PRODUCTION DEPLOYMENT")
    print("   All thresholds met.")
    sys.exit(0)
elif p0_rate >= 90:
    print("⚠️  CONDITIONAL APPROVAL")
    print(f"   P0 critical tests pass ({p0_rate:.1f}% ≥ 90%)")
    print(f"   But overall pass rate low ({pass_rate:.1f}% < 85%)")
    print("   Recommend: Fix P1 issues before full deployment")
    sys.exit(1)
else:
    print("❌ NOT APPROVED FOR DEPLOYMENT")
    print(f"   P0 critical tests failing ({p0_rate:.1f}% < 90%)")
    print("   MUST fix P0 issues before deployment")
    sys.exit(2)
EOF

ANALYSIS_EXIT_CODE=$?

echo ""
echo -e "${GREEN}✓ Analysis complete${NC}"
echo ""

# ============================================================================
# GENERATE REPORTS
# ============================================================================

echo -e "${YELLOW}[5/6] Generating Reports${NC}"
echo ""

# Generate executive summary
python3 << 'EOFPY'
import json
from datetime import datetime

with open('$OUTPUT_DIR/results.json') as f:
    data = json.load(f)

summary = data['summary']
results = data['results']

# Calculate priority stats
p0_results = [r for r in results if r['priority'] == 'P0']
p0_passed = sum(1 for r in p0_results if r['passed'])
p0_total = len(p0_results)
p0_rate = (p0_passed / p0_total * 100) if p0_total > 0 else 0

report = f"""# ROGUE VALIDATION REPORT

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Mode:** {'P0 Only' if '$MODE' == 'p0' else 'Full Validation (P0+P1)'}

## Results

- Total Scenarios: {summary['total_scenarios']}
- Passed: {summary['passed']} ({summary['pass_rate']:.1f}%)
- Failed: {summary['failed']}
- Runtime: {summary['total_execution_time']/60:.1f} minutes
- Cost: ${summary['cost_summary']['total_cost_usd']:.2f}

## Priority Breakdown

- P0 Critical: {p0_passed}/{p0_total} ({p0_rate:.1f}%)

## Decision

"""

if summary['pass_rate'] >= 85 and p0_rate >= 90:
    report += "**✅ APPROVED FOR PRODUCTION DEPLOYMENT**\n"
elif p0_rate >= 90:
    report += "**⚠️  CONDITIONAL APPROVAL** - Fix P1 issues before full deployment\n"
else:
    report += "**❌ NOT APPROVED FOR DEPLOYMENT** - Must fix P0 critical issues\n"

report += f"""

## Next Steps

See detailed reports:
- Executive Summary: {OUTPUT_DIR}/EXECUTIVE_SUMMARY.md
- Markdown Report: {OUTPUT_DIR}/summary.md
- JSON Results: {OUTPUT_DIR}/results.json
- Execution Log: {OUTPUT_DIR}/execution.log

"""

with open('$OUTPUT_DIR/QUICK_SUMMARY.md', 'w') as f:
    f.write(report)

print("Reports generated:")
print(f"  - {OUTPUT_DIR}/QUICK_SUMMARY.md")
EOFPY

echo ""
echo -e "${GREEN}✓ Reports generated${NC}"
echo ""

# ============================================================================
# CLEANUP
# ============================================================================

echo -e "${YELLOW}[6/6] Cleanup${NC}"
echo ""

# Stop A2A service
if [ -f /tmp/a2a_service.pid ]; then
    A2A_PID=$(cat /tmp/a2a_service.pid)
    echo "  Stopping A2A service (PID: $A2A_PID)..."
    kill $A2A_PID 2>/dev/null || echo "  Service already stopped"
    rm /tmp/a2a_service.pid
fi

# Wait for port to free up
sleep 2

# Verify cleanup
if lsof -i :8000 > /dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠ Port 8000 still in use${NC}"
else
    echo -e "  ${GREEN}✓ Port 8000 free${NC}"
fi

# Clean temp files
rm -rf "$OUTPUT_DIR/temp" 2>/dev/null && echo "  ✓ Temp files cleaned" || true

echo ""
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${BLUE}========================================"
echo "VALIDATION COMPLETE"
echo "========================================${NC}"
echo ""
echo "Results saved to:"
echo "  $OUTPUT_DIR"
echo ""
echo "Quick summary:"
cat "$OUTPUT_DIR/QUICK_SUMMARY.md"
echo ""

# Exit with appropriate code
exit $ANALYSIS_EXIT_CODE
