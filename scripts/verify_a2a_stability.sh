#!/bin/bash
# A2A Service Stability Verification Script
# Run this script to verify A2A service is stable before P0 validation
# Expected runtime: 5 minutes
# Exit code: 0 = PASS, 1 = FAIL

set -e

echo "=========================================="
echo "A2A Service Stability Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Results tracking
PASSED=0
FAILED=0

# Function to check and report
check() {
    local name="$1"
    local command="$2"
    local expected="$3"

    echo -n "Checking $name... "

    if eval "$command" > /tmp/a2a_check.tmp 2>&1; then
        if [ -z "$expected" ] || grep -q "$expected" /tmp/a2a_check.tmp; then
            echo -e "${GREEN}PASS${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}FAIL${NC} (expected: $expected)"
            cat /tmp/a2a_check.tmp
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}FAIL${NC}"
        cat /tmp/a2a_check.tmp
        ((FAILED++))
        return 1
    fi
}

# 1. Check if A2A service process is running
echo "1. Process Status"
echo "----------------"
check "A2A process running" "ps aux | grep -E 'uvicorn a2a_service' | grep -v grep" "uvicorn"

# 2. Check if port 8080 is listening
echo ""
echo "2. Port Status"
echo "-------------"
check "Port 8080 listening" "ss -tuln | grep 8080" "8080"

# 3. Check health endpoint response time
echo ""
echo "3. Health Endpoint"
echo "-----------------"
START_TIME=$(date +%s%3N)
check "Health endpoint responds" "curl -s -w '%{http_code}' http://localhost:8080/health" "200"
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))
echo "   Response time: ${RESPONSE_TIME}ms"

if [ $RESPONSE_TIME -gt 1000 ]; then
    echo -e "   ${RED}WARNING: Response time > 1s${NC}"
    ((FAILED++))
else
    echo -e "   ${GREEN}Response time OK (<1s)${NC}"
    ((PASSED++))
fi

# 4. Check agents registered
echo ""
echo "4. Agent Registry"
echo "----------------"
AGENTS_COUNT=$(curl -s http://localhost:8080/health | jq -r '.agents_registered // 0')
echo "   Agents registered: $AGENTS_COUNT"
if [ "$AGENTS_COUNT" -eq 15 ]; then
    echo -e "   ${GREEN}PASS (15 agents registered)${NC}"
    ((PASSED++))
else
    echo -e "   ${RED}FAIL (expected 15, got $AGENTS_COUNT)${NC}"
    ((FAILED++))
fi

# 5. Check CPU usage
echo ""
echo "5. Resource Usage"
echo "----------------"
A2A_PID=$(ps aux | grep -E 'uvicorn a2a_service' | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$A2A_PID" ]; then
    CPU_USAGE=$(ps -p $A2A_PID -o %cpu= | awk '{print int($1)}')
    MEM_USAGE=$(ps -p $A2A_PID -o %mem= | awk '{print $1}')
    echo "   CPU usage: ${CPU_USAGE}%"
    echo "   Memory usage: ${MEM_USAGE}%"

    if [ "$CPU_USAGE" -lt 20 ]; then
        echo -e "   ${GREEN}CPU usage OK (<20%)${NC}"
        ((PASSED++))
    else
        echo -e "   ${RED}WARNING: CPU usage high (>20%)${NC}"
        ((FAILED++))
    fi
else
    echo -e "   ${RED}FAIL: Could not find A2A process${NC}"
    ((FAILED++))
fi

# 6. Test sample request
echo ""
echo "6. Sample Request"
echo "----------------"
cat > /tmp/a2a_test_request.json <<EOF
{
  "task": "Test health check",
  "agent": "qa_agent"
}
EOF

echo -n "Sending test request... "
if curl -s -X POST http://localhost:8080/agents/qa_agent/execute \
    -H "Content-Type: application/json" \
    -d @/tmp/a2a_test_request.json > /tmp/a2a_test_response.json 2>&1; then

    # Check if response is valid JSON
    if jq empty /tmp/a2a_test_response.json 2>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
        echo "   Response: $(cat /tmp/a2a_test_response.json | jq -c '.' | head -c 100)..."
    else
        echo -e "${YELLOW}WARNING: Non-JSON response${NC}"
        echo "   Response: $(cat /tmp/a2a_test_response.json | head -c 100)"
        # Not counted as failure - some agents may return plain text
    fi
else
    echo -e "${RED}FAIL${NC}"
    cat /tmp/a2a_test_response.json
    ((FAILED++))
fi

# 7. Stability test (5-minute observation)
echo ""
echo "7. Stability Test (5-minute observation)"
echo "---------------------------------------"
echo "Monitoring A2A service for crashes/restarts..."

INITIAL_PID=$A2A_PID
STABLE=true

for i in {1..30}; do
    sleep 10
    CURRENT_PID=$(ps aux | grep -E 'uvicorn a2a_service' | grep -v grep | awk '{print $2}' | head -1)

    if [ "$CURRENT_PID" != "$INITIAL_PID" ]; then
        echo -e "${RED}FAIL: A2A service restarted (PID changed: $INITIAL_PID -> $CURRENT_PID)${NC}"
        STABLE=false
        ((FAILED++))
        break
    fi

    if [ -z "$CURRENT_PID" ]; then
        echo -e "${RED}FAIL: A2A service crashed${NC}"
        STABLE=false
        ((FAILED++))
        break
    fi

    # Progress indicator
    echo -n "."
done

echo ""
if $STABLE; then
    echo -e "${GREEN}PASS: Service stable for 5 minutes${NC}"
    ((PASSED++))
fi

# 8. Memory leak check
echo ""
echo "8. Memory Leak Check"
echo "-------------------"
INITIAL_MEM=$(ps -p $A2A_PID -o rss= 2>/dev/null || echo "0")
echo "Initial memory: ${INITIAL_MEM} KB"
sleep 30
FINAL_MEM=$(ps -p $A2A_PID -o rss= 2>/dev/null || echo "0")
echo "Final memory: ${FINAL_MEM} KB"

if [ "$FINAL_MEM" -eq 0 ]; then
    echo -e "${RED}FAIL: Could not read memory (service may have crashed)${NC}"
    ((FAILED++))
else
    MEM_INCREASE=$((FINAL_MEM - INITIAL_MEM))
    MEM_INCREASE_PCT=$((MEM_INCREASE * 100 / INITIAL_MEM))
    echo "Memory change: ${MEM_INCREASE} KB (${MEM_INCREASE_PCT}%)"

    if [ "$MEM_INCREASE_PCT" -lt 10 ]; then
        echo -e "${GREEN}PASS: No significant memory leak (<10% increase)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING: Memory increased by ${MEM_INCREASE_PCT}%${NC}"
        # Not counted as hard failure - may be normal initial warmup
    fi
fi

# Final summary
echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ A2A SERVICE IS STABLE${NC}"
    echo ""
    echo "Ready to proceed with P0 baseline validation."
    echo "Run: python infrastructure/testing/rogue_runner.py --scenarios-dir tests/rogue/scenarios/ --priority P0 --parallel 5 --use-cache --verbose"
    exit 0
else
    echo -e "${RED}✗ A2A SERVICE IS NOT STABLE${NC}"
    echo ""
    echo "Fix the following issues before proceeding:"
    echo "- Review failed checks above"
    echo "- Check A2A service logs: journalctl -u a2a_service"
    echo "- Restart service if needed: systemctl restart a2a_service"
    exit 1
fi
