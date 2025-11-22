#!/bin/bash
# Test A2A Service Stability After Lazy Loading Fix
# Hudson - Infrastructure Specialist (Oct 30, 2025)

set -e

echo "=========================================="
echo "A2A SERVICE STABILITY TEST"
echo "Testing lazy loading performance fixes"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass_test() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

fail_test() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVICE_PID" ]; then
        info "Cleaning up service (PID: $SERVICE_PID)"
        kill $SERVICE_PID 2>/dev/null || true
        wait $SERVICE_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Test 1: Service startup time
echo "Test 1: Service Startup Time (<5 seconds)"
echo "-------------------------------------------"

info "Starting A2A service..."
START_TIME=$(date +%s)

# Start service in background
python /home/genesis/genesis-rebuild/a2a_service.py > /tmp/a2a_service.log 2>&1 &
SERVICE_PID=$!

# Wait for service to be ready (max 10 seconds)
TIMEOUT=10
ELAPSED=0
SERVICE_READY=false

while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        SERVICE_READY=true
        break
    fi
    sleep 0.5
    ((ELAPSED++))
done

END_TIME=$(date +%s)
STARTUP_TIME=$((END_TIME - START_TIME))

if [ "$SERVICE_READY" = true ] && [ $STARTUP_TIME -lt 5 ]; then
    pass_test "Service started in ${STARTUP_TIME}s (target: <5s)"
else
    if [ "$SERVICE_READY" = false ]; then
        fail_test "Service did not respond within ${TIMEOUT}s"
    else
        fail_test "Service started in ${STARTUP_TIME}s (target: <5s)"
    fi
fi

echo ""

# Test 2: Health endpoint responds immediately
echo "Test 2: Health Endpoint Response Time"
echo "---------------------------------------"

