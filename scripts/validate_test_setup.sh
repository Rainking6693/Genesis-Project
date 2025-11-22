#!/bin/bash
# Test Setup Validation Script
# Verifies pytest configuration and runs the 4 previously-failing test files
#
# Usage:
#   ./scripts/validate_test_setup.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - Setup errors (missing dependencies, bad config)
#   2 - Test failures

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script info
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Genesis Test Setup Validation Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}[1/7] Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version | awk '{print $2}')
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 12 ]; }; then
    echo -e "${RED}✗ Python 3.12+ required, found $PYTHON_VERSION${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"
fi

# Check virtual environment
echo -e "${YELLOW}[2/7] Checking virtual environment...${NC}"
if [ -d "venv" ]; then
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
else
    echo -e "${RED}✗ Virtual environment not found${NC}"
    echo -e "${YELLOW}  Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
source venv/bin/activate

# Check pytest installation
echo -e "${YELLOW}[3/7] Checking pytest installation...${NC}"
if command -v pytest &> /dev/null; then
    PYTEST_VERSION=$(pytest --version | awk '{print $2}')
    echo -e "${GREEN}✓ pytest $PYTEST_VERSION installed${NC}"
else
    echo -e "${RED}✗ pytest not found${NC}"
    echo -e "${YELLOW}  Installing test dependencies...${NC}"
    pip install -e ".[test]" > /dev/null 2>&1
    echo -e "${GREEN}✓ Test dependencies installed${NC}"
fi

# Check critical plugins
echo -e "${YELLOW}[4/7] Checking pytest plugins...${NC}"
PLUGINS_OK=true

if ! python3 -c "import pytest_asyncio" 2>/dev/null; then
    echo -e "${RED}✗ pytest-asyncio not found${NC}"
    PLUGINS_OK=false
fi

if ! python3 -c "import pytest_rerunfailures" 2>/dev/null; then
    echo -e "${RED}✗ pytest-rerunfailures not found${NC}"
    PLUGINS_OK=false
fi

if ! python3 -c "import pytest_timeout" 2>/dev/null; then
    echo -e "${RED}✗ pytest-timeout not found${NC}"
    PLUGINS_OK=false
fi

if [ "$PLUGINS_OK" = false ]; then
    echo -e "${YELLOW}  Installing missing plugins...${NC}"
    pip install pytest-asyncio pytest-rerunfailures pytest-timeout > /dev/null 2>&1
    echo -e "${GREEN}✓ Plugins installed${NC}"
else
    echo -e "${GREEN}✓ All required plugins installed${NC}"
fi

# Check infrastructure dependencies
echo -e "${YELLOW}[5/7] Checking infrastructure dependencies...${NC}"
DEPS_OK=true

if ! python3 -c "import numpy" 2>/dev/null; then
    echo -e "${RED}✗ numpy not found${NC}"
    DEPS_OK=false
fi

if ! python3 -c "import faiss" 2>/dev/null; then
    echo -e "${RED}✗ faiss-cpu not found${NC}"
    DEPS_OK=false
fi

if ! python3 -c "import opentelemetry" 2>/dev/null; then
    echo -e "${RED}✗ opentelemetry not found${NC}"
    DEPS_OK=false
fi

if [ "$DEPS_OK" = false ]; then
    echo -e "${YELLOW}  Installing infrastructure dependencies...${NC}"
    pip install -r requirements_infrastructure.txt > /dev/null 2>&1
    pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation > /dev/null 2>&1
    echo -e "${GREEN}✓ Infrastructure dependencies installed${NC}"
else
    echo -e "${GREEN}✓ All infrastructure dependencies installed${NC}"
fi

# Check pytest.ini configuration
echo -e "${YELLOW}[6/7] Validating pytest.ini configuration...${NC}"
if grep -q "\-p no:asyncio" pytest.ini; then
    echo -e "${RED}✗ pytest.ini contains '-p no:asyncio' directive${NC}"
    echo -e "${YELLOW}  This should be removed per Oct 25, 2025 fix${NC}"
    exit 1
fi

if grep -q "\-p no:rerunfailures" pytest.ini; then
    echo -e "${RED}✗ pytest.ini contains '-p no:rerunfailures' directive${NC}"
    echo -e "${YELLOW}  This should be removed per Oct 25, 2025 fix${NC}"
    exit 1
fi

echo -e "${GREEN}✓ pytest.ini configuration valid${NC}"

# Run the 4 previously-failing test files
echo -e "${YELLOW}[7/7] Running validation test suite...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TEST_FILES=(
    "tests/test_memory_store_semantic_search.py"
    "tests/test_hybrid_rag_retriever.py"
    "tests/test_agent_integration_hybrid_rag.py"
    "tests/test_error_handling.py"
)

# Run pytest with summary output
if pytest "${TEST_FILES[@]}" -v --tb=short 2>&1 | tee /tmp/pytest_validation.log; then
    # Extract results
    PASSED=$(grep -oP '\d+(?= passed)' /tmp/pytest_validation.log | tail -1)
    SKIPPED=$(grep -oP '\d+(?= skipped)' /tmp/pytest_validation.log | tail -1 || echo "0")
    DURATION=$(grep -oP '\d+\.\d+(?=s)' /tmp/pytest_validation.log | tail -1)

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ VALIDATION PASSED${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Test Results:"
    echo -e "  ${GREEN}✓${NC} Tests Passed: ${PASSED:-0}"
    echo -e "  ${YELLOW}⏭${NC} Tests Skipped: ${SKIPPED}"
    echo -e "  ${BLUE}⏱${NC} Duration: ${DURATION}s"
    echo ""
    echo -e "All 4 previously-failing test files are now operational!"
    echo -e "Setup validation complete - test suite is production-ready."
    echo ""

    exit 0
else
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Some tests failed. Check the output above for details.${NC}"
    echo ""
    echo -e "Common fixes:"
    echo -e "  1. Install missing dependencies: pip install -r requirements_infrastructure.txt"
    echo -e "  2. Check pytest.ini for plugin disablers (-p no:asyncio, -p no:rerunfailures)"
    echo -e "  3. Review test logs: /tmp/pytest_validation.log"
    echo ""

    exit 2
fi
