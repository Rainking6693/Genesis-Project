#!/bin/bash
# Health Check Script for Local LLM Servers
# P1-3 Fix: Monitor Llama 3.2 Vision (8001) and Qwen2.5-VL (8002/8003) servers
# Author: Claude (Local LLM P1 Fixes)
# Date: November 3, 2025

set -euo pipefail

# Configuration
LLAMA_PORT=8001
QWEN_PORT_PRIMARY=8002
QWEN_PORT_FALLBACK=8003
TIMEOUT=5
LOG_FILE="/var/log/llm_health_check.log"
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if a port is responding
check_port() {
    local port=$1
    local service_name=$2

    # Try HTTP health check first
    if curl -s -f -m "$TIMEOUT" "http://127.0.0.1:${port}/health" > /dev/null 2>&1; then
        return 0
    fi

    # Fallback: Check if port is listening
    if nc -z -w "$TIMEOUT" 127.0.0.1 "$port" 2>/dev/null; then
        return 0
    fi

    return 1
}

# Restart service if needed
restart_service() {
    local service_name=$1
    log "${YELLOW}Attempting to restart ${service_name}...${NC}"

    if sudo systemctl restart "$service_name"; then
        log "${GREEN}Successfully restarted ${service_name}${NC}"
        return 0
    else
        log "${RED}Failed to restart ${service_name}${NC}"
        return 1
    fi
}

# Check Llama 3.2 Vision server
check_llama() {
    log "Checking Llama 3.2 Vision server (port ${LLAMA_PORT})..."

    for i in $(seq 1 $MAX_RETRIES); do
        if check_port "$LLAMA_PORT" "llama-vision"; then
            log "${GREEN}✓ Llama 3.2 Vision server healthy${NC}"
            return 0
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            log "${YELLOW}Retry $i/$MAX_RETRIES for Llama server...${NC}"
            sleep 2
        fi
    done

    log "${RED}✗ Llama 3.2 Vision server unhealthy after $MAX_RETRIES retries${NC}"
    restart_service "llama-vision-server"
    return $?
}

# Check Qwen2.5-VL server
check_qwen() {
    log "Checking Qwen2.5-VL server (ports ${QWEN_PORT_PRIMARY}/${QWEN_PORT_FALLBACK})..."

    # Check primary port
    if check_port "$QWEN_PORT_PRIMARY" "qwen-vl"; then
        log "${GREEN}✓ Qwen2.5-VL server healthy (port ${QWEN_PORT_PRIMARY})${NC}"
        return 0
    fi

    # Check fallback port
    if check_port "$QWEN_PORT_FALLBACK" "qwen-vl"; then
        log "${GREEN}✓ Qwen2.5-VL server healthy (port ${QWEN_PORT_FALLBACK})${NC}"
        return 0
    fi

    log "${RED}✗ Qwen2.5-VL server unhealthy on both ports${NC}"
    restart_service "qwen3-vl-server"
    return $?
}

# Main health check
main() {
    log "=========================================="
    log "Starting Local LLM Health Check"
    log "=========================================="

    # Check both servers
    llama_ok=0
    qwen_ok=0

    check_llama || llama_ok=$?
    check_qwen || qwen_ok=$?

    # Summary
    log "=========================================="
    if [ $llama_ok -eq 0 ] && [ $qwen_ok -eq 0 ]; then
        log "${GREEN}All LLM servers healthy${NC}"
        exit 0
    else
        log "${RED}Some LLM servers unhealthy${NC}"
        exit 1
    fi
}

# Run main function
main
