#!/bin/bash
# Batch Fine-Tuning Script for All Genesis Agents
#
# Automates fine-tuning of all 5 agents in parallel (if resources allow)
# or sequentially (if limited resources).
#
# Usage:
#   # Phase 1: Sampled training (10k examples)
#   bash scripts/finetune_all_agents.sh phase1
#
#   # Phase 2: Experimental Mistral-7B
#   bash scripts/finetune_all_agents.sh phase2
#
#   # Phase 3: Full training (20k examples) - conditional
#   bash scripts/finetune_all_agents.sh phase3
#
# Author: Cursor (AI Coding Agent)
# Date: October 31, 2025

set -euo pipefail

# Configuration
AGENTS=("qa_agent" "support_agent" "legal_agent" "analyst_agent" "content_agent")
BACKEND="gpt4o-mini"
SAMPLE_SIZE=10000
EPOCHS=3
LEARNING_RATE=2e-5
BATCH_SIZE=4
PARALLEL=true  # Set to false for sequential execution
MAX_PARALLEL=3  # Max parallel jobs if PARALLEL=true

# Directories
DATA_DIR="data/unsloth_format"
OUTPUT_DIR="models"
LOG_DIR="logs/finetuning"

# Create directories
mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# Function to check if job limit reached
wait_for_slot() {
    if [ "$PARALLEL" = true ]; then
        while [ $(jobs -r | wc -l) -ge "$MAX_PARALLEL" ]; do
            sleep 5
        done
    fi
}

# Function to fine-tune single agent
finetune_agent() {
    local agent=$1
    local phase=$2
    local suffix="${phase}_${SAMPLE_SIZE}"
    
    echo "=========================================="
    echo "Fine-tuning: $agent ($phase)"
    echo "=========================================="
    
    python3 scripts/finetune_agent.py \
        --agent "$agent" \
        --backend "$BACKEND" \
        --train_data "$DATA_DIR/${agent}_training.jsonl" \
        --output_dir "$OUTPUT_DIR/${agent}_${BACKEND}_${suffix}" \
        --sample_size "$SAMPLE_SIZE" \
        --epochs "$EPOCHS" \
        --learning_rate "$LEARNING_RATE" \
        --batch_size "$BATCH_SIZE" \
        --log_file "$LOG_DIR/${agent}_${BACKEND}_${suffix}.log" \
        --resume
    
    echo "✅ Completed: $agent"
}

# Phase 1: Sampled Training (10k examples each)
phase1() {
    echo "=========================================="
    echo "PHASE 1: Sampled Training (10k examples)"
    echo "=========================================="
    echo "Backend: $BACKEND"
    echo "Agents: ${AGENTS[*]}"
    echo ""
    
    for agent in "${AGENTS[@]}"; do
        if [ "$PARALLEL" = true ]; then
            wait_for_slot
            finetune_agent "$agent" "10k" &
        else
            finetune_agent "$agent" "10k"
        fi
    done
    
    # Wait for all jobs
    wait
    
    echo ""
    echo "=========================================="
    echo "PHASE 1 COMPLETE"
    echo "=========================================="
    echo "All agents fine-tuned with 10k samples"
    echo "Next: Run benchmarks, then proceed to Phase 3 if successful"
}

# Phase 2: Experimental Mistral-7B
phase2() {
    echo "=========================================="
    echo "PHASE 2: Experimental Mistral-7B"
    echo "=========================================="
    echo "Fine-tuning QA agent with Mistral-7B for comparison"
    echo ""
    
    # Check GPU availability
    if ! python3 -c "import torch; assert torch.cuda.is_available()" 2>/dev/null; then
        echo "⚠️  Warning: CUDA not available. Mistral-7B requires GPU."
        echo "Skipping Phase 2."
        exit 1
    fi
    
    python3 scripts/finetune_agent.py \
        --agent "qa_agent" \
        --backend "mistral-7b" \
        --train_data "$DATA_DIR/qa_agent_training.jsonl" \
        --output_dir "$OUTPUT_DIR/qa_agent_mistral_10k" \
        --sample_size "$SAMPLE_SIZE" \
        --epochs "$EPOCHS" \
        --learning_rate "$LEARNING_RATE" \
        --batch_size "$BATCH_SIZE" \
        --log_file "$LOG_DIR/qa_agent_mistral_10k.log" \
        --resume
    
    echo ""
    echo "=========================================="
    echo "PHASE 2 COMPLETE"
    echo "=========================================="
}

# Phase 3: Full Training (20k examples) - CONDITIONAL
phase3() {
    echo "=========================================="
    echo "PHASE 3: Full Training (20k examples)"
    echo "=========================================="
    echo "⚠️  WARNING: Only run if Phase 1 results show ≥10% improvement"
    echo ""
    read -p "Proceed with full training? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Phase 3 cancelled."
        return 1
    fi
    
    SAMPLE_SIZE=""  # Use full dataset
    
    for agent in "${AGENTS[@]}"; do
        if [ "$PARALLEL" = true ]; then
            wait_for_slot
            python3 scripts/finetune_agent.py \
                --agent "$agent" \
                --backend "$BACKEND" \
                --train_data "$DATA_DIR/${agent}_training.jsonl" \
                --output_dir "$OUTPUT_DIR/${agent}_${BACKEND}_full" \
                --epochs "$EPOCHS" \
                --learning_rate "$LEARNING_RATE" \
                --batch_size "$BATCH_SIZE" \
                --log_file "$LOG_DIR/${agent}_${BACKEND}_full.log" \
                --resume &
        else
            python3 scripts/finetune_agent.py \
                --agent "$agent" \
                --backend "$BACKEND" \
                --train_data "$DATA_DIR/${agent}_training.jsonl" \
                --output_dir "$OUTPUT_DIR/${agent}_${BACKEND}_full" \
                --epochs "$EPOCHS" \
                --learning_rate "$LEARNING_RATE" \
                --batch_size "$BATCH_SIZE" \
                --log_file "$LOG_DIR/${agent}_${BACKEND}_full.log" \
                --resume
        fi
    done
    
    wait
    
    echo ""
    echo "=========================================="
    echo "PHASE 3 COMPLETE"
    echo "=========================================="
}

# Main
case "${1:-phase1}" in
    phase1)
        phase1
        ;;
    phase2)
        phase2
        ;;
    phase3)
        phase3
        ;;
    *)
        echo "Usage: $0 {phase1|phase2|phase3}"
        echo ""
        echo "  phase1: Sampled training (10k examples) - all 5 agents"
        echo "  phase2: Experimental Mistral-7B - QA agent only"
        echo "  phase3: Full training (20k examples) - conditional"
        exit 1
        ;;
esac

