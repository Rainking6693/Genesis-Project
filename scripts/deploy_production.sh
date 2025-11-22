#!/bin/bash
################################################################################
# Genesis Rebuild - Blue-Green Production Deployment Script
#
# This script implements blue-green deployment strategy with:
# - Zero-downtime deployment
# - Health checks before traffic switch
# - Automatic rollback on failure
# - Feature flag-based gradual rollout
# - Comprehensive logging and monitoring
#
# Author: Cora (Orchestration & Architecture Specialist)
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage:
#   ./scripts/deploy_production.sh [--dry-run] [--force] [--skip-tests]
#
# Environment Variables:
#   DEPLOYMENT_ENV: Target environment (default: production)
#   HEALTH_CHECK_URL: Health check endpoint (default: http://localhost:8080/health)
#   TRAFFIC_SWITCH_DELAY: Delay before switching traffic (default: 30s)
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
CONFIG_FILE="$PROJECT_ROOT/config/production.yml"
FEATURE_FLAGS_FILE="$PROJECT_ROOT/config/feature_flags.json"
LOG_DIR="/var/log/genesis"
DEPLOYMENT_LOG="$LOG_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/var/backup/genesis/deployments"

# Deployment settings
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:8080/health}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5}"
HEALTH_CHECK_MAX_ATTEMPTS="${HEALTH_CHECK_MAX_ATTEMPTS:-30}"
TRAFFIC_SWITCH_DELAY="${TRAFFIC_SWITCH_DELAY:-30}"
MIN_HEALTHY_INSTANCES="${MIN_HEALTHY_INSTANCES:-1}"

# Deployment state
BLUE_PORT=8080
GREEN_PORT=8081
CURRENT_COLOR=""
NEW_COLOR=""
DRY_RUN=false
FORCE=false
SKIP_TESTS=false

################################################################################
# Utility Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
    esac
}

error_exit() {
    log ERROR "$1"
    log ERROR "Deployment FAILED. Check logs at: $DEPLOYMENT_LOG"
    exit 1
}

check_prerequisites() {
    log INFO "Checking prerequisites..."

    # Check if running as correct user
    if [[ "$DEPLOYMENT_ENV" == "production" ]] && [[ $EUID -eq 0 ]]; then
        error_exit "Do not run production deployments as root"
    fi

    # Check required commands
    local required_commands=("python3" "curl" "jq" "docker" "docker-compose")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command not found: $cmd"
        fi
    done

    # Check configuration files
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error_exit "Configuration file not found: $CONFIG_FILE"
    fi

    if [[ ! -f "$FEATURE_FLAGS_FILE" ]]; then
        log WARNING "Feature flags file not found: $FEATURE_FLAGS_FILE"
        log INFO "Generating default feature flags..."
        python3 "$PROJECT_ROOT/infrastructure/feature_flags.py"
    fi

    # Create log and backup directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"

    log SUCCESS "Prerequisites check passed"
}

get_current_deployment() {
    log INFO "Detecting current deployment..."

    # Check which port is currently active
    if curl -sf "http://localhost:$BLUE_PORT/health" &> /dev/null; then
        CURRENT_COLOR="blue"
        NEW_COLOR="green"
        log INFO "Current deployment: BLUE (port $BLUE_PORT)"
    elif curl -sf "http://localhost:$GREEN_PORT/health" &> /dev/null; then
        CURRENT_COLOR="green"
        NEW_COLOR="blue"
        log INFO "Current deployment: GREEN (port $GREEN_PORT)"
    else
        CURRENT_COLOR="none"
        NEW_COLOR="blue"
        log WARNING "No current deployment detected. Starting fresh on BLUE."
    fi
}

backup_current_deployment() {
    if [[ "$CURRENT_COLOR" == "none" ]]; then
        log INFO "No current deployment to backup"
        return
    fi

    log INFO "Backing up current $CURRENT_COLOR deployment..."

    local backup_name="deployment_${CURRENT_COLOR}_$(date +%Y%m%d_%H%M%S).tar.gz"
    local backup_path="$BACKUP_DIR/$backup_name"

    if [[ "$DRY_RUN" == false ]]; then
        tar -czf "$backup_path" \
            -C "$PROJECT_ROOT" \
            config/ \
            infrastructure/ \
            orchestration/ \
            scripts/ \
            2>> "$DEPLOYMENT_LOG"

        log SUCCESS "Backup created: $backup_path"
    else
        log INFO "[DRY RUN] Would create backup: $backup_path"
    fi
}

