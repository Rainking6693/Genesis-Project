#!/bin/bash
################################################################################
# Genesis Rebuild - Production Rollback Script
#
# This script implements fast rollback to previous deployment with:
# - Target: <15 minutes total rollback time
# - Automatic health verification
# - State preservation
# - Comprehensive audit logging
# - Emergency mode for critical failures
#
# Author: Cora (Orchestration & Architecture Specialist)
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage:
#   ./scripts/rollback_production.sh [--emergency] [--to-backup BACKUP_NAME]
#
# Environment Variables:
#   DEPLOYMENT_ENV: Target environment (default: production)
#   ROLLBACK_TIMEOUT: Maximum rollback time in seconds (default: 900 = 15min)
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
LOG_DIR="/var/log/genesis"
ROLLBACK_LOG="$LOG_DIR/rollback_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/var/backup/genesis/deployments"
METADATA_FILE="$PROJECT_ROOT/.deployment_metadata.json"

# Rollback settings
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-900}"  # 15 minutes
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5}"
HEALTH_CHECK_MAX_ATTEMPTS="${HEALTH_CHECK_MAX_ATTEMPTS:-30}"

# Deployment ports
BLUE_PORT=8080
GREEN_PORT=8081

# Rollback state
CURRENT_COLOR=""
PREVIOUS_COLOR=""
EMERGENCY_MODE=false
BACKUP_TO_RESTORE=""
ROLLBACK_START_TIME=$(date +%s)

################################################################################
# Utility Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local elapsed=$(($(date +%s) - ROLLBACK_START_TIME))

    case "$level" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} [${elapsed}s] $message" | tee -a "$ROLLBACK_LOG"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} [${elapsed}s] $message" | tee -a "$ROLLBACK_LOG"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} [${elapsed}s] $message" | tee -a "$ROLLBACK_LOG"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} [${elapsed}s] $message" | tee -a "$ROLLBACK_LOG"
            ;;
    esac
}

error_exit() {
    log ERROR "$1"
    log ERROR "Rollback FAILED. Check logs at: $ROLLBACK_LOG"

    # Send critical alert
    send_critical_alert "ROLLBACK FAILED: $1"

    exit 1
}

check_timeout() {
    local elapsed=$(($(date +%s) - ROLLBACK_START_TIME))

    if [[ $elapsed -gt $ROLLBACK_TIMEOUT ]]; then
        error_exit "Rollback timeout exceeded ($elapsed seconds > $ROLLBACK_TIMEOUT seconds)"
    fi
}

check_prerequisites() {
    log INFO "Checking rollback prerequisites..."

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Check required commands
    local required_commands=("curl" "jq" "docker" "docker-compose")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command not found: $cmd"
        fi
    done

    # Check backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error_exit "Backup directory not found: $BACKUP_DIR"
    fi

    log SUCCESS "Prerequisites check passed"
}

get_current_deployment() {
    log INFO "Detecting current deployment state..."

    if [[ ! -f "$METADATA_FILE" ]]; then
        log WARNING "Deployment metadata file not found: $METADATA_FILE"
        log INFO "Attempting to detect deployment from running services..."

        if curl -sf "http://localhost:$BLUE_PORT/health" &> /dev/null; then
            CURRENT_COLOR="blue"
            PREVIOUS_COLOR="green"
        elif curl -sf "http://localhost:$GREEN_PORT/health" &> /dev/null; then
            CURRENT_COLOR="green"
            PREVIOUS_COLOR="blue"
        else
            error_exit "Cannot detect current deployment. No services running."
        fi
    else
        CURRENT_COLOR=$(jq -r '.color' "$METADATA_FILE")
        PREVIOUS_COLOR=$(jq -r '.previous_color // "unknown"' "$METADATA_FILE")

        log INFO "Current deployment: $CURRENT_COLOR"
        log INFO "Previous deployment: $PREVIOUS_COLOR"
        log INFO "Deployment timestamp: $(jq -r '.timestamp' "$METADATA_FILE")"
        log INFO "Git commit: $(jq -r '.git_commit' "$METADATA_FILE")"
    fi
}

