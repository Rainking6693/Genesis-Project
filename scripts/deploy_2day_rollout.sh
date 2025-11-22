#!/bin/bash
################################################################################
# Genesis 2-Day Progressive Rollout Automation
#
# This script automates the 48-hour compressed deployment timeline with:
# - Three deployment plans (aggressive, conservative, hybrid)
# - Automated health validation at each stage
# - Real-time SLO monitoring
# - Automatic rollback on threshold violations
# - Feature flag coordination across 17+ flags
#
# Author: Hudson (Code Review & Deployment Specialist)
# Date: 2025-10-27
# Version: 2.0.0
#
# Usage:
#   ./scripts/deploy_2day_rollout.sh [plan] [command]
#
# Plans:
#   aggressive   - 2 days, 4 stages (6h/6h/12h/24h)
#   conservative - 2 days, 4 stages (12h/12h/12h/12h)
#   hybrid       - 2 days, 6 stages (8h/8h/8h/8h/8h/8h) [RECOMMENDED]
#
# Commands:
#   deploy       - Execute deployment
#   status       - Check deployment status
#   pause        - Pause at current stage
#   resume       - Resume deployment
#   abort        - Emergency abort and rollback
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
DEPLOYMENT_LOG="$LOG_DIR/2day_rollout_$(date +%Y%m%d_%H%M%S).log"
STATE_FILE="$PROJECT_ROOT/config/deployment_state_2day.json"

# Deployment settings
PLAN="${1:-hybrid}"
COMMAND="${2:-deploy}"
MONITORING_INTERVAL=900  # 15 minutes (900 seconds)
HEALTH_CHECK_TIMEOUT=30
ROLLBACK_TRIGGERED=false

# SLO Thresholds
SLO_TEST_PASS_RATE=98.0
SLO_ERROR_RATE=0.1
SLO_P95_LATENCY=200

################################################################################
# Utility Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
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
        STAGE)
            echo -e "${CYAN}[STAGE]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
    esac
}

error_exit() {
    log ERROR "$1"
    log ERROR "Deployment FAILED. Check logs at: $DEPLOYMENT_LOG"

    # Trigger rollback if deployment was in progress
    if [[ "$ROLLBACK_TRIGGERED" == "false" ]]; then
        log ERROR "Initiating emergency rollback..."
        rollback
    fi

    exit 1
}

init_deployment() {
    log INFO "Initializing 2-day deployment..."

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Initialize state file
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" <<EOF
{
  "plan": "$PLAN",
  "start_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "current_stage": 0,
  "traffic_percentage": 0,
  "paused": false,
  "stages_completed": [],
  "rollback_count": 0
}
EOF
    fi

    log SUCCESS "Deployment initialized"
}

get_state() {
    local key="$1"
    jq -r ".$key" "$STATE_FILE"
}

update_state() {
    local key="$1"
    local value="$2"

    # Create temp file
    local temp_file=$(mktemp)

    # Update state
    jq ".$key = $value" "$STATE_FILE" > "$temp_file"
    mv "$temp_file" "$STATE_FILE"
}

################################################################################
# Health Check Functions
################################################################################