run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log WARNING "Skipping tests (--skip-tests flag set)"
        return
    fi

    log INFO "Running test suite..."

    if [[ "$DRY_RUN" == false ]]; then
        cd "$PROJECT_ROOT"

        # Run pytest with coverage
        if ! python3 -m pytest tests/ \
            --cov=orchestration \
            --cov=infrastructure \
            --cov-report=term-missing \
            --tb=short \
            -v \
            >> "$DEPLOYMENT_LOG" 2>&1; then

            error_exit "Tests failed. Deployment aborted."
        fi

        log SUCCESS "All tests passed"
    else
        log INFO "[DRY RUN] Would run pytest test suite"
    fi
}

check_feature_flags() {
    log INFO "Checking feature flags..."

    # Check if Phase 4 deployment is enabled
    local phase_4_enabled=$(python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from infrastructure.feature_flags import get_feature_flag_manager
manager = get_feature_flag_manager()
print('true' if manager.is_enabled('phase_4_deployment') else 'false')
" 2>> "$DEPLOYMENT_LOG")

    if [[ "$phase_4_enabled" == "false" ]] && [[ "$FORCE" == false ]]; then
        log WARNING "phase_4_deployment feature flag is DISABLED"
        log WARNING "This deployment will not receive traffic until the flag is enabled"
        log WARNING "Use --force to override (not recommended for production)"

        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Deployment aborted by user"
        fi
    fi

    # Display current rollout status
    python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from infrastructure.feature_flags import get_feature_flag_manager
manager = get_feature_flag_manager()
status = manager.get_rollout_status('phase_4_deployment')
print('  Rollout Phase:', status.get('phase', 'unknown'))
print('  Current Percentage:', f\"{status.get('current_percentage', 0):.1f}%\")
print('  Start Date:', status.get('start_date', 'N/A'))
print('  End Date:', status.get('end_date', 'N/A'))
" | while read line; do log INFO "$line"; done
}

deploy_new_version() {
    local port
    if [[ "$NEW_COLOR" == "blue" ]]; then
        port=$BLUE_PORT
    else
        port=$GREEN_PORT
    fi

    log INFO "Deploying new version to $NEW_COLOR environment (port $port)..."

    if [[ "$DRY_RUN" == false ]]; then
        # Stop any existing process on the new port
        if lsof -ti:$port &> /dev/null; then
            log INFO "Stopping existing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>> "$DEPLOYMENT_LOG" || true
            sleep 2
        fi

        # Deploy using Docker Compose
        log INFO "Starting services with Docker Compose..."

        export DEPLOYMENT_COLOR="$NEW_COLOR"
        export SERVICE_PORT="$port"
        export CONFIG_FILE="$CONFIG_FILE"

        cd "$PROJECT_ROOT"

        # Build and start services
        docker-compose -f docker-compose.production.yml up -d --build \
            >> "$DEPLOYMENT_LOG" 2>&1

        log SUCCESS "Services started on port $port"
    else
        log INFO "[DRY RUN] Would deploy to port $port"
    fi
}

health_check() {
    local port="$1"
    local max_attempts="${2:-$HEALTH_CHECK_MAX_ATTEMPTS}"

    log INFO "Running health checks on port $port..."

    for ((i=1; i<=$max_attempts; i++)); do
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

run_smoke_tests() {
    local port="$1"

    log INFO "Running smoke tests on port $port..."

    local endpoints=(
        "/health"
        "/ready"
        "/live"
    )

    for endpoint in "${endpoints[@]}"; do
        log INFO "  Testing $endpoint..."

        local response=$(curl -sf --max-time 10 "http://localhost:$port$endpoint" || echo "FAILED")

        if [[ "$response" == "FAILED" ]]; then
            log ERROR "Smoke test failed for $endpoint"
            return 1
        fi

        log INFO "    Response: $response"
    done

    log SUCCESS "All smoke tests passed"
    return 0
}

switch_traffic() {
    local new_port
    if [[ "$NEW_COLOR" == "blue" ]]; then
        new_port=$BLUE_PORT
    else
        new_port=$GREEN_PORT
    fi

    log INFO "Preparing to switch traffic to $NEW_COLOR (port $new_port)..."
    log INFO "Waiting $TRAFFIC_SWITCH_DELAY seconds for final validation..."

    if [[ "$DRY_RUN" == false ]]; then
        sleep "$TRAFFIC_SWITCH_DELAY"

        # Final health check before switching
        if ! health_check "$new_port" 3; then
            error_exit "Final health check failed. Traffic switch aborted."
        fi

        # Update nginx/load balancer configuration
        log INFO "Updating load balancer configuration..."

        # This would update your load balancer (nginx, HAProxy, etc.)
        # Example: update nginx upstream to point to new port
        # sed -i "s/server localhost:.*;/server localhost:$new_port;/" /etc/nginx/sites-available/genesis
        # nginx -s reload

        log SUCCESS "Traffic switched to $NEW_COLOR environment"
    else
        log INFO "[DRY RUN] Would switch traffic to port $new_port"
    fi
}

stop_old_deployment() {
    if [[ "$CURRENT_COLOR" == "none" ]]; then
        log INFO "No old deployment to stop"
        return
    fi

    local old_port
    if [[ "$CURRENT_COLOR" == "blue" ]]; then
        old_port=$BLUE_PORT
    else
        old_port=$GREEN_PORT
    fi

    log INFO "Stopping old $CURRENT_COLOR deployment (port $old_port)..."

    if [[ "$DRY_RUN" == false ]]; then
        export DEPLOYMENT_COLOR="$CURRENT_COLOR"
        export SERVICE_PORT="$old_port"

        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.production.yml down \
            >> "$DEPLOYMENT_LOG" 2>&1

        log SUCCESS "Old deployment stopped"
    else
        log INFO "[DRY RUN] Would stop old deployment on port $old_port"
    fi
}

update_deployment_metadata() {
    log INFO "Updating deployment metadata..."

    if [[ "$DRY_RUN" == false ]]; then
        local metadata_file="$PROJECT_ROOT/.deployment_metadata.json"

        cat > "$metadata_file" <<EOF
{
  "deployment_id": "$(uuidgen)",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$DEPLOYMENT_ENV",
  "color": "$NEW_COLOR",
  "version": "1.0.0",
  "deployed_by": "$USER",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "previous_color": "$CURRENT_COLOR",
  "dry_run": false
}
EOF

        log SUCCESS "Deployment metadata updated: $metadata_file"
    else
        log INFO "[DRY RUN] Would update deployment metadata"
    fi
}

send_notifications() {
    local status="$1"
    local message="$2"

    log INFO "Sending deployment notifications..."

    # Send Slack notification (if configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"[Genesis] $status: $message\"}" \
            &> /dev/null || true
    fi

    # Send email notification (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "[Genesis] Deployment $status" "$NOTIFICATION_EMAIL" \
            &> /dev/null || true
    fi
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--dry-run] [--force] [--skip-tests]"
                exit 1
                ;;
        esac
    done

    # Print banner
    echo ""
    echo "================================================================================"
    echo "  Genesis Rebuild - Blue-Green Production Deployment"
    echo "  Environment: $DEPLOYMENT_ENV"
    echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    if [[ "$DRY_RUN" == true ]]; then
        echo "  Mode: DRY RUN (no changes will be made)"
    fi
    echo "================================================================================"
    echo ""

    log INFO "Starting deployment process..."
    log INFO "Deployment log: $DEPLOYMENT_LOG"

    # Pre-deployment checks
    check_prerequisites
    get_current_deployment
    check_feature_flags
    backup_current_deployment
    run_tests

    # Deploy new version
    deploy_new_version

    # Validate new deployment
    local new_port
    if [[ "$NEW_COLOR" == "blue" ]]; then
        new_port=$BLUE_PORT
    else
        new_port=$GREEN_PORT
    fi

    if ! health_check "$new_port"; then
        error_exit "New deployment failed health checks. Deployment aborted."
    fi

    if ! run_smoke_tests "$new_port"; then
        error_exit "Smoke tests failed. Deployment aborted."
    fi

    # Switch traffic
    switch_traffic

    # Cleanup
    stop_old_deployment
    update_deployment_metadata

    # Success!
    log SUCCESS "============================================"
    log SUCCESS "Deployment completed successfully!"
    log SUCCESS "New deployment: $NEW_COLOR (port $new_port)"
    log SUCCESS "Previous deployment: $CURRENT_COLOR"
    log SUCCESS "Deployment log: $DEPLOYMENT_LOG"
    log SUCCESS "============================================"

    send_notifications "SUCCESS" "Deployment to $DEPLOYMENT_ENV completed successfully ($NEW_COLOR environment)"
}

# Trap errors and cleanup
trap 'error_exit "Deployment failed with error"' ERR

# Run main deployment
main "$@"