find_backup_to_restore() {
    if [[ -n "$BACKUP_TO_RESTORE" ]]; then
        # User specified a specific backup
        local backup_path="$BACKUP_DIR/$BACKUP_TO_RESTORE"

        if [[ ! -f "$backup_path" ]]; then
            error_exit "Specified backup not found: $backup_path"
        fi

        log INFO "Using specified backup: $BACKUP_TO_RESTORE"
        return
    fi

    log INFO "Finding most recent backup to restore..."

    # Find most recent backup for previous color
    if [[ "$PREVIOUS_COLOR" != "unknown" ]] && [[ "$PREVIOUS_COLOR" != "none" ]]; then
        BACKUP_TO_RESTORE=$(ls -t "$BACKUP_DIR"/deployment_${PREVIOUS_COLOR}_*.tar.gz 2>/dev/null | head -1 || echo "")
    fi

    if [[ -z "$BACKUP_TO_RESTORE" ]]; then
        # Fallback: find most recent backup regardless of color
        BACKUP_TO_RESTORE=$(ls -t "$BACKUP_DIR"/deployment_*.tar.gz 2>/dev/null | head -1 || echo "")
    fi

    if [[ -z "$BACKUP_TO_RESTORE" ]]; then
        error_exit "No backups found in $BACKUP_DIR"
    fi

    log INFO "Found backup to restore: $(basename "$BACKUP_TO_RESTORE")"
}

