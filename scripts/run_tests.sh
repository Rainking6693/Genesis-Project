#!/bin/bash
# Test Runner for Genesis Project
#
# Purpose: Run pytest with consistent configuration across all environments
# Uses pytest.ini which disables plugin autoload by default (-p no:asyncio -p no:rerunfailures)
# to ensure compatibility in CI/sandbox environments where plugins may not be available
#
# Usage:
#   ./scripts/run_tests.sh                    # Run all tests (plugins disabled by default)
#   ./scripts/run_tests.sh tests/test_*.py    # Run specific test files
#   ./scripts/run_tests.sh -k test_name       # Run tests matching pattern
#   ./scripts/run_tests.sh --cov             # Run with coverage
#
# Environment Variables:
#   PYTEST_DISABLE_PLUGIN_AUTOLOAD=1  # Explicitly disable all plugin autoload (default behavior)
#   SANDBOX_MODE=1                    # Legacy alias for PYTEST_DISABLE_PLUGIN_AUTOLOAD
#
# Why Plugin Autoload is Disabled:
#   - Third-party plugins (pytest-asyncio, pytest-rerunfailures) cause "asyncio marker" errors
#     when not available in CI/sandbox environments
#   - Genesis uses markers (asyncio, flaky) registered in pytest.ini for compatibility
#   - Tests run successfully without plugins by using standard pytest features
#   - This ensures reliable test execution across all environments
#
# How to Enable Specific Plugins (Advanced):
#   If you need to enable plugins for specific tests, you can override pytest.ini:
#   pytest -p asyncio tests/test_specific_async.py
#   pytest -p rerunfailures --reruns 3 tests/test_flaky.py

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set PYTEST_DISABLE_PLUGIN_AUTOLOAD by default for consistency
# This ensures the behavior is explicit even if pytest.ini changes
export PYTEST_DISABLE_PLUGIN_AUTOLOAD="${PYTEST_DISABLE_PLUGIN_AUTOLOAD:-1}"

# Legacy support for SANDBOX_MODE environment variable
if [ "${SANDBOX_MODE:-0}" = "1" ]; then
    export PYTEST_DISABLE_PLUGIN_AUTOLOAD=1
fi

# Determine plugin status for user feedback
if [ "${PYTEST_DISABLE_PLUGIN_AUTOLOAD}" = "1" ]; then
    PLUGIN_STATUS="${YELLOW}DISABLED${NC} (plugin autoload disabled for CI/sandbox compatibility)"
else
    PLUGIN_STATUS="${GREEN}ENABLED${NC} (plugins will autoload if installed)"
fi

echo -e "${BLUE}=== Genesis Test Runner ===${NC}"
echo -e "Plugin autoload: $PLUGIN_STATUS"
echo "Configuration: pytest.ini (includes -p no:asyncio -p no:rerunfailures)"
echo "Markers registered: asyncio, flaky (work without plugins)"
echo ""

# Check if pytest is available
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}ERROR: pytest not found. Please install: pip install pytest${NC}"
    exit 1
fi

# Run pytest with all arguments passed through
# The pytest.ini configuration already includes -p no:asyncio -p no:rerunfailures
# This ensures tests run without plugin dependencies
echo -e "${GREEN}Running tests...${NC}"
pytest "$@"

# Capture exit code
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed (exit code: $exit_code)${NC}"
fi

exit $exit_code
