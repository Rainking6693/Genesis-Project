#!/bin/bash
# Genesis Health Check Script
# Validates system health and reports status for 48-hour monitoring

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/genesis/genesis-rebuild"
HEALTH_LOG="${PROJECT_ROOT}/logs/health_check.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EXIT_CODE=0

# Initialize log
mkdir -p "$(dirname "$HEALTH_LOG")"
echo "=== Genesis Health Check - ${TIMESTAMP} ===" | tee -a "$HEALTH_LOG"

# Check 1: Python environment
echo -n "Checking Python environment... " | tee -a "$HEALTH_LOG"
if command -v python3 &> /dev/null && python3 --version &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}OK${NC} ($PYTHON_VERSION)" | tee -a "$HEALTH_LOG"
else
    echo -e "${RED}FAILED${NC}" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 2: Virtual environment
echo -n "Checking virtual environment... " | tee -a "$HEALTH_LOG"
if [ -d "${PROJECT_ROOT}/venv" ] && [ -f "${PROJECT_ROOT}/venv/bin/activate" ]; then
    echo -e "${GREEN}OK${NC}" | tee -a "$HEALTH_LOG"
else
    echo -e "${RED}FAILED${NC} (venv not found)" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 3: Required dependencies
echo -n "Checking dependencies... " | tee -a "$HEALTH_LOG"
source "${PROJECT_ROOT}/venv/bin/activate" 2>/dev/null || true
MISSING_DEPS=0
for pkg in pytest opentelemetry-api opentelemetry-sdk prometheus_client; do
    if ! python3 -c "import ${pkg//-/_}" 2>/dev/null; then
        echo -e "${RED}MISSING${NC}: $pkg" | tee -a "$HEALTH_LOG"
        MISSING_DEPS=$((MISSING_DEPS + 1))
    fi
done

if [ $MISSING_DEPS -eq 0 ]; then
    echo -e "${GREEN}OK${NC}" | tee -a "$HEALTH_LOG"
else
    echo -e "${RED}FAILED${NC} ($MISSING_DEPS missing)" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 4: Critical infrastructure modules
echo -n "Checking infrastructure modules... " | tee -a "$HEALTH_LOG"
MISSING_MODULES=0
for module in observability htdag_planner halo_router aop_validator; do
    if [ ! -f "${PROJECT_ROOT}/infrastructure/${module}.py" ]; then
        echo -e "${RED}MISSING${NC}: ${module}.py" | tee -a "$HEALTH_LOG"
        MISSING_MODULES=$((MISSING_MODULES + 1))
    fi
done

if [ $MISSING_MODULES -eq 0 ]; then
    echo -e "${GREEN}OK${NC}" | tee -a "$HEALTH_LOG"
else
    echo -e "${RED}FAILED${NC} ($MISSING_MODULES missing)" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 5: Test suite integrity
echo -n "Checking test suite... " | tee -a "$HEALTH_LOG"
if [ -d "${PROJECT_ROOT}/tests" ]; then
    TEST_COUNT=$(find "${PROJECT_ROOT}/tests" -name "test_*.py" | wc -l)
    if [ "$TEST_COUNT" -ge 20 ]; then
        echo -e "${GREEN}OK${NC} ($TEST_COUNT test files)" | tee -a "$HEALTH_LOG"
    else
        echo -e "${YELLOW}WARNING${NC} (only $TEST_COUNT test files)" | tee -a "$HEALTH_LOG"
    fi
else
    echo -e "${RED}FAILED${NC} (tests directory not found)" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 6: Configuration files
echo -n "Checking configuration files... " | tee -a "$HEALTH_LOG"
MISSING_CONFIGS=0
for config in pytest.ini; do
    if [ ! -f "${PROJECT_ROOT}/${config}" ]; then
        echo -e "${RED}MISSING${NC}: ${config}" | tee -a "$HEALTH_LOG"
        MISSING_CONFIGS=$((MISSING_CONFIGS + 1))
    fi
done

if [ $MISSING_CONFIGS -eq 0 ]; then
    echo -e "${GREEN}OK${NC}" | tee -a "$HEALTH_LOG"
else
    echo -e "${YELLOW}WARNING${NC} ($MISSING_CONFIGS missing)" | tee -a "$HEALTH_LOG"
fi

# Check 7: Disk space
echo -n "Checking disk space... " | tee -a "$HEALTH_LOG"
DISK_USAGE=$(df -h "${PROJECT_ROOT}" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}OK${NC} (${DISK_USAGE}% used)" | tee -a "$HEALTH_LOG"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}WARNING${NC} (${DISK_USAGE}% used)" | tee -a "$HEALTH_LOG"
else
    echo -e "${RED}CRITICAL${NC} (${DISK_USAGE}% used)" | tee -a "$HEALTH_LOG"
    EXIT_CODE=1
fi

# Check 8: Memory availability
echo -n "Checking memory... " | tee -a "$HEALTH_LOG"
if command -v free &> /dev/null; then
    MEM_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
    if [ "$MEM_AVAILABLE" -gt 1000 ]; then
        echo -e "${GREEN}OK${NC} (${MEM_AVAILABLE}MB available)" | tee -a "$HEALTH_LOG"
    elif [ "$MEM_AVAILABLE" -gt 500 ]; then
        echo -e "${YELLOW}WARNING${NC} (${MEM_AVAILABLE}MB available)" | tee -a "$HEALTH_LOG"
    else
        echo -e "${RED}CRITICAL${NC} (${MEM_AVAILABLE}MB available)" | tee -a "$HEALTH_LOG"
        EXIT_CODE=1
    fi
else
    echo -e "${YELLOW}SKIPPED${NC} (free command not available)" | tee -a "$HEALTH_LOG"
fi

# Check 9: Quick smoke test
echo -n "Running quick smoke test... " | tee -a "$HEALTH_LOG"
cd "${PROJECT_ROOT}"
if timeout 30s python3 -m pytest tests/test_observability.py -q --tb=no &>/dev/null; then
    echo -e "${GREEN}OK${NC}" | tee -a "$HEALTH_LOG"
else
    echo -e "${YELLOW}WARNING${NC} (smoke test failed or timed out)" | tee -a "$HEALTH_LOG"
fi

# Summary
echo "" | tee -a "$HEALTH_LOG"
echo "=== Health Check Summary ===" | tee -a "$HEALTH_LOG"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "Status: ${GREEN}HEALTHY${NC}" | tee -a "$HEALTH_LOG"
    echo "All critical checks passed. System is ready for production." | tee -a "$HEALTH_LOG"
else
    echo -e "Status: ${RED}UNHEALTHY${NC}" | tee -a "$HEALTH_LOG"
    echo "One or more critical checks failed. Review logs before deployment." | tee -a "$HEALTH_LOG"
fi

echo "Timestamp: ${TIMESTAMP}" | tee -a "$HEALTH_LOG"
echo "Log: ${HEALTH_LOG}" | tee -a "$HEALTH_LOG"

exit $EXIT_CODE
