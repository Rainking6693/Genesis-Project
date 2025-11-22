#!/bin/bash

##############################################################################
# Genesis Rebuild - Staging Deployment Script
# Version: 1.0.0
# Last Updated: October 18, 2025
#
# This script automates the deployment of Genesis orchestration system
# to the staging environment with comprehensive validation and rollback.
#
# Usage:
#   ./scripts/deploy_staging.sh [OPTIONS]
#
# Options:
#   --skip-tests          Skip pre-deployment test suite
#   --skip-security       Skip security scans
#   --skip-backup         Skip pre-deployment backup
#   --force               Force deployment without confirmations
#   --dry-run             Show what would be deployed without executing
#   --rollback            Rollback to previous deployment
#   --help                Show this help message
#
# Exit Codes:
#   0   - Success
#   1   - General error
#   2   - Pre-deployment checks failed
#   3   - Deployment failed
#   4   - Post-deployment validation failed
#   5   - Rollback initiated
##############################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/config/staging.yml"
ENV_FILE="$PROJECT_ROOT/.env"
VENV_PATH="$PROJECT_ROOT/venv"
DEPLOYMENT_LOG="/var/log/genesis/deployment_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/backup/genesis/$(date +%Y%m%d_%H%M%S)"

# Deployment settings
REQUIRED_PASS_RATE=0.95
MAX_DEPLOY_TIME=600  # 10 minutes
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=6  # seconds

# Parse command line arguments
SKIP_TESTS=false
SKIP_SECURITY=false
SKIP_BACKUP=false
FORCE=false
DRY_RUN=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            head -n 30 "$0" | tail -n +3
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as correct user
    if [[ $EUID -eq 0 ]]; then
        log_error "Do not run this script as root"
        exit 1
    fi

    # Check required commands
    local required_commands=("python3" "git" "docker" "docker-compose")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done

    # Check Python version
    local python_version=$(python3 --version | awk '{print $2}')
    if [[ ! "$python_version" =~ ^3\.(1[2-9]|[2-9][0-9]) ]]; then
        log_error "Python 3.12+ required (found: $python_version)"
        exit 2
    fi

    # Check if virtual environment exists
    if [[ ! -d "$VENV_PATH" ]]; then
        log_error "Virtual environment not found at $VENV_PATH"
        exit 2
    fi

    # Check if configuration file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 2
    fi

    # Check if .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Copy .env.example to .env and configure your API keys"
        exit 2
    fi

    # Verify API keys are set
    source "$ENV_FILE"
    if [[ -z "${OPENAI_API_KEY:-}" ]] || [[ "$OPENAI_API_KEY" == "your_openai_api_key_here" ]]; then
        log_error "OPENAI_API_KEY not configured in .env"
        exit 2
    fi

    if [[ -z "${ANTHROPIC_API_KEY:-}" ]] || [[ "$ANTHROPIC_API_KEY" == "your_anthropic_api_key_here" ]]; then
        log_error "ANTHROPIC_API_KEY not configured in .env"
        exit 2
    fi

    log_success "Prerequisites check passed"
}

create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_warning "Skipping pre-deployment backup"
        return 0
    fi

    log_info "Creating pre-deployment backup..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would create backup at: $BACKUP_DIR"
        return 0
    fi

    mkdir -p "$BACKUP_DIR"

    # Backup current deployment
    if [[ -d "$PROJECT_ROOT/current" ]]; then
        cp -r "$PROJECT_ROOT/current" "$BACKUP_DIR/code"
        log_info "Code backup created"
    fi

    # Backup databases (if running)
    if docker ps | grep -q genesis-mongodb; then
        docker exec genesis-mongodb mongodump --out "$BACKUP_DIR/mongodb" 2>/dev/null || true
        log_info "MongoDB backup created"
    fi

    if docker ps | grep -q genesis-redis; then
        docker exec genesis-redis redis-cli SAVE 2>/dev/null || true
        docker cp genesis-redis:/data/dump.rdb "$BACKUP_DIR/redis/" 2>/dev/null || true
        log_info "Redis backup created"
    fi

    # Store deployment metadata
    cat > "$BACKUP_DIR/metadata.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "deployed_by": "$USER",
  "hostname": "$(hostname)"
}
EOF

    log_success "Backup created at: $BACKUP_DIR"
}

