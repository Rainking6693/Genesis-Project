#!/bin/bash
#
# Continuous Production Monitoring Script for Genesis System
# Runs automated health checks every 5 minutes during 48-hour monitoring period
#
# Usage:
#   ./scripts/continuous_monitoring.sh        # Run once
#   ./scripts/continuous_monitoring.sh --loop # Run continuously every 5 minutes
#
# Author: Forge (Testing & Validation Specialist)
# Date: 2025-10-18

set -e

# Configuration
PROJECT_ROOT="/home/genesis/genesis-rebuild"
MONITORING_LOG="${PROJECT_ROOT}/logs/continuous_monitoring.log"
METRICS_FILE="${PROJECT_ROOT}/monitoring/metrics_snapshot.json"
ALERT_FILE="${PROJECT_ROOT}/monitoring/alerts_triggered.json"
INTERVAL_SECONDS=300  # 5 minutes

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo "${timestamp} [${level}] ${message}" | tee -a "${MONITORING_LOG}"
}

# Check if monitoring services are running
check_monitoring_services() {
    log "INFO" "Checking monitoring services..."

    local services_ok=true

    # Check Prometheus
    if curl -sf http://localhost:9090/api/v1/targets > /dev/null 2>&1; then
        log "INFO" "✓ Prometheus is running"
    else
        log "WARN" "✗ Prometheus is not responding"
        services_ok=false
    fi

    # Check Grafana
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log "INFO" "✓ Grafana is running"
    else
        log "WARN" "✗ Grafana is not responding"
        services_ok=false
    fi

    # Check Alertmanager
    if curl -sf http://localhost:9093/api/v2/status > /dev/null 2>&1; then
        log "INFO" "✓ Alertmanager is running"
    else
        log "WARN" "✗ Alertmanager is not responding"
        services_ok=false
    fi

    if [ "$services_ok" = false ]; then
        log "WARN" "Some monitoring services are not running. Start with: cd monitoring && docker-compose up -d"
    fi
}

# Run production health tests
run_health_tests() {
    log "INFO" "Running production health tests..."

    cd "${PROJECT_ROOT}"

    # Run production health test suite
    python3 -m pytest tests/test_production_health.py \
        -v \
        --tb=short \
        --color=yes \
        --junitxml=monitoring/health_test_results.xml \
        2>&1 | tee -a "${MONITORING_LOG}"

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        log "INFO" "✓ All health tests passed"
        return 0
    else
        log "ERROR" "✗ Some health tests failed (exit code: ${exit_code})"
        return $exit_code
    fi
}

# Calculate and report SLO metrics
report_slo_metrics() {
    log "INFO" "Calculating SLO metrics..."

    # Parse test results
    if [ -f "${PROJECT_ROOT}/monitoring/health_test_results.xml" ]; then
        # Extract pass rate from JUnit XML
        local tests=$(grep -o 'tests="[0-9]*"' monitoring/health_test_results.xml | grep -o '[0-9]*' | head -1)
        local failures=$(grep -o 'failures="[0-9]*"' monitoring/health_test_results.xml | grep -o '[0-9]*' | head -1)
        local errors=$(grep -o 'errors="[0-9]*"' monitoring/health_test_results.xml | grep -o '[0-9]*' | head -1)

        tests=${tests:-0}
        failures=${failures:-0}
        errors=${errors:-0}

        local passed=$((tests - failures - errors))
        local pass_rate=0

        if [ $tests -gt 0 ]; then
            pass_rate=$(awk "BEGIN {printf \"%.1f\", ($passed / $tests) * 100}")
        fi

        log "INFO" "Test Pass Rate: ${pass_rate}% (SLO: ≥95%)"

        # Check SLO threshold
        if (( $(echo "$pass_rate < 95.0" | bc -l) )); then
            log "ERROR" "CRITICAL: Pass rate ${pass_rate}% below 95% SLO threshold"
            trigger_alert "test_pass_rate" "Pass rate ${pass_rate}% below 95% SLO" "critical"
        elif (( $(echo "$pass_rate < 98.0" | bc -l) )); then
            log "WARN" "WARNING: Pass rate ${pass_rate}% below 98% warning threshold"
            trigger_alert "test_pass_rate" "Pass rate ${pass_rate}% below 98% warning" "warning"
        fi
    fi

    # Check system resources
    local memory_percent=$(free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}')
    local cpu_percent=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local disk_percent=$(df -h "${PROJECT_ROOT}" | tail -1 | awk '{print $5}' | sed 's/%//')

    log "INFO" "System Resources: CPU ${cpu_percent}%, Memory ${memory_percent}%, Disk ${disk_percent}%"

    # Check resource thresholds
    if (( $(echo "$memory_percent > 95.0" | bc -l) )); then
        log "ERROR" "CRITICAL: Memory usage ${memory_percent}% exceeds 95%"
        trigger_alert "memory_exhaustion" "Memory at ${memory_percent}%" "critical"
    elif (( $(echo "$memory_percent > 80.0" | bc -l) )); then
        log "WARN" "WARNING: Memory usage ${memory_percent}% exceeds 80%"
        trigger_alert "high_memory" "Memory at ${memory_percent}%" "warning"
    fi
}

