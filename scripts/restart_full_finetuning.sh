#!/bin/bash
# RESTART Full Fine-Tuning Execution (after syntax fix)
# Re-runs all 5 agents in parallel with full 20k examples

set -euo pipefail

# Activate virtual environment
source venv/bin/activate
echo "✅ Activated virtual environment"

# Configuration
AGENTS=("qa_agent" "support_agent" "legal_agent" "analyst_agent" "content_agent")
BACKEND="gpt4o-mini"
DATA_DIR="data/openai_format_sampled"  # ← 5k samples (75% cost reduction)
OUTPUT_DIR="models"
LOG_DIR="logs/finetuning"
EPOCHS=3
LEARNING_RATE=2e-5
BATCH_SIZE=4

# Create directories
mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# Clear old execution log
cat > logs/finetuning_execution.log << 'EOF'
✅ Activated virtual environment
==========================================
FULL FINE-TUNING EXECUTION (RESTARTED)
==========================================
Backend: gpt4o-mini
Agents: qa_agent support_agent legal_agent analyst_agent content_agent
Examples: Full dataset (~20k each)
Expected time: 5-9 hours
Expected cost: $96.53
Status: RESTARTED after syntax fix
==========================================

EOF

echo "=========================================="
echo "FULL FINE-TUNING EXECUTION (RESTARTED)"
echo "=========================================="
echo "Backend: $BACKEND"
echo "Agents: ${AGENTS[*]}"
echo "Examples: Full dataset (~20k each)"
echo "Expected time: 5-9 hours"
echo "Expected cost: \$96.53"
echo "=========================================="
echo ""

# Start all 5 agents in parallel
PIDS=()
for agent in "${AGENTS[@]}"; do
    echo "Starting fine-tuning for $agent..."

    python3 scripts/finetune_agent.py \
        --agent "$agent" \
        --backend "$BACKEND" \
        --train_data "$DATA_DIR/${agent}_training.jsonl" \
        --output_dir "$OUTPUT_DIR/${agent}_${BACKEND}_full" \
        --epochs "$EPOCHS" \
        --learning_rate "$LEARNING_RATE" \
        --batch_size "$BATCH_SIZE" \
        > "$LOG_DIR/${agent}_${BACKEND}_full.stdout.log" 2>&1 &

    PID=$!
    PIDS+=($PID)
    echo "  Started PID: $PID" | tee -a logs/finetuning_execution.log
done

echo "" | tee -a logs/finetuning_execution.log
echo "All ${#AGENTS[@]} agents started in parallel" | tee -a logs/finetuning_execution.log
echo "PIDs: ${PIDS[*]}" | tee -a logs/finetuning_execution.log
echo "" | tee -a logs/finetuning_execution.log
echo "Monitoring progress... (Ctrl+C to cancel, jobs will continue)" | tee -a logs/finetuning_execution.log
echo "" | tee -a logs/finetuning_execution.log

# Monitor progress
while true; do
    running=0
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            ((running++))
        fi
    done

    timestamp=$(date '+%H:%M:%S')
    if [ $running -eq 0 ]; then
        echo "[$timestamp] ✅ All jobs completed!" | tee -a logs/finetuning_execution.log
        break
    else
        echo "[$timestamp] $running/${#AGENTS[@]} jobs still running..." | tee -a logs/finetuning_execution.log
    fi

    sleep 60
done

echo ""
echo "=========================================="
echo "EXECUTION COMPLETE"
echo "=========================================="
echo "Check individual logs in: $LOG_DIR/"
echo "Check models in: $OUTPUT_DIR/"