run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping pre-deployment tests"
        return 0
    fi

    log_info "Running pre-deployment test suite..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would run test suite"
        return 0
    fi

    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"

    # Run tests with coverage
    local test_output
    test_output=$(pytest tests/ \
        --tb=short \
        --maxfail=5 \
        -v \
        2>&1 | tee -a "$DEPLOYMENT_LOG")

    # Parse test results
    local tests_passed=$(echo "$test_output" | grep -oP '\d+(?= passed)' | tail -1 || echo "0")
    local tests_failed=$(echo "$test_output" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")
    local tests_total=$((tests_passed + tests_failed))

    if [[ $tests_total -eq 0 ]]; then
        log_error "No tests found or test execution failed"
        exit 2
    fi

    local pass_rate=$(echo "scale=4; $tests_passed / $tests_total" | bc)
    log_info "Test results: $tests_passed/$tests_total passed ($(echo "scale=2; $pass_rate * 100" | bc)%)"

    # Check against required pass rate
    if (( $(echo "$pass_rate < $REQUIRED_PASS_RATE" | bc -l) )); then
        log_error "Test pass rate ($pass_rate) below required threshold ($REQUIRED_PASS_RATE)"
        exit 2
    fi

    log_success "Test suite passed"
}

run_security_scans() {
    if [[ "$SKIP_SECURITY" == true ]]; then
        log_warning "Skipping security scans"
        return 0
    fi

    log_info "Running security scans..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would run security scans"
        return 0
    fi

    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"

    # Run Bandit (SAST)
    log_info "Running Bandit security scan..."
    bandit -r infrastructure/ agents/ \
        -f json \
        -o "$PROJECT_ROOT/bandit_report.json" \
        -ll \
        2>&1 | tee -a "$DEPLOYMENT_LOG" || true

    # Check for high/critical issues
    local high_issues=$(grep -c '"issue_severity": "HIGH"' "$PROJECT_ROOT/bandit_report.json" 2>/dev/null || echo "0")
    local critical_issues=$(grep -c '"issue_severity": "CRITICAL"' "$PROJECT_ROOT/bandit_report.json" 2>/dev/null || echo "0")

    if [[ $critical_issues -gt 0 ]]; then
        log_error "Found $critical_issues CRITICAL security issues"
        exit 2
    fi

    if [[ $high_issues -gt 0 ]]; then
        log_warning "Found $high_issues HIGH security issues (review recommended)"
    fi

    # Run Safety (dependency check)
    log_info "Running Safety dependency scan..."
    safety check \
        --output json \
        --file requirements_infrastructure.txt \
        > "$PROJECT_ROOT/safety_report.json" 2>&1 || true

    log_success "Security scans completed"
}

deploy_application() {
    log_info "Deploying Genesis orchestration system..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would deploy application"
        return 0
    fi

    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"

    # Stop existing services gracefully
    log_info "Stopping existing services..."
    if [[ -f "$PROJECT_ROOT/scripts/stop_services.sh" ]]; then
        bash "$PROJECT_ROOT/scripts/stop_services.sh" || true
    fi

    # Pull latest code (if in git repo)
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        log_info "Pulling latest code..."
        git pull origin main || log_warning "Git pull failed (continuing anyway)"
    fi

    # Install/update dependencies
    log_info "Installing dependencies..."
    pip install --upgrade pip -q
    pip install -r requirements_infrastructure.txt -q

    # Start infrastructure services (Docker)
    log_info "Starting infrastructure services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d 2>&1 | tee -a "$DEPLOYMENT_LOG" || {
        log_error "Failed to start Docker services"
        exit 3
    }

    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10

    # Start Genesis orchestrator
    log_info "Starting Genesis orchestrator..."
    export ENVIRONMENT=staging
    export CONFIG_FILE="$CONFIG_FILE"

    # Start as background service
    nohup python3 "$PROJECT_ROOT/genesis_orchestrator.py" \
        > /var/log/genesis/orchestrator.log 2>&1 &

    echo $! > /var/run/genesis/orchestrator.pid

    log_success "Application deployed"
}

verify_deployment() {
    log_info "Verifying deployment..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would verify deployment"
        return 0
    fi

    local retry_count=0
    local health_check_passed=false

    # Wait for application to start
    sleep 5

    # Health check loop
    while [[ $retry_count -lt $HEALTH_CHECK_RETRIES ]]; do
        log_info "Health check attempt $((retry_count + 1))/$HEALTH_CHECK_RETRIES..."

        # Check if orchestrator process is running
        if [[ -f /var/run/genesis/orchestrator.pid ]]; then
            local pid=$(cat /var/run/genesis/orchestrator.pid)
            if ps -p "$pid" > /dev/null 2>&1; then
                log_info "Orchestrator process running (PID: $pid)"
                health_check_passed=true
                break
            fi
        fi

        ((retry_count++))
        sleep $HEALTH_CHECK_INTERVAL
    done

    if [[ "$health_check_passed" != true ]]; then
        log_error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
        log_error "Check logs at /var/log/genesis/orchestrator.log"
        exit 4
    fi

    log_success "Deployment verification passed"
}

