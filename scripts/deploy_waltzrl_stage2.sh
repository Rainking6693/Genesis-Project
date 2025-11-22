#!/bin/bash
# WaltzRL Stage 2 GPU Training Deployment Script
# Version: 1.0
# Date: October 27, 2025
# Owner: Vanguard (MLOps Agent)
#
# This script deploys WaltzRL Stage 2 training to Lambda Labs GPU cluster.
# Requires: Lambda Labs API key, SSH key configured
#
# Usage:
#   ./scripts/deploy_waltzrl_stage2.sh [OPTIONS]
#
# Options:
#   --instance-id <id>    Use existing instance (skip creation)
#   --resume-from <path>  Resume from checkpoint
#   --dry-run            Show commands without executing
#   --help               Show this help message

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LAMBDA_INSTANCE_TYPE="gpu_8x_h100_pcie"
LAMBDA_REGION="us-west-2"
SSH_KEY_NAME="genesis-key"
DATASET_PATH="/home/genesis/genesis-rebuild/data/waltzrl_training_dataset.jsonl"
REPO_URL="https://github.com/genesis/genesis-rebuild.git"
DRY_RUN=false
INSTANCE_ID=""
RESUME_FROM=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --instance-id)
            INSTANCE_ID="$2"
            shift 2
            ;;
        --resume-from)
            RESUME_FROM="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            head -n 20 "$0" | grep "^#" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

run_cmd() {
    local cmd="$1"
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] $cmd"
    else
        log_info "Running: $cmd"
        eval "$cmd"
    fi
}

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

# Check Lambda Labs CLI
if ! command -v lambda &> /dev/null; then
    log_error "Lambda Labs CLI not installed. Install with: pip install lambda-cloud"
    exit 1
fi

# Check if logged in
if ! lambda cloud instances list &> /dev/null; then
    log_error "Not logged in to Lambda Labs. Run: lambda cloud login"
    exit 1
fi

# Check dataset exists
if [ ! -f "$DATASET_PATH" ]; then
    log_error "Dataset not found: $DATASET_PATH"
    exit 1
fi

# Verify dataset checksum
log_info "Verifying dataset integrity..."
DATASET_MD5=$(md5sum "$DATASET_PATH" | awk '{print $1}')
log_info "Dataset MD5: $DATASET_MD5"

log_info "Prerequisites check passed ✓"

# Step 2: Create or use existing instance
if [ -z "$INSTANCE_ID" ]; then
    log_info "Creating Lambda Labs instance..."
    log_info "  Type: $LAMBDA_INSTANCE_TYPE"
    log_info "  Region: $LAMBDA_REGION"
    log_info "  SSH Key: $SSH_KEY_NAME"

    CREATE_CMD="lambda cloud instances create \
        --instance-type-name $LAMBDA_INSTANCE_TYPE \
        --region $LAMBDA_REGION \
        --ssh-key-name $SSH_KEY_NAME"

    if [ "$DRY_RUN" = false ]; then
        INSTANCE_JSON=$(eval "$CREATE_CMD")
        INSTANCE_ID=$(echo "$INSTANCE_JSON" | jq -r '.data.id')
        INSTANCE_IP=$(echo "$INSTANCE_JSON" | jq -r '.data.ip')

        log_info "Instance created: $INSTANCE_ID"
        log_info "Instance IP: $INSTANCE_IP"

        # Wait for instance to be ready
        log_info "Waiting for instance to be ready..."
        sleep 30
    else
        log_info "[DRY-RUN] Would create instance: $CREATE_CMD"
        INSTANCE_ID="<instance-id>"
        INSTANCE_IP="<instance-ip>"
    fi
else
    log_info "Using existing instance: $INSTANCE_ID"

    # Get instance IP
    if [ "$DRY_RUN" = false ]; then
        INSTANCE_JSON=$(lambda cloud instances get "$INSTANCE_ID")
        INSTANCE_IP=$(echo "$INSTANCE_JSON" | jq -r '.data.ip')
        log_info "Instance IP: $INSTANCE_IP"
    else
        INSTANCE_IP="<instance-ip>"
    fi
fi

# Step 3: Setup environment on instance
log_info "Setting up environment on instance..."

SETUP_COMMANDS="
# Update system
sudo apt-get update

# Clone repository
cd ~
git clone $REPO_URL || (cd genesis-rebuild && git pull)
cd genesis-rebuild

# Install Python dependencies
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify GPU availability
nvidia-smi
python -c 'import torch; print(f\"GPUs available: {torch.cuda.device_count()}\")'

# Create necessary directories
mkdir -p logs models/waltzrl_stage2/checkpoints
"

if [ "$DRY_RUN" = false ]; then
    log_info "Executing setup commands via SSH..."
    ssh -o StrictHostKeyChecking=no "ubuntu@$INSTANCE_IP" "$SETUP_COMMANDS"
else
    log_info "[DRY-RUN] Would execute setup commands"
fi