check_slo_metrics() {
    log INFO "Checking SLO metrics..."

    # Check test pass rate
    local test_pass_rate=$(curl -sf "http://localhost:9090/api/v1/query?query=test_pass_rate" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
    log INFO "  Test Pass Rate: ${test_pass_rate}% (SLO: >=${SLO_TEST_PASS_RATE}%)"

    if (( $(echo "$test_pass_rate < $SLO_TEST_PASS_RATE" | bc -l) )); then
        log ERROR "Test pass rate below SLO: ${test_pass_rate}% < ${SLO_TEST_PASS_RATE}%"
        return 1
    fi

    # Check error rate
    local error_rate=$(curl -sf "http://localhost:9090/api/v1/query?query=error_rate" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
    log INFO "  Error Rate: ${error_rate}% (SLO: <${SLO_ERROR_RATE}%)"

    if (( $(echo "$error_rate > $SLO_ERROR_RATE" | bc -l) )); then
        log ERROR "Error rate above SLO: ${error_rate}% > ${SLO_ERROR_RATE}%"
        return 1
    fi

    # Check P95 latency
    local p95_latency=$(curl -sf "http://localhost:9090/api/v1/query?query=p95_latency" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
    log INFO "  P95 Latency: ${p95_latency}ms (SLO: <${SLO_P95_LATENCY}ms)"

    if (( $(echo "$p95_latency > $SLO_P95_LATENCY" | bc -l) )); then
        log ERROR "P95 latency above SLO: ${p95_latency}ms > ${SLO_P95_LATENCY}ms"
        return 1
    fi

    log SUCCESS "All SLO metrics passing"
    return 0
}

run_health_tests() {
    log INFO "Running production health tests..."

    cd "$PROJECT_ROOT"

    if pytest tests/test_production_health.py::TestProductionSLOs -v --tb=short >> "$DEPLOYMENT_LOG" 2>&1; then
        log SUCCESS "Health tests passed"
        return 0
    else
        log ERROR "Health tests failed"
        return 1
    fi
}

validate_health() {
    local stage_name="$1"

    log INFO "Validating health for stage: $stage_name"

    # Run SLO checks
    if ! check_slo_metrics; then
        log ERROR "SLO metrics validation failed"
        return 1
    fi

    # Run health tests
    if ! run_health_tests; then
        log ERROR "Health tests failed"
        return 1
    fi

    log SUCCESS "Health validation passed for $stage_name"
    return 0
}

################################################################################
# Feature Flag Management
################################################################################

update_feature_flags() {
    local flags_json="$1"

    log INFO "Updating feature flags..."

    cd "$PROJECT_ROOT"

    # Parse flags and update
    echo "$flags_json" | jq -c '.[]' | while read -r flag_data; do
        local flag_name=$(echo "$flag_data" | jq -r '.name')
        local enabled=$(echo "$flag_data" | jq -r '.enabled')
        local percentage=$(echo "$flag_data" | jq -r '.percentage // 0')

        log INFO "  Setting $flag_name: enabled=$enabled, percentage=$percentage%"

        # Convert bash boolean to Python boolean
        local py_enabled="False"
        if [[ "$enabled" == "true" ]]; then
            py_enabled="True"
        fi

        python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from infrastructure.feature_flags import get_feature_flag_manager

manager = get_feature_flag_manager()
manager.set_flag('$flag_name', $py_enabled)
if $percentage > 0 and '$flag_name' in manager.flags:
    manager.flags['$flag_name'].rollout_percentage = $percentage
" 2>> "$DEPLOYMENT_LOG"
    done

    log SUCCESS "Feature flags updated"
}

get_current_traffic_percentage() {
    # Calculate current traffic based on enabled flags
    cd "$PROJECT_ROOT"

    python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from infrastructure.feature_flags import get_feature_flag_manager

manager = get_feature_flag_manager()
flags = manager.get_all_flags()

total_percentage = 0
for name, data in flags.items():
    if data['enabled']:
        total_percentage += data.get('rollout_percentage', 0)

# Average across all flags
avg_percentage = total_percentage / max(len(flags), 1)
print(f'{avg_percentage:.1f}')
" 2>> "$DEPLOYMENT_LOG"
}

################################################################################
# Deployment Plans
################################################################################

deploy_increment() {
    local stage_num="$1"
    local stage_name="$2"
    local target_percentage="$3"
    local duration_hours="$4"
    local flags_json="$5"

    log STAGE "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log STAGE "Stage $stage_num: $stage_name"
    log STAGE "Target Traffic: $target_percentage%"
    log STAGE "Duration: $duration_hours hours"
    log STAGE "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check if paused
    if [[ "$(get_state paused)" == "true" ]]; then
        log WARNING "Deployment is PAUSED. Use 'resume' command to continue."
        return 0
    fi

    # Update feature flags
    update_feature_flags "$flags_json"

    # Update state
    update_state "current_stage" "$stage_num"
    update_state "traffic_percentage" "$target_percentage"

    # Monitor for duration
    local duration_seconds=$((duration_hours * 3600))
    local elapsed=0
    local check_count=0

    log INFO "Monitoring for ${duration_hours}h (checking every $((MONITORING_INTERVAL / 60)) minutes)..."

    while (( elapsed < duration_seconds )); do
        # Check if paused
        if [[ "$(get_state paused)" == "true" ]]; then
            log WARNING "Deployment PAUSED at stage $stage_num"
            return 0
        fi

        # Run health validation
        if ! validate_health "$stage_name"; then
            log ERROR "Health validation failed at stage $stage_num"
            error_exit "Stage $stage_num health check failed"
        fi

        check_count=$((check_count + 1))
        log INFO "Health check $check_count passed (${elapsed}s elapsed)"

        # Sleep until next check
        sleep "$MONITORING_INTERVAL"
        elapsed=$((elapsed + MONITORING_INTERVAL))
    done

    # Mark stage complete
    local completed_stages=$(get_state "stages_completed")
    update_state "stages_completed" "$(echo "$completed_stages" | jq ". + [$stage_num]")"

    log SUCCESS "Stage $stage_num: $stage_name COMPLETE"
}

deploy_aggressive() {
    log INFO "Executing AGGRESSIVE plan (4 stages, 48 hours)"

    # Stage 1: Hour 0-6 (25%)
    deploy_increment 1 "Initial Rollout" 25 6 '[
        {"name": "orchestration_enabled", "enabled": true, "percentage": 100},
        {"name": "phase_1_complete", "enabled": true, "percentage": 100},
        {"name": "phase_2_complete", "enabled": true, "percentage": 100},
        {"name": "phase_3_complete", "enabled": true, "percentage": 100}
    ]'

    # Stage 2: Hour 6-12 (50%)
    deploy_increment 2 "Scale to 50%" 50 6 '[
        {"name": "darwin_integration_enabled", "enabled": true, "percentage": 50},
        {"name": "a2a_integration_enabled", "enabled": true, "percentage": 50}
    ]'

    # Stage 3: Hour 12-24 (75%)
    deploy_increment 3 "Scale to 75%" 75 12 '[
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 50},
        {"name": "casebank_memory_enabled", "enabled": true, "percentage": 50},
        {"name": "vllm_caching_enabled", "enabled": true, "percentage": 50}
    ]'

    # Stage 4: Hour 24-48 (100%)
    deploy_increment 4 "Full Deployment" 100 24 '[
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 100},
        {"name": "casebank_memory_enabled", "enabled": true, "percentage": 100},
        {"name": "vllm_caching_enabled", "enabled": true, "percentage": 100},
        {"name": "openenv_enabled", "enabled": true, "percentage": 100},
        {"name": "longcontext_profiles_enabled", "enabled": true, "percentage": 100}
    ]'
}