run_smoke_tests() {
    log_info "Running smoke tests..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would run smoke tests"
        return 0
    fi

    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"

    # Run smoke tests
    local smoke_test_output
    smoke_test_output=$(pytest tests/test_smoke.py \
        -v \
        --tb=short \
        2>&1 | tee -a "$DEPLOYMENT_LOG")

    # Parse results
    local smoke_passed=$(echo "$smoke_test_output" | grep -oP '\d+(?= passed)' | tail -1 || echo "0")
    local smoke_failed=$(echo "$smoke_test_output" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")

    if [[ $smoke_failed -gt 0 ]]; then
        log_error "Smoke tests failed: $smoke_failed failures"
        exit 4
    fi

    log_success "Smoke tests passed ($smoke_passed tests)"
}

display_deployment_info() {
    log_success "============================================"
    log_success "  Genesis Staging Deployment Complete"
    log_success "============================================"
    log_info ""
    log_info "Deployment Details:"
    log_info "  - Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    log_info "  - Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "  - Deployed By: $USER"
    log_info "  - Backup Location: $BACKUP_DIR"
    log_info ""
    log_info "Service Endpoints:"
    log_info "  - Orchestrator: http://localhost:8000"
    log_info "  - Health Check: http://localhost:8000/health"
    log_info "  - Metrics: http://localhost:8000/metrics"
    log_info ""
    log_info "Logs:"
    log_info "  - Deployment: $DEPLOYMENT_LOG"
    log_info "  - Orchestrator: /var/log/genesis/orchestrator.log"
    log_info ""
    log_info "Next Steps:"
    log_info "  1. Monitor logs for 48 hours"
    log_info "  2. Review metrics dashboard"
    log_info "  3. Validate with STAGING_VALIDATION_CHECKLIST.md"
    log_info "  4. If stable, promote to production"
    log_info ""
    log_info "Rollback:"
    log_info "  ./scripts/deploy_staging.sh --rollback"
    log_info ""
    log_success "============================================"
}

perform_rollback() {
    log_warning "Initiating rollback..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would perform rollback"
        return 0
    fi

    # Find most recent backup
    local latest_backup=$(ls -td /backup/genesis/*/ 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        log_error "No backup found for rollback"
        exit 5
    fi

    log_info "Rolling back to: $latest_backup"

    # Stop current services
    log_info "Stopping services..."
    if [[ -f "$PROJECT_ROOT/scripts/stop_services.sh" ]]; then
        bash "$PROJECT_ROOT/scripts/stop_services.sh" || true
    fi

    # Restore code
    if [[ -d "$latest_backup/code" ]]; then
        log_info "Restoring code..."
        rm -rf "$PROJECT_ROOT/current"
        cp -r "$latest_backup/code" "$PROJECT_ROOT/current"
    fi

    # Restore databases
    if [[ -d "$latest_backup/mongodb" ]]; then
        log_info "Restoring MongoDB..."
        docker exec genesis-mongodb mongorestore "$latest_backup/mongodb" 2>/dev/null || true
    fi

    if [[ -f "$latest_backup/redis/dump.rdb" ]]; then
        log_info "Restoring Redis..."
        docker cp "$latest_backup/redis/dump.rdb" genesis-redis:/data/ 2>/dev/null || true
        docker exec genesis-redis redis-cli SHUTDOWN SAVE 2>/dev/null || true
        docker start genesis-redis 2>/dev/null || true
    fi

    log_success "Rollback complete"
    log_warning "Please verify the restored deployment"
}

cleanup() {
    log_info "Cleaning up temporary files..."

    # Remove old backups (keep last 7 days)
    find /backup/genesis/ -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

    # Remove old logs (keep last 30 days)
    find /var/log/genesis/ -type f -mtime +30 -delete 2>/dev/null || true

    log_success "Cleanup complete"
}

main() {
    log_info "Genesis Staging Deployment Started"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "User: $USER"
    log_info "Host: $(hostname)"
    log_info ""

    # Handle rollback mode
    if [[ "$ROLLBACK" == true ]]; then
        perform_rollback
        exit 0
    fi

    # Confirmation prompt (unless --force)
    if [[ "$FORCE" != true ]] && [[ "$DRY_RUN" != true ]]; then
        read -p "Deploy Genesis to staging environment? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warning "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Create necessary directories
    mkdir -p /var/log/genesis
    mkdir -p /var/run/genesis
    mkdir -p /backup/genesis

    # Deployment pipeline
    check_prerequisites
    create_backup
    run_tests
    run_security_scans
    deploy_application
    verify_deployment
    run_smoke_tests
    cleanup
    display_deployment_info

    log_success "Deployment completed successfully!"
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO"; exit 3' ERR

# Run main function
main "$@"
