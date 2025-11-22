#!/bin/bash
# CI/CD Configuration Validation Script
# Purpose: Validate all CI/CD configuration files before committing

set -e  # Exit on error

echo "=========================================="
echo "CI/CD Configuration Validation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
ERRORS=0

# Function to check file exists
check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} File exists: $file"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $file"
        ((ERRORS++))
        return 1
    fi
}

# Function to validate YAML
validate_yaml() {
    local file=$1
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Valid YAML: $file"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} Invalid YAML: $file"
        ((ERRORS++))
        return 1
    fi
}

# Function to validate pytest config
validate_pytest() {
    if python3 -m pytest --co -q > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} pytest.ini is valid"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} pytest.ini has errors"
        python3 -m pytest --co -q 2>&1 | head -10
        ((ERRORS++))
        return 1
    fi
}

# Function to check Python syntax
check_python_syntax() {
    local file=$1
    if python3 -m py_compile "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Valid Python syntax: $file"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} Python syntax error: $file"
        ((ERRORS++))
        return 1
    fi
}

echo "1. Checking required files..."
echo "------------------------------"
check_file ".github/workflows/test-suite.yml"
check_file ".github/workflows/deploy.yml"
check_file "pytest.ini"
check_file ".pre-commit-config.yaml"
check_file "pyproject.toml"
check_file "docs/CICD_CONFIGURATION.md"
echo ""

echo "2. Validating YAML syntax..."
echo "------------------------------"
validate_yaml ".github/workflows/test-suite.yml"
validate_yaml ".github/workflows/deploy.yml"
validate_yaml ".pre-commit-config.yaml"
echo ""

echo "3. Validating pytest configuration..."
echo "---------------------------------------"
validate_pytest
echo ""

echo "4. Checking pytest markers..."
echo "------------------------------"
MARKERS=$(python3 -m pytest --markers 2>/dev/null | grep -E "^@pytest.mark" | wc -l)
if [ $MARKERS -gt 10 ]; then
    echo -e "${GREEN}✓${NC} Found $MARKERS pytest markers"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Only found $MARKERS pytest markers (expected >10)"
    ((WARNINGS++))
fi
echo ""

echo "5. Checking test discovery..."
echo "------------------------------"
TEST_COUNT=$(python3 -m pytest --co -q 2>/dev/null | grep -E "^<" | wc -l)
if [ $TEST_COUNT -gt 900 ]; then
    echo -e "${GREEN}✓${NC} Discovered $TEST_COUNT tests"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Only discovered $TEST_COUNT tests (expected >900)"
    ((WARNINGS++))
fi
echo ""

echo "6. Checking Python dependencies..."
echo "-----------------------------------"
if python3 -c "import pytest, pytest_asyncio, pytest_cov" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Core pytest dependencies installed"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Missing pytest dependencies"
    ((ERRORS++))
fi

if python3 -c "import yaml" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PyYAML installed"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} PyYAML not installed (needed for workflow validation)"
    ((WARNINGS++))
fi
echo ""