deploy_conservative() {
    log INFO "Executing CONSERVATIVE plan (4 stages, 48 hours)"

    # Stage 1: Hour 0-12 (20%)
    deploy_increment 1 "Initial Rollout" 20 12 '[
        {"name": "orchestration_enabled", "enabled": true, "percentage": 100},
        {"name": "phase_1_complete", "enabled": true, "percentage": 100},
        {"name": "phase_2_complete", "enabled": true, "percentage": 100}
    ]'

    # Stage 2: Hour 12-24 (50%)
    deploy_increment 2 "Scale to 50%" 50 12 '[
        {"name": "phase_3_complete", "enabled": true, "percentage": 100},
        {"name": "darwin_integration_enabled", "enabled": true, "percentage": 50}
    ]'

    # Stage 3: Hour 24-36 (80%)
    deploy_increment 3 "Scale to 80%" 80 12 '[
        {"name": "darwin_integration_enabled", "enabled": true, "percentage": 100},
        {"name": "a2a_integration_enabled", "enabled": true, "percentage": 50},
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 50}
    ]'

    # Stage 4: Hour 36-48 (100%)
    deploy_increment 4 "Full Deployment" 100 12 '[
        {"name": "a2a_integration_enabled", "enabled": true, "percentage": 100},
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 100},
        {"name": "casebank_memory_enabled", "enabled": true, "percentage": 100},
        {"name": "vllm_caching_enabled", "enabled": true, "percentage": 100},
        {"name": "openenv_enabled", "enabled": true, "percentage": 100},
        {"name": "longcontext_profiles_enabled", "enabled": true, "percentage": 100}
    ]'
}

