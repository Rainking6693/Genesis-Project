#!/bin/bash
# Monitoring Stack Validation Script
set -e

echo "========================================"
echo "MONITORING STACK VALIDATION"
echo "========================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

passed=0
failed=0
warnings=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((passed++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((warnings++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((failed++))
}

echo "1. Checking Docker Containers..."
docker ps | grep -q "prometheus" && check_pass "Prometheus running" || check_fail "Prometheus NOT running"
docker ps | grep -q "grafana" && check_pass "Grafana running" || check_fail "Grafana NOT running"
docker ps | grep -q "genesis-metrics" && check_pass "Metrics exporter running" || check_fail "Metrics exporter NOT running"

echo ""
echo "2. Checking HTTP Endpoints..."
curl -s http://localhost:9090/-/healthy | grep -q "Prometheus" && check_pass "Prometheus responding" || check_fail "Prometheus NOT responding"
curl -s http://localhost:3000/api/health | grep -q "ok" && check_pass "Grafana responding" || check_fail "Grafana NOT responding"
curl -s http://localhost:8002/metrics | grep -q "genesis_tests_total" && check_pass "Metrics exporter serving" || check_fail "Metrics exporter NOT serving"

echo ""
echo "3. Checking Prometheus Scraping..."
targets_json=\$(curl -s http://localhost:9090/api/v1/targets)
echo "\$targets_json" | grep -q "genesis-orchestration" && check_pass "Scrape target configured" || check_fail "Scrape target NOT configured"
echo "\$targets_json" | grep -A 20 "genesis-orchestration" | grep -q '"health":"up"' && check_pass "Scraping successfully" || check_warn "Scraping may be down"

echo ""
echo "4. Checking Grafana Configuration..."
datasources_json=\$(curl -s -u admin:admin http://localhost:3000/api/datasources)
echo "\$datasources_json" | grep -q "Prometheus" && check_pass "Prometheus datasource configured" || check_fail "Datasource NOT configured"

echo ""
echo "========================================"
echo -e "${GREEN}Passed: $passed${NC} | ${YELLOW}Warnings: $warnings${NC} | ${RED}Failed: $failed${NC}"

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ MONITORING STACK: OPERATIONAL${NC}"
    exit 0
else
    echo -e "${RED}❌ MONITORING STACK: DEGRADED${NC}"
    exit 1
fi