# Trigger alert
trigger_alert() {
    local alert_name="$1"
    local description="$2"
    local severity="$3"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Create alert JSON
    local alert_json=$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "alert": "${alert_name}",
  "description": "${description}",
  "severity": "${severity}",
  "status": "firing"
}
EOF
)

    # Append to alerts file
    mkdir -p "$(dirname "${ALERT_FILE}")"

    if [ ! -f "${ALERT_FILE}" ]; then
        echo "[]" > "${ALERT_FILE}"
    fi

    # Add alert to JSON array
    local temp_file=$(mktemp)
    jq ". += [${alert_json}]" "${ALERT_FILE}" > "${temp_file}" && mv "${temp_file}" "${ALERT_FILE}"

    log "ALERT" "[${severity}] ${alert_name}: ${description}"

    # Send to Alertmanager if running
    if curl -sf http://localhost:9093/api/v2/status > /dev/null 2>&1; then
        curl -XPOST -H "Content-Type: application/json" \
            http://localhost:9093/api/v1/alerts \
            -d "[{
                \"labels\": {
                    \"alertname\": \"${alert_name}\",
                    \"severity\": \"${severity}\",
                    \"component\": \"continuous_monitoring\"
                },
                \"annotations\": {
                    \"summary\": \"${description}\",
                    \"description\": \"${description}\"
                }
            }]" > /dev/null 2>&1
    fi
}

# Generate monitoring report
generate_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log "INFO" "Generating monitoring report..."

    cat <<EOF

==========================================
Genesis Production Health Report
Generated: ${timestamp}
==========================================

EOF

    # Show recent alerts
    if [ -f "${ALERT_FILE}" ]; then
        local alert_count=$(jq 'length' "${ALERT_FILE}")
        log "INFO" "Total alerts triggered: ${alert_count}"

        if [ $alert_count -gt 0 ]; then
            log "INFO" "Recent alerts:"
            jq -r '.[-5:] | .[] | "  [\(.severity)] \(.timestamp) - \(.alert): \(.description)"' "${ALERT_FILE}" | tee -a "${MONITORING_LOG}"
        fi
    fi

    # Show metrics trend
    if [ -f "${METRICS_FILE}" ]; then
        local snapshot_count=$(jq 'length' "${METRICS_FILE}")
        log "INFO" "Metrics snapshots collected: ${snapshot_count}"

        if [ $snapshot_count -gt 0 ]; then
            log "INFO" "Latest metrics:"
            jq -r '.[-1] | "  CPU: \(.cpu_percent)%, Memory: \(.memory_percent)%, Disk: \(.disk_percent)%"' "${METRICS_FILE}" | tee -a "${MONITORING_LOG}"
        fi
    fi
}

# Main monitoring loop
main() {
    local run_once=true

    if [ "$1" = "--loop" ]; then
        run_once=false
        log "INFO" "Starting continuous monitoring (every ${INTERVAL_SECONDS}s)..."
        log "INFO" "Press Ctrl+C to stop"
    fi

    # Ensure directories exist
    mkdir -p "${PROJECT_ROOT}/logs"
    mkdir -p "${PROJECT_ROOT}/monitoring"

    while true; do
        log "INFO" "=========================================="
        log "INFO" "Starting health check cycle..."

        # Check monitoring services
        check_monitoring_services

        # Run health tests
        if run_health_tests; then
            report_slo_metrics
        else
            log "ERROR" "Health tests failed - investigating..."
            report_slo_metrics
        fi

        # Generate report
        generate_report

        log "INFO" "Health check cycle completed"

        # Exit if running once
        if [ "$run_once" = true ]; then
            break
        fi

        # Wait for next cycle
        log "INFO" "Next check in ${INTERVAL_SECONDS} seconds..."
        sleep ${INTERVAL_SECONDS}
    done
}

# Run main function
main "$@"