deploy_hybrid() {
    log INFO "Executing HYBRID plan (6 stages, 48 hours) [RECOMMENDED]"

    # Stage 1: Hour 0-8 (30% - Phase 1-4)
    deploy_increment 1 "Phase 1-4 Rollout" 30 8 '[
        {"name": "orchestration_enabled", "enabled": true, "percentage": 100},
        {"name": "security_hardening_enabled", "enabled": true, "percentage": 100},
        {"name": "error_handling_enabled", "enabled": true, "percentage": 100},
        {"name": "otel_enabled", "enabled": true, "percentage": 100},
        {"name": "phase_1_complete", "enabled": true, "percentage": 100},
        {"name": "phase_2_complete", "enabled": true, "percentage": 100},
        {"name": "phase_3_complete", "enabled": true, "percentage": 100},
        {"name": "phase_4_deployment", "enabled": true, "percentage": 100}
    ]'

    # Stage 2: Hour 8-16 (60% - Phase 5)
    deploy_increment 2 "Phase 5 Integration" 60 8 '[
        {"name": "darwin_integration_enabled", "enabled": true, "percentage": 50},
        {"name": "a2a_integration_enabled", "enabled": true, "percentage": 50},
        {"name": "waltzrl_safety_enabled", "enabled": true, "percentage": 25}
    ]'

    # Stage 3: Hour 16-24 (85% - Phase 6 Tier 1-2)
    deploy_increment 3 "Phase 6 Tier 1-2" 85 8 '[
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 50},
        {"name": "casebank_memory_enabled", "enabled": true, "percentage": 50},
        {"name": "vllm_caching_enabled", "enabled": true, "percentage": 50}
    ]'

    # Stage 4: Hour 24-32 (100% - Phase 6 Tier 3)
    deploy_increment 4 "Phase 6 Tier 3" 100 8 '[
        {"name": "openenv_enabled", "enabled": true, "percentage": 25},
        {"name": "longcontext_profiles_enabled", "enabled": true, "percentage": 25}
    ]'

    # Stage 5: Hour 32-40 (100% - All flags to 100%)
    deploy_increment 5 "Full System 100%" 100 8 '[
        {"name": "darwin_integration_enabled", "enabled": true, "percentage": 100},
        {"name": "a2a_integration_enabled", "enabled": true, "percentage": 100},
        {"name": "waltzrl_safety_enabled", "enabled": true, "percentage": 100},
        {"name": "sglang_router_enabled", "enabled": true, "percentage": 100},
        {"name": "casebank_memory_enabled", "enabled": true, "percentage": 100},
        {"name": "vllm_caching_enabled", "enabled": true, "percentage": 100},
        {"name": "openenv_enabled", "enabled": true, "percentage": 100},
        {"name": "longcontext_profiles_enabled", "enabled": true, "percentage": 100}
    ]'

    # Stage 6: Hour 40-48 (100% - Final observation)
    log STAGE "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log STAGE "Stage 6: Final Observation"
    log STAGE "Duration: 8 hours"
    log STAGE "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local duration_seconds=$((8 * 3600))
    local elapsed=0

    while (( elapsed < duration_seconds )); do
        validate_health "Final Observation"
        sleep "$MONITORING_INTERVAL"
        elapsed=$((elapsed + MONITORING_INTERVAL))
    done

    log SUCCESS "Stage 6: Final Observation COMPLETE"
}