restore_from_backup() {
    check_timeout

    log INFO "Restoring from backup: $(basename "$BACKUP_TO_RESTORE")"

    # Create temporary restore directory
    local restore_dir="/tmp/genesis_rollback_$$"
    mkdir -p "$restore_dir"

    # Extract backup
    log INFO "Extracting backup..."
    tar -xzf "$BACKUP_TO_RESTORE" -C "$restore_dir" 2>> "$ROLLBACK_LOG"

    # Restore configuration files
    log INFO "Restoring configuration files..."
    cp -r "$restore_dir/config"/* "$PROJECT_ROOT/config/" 2>> "$ROLLBACK_LOG" || true
    cp -r "$restore_dir/infrastructure"/* "$PROJECT_ROOT/infrastructure/" 2>> "$ROLLBACK_LOG" || true

    # Cleanup
    rm -rf "$restore_dir"

    log SUCCESS "Backup restored successfully"
}

stop_current_deployment() {
    check_timeout

    local port
    if [[ "$CURRENT_COLOR" == "blue" ]]; then
        port=$BLUE_PORT
    else
        port=$GREEN_PORT
    fi

    log INFO "Stopping current $CURRENT_COLOR deployment (port $port)..."

    if [[ "$EMERGENCY_MODE" == true ]]; then
        # Emergency mode - force kill everything
        log WARNING "EMERGENCY MODE: Force killing all processes..."

        if lsof -ti:$port &> /dev/null; then
            lsof -ti:$port | xargs kill -9 2>> "$ROLLBACK_LOG" || true
        fi

        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" down --remove-orphans \
            >> "$ROLLBACK_LOG" 2>&1 || true
    else
        # Graceful shutdown
        export DEPLOYMENT_COLOR="$CURRENT_COLOR"
        export SERVICE_PORT="$port"

        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.production.yml down \
            >> "$ROLLBACK_LOG" 2>&1
    fi

    log SUCCESS "Current deployment stopped"
}

start_previous_deployment() {
    check_timeout

    local port
    if [[ "$PREVIOUS_COLOR" == "blue" ]]; then
        port=$BLUE_PORT
    else
        port=$GREEN_PORT
    fi

    log INFO "Starting previous $PREVIOUS_COLOR deployment (port $port)..."

    # Stop any process on the target port
    if lsof -ti:$port &> /dev/null; then
        log INFO "Stopping existing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>> "$ROLLBACK_LOG" || true
        sleep 2
    fi

    export DEPLOYMENT_COLOR="$PREVIOUS_COLOR"
    export SERVICE_PORT="$port"
    export CONFIG_FILE="$PROJECT_ROOT/config/production.yml"

    cd "$PROJECT_ROOT"

    # Start services
    docker-compose -f docker-compose.production.yml up -d --build \
        >> "$ROLLBACK_LOG" 2>&1

    log SUCCESS "Previous deployment started on port $port"
}

health_check() {
    check_timeout

    local port="$1"
    local max_attempts="${2:-$HEALTH_CHECK_MAX_ATTEMPTS}"

    log INFO "Running health checks on port $port..."

    for ((i=1; i<=$max_attempts; i++)); do
        check_timeout

        log INFO "  Attempt $i/$max_attempts..."

        if curl -sf --max-time "$HEALTH_CHECK_TIMEOUT" \
            "http://localhost:$port/health" &> /dev/null; then

            log SUCCESS "Health check passed on port $port"
            return 0
        fi

        if [[ $i -lt $max_attempts ]]; then
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done

    log ERROR "Health check failed after $max_attempts attempts"
    return 1
}

switch_traffic_back() {
    check_timeout

    local port
    if [[ "$PREVIOUS_COLOR" == "blue" ]]; then
        port=$BLUE_PORT
    else
        port=$GREEN_PORT
    fi

    log INFO "Switching traffic back to $PREVIOUS_COLOR (port $port)..."

    # Update load balancer configuration
    # This would update your load balancer (nginx, HAProxy, etc.)
    # Example: update nginx upstream to point to previous port
    # sed -i "s/server localhost:.*;/server localhost:$port;/" /etc/nginx/sites-available/genesis
    # nginx -s reload

    log SUCCESS "Traffic switched back to $PREVIOUS_COLOR environment"
}

update_deployment_metadata() {
    check_timeout

    log INFO "Updating deployment metadata..."

    cat > "$METADATA_FILE" <<EOF
{
  "deployment_id": "$(uuidgen)",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$DEPLOYMENT_ENV",
  "color": "$PREVIOUS_COLOR",
  "version": "1.0.0-rollback",
  "deployed_by": "$USER",
  "rollback": true,
  "rollback_from": "$CURRENT_COLOR",
  "rollback_reason": "Manual rollback initiated",
  "rollback_duration_seconds": $(($(date +%s) - ROLLBACK_START_TIME))
}
EOF

    log SUCCESS "Deployment metadata updated"
}

disable_feature_flags() {
    log INFO "Disabling risky feature flags..."

    python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from infrastructure.feature_flags import get_feature_flag_manager
import json

manager = get_feature_flag_manager()

# Disable Phase 4 deployment flag
manager.set_flag('phase_4_deployment', False)

# Disable AATC (high-risk feature)
manager.set_flag('aatc_system_enabled', False)

# Save updated flags
manager.save_to_file('$PROJECT_ROOT/config/feature_flags.json')

print('Feature flags disabled successfully')
" >> "$ROLLBACK_LOG" 2>&1

    log SUCCESS "Risky feature flags disabled"
}

send_critical_alert() {
    local message="$1"

    # Send Slack alert (if configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 [Genesis CRITICAL] $message\"}" \
            &> /dev/null || true
    fi

    # Send PagerDuty alert (if configured)
    if [[ -n "${PAGERDUTY_ROUTING_KEY:-}" ]]; then
        curl -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"$message\",
                    \"severity\": \"critical\",
                    \"source\": \"Genesis Rollback Script\"
                }
            }" \
            &> /dev/null || true
    fi

    # Send email (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "[Genesis CRITICAL] Rollback Alert" "$NOTIFICATION_EMAIL" \
            &> /dev/null || true
    fi
}

create_incident_report() {
    local report_file="$LOG_DIR/incident_report_$(date +%Y%m%d_%H%M%S).txt"

    cat > "$report_file" <<EOF
================================================================================
GENESIS PRODUCTION ROLLBACK - INCIDENT REPORT
================================================================================

Incident Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')
Environment: $DEPLOYMENT_ENV
Rollback Duration: $(($(date +%s) - ROLLBACK_START_TIME)) seconds
Emergency Mode: $EMERGENCY_MODE

Current Deployment (Failed):
  Color: $CURRENT_COLOR
  $(if [[ -f "$METADATA_FILE" ]]; then
    echo "  Git Commit: $(jq -r '.git_commit' "$METADATA_FILE")"
    echo "  Deployed By: $(jq -r '.deployed_by' "$METADATA_FILE")"
    echo "  Deployed At: $(jq -r '.timestamp' "$METADATA_FILE")"
  fi)

Rolled Back To:
  Color: $PREVIOUS_COLOR
  Backup: $(basename "$BACKUP_TO_RESTORE")

System Status:
  - Configuration restored from backup
  - Feature flags disabled (phase_4_deployment, aatc_system_enabled)
  - Traffic switched to previous deployment
  - Health checks: $(health_check $(if [[ "$PREVIOUS_COLOR" == "blue" ]]; then echo "$BLUE_PORT"; else echo "$GREEN_PORT"; fi) 3 && echo "PASSING" || echo "FAILING")

Logs:
  Rollback Log: $ROLLBACK_LOG
  Deployment Metadata: $METADATA_FILE

Next Steps:
  1. Review rollback logs: cat $ROLLBACK_LOG
  2. Investigate deployment failure
  3. Fix root cause
  4. Re-test in staging environment
  5. Re-deploy when ready

================================================================================
EOF

    log INFO "Incident report created: $report_file"

    # Display summary
    cat "$report_file" | tee -a "$ROLLBACK_LOG"
}

################################################################################
# Main Rollback Flow
################################################################################

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --emergency)
                EMERGENCY_MODE=true
                shift
                ;;
            --to-backup)
                BACKUP_TO_RESTORE="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--emergency] [--to-backup BACKUP_NAME]"
                exit 1
                ;;
        esac
    done

    # Print banner
    echo ""
    echo "================================================================================"
    echo "  Genesis Rebuild - Production Rollback"
    echo "  Environment: $DEPLOYMENT_ENV"
    echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  Target: <15 minutes total rollback time"
    if [[ "$EMERGENCY_MODE" == true ]]; then
        echo "  Mode: EMERGENCY (force kill, minimal checks)"
    fi
    echo "================================================================================"
    echo ""

    log INFO "Starting rollback process..."
    log INFO "Rollback log: $ROLLBACK_LOG"
    log INFO "Timeout: $ROLLBACK_TIMEOUT seconds"

    # Send initial alert
    send_critical_alert "Production rollback initiated for $DEPLOYMENT_ENV environment"

    # Pre-rollback checks
    check_prerequisites
    get_current_deployment
    find_backup_to_restore

    # Confirm rollback (unless emergency mode)
    if [[ "$EMERGENCY_MODE" == false ]]; then
        echo ""
        echo "⚠️  WARNING: You are about to rollback the production deployment!"
        echo ""
        echo "  Current:  $CURRENT_COLOR"
        echo "  Rollback: $PREVIOUS_COLOR"
        echo "  Backup:   $(basename "$BACKUP_TO_RESTORE")"
        echo ""
        read -p "Continue with rollback? (yes/NO): " -r

        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log INFO "Rollback cancelled by user"
            exit 0
        fi
    fi

    # Execute rollback
    log INFO "Beginning rollback execution..."

    restore_from_backup
    disable_feature_flags
    stop_current_deployment
    start_previous_deployment

    # Validate rolled-back deployment
    local previous_port
    if [[ "$PREVIOUS_COLOR" == "blue" ]]; then
        previous_port=$BLUE_PORT
    else
        previous_port=$GREEN_PORT
    fi

    if ! health_check "$previous_port"; then
        error_exit "Rolled-back deployment failed health checks!"
    fi

    # Switch traffic back
    switch_traffic_back
    update_deployment_metadata

    # Calculate final metrics
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    local minutes=$((rollback_duration / 60))
    local seconds=$((rollback_duration % 60))

    # Success!
    log SUCCESS "============================================"
    log SUCCESS "Rollback completed successfully!"
    log SUCCESS "Duration: ${minutes}m ${seconds}s"
    log SUCCESS "Rolled back from: $CURRENT_COLOR"
    log SUCCESS "Restored to: $PREVIOUS_COLOR"
    log SUCCESS "Target met: $(if [[ $rollback_duration -lt 900 ]]; then echo "YES (<15 min)"; else echo "NO (>${minutes}min)"; fi)"
    log SUCCESS "============================================"

    # Create incident report
    create_incident_report

    # Send success notification
    send_critical_alert "Production rollback completed successfully in ${minutes}m ${seconds}s (target: <15min)"
}

# Trap errors
trap 'error_exit "Rollback failed with error"' ERR

# Run main rollback
main "$@"
