#!/bin/bash
# Genesis Automated Test Runner for 48-Hour Monitoring
# Runs test suite and reports metrics to Prometheus

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/genesis/genesis-rebuild"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEST_LOG="${PROJECT_ROOT}/logs/test_results_$(date +%Y%m%d_%H%M%S).log"
METRICS_FILE="${PROJECT_ROOT}/logs/test_metrics.prom"
ALERT_THRESHOLD=0.98  # 98% pass rate SLO

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Genesis Automated Test Run - ${TIMESTAMP} ===" | tee -a "$TEST_LOG"

# Change to project directory
cd "$PROJECT_ROOT"

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo -e "${RED}ERROR:${NC} Virtual environment not found" | tee -a "$TEST_LOG"
    exit 1
fi

# Run test suite with coverage
echo "Running test suite..." | tee -a "$TEST_LOG"
START_TIME=$(date +%s)

pytest tests/ \
    -v \
    --tb=short \
    --junitxml=logs/junit_results.xml \
    --cov=infrastructure \
    --cov=agents \
    --cov-report=term-missing \
    --cov-report=json:logs/coverage.json \
    2>&1 | tee -a "$TEST_LOG"

TEST_EXIT_CODE=${PIPESTATUS[0]}
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Parse test results
if [ -f "logs/junit_results.xml" ]; then
    # Extract test counts from JUnit XML
    TOTAL_TESTS=$(grep -oP 'tests="\K[0-9]+' logs/junit_results.xml | head -1)
    FAILED_TESTS=$(grep -oP 'failures="\K[0-9]+' logs/junit_results.xml | head -1)
    ERROR_TESTS=$(grep -oP 'errors="\K[0-9]+' logs/junit_results.xml | head -1)
    SKIPPED_TESTS=$(grep -oP 'skipped="\K[0-9]+' logs/junit_results.xml | head -1)

    # Calculate passed tests
    PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS - ERROR_TESTS - SKIPPED_TESTS))

    # Calculate pass rate
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        PASS_RATE=$(awk "BEGIN {print ($PASSED_TESTS / $TOTAL_TESTS)}")
    else
        PASS_RATE=0
    fi
else
    echo -e "${YELLOW}WARNING:${NC} JUnit results not found, parsing pytest output..." | tee -a "$TEST_LOG"

    # Fallback: parse pytest output
    TOTAL_TESTS=$(grep -oP '\d+(?= passed)' "$TEST_LOG" | tail -1)
    PASSED_TESTS=${TOTAL_TESTS:-0}
    FAILED_TESTS=$(grep -oP '\d+(?= failed)' "$TEST_LOG" | tail -1)
    FAILED_TESTS=${FAILED_TESTS:-0}
    SKIPPED_TESTS=$(grep -oP '\d+(?= skipped)' "$TEST_LOG" | tail -1)
    SKIPPED_TESTS=${SKIPPED_TESTS:-0}
    ERROR_TESTS=0

    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS + SKIPPED_TESTS))

    if [ "$TOTAL_TESTS" -gt 0 ]; then
        PASS_RATE=$(awk "BEGIN {print ($PASSED_TESTS / $TOTAL_TESTS)}")
    else
        PASS_RATE=0
    fi
fi

# Extract coverage percentage
if [ -f "logs/coverage.json" ]; then
    COVERAGE=$(jq -r '.totals.percent_covered' logs/coverage.json 2>/dev/null || echo "0")
else
    COVERAGE=0
fi

# Generate Prometheus metrics
echo "# HELP genesis_tests_total_total Total number of tests executed" > "$METRICS_FILE"
echo "# TYPE genesis_tests_total_total counter" >> "$METRICS_FILE"
echo "genesis_tests_total_total $TOTAL_TESTS" >> "$METRICS_FILE"

echo "# HELP genesis_tests_passed_total Number of tests passed" >> "$METRICS_FILE"
echo "# TYPE genesis_tests_passed_total counter" >> "$METRICS_FILE"
echo "genesis_tests_passed_total $PASSED_TESTS" >> "$METRICS_FILE"

echo "# HELP genesis_tests_failed_total Number of tests failed" >> "$METRICS_FILE"
echo "# TYPE genesis_tests_failed_total counter" >> "$METRICS_FILE"
echo "genesis_tests_failed_total $FAILED_TESTS" >> "$METRICS_FILE"