################################################################################
# Rollback Functions
################################################################################

rollback() {
    ROLLBACK_TRIGGERED=true

    log ERROR "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log ERROR "INITIATING EMERGENCY ROLLBACK"
    log ERROR "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Disable all Phase 6 flags immediately
    log INFO "Disabling Phase 6 flags..."
    update_feature_flags '[
        {"name": "sglang_router_enabled", "enabled": false},
        {"name": "casebank_memory_enabled", "enabled": false},
        {"name": "vllm_caching_enabled", "enabled": false},
        {"name": "openenv_enabled", "enabled": false},
        {"name": "longcontext_profiles_enabled", "enabled": false}
    ]'

    # Reduce traffic to safe state (30%)
    log INFO "Reducing traffic to safe state (30%)..."
    update_feature_flags '[
        {"name": "darwin_integration_enabled", "enabled": false},
        {"name": "a2a_integration_enabled", "enabled": false}
    ]'

    # Update rollback count
    local rollback_count=$(get_state "rollback_count")
    update_state "rollback_count" $((rollback_count + 1))

    # Verify system stable
    sleep 10
    if validate_health "Post-Rollback"; then
        log SUCCESS "Rollback successful - system stable at safe state"
    else
        log ERROR "Rollback completed but system still unstable"
        log ERROR "MANUAL INTERVENTION REQUIRED"
    fi

    log ERROR "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

################################################################################
# Command Handlers
################################################################################

cmd_deploy() {
    log INFO "Starting 2-day deployment with plan: $PLAN"

    # Initialize
    init_deployment

    # Execute plan
    case "$PLAN" in
        aggressive)
            deploy_aggressive
            ;;
        conservative)
            deploy_conservative
            ;;
        hybrid)
            deploy_hybrid
            ;;
        *)
            error_exit "Unknown plan: $PLAN"
            ;;
    esac

    # Success
    log SUCCESS "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log SUCCESS "2-DAY DEPLOYMENT COMPLETE"
    log SUCCESS "Plan: $PLAN"
    log SUCCESS "Traffic: 100%"
    log SUCCESS "Duration: 48 hours"
    log SUCCESS "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_status() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo "No deployment in progress"
        exit 0
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "DEPLOYMENT STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Plan: $(get_state plan)"
    echo "Start Time: $(get_state start_time)"
    echo "Current Stage: $(get_state current_stage)"
    echo "Traffic: $(get_state traffic_percentage)%"
    echo "Paused: $(get_state paused)"
    echo "Rollback Count: $(get_state rollback_count)"
    echo "Stages Completed: $(get_state stages_completed)"
    echo ""
    echo "Current Traffic Percentage: $(get_current_traffic_percentage)%"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_pause() {
    log WARNING "PAUSING deployment"
    update_state "paused" "true"
    log SUCCESS "Deployment PAUSED at stage $(get_state current_stage)"
}

cmd_resume() {
    log INFO "RESUMING deployment"
    update_state "paused" "false"
    log SUCCESS "Deployment RESUMED from stage $(get_state current_stage)"
}

cmd_abort() {
    log ERROR "ABORTING deployment"
    rollback
    exit 1
}

################################################################################
# Main
################################################################################

main() {
    # Print banner
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Genesis Rebuild - 2-Day Progressive Rollout"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Plan: $PLAN"
    echo "Command: $COMMAND"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Execute command
    case "$COMMAND" in
        deploy)
            cmd_deploy
            ;;
        status)
            cmd_status
            ;;
        pause)
            cmd_pause
            ;;
        resume)
            cmd_resume
            ;;
        abort)
            cmd_abort
            ;;
        *)
            echo "Unknown command: $COMMAND"
            echo "Usage: $0 [plan] [command]"
            echo ""
            echo "Plans: aggressive | conservative | hybrid"
            echo "Commands: deploy | status | pause | resume | abort"
            exit 1
            ;;
    esac
}

# Trap errors
trap 'error_exit "Script failed with error"' ERR

# Run main
main "$@"
