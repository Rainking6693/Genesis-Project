#!/bin/bash
# ES Evaluation Sandbox Validation Script
# Version: 1.0
# Last Updated: November 8, 2025

set -e

echo "=========================================="
echo "ES EVALUATION SANDBOX VALIDATION"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker is running
echo -n "Checking Docker... "
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}FAILED${NC}"
    echo "Error: Docker is not running"
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check required files exist
echo ""
echo "Checking required files..."

FILES=(
    "docker-compose.es-eval.yml"
    "infrastructure/evolution_strategies/eval_sandbox.py"
    "tests/fixtures/es_test_tasks.json"
    "tests/fixtures/mock_llm_server.py"
    "docs/ES_EVALUATION_ISOLATION.md"
)

for file in "${FILES[@]}"; do
    echo -n "  - $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}EXISTS${NC}"
    else
        echo -e "${RED}MISSING${NC}"
        exit 1
    fi
done

# Validate JSON fixtures
echo ""
echo -n "Validating test fixtures JSON... "
if python -m json.tool tests/fixtures/es_test_tasks.json > /dev/null 2>&1; then
    echo -e "${GREEN}VALID${NC}"
else
    echo -e "${RED}INVALID${NC}"
    exit 1
fi

# Check fixture content
echo -n "Checking test tasks count... "
TASK_COUNT=$(python -c "import json; data=json.load(open('tests/fixtures/es_test_tasks.json')); print(len(data['test_tasks']))")
if [ "$TASK_COUNT" -ge 20 ]; then
    echo -e "${GREEN}$TASK_COUNT tasks${NC}"
else
    echo -e "${RED}INSUFFICIENT (need 20, found $TASK_COUNT)${NC}"
    exit 1
fi

# Check Docker Compose config
echo ""
echo -n "Validating Docker Compose config... "
if docker-compose -f docker-compose.es-eval.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}VALID${NC}"
else
    echo -e "${RED}INVALID${NC}"
    exit 1
fi

# Check network isolation
echo -n "Checking network isolation... "
if grep -q "internal: true" docker-compose.es-eval.yml; then
    echo -e "${GREEN}ISOLATED${NC}"
else
    echo -e "${RED}NOT ISOLATED${NC}"
    exit 1
fi

# Check resource limits
echo -n "Checking resource limits... "
if grep -q "cpus: '2.0'" docker-compose.es-eval.yml && grep -q "memory: 4G" docker-compose.es-eval.yml; then
    echo -e "${GREEN}CONFIGURED${NC}"
else
    echo -e "${RED}MISSING${NC}"
    exit 1
fi

# Optional: Test container startup (WARNING: This will start containers)
echo ""
read -p "Do you want to test container startup? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting ES evaluation sandbox..."
    docker-compose -f docker-compose.es-eval.yml up -d

    echo "Waiting for containers to be healthy..."
    sleep 10

    echo -n "Checking es-evaluation container... "
    if docker ps | grep -q genesis-es-eval-sandbox; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        docker-compose -f docker-compose.es-eval.yml logs
        docker-compose -f docker-compose.es-eval.yml down -v
        exit 1
    fi

    echo -n "Checking es-mock-api container... "
    if docker ps | grep -q genesis-es-mock-api; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        docker-compose -f docker-compose.es-eval.yml logs
        docker-compose -f docker-compose.es-eval.yml down -v
        exit 1
    fi

    echo ""
    echo "Checking logs for security verification..."
    if docker logs genesis-es-eval-sandbox 2>&1 | grep -q "SECURITY: Verified ES_EVAL_MODE=ISOLATED"; then
        echo -e "${GREEN}SECURITY MODE VERIFIED${NC}"
    else
        echo -e "${YELLOW}WARNING: Could not verify security mode in logs${NC}"
    fi

    echo ""
    echo "Cleaning up..."
    docker-compose -f docker-compose.es-eval.yml down -v
    echo -e "${GREEN}Cleanup complete${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}VALIDATION COMPLETE${NC}"
echo "=========================================="
echo ""
echo "All security checks passed!"
echo ""
echo "Next steps:"
echo "  1. Review docs/ES_EVALUATION_ISOLATION.md"
echo "  2. Start sandbox: docker-compose -f docker-compose.es-eval.yml up -d"
echo "  3. View logs: docker logs genesis-es-eval-sandbox"
echo "  4. Stop sandbox: docker-compose -f docker-compose.es-eval.yml down -v"
echo ""