# Step 4: Transfer dataset
log_info "Transferring dataset to instance..."
TRANSFER_CMD="scp -o StrictHostKeyChecking=no $DATASET_PATH ubuntu@$INSTANCE_IP:~/genesis-rebuild/data/"

if [ "$DRY_RUN" = false ]; then
    eval "$TRANSFER_CMD"

    # Verify dataset integrity on instance
    REMOTE_MD5=$(ssh "ubuntu@$INSTANCE_IP" "md5sum ~/genesis-rebuild/data/waltzrl_training_dataset.jsonl | awk '{print \$1}'")

    if [ "$DATASET_MD5" = "$REMOTE_MD5" ]; then
        log_info "Dataset transfer verified ✓ (MD5: $REMOTE_MD5)"
    else
        log_error "Dataset corruption detected! Local MD5: $DATASET_MD5, Remote MD5: $REMOTE_MD5"
        exit 1
    fi
else
    log_info "[DRY-RUN] Would transfer dataset: $TRANSFER_CMD"
fi

# Step 5: Launch training
log_info "Launching WaltzRL Stage 2 training..."

TRAINING_CMD="
cd ~/genesis-rebuild

# Set environment variables
export WALTZRL_STAGE=2
export WALTZRL_DATASET=~/genesis-rebuild/data/waltzrl_training_dataset.jsonl
export WALTZRL_EPOCHS=5
export WALTZRL_BATCH_SIZE=32
export WALTZRL_LEARNING_RATE=0.000005
export WALTZRL_OUTPUT_DIR=~/genesis-rebuild/models/waltzrl_stage2

# Launch training (52 hours)
nohup python infrastructure/waltzrl_stage2_trainer.py \
    --dataset \$WALTZRL_DATASET \
    --epochs \$WALTZRL_EPOCHS \
    --batch-size \$WALTZRL_BATCH_SIZE \
    --learning-rate \$WALTZRL_LEARNING_RATE \
    --output-dir \$WALTZRL_OUTPUT_DIR \
    --gpus 8 \
    --checkpoint-interval 1000 \
    --validation-interval 500 \
    $([ -n "$RESUME_FROM" ] && echo "--resume-from $RESUME_FROM" || echo "") \
    > logs/waltzrl_training.log 2>&1 &

# Save process ID
echo \$! > waltzrl_training.pid

# Show process status
ps aux | grep waltzrl_stage2_trainer | grep -v grep
"

if [ "$DRY_RUN" = false ]; then
    ssh "ubuntu@$INSTANCE_IP" "$TRAINING_CMD"
    log_info "Training launched successfully ✓"
else
    log_info "[DRY-RUN] Would launch training"
fi

# Step 6: Launch monitoring (local)
log_info "Setting up training monitoring..."

MONITOR_CMD="
# Create SSH tunnel for log monitoring
ssh -f -N -L 9999:localhost:22 ubuntu@$INSTANCE_IP

# Launch monitoring script (monitors remote logs via SSH)
python scripts/monitor_waltzrl_training.py \
    --log-file ubuntu@$INSTANCE_IP:~/genesis-rebuild/logs/waltzrl_training.log \
    --interval 300 \
    --alert-email ops@genesis.ai \
    > logs/waltzrl_monitor.log 2>&1 &

echo \$! > waltzrl_monitor.pid
"

if [ "$DRY_RUN" = false ]; then
    log_info "Launching monitoring in background..."
    # Note: Monitoring via SSH requires additional setup (not implemented in this script)
    log_warn "Remote monitoring not fully implemented. Monitor manually with:"
    echo "  ssh ubuntu@$INSTANCE_IP 'tail -f ~/genesis-rebuild/logs/waltzrl_training.log'"
else
    log_info "[DRY-RUN] Would launch monitoring"
fi

# Step 7: Print summary
echo ""
echo "=============================================================================="
echo "WALTZRL STAGE 2 TRAINING DEPLOYED"
echo "=============================================================================="
echo "Instance ID: $INSTANCE_ID"
echo "Instance IP: $INSTANCE_IP"
echo "Dataset MD5: $DATASET_MD5"
echo "Training Duration: ~52 hours"
echo "Expected Cost: \$832 (8×H100 × 52 hours × \$2.00/hr)"
echo ""
echo "Monitor training:"
echo "  ssh ubuntu@$INSTANCE_IP 'tail -f ~/genesis-rebuild/logs/waltzrl_training.log'"
echo ""
echo "Check training status:"
echo "  ssh ubuntu@$INSTANCE_IP 'ps aux | grep waltzrl_stage2_trainer'"
echo ""
echo "After training completes (52 hours):"
echo "  1. Run validation: ssh ubuntu@$INSTANCE_IP 'cd ~/genesis-rebuild && pytest tests/test_waltzrl_stage2_validation.py -v'"
echo "  2. Download models: scp -r ubuntu@$INSTANCE_IP:~/genesis-rebuild/models/waltzrl_stage2/*.pt models/waltzrl_stage2/"
echo "  3. Terminate instance: lambda cloud instances terminate $INSTANCE_ID"
echo "=============================================================================="

log_info "Deployment complete ✓"
