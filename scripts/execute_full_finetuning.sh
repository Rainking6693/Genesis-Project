#!/bin/bash
# Execute Full Fine-Tuning - All 5 Agents in Parallel
# GPT-4o-mini backend, full 20k examples each
# Expected: 5-9 hours, $96.53 cost

set -euo pipefail

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
fi

AGENTS=("qa_agent" "support_agent" "legal_agent" "analyst_agent" "content_agent")
BACKEND="gpt4o-mini"
DATA_DIR="data/unsloth_format"
OUTPUT_DIR="models"
LOG_DIR="logs/finetuning"
EPOCHS=3
LEARNING_RATE=2e-5
BATCH_SIZE=4

echo "=========================================="
echo "FULL FINE-TUNING EXECUTION"
echo "=========================================="
echo "Backend: $BACKEND"
echo "Agents: ${AGENTS[*]}"
echo "Examples: Full dataset (~20k each)"
echo "Expected time: 5-9 hours"
echo "Expected cost: \$96.53"
echo "=========================================="
echo ""

# Create directories
mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# Start all fine-tuning jobs in parallel
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
        --log_file "$LOG_DIR/${agent}_${BACKEND}_full.log" \
        --resume \
        > "$LOG_DIR/${agent}_${BACKEND}_full.stdout.log" 2>&1 &
    
    PIDS+=($!)
    echo "  Started PID: ${PIDS[-1]}"
done

echo ""
echo "All ${#AGENTS[@]} agents started in parallel"
echo "PIDs: ${PIDS[*]}"
echo ""
echo "Monitoring progress... (Ctrl+C to cancel, jobs will continue)"
echo ""

# Monitor progress
while true; do
    RUNNING=0
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            RUNNING=$((RUNNING + 1))
        fi
    done
    
    if [ $RUNNING -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "ALL JOBS COMPLETE"
        echo "=========================================="
        break
    fi
    
    echo "[$(date +%H:%M:%S)] $RUNNING/${#PIDS[@]} jobs still running..."
    sleep 60
done

# Check final status
echo ""
echo "Final Status:"
for i in "${!AGENTS[@]}"; do
    agent="${AGENTS[$i]}"
    pid="${PIDS[$i]}"
    
    if wait "$pid" 2>/dev/null; then
        echo "  ✅ $agent: SUCCESS"
    else
        echo "  ❌ $agent: FAILED (check logs)"
    fi
done

echo ""
echo "Logs available in: $LOG_DIR"
echo "Models available in: $OUTPUT_DIR"

