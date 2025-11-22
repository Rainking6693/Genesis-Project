#!/bin/bash
# TEI Deployment Script
# Deploys HuggingFace Text Embeddings Inference Docker container
#
# Usage:
#   ./scripts/deploy_tei.sh [start|stop|restart|status|logs]
#
# Requirements:
#   - Docker installed
#   - NVIDIA GPU with drivers
#   - nvidia-docker runtime
#
# Author: Thon (Infrastructure Lead)
# Date: November 4, 2025

set -e

# Configuration
CONTAINER_NAME="tei"
IMAGE="ghcr.io/huggingface/text-embeddings-inference:latest"
PORT=8081
MODEL_ID="BAAI/bge-base-en-v1.5"
DATA_DIR="/home/genesis/tei-data"
MAX_CONCURRENT_REQUESTS=512
MAX_BATCH_TOKENS=16384

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_info "✓ Docker installed"
    
    # Check NVIDIA GPU
    if ! command -v nvidia-smi &> /dev/null; then
        log_warn "nvidia-smi not found - GPU may not be available"
    else
        log_info "✓ NVIDIA GPU detected"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    fi
    
    # Check nvidia-docker runtime
    if ! docker info 2>/dev/null | grep -q nvidia; then
        log_warn "nvidia-docker runtime not detected - will try anyway"
    else
        log_info "✓ nvidia-docker runtime available"
    fi
}

# Create data directory
create_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        log_info "Creating data directory: $DATA_DIR"
        mkdir -p "$DATA_DIR"
    else
        log_info "✓ Data directory exists: $DATA_DIR"
    fi
}

# Start TEI container
start_tei() {
    log_info "Starting TEI container..."
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warn "Container '$CONTAINER_NAME' already exists"
        
        # Check if running
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_info "Container is already running"
            return 0
        else
            log_info "Starting existing container..."
            docker start "$CONTAINER_NAME"
            return 0
        fi
    fi
    
    # Pull latest image
    log_info "Pulling latest TEI image..."
    docker pull "$IMAGE"
    
    # Run container
    log_info "Running TEI container..."
    docker run -d \
        --name="$CONTAINER_NAME" \
        --gpus all \
        -p "$PORT:80" \
        -v "$DATA_DIR:/data" \
        --restart unless-stopped \
        "$IMAGE" \
        --model-id "$MODEL_ID" \
        --max-concurrent-requests "$MAX_CONCURRENT_REQUESTS" \
        --max-batch-tokens "$MAX_BATCH_TOKENS"
    
    log_info "✓ TEI container started"
    
    # Wait for container to be ready
    log_info "Waiting for TEI to be ready..."
    sleep 5
    
    # Health check
    for i in {1..30}; do
        if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
            log_info "✓ TEI is ready!"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    log_error "TEI failed to start within 30 seconds"
    docker logs "$CONTAINER_NAME" --tail 50
    return 1
}

# Stop TEI container
stop_tei() {
    log_info "Stopping TEI container..."
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME"
        log_info "✓ TEI container stopped"
    else
        log_warn "Container '$CONTAINER_NAME' is not running"
    fi
}

# Restart TEI container
restart_tei() {
    log_info "Restarting TEI container..."
    stop_tei
    sleep 2
    start_tei
}

# Show container status
show_status() {
    log_info "TEI Container Status:"
    echo ""
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        # Show resource usage if running
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_info "Resource Usage:"
            docker stats "$CONTAINER_NAME" --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
            echo ""
            
            # Test endpoint
            log_info "Testing endpoint..."
            if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Health check: PASS${NC}"
                
                # Test embedding
                log_info "Testing embedding generation..."
                RESPONSE=$(curl -s -X POST "http://localhost:$PORT/embed" \
                    -H "Content-Type: application/json" \
                    -d '{"inputs":"Genesis agent system"}')
                
                if [ -n "$RESPONSE" ]; then
                    echo -e "${GREEN}✓ Embedding generation: PASS${NC}"
                    echo "Response length: $(echo "$RESPONSE" | wc -c) bytes"
                else
                    echo -e "${RED}✗ Embedding generation: FAIL${NC}"
                fi
            else
                echo -e "${RED}✗ Health check: FAIL${NC}"
            fi
        fi
    else
        log_warn "Container '$CONTAINER_NAME' does not exist"
    fi
}

# Show container logs
show_logs() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker logs "$CONTAINER_NAME" --tail 100 -f
    else
        log_error "Container '$CONTAINER_NAME' does not exist"
        exit 1
    fi
}

# Remove container
remove_tei() {
    log_warn "Removing TEI container..."
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker rm -f "$CONTAINER_NAME"
        log_info "✓ TEI container removed"
    else
        log_warn "Container '$CONTAINER_NAME' does not exist"
    fi
}

# Main script
main() {
    case "${1:-start}" in
        start)
            check_prerequisites
            create_data_dir
            start_tei
            show_status
            ;;
        stop)
            stop_tei
            ;;
        restart)
            restart_tei
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        remove)
            remove_tei
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|remove}"
            exit 1
            ;;
    esac
}

main "$@"