echo "7. Checking workflow syntax..."
echo "--------------------------------"
# Check for common workflow issues
if grep -q "python-version.*3.12" .github/workflows/*.yml; then
    echo -e "${GREEN}✓${NC} Python version 3.12 configured"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Python version not explicitly set to 3.12"
    ((WARNINGS++))
fi

if grep -q "timeout-minutes" .github/workflows/*.yml; then
    echo -e "${GREEN}✓${NC} Timeout configured for jobs"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} No timeouts configured"
    ((WARNINGS++))
fi
echo ""

echo "8. Checking pre-commit configuration..."
echo "-----------------------------------------"
if command -v pre-commit &> /dev/null; then
    if pre-commit validate-config .pre-commit-config.yaml 2>/dev/null; then
        echo -e "${GREEN}✓${NC} pre-commit config is valid"
        ((SUCCESS++))
    else
        echo -e "${RED}✗${NC} pre-commit config has errors"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} pre-commit not installed (run: pip install pre-commit)"
    ((WARNINGS++))
fi
echo ""

echo "9. Checking Phase 4 CI/CD updates..."
echo "--------------------------------------"
if grep -q "ORCHESTRATION_ENABLED" .github/workflows/ci.yml; then
    echo -e "${GREEN}✓${NC} Feature flags configured in CI workflow"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Feature flags missing in CI workflow"
    ((ERRORS++))
fi

if grep -q "health-checks:" .github/workflows/ci.yml; then
    echo -e "${GREEN}✓${NC} Health checks job configured in CI"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Health checks job missing in CI"
    ((ERRORS++))
fi

if grep -q "PROMETHEUS_ENABLED" .github/workflows/staging-deploy.yml; then
    echo -e "${GREEN}✓${NC} Monitoring configured in staging deployment"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Monitoring not configured in staging"
    ((WARNINGS++))
fi

if grep -q "monitoring_start" .github/workflows/production-deploy.yml; then
    echo -e "${GREEN}✓${NC} 48-hour monitoring window configured in production"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Monitoring window missing in production deployment"
    ((ERRORS++))
fi
echo ""

echo "10. Checking deployment scripts..."
echo "------------------------------------"
if [ -f scripts/health_check.sh ] && [ -x scripts/health_check.sh ]; then
    echo -e "${GREEN}✓${NC} Health check script exists and is executable"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Health check script missing or not executable"
    ((ERRORS++))
fi

if [ -f scripts/run_monitoring_tests.sh ] && [ -x scripts/run_monitoring_tests.sh ]; then
    echo -e "${GREEN}✓${NC} Monitoring test script exists and is executable"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Monitoring test script missing or not executable"
    ((WARNINGS++))
fi
echo ""

echo "11. Checking monitoring configuration..."
echo "------------------------------------------"
if [ -d monitoring ]; then
    echo -e "${GREEN}✓${NC} Monitoring directory exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Monitoring directory missing"
    ((ERRORS++))
fi

if [ -f monitoring/prometheus_config.yml ]; then
    echo -e "${GREEN}✓${NC} Prometheus configuration exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Prometheus configuration missing"
    ((WARNINGS++))
fi

if [ -f monitoring/docker-compose.yml ]; then
    echo -e "${GREEN}✓${NC} Monitoring Docker Compose file exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Monitoring Docker Compose file missing"
    ((WARNINGS++))
fi
echo ""

echo "12. Checking feature flags..."
echo "-------------------------------"
if [ -f infrastructure/feature_flags.py ]; then
    echo -e "${GREEN}✓${NC} Feature flags module exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Feature flags module missing"
    ((ERRORS++))
fi

if python3 -c "from infrastructure.feature_flags import get_feature_flag_manager" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Feature flags module is importable"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Feature flags module has import errors"
    ((WARNINGS++))
fi
echo ""

echo "13. Checking documentation..."
echo "------------------------------"
if [ -f docs/CICD_CONFIGURATION.md ]; then
    DOC_LINES=$(wc -l < docs/CICD_CONFIGURATION.md)
    if [ $DOC_LINES -gt 500 ]; then
        echo -e "${GREEN}✓${NC} Comprehensive documentation ($DOC_LINES lines)"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠${NC} Documentation might be incomplete ($DOC_LINES lines)"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} CICD_CONFIGURATION.md not found"
    ((WARNINGS++))
fi

if [ -f docs/CICD_PHASE4_UPDATES.md ]; then
    echo -e "${GREEN}✓${NC} Phase 4 updates documentation exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Phase 4 updates documentation missing"
    ((WARNINGS++))
fi

if [ -f docs/CICD_DEPLOYMENT_REPORT.md ]; then
    echo -e "${GREEN}✓${NC} Deployment report exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Deployment report missing"
    ((WARNINGS++))
fi
echo ""

echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Successful checks: $SUCCESS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Validation FAILED${NC} - Fix errors before proceeding"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Validation PASSED with warnings${NC} - Review warnings"
    exit 0
else
    echo -e "${GREEN}Validation PASSED${NC} - All checks successful"
    exit 0
fi