echo "# HELP genesis_tests_skipped_total Number of tests skipped" >> "$METRICS_FILE"
echo "# TYPE genesis_tests_skipped_total counter" >> "$METRICS_FILE"
echo "genesis_tests_skipped_total $SKIPPED_TESTS" >> "$METRICS_FILE"

echo "# HELP genesis_test_pass_rate Test pass rate (0-1)" >> "$METRICS_FILE"
echo "# TYPE genesis_test_pass_rate gauge" >> "$METRICS_FILE"
echo "genesis_test_pass_rate $PASS_RATE" >> "$METRICS_FILE"

echo "# HELP genesis_test_duration_seconds Test suite duration" >> "$METRICS_FILE"
echo "# TYPE genesis_test_duration_seconds gauge" >> "$METRICS_FILE"
echo "genesis_test_duration_seconds $DURATION" >> "$METRICS_FILE"

echo "# HELP genesis_test_coverage_percent Code coverage percentage" >> "$METRICS_FILE"
echo "# TYPE genesis_test_coverage_percent gauge" >> "$METRICS_FILE"
echo "genesis_test_coverage_percent $COVERAGE" >> "$METRICS_FILE"

# Export metrics to Prometheus pushgateway (if available)
if command -v curl &> /dev/null; then
    if curl -s http://localhost:9091/metrics &> /dev/null; then
        cat "$METRICS_FILE" | curl --data-binary @- http://localhost:9091/metrics/job/genesis_tests
        echo "Metrics pushed to Prometheus Pushgateway" | tee -a "$TEST_LOG"
    fi
fi

# Print summary
echo "" | tee -a "$TEST_LOG"
echo "=== Test Summary ===" | tee -a "$TEST_LOG"
echo "Total Tests:    $TOTAL_TESTS" | tee -a "$TEST_LOG"
echo "Passed:         $PASSED_TESTS" | tee -a "$TEST_LOG"
echo "Failed:         $FAILED_TESTS" | tee -a "$TEST_LOG"
echo "Skipped:        $SKIPPED_TESTS" | tee -a "$TEST_LOG"
echo "Pass Rate:      $(awk "BEGIN {printf \"%.2f%%\", $PASS_RATE * 100}")" | tee -a "$TEST_LOG"
echo "Coverage:       ${COVERAGE}%" | tee -a "$TEST_LOG"
echo "Duration:       ${DURATION}s" | tee -a "$TEST_LOG"
echo "Timestamp:      ${TIMESTAMP}" | tee -a "$TEST_LOG"

# Check against SLO
PASS_RATE_CHECK=$(awk "BEGIN {print ($PASS_RATE >= $ALERT_THRESHOLD)}")

if [ "$PASS_RATE_CHECK" -eq 1 ]; then
    echo -e "Status:         ${GREEN}PASS${NC} (≥98% SLO met)" | tee -a "$TEST_LOG"
    EXIT_CODE=0
else
    echo -e "Status:         ${RED}FAIL${NC} (<98% SLO not met)" | tee -a "$TEST_LOG"
    EXIT_CODE=1

    # Send alert (if alerting configured)
    if [ -f "${PROJECT_ROOT}/scripts/send_alert.sh" ]; then
        "${PROJECT_ROOT}/scripts/send_alert.sh" \
            "TestPassRateLow" \
            "Test pass rate $(awk "BEGIN {printf \"%.2f%%\", $PASS_RATE * 100}") below 98% SLO" \
            "P1"
    fi
fi

# Identify failing tests (if any)
if [ "$FAILED_TESTS" -gt 0 ]; then
    echo "" | tee -a "$TEST_LOG"
    echo "=== Failing Tests ===" | tee -a "$TEST_LOG"
    grep "FAILED" "$TEST_LOG" | tail -10 | tee -a "$TEST_LOG"
fi

# Archive results
ARCHIVE_DIR="${PROJECT_ROOT}/logs/test_archives/$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"
cp logs/junit_results.xml "$ARCHIVE_DIR/" 2>/dev/null || true
cp logs/coverage.json "$ARCHIVE_DIR/" 2>/dev/null || true
cp "$METRICS_FILE" "$ARCHIVE_DIR/" 2>/dev/null || true

echo "" | tee -a "$TEST_LOG"
echo "Logs: $TEST_LOG" | tee -a "$TEST_LOG"
echo "Metrics: $METRICS_FILE" | tee -a "$TEST_LOG"
echo "Archive: $ARCHIVE_DIR" | tee -a "$TEST_LOG"

exit $EXIT_CODE