if [ "$SERVICE_READY" = true ]; then
    HEALTH_START=$(date +%s%3N)
    HEALTH_RESPONSE=$(curl -f -s http://localhost:8080/health)
    HEALTH_END=$(date +%s%3N)
    HEALTH_TIME=$((HEALTH_END - HEALTH_START))

    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        if [ $HEALTH_TIME -lt 1000 ]; then
            pass_test "Health endpoint responded in ${HEALTH_TIME}ms (target: <1000ms)"
        else
            fail_test "Health endpoint too slow: ${HEALTH_TIME}ms (target: <1000ms)"
        fi
    else
        fail_test "Health endpoint returned invalid response"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 3: No agents loaded at startup
echo "Test 3: Lazy Loading Verification"
echo "----------------------------------"

if [ "$SERVICE_READY" = true ]; then
    VERSION_RESPONSE=$(curl -f -s http://localhost:8080/a2a/version)

    AGENTS_LOADED=$(echo "$VERSION_RESPONSE" | grep -o '"agents_loaded":[0-9]*' | cut -d':' -f2)
    AGENTS_REGISTERED=$(echo "$VERSION_RESPONSE" | grep -o '"agents_registered":[0-9]*' | cut -d':' -f2)

    if [ "$AGENTS_LOADED" -eq 0 ]; then
        pass_test "No agents loaded at startup (lazy loading confirmed)"
    else
        fail_test "Agents already loaded at startup: $AGENTS_LOADED (expected: 0)"
    fi

    if [ "$AGENTS_REGISTERED" -eq 15 ]; then
        pass_test "All 15 agents registered in metadata"
    else
        fail_test "Expected 15 agents registered, got: $AGENTS_REGISTERED"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 4: Memory usage at startup
echo "Test 4: Memory Usage at Startup (<500MB)"
echo "-----------------------------------------"

if [ "$SERVICE_READY" = true ] && [ ! -z "$SERVICE_PID" ]; then
    # Get memory usage in KB
    MEMORY_KB=$(ps -o rss= -p $SERVICE_PID 2>/dev/null || echo "0")
    MEMORY_MB=$((MEMORY_KB / 1024))

    if [ $MEMORY_MB -lt 500 ]; then
        pass_test "Memory usage: ${MEMORY_MB}MB (target: <500MB)"
    else
        fail_test "Memory usage too high: ${MEMORY_MB}MB (target: <500MB)"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 5: CPU usage during idle
echo "Test 5: CPU Usage During Idle (<20%)"
echo "-------------------------------------"

if [ "$SERVICE_READY" = true ] && [ ! -z "$SERVICE_PID" ]; then
    info "Measuring CPU usage for 3 seconds..."
    sleep 3

    # Get CPU percentage (averaged over measurement period)
    CPU_PERCENT=$(ps -o %cpu= -p $SERVICE_PID 2>/dev/null | awk '{print int($1)}' || echo "0")

    if [ $CPU_PERCENT -lt 20 ]; then
        pass_test "CPU usage: ${CPU_PERCENT}% (target: <20%)"
    else
        fail_test "CPU usage too high: ${CPU_PERCENT}% (target: <20%)"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 6: Agent lazy loading (first request triggers load)
echo "Test 6: Agent Lazy Loading on First Request"
echo "--------------------------------------------"

if [ "$SERVICE_READY" = true ]; then
    info "Sending request to trigger QA agent lazy load..."

    REQUEST_START=$(date +%s)
    INVOKE_RESPONSE=$(curl -f -s -X POST http://localhost:8080/a2a/invoke \
        -H "Content-Type: application/json" \
        -d '{"tool": "test_feature", "arguments": {"feature": "test"}}' || echo "FAILED")
    REQUEST_END=$(date +%s)
    REQUEST_TIME=$((REQUEST_END - REQUEST_START))

    # Check if agent was loaded
    VERSION_AFTER=$(curl -f -s http://localhost:8080/a2a/version)
    AGENTS_LOADED_AFTER=$(echo "$VERSION_AFTER" | grep -o '"agents_loaded":[0-9]*' | cut -d':' -f2)

    if [ "$AGENTS_LOADED_AFTER" -gt 0 ]; then
        pass_test "Agent lazy-loaded successfully (agents loaded: $AGENTS_LOADED_AFTER)"
    else
        fail_test "Agent not loaded after request"
    fi

    if [ $REQUEST_TIME -lt 10 ]; then
        pass_test "First request completed in ${REQUEST_TIME}s (target: <10s)"
    else
        fail_test "First request too slow: ${REQUEST_TIME}s (target: <10s)"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 7: Subsequent requests use cached agent (<2s)
echo "Test 7: Cached Agent Request Performance"
echo "-----------------------------------------"

if [ "$SERVICE_READY" = true ]; then
    info "Sending second request (should use cached agent)..."

    CACHED_START=$(date +%s)
    CACHED_RESPONSE=$(curl -f -s -X POST http://localhost:8080/a2a/invoke \
        -H "Content-Type: application/json" \
        -d '{"tool": "test_feature", "arguments": {"feature": "test2"}}' || echo "FAILED")
    CACHED_END=$(date +%s)
    CACHED_TIME=$((CACHED_END - CACHED_START))

    if [ $CACHED_TIME -lt 2 ]; then
        pass_test "Cached agent request completed in ${CACHED_TIME}s (target: <2s)"
    else
        fail_test "Cached agent request too slow: ${CACHED_TIME}s (target: <2s)"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Test 8: Infrastructure tools still work (not lazy-loaded)
echo "Test 8: Infrastructure Tools (No Lazy Loading)"
echo "-----------------------------------------------"

if [ "$SERVICE_READY" = true ]; then
    INTENT_RESPONSE=$(curl -f -s -X POST http://localhost:8080/a2a/invoke \
        -H "Content-Type: application/json" \
        -d '{"tool": "extract_intent", "arguments": {"text": "I want to deploy a web app"}}' || echo "FAILED")

    if echo "$INTENT_RESPONSE" | grep -q "result"; then
        pass_test "Infrastructure tools work without lazy loading"
    else
        fail_test "Infrastructure tool failed: $INTENT_RESPONSE"
    fi
else
    fail_test "Service not ready, skipping test"
fi

echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - A2A SERVICE STABLE${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED - REVIEW LOGS${NC}"
    echo ""
    echo "Service logs:"
    tail -n 50 /tmp/a2a_service.log
    exit 1
fi
