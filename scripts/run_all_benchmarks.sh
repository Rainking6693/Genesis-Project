#!/bin/bash
# Run benchmarks for all 5 fine-tuned Genesis agents
# Uses existing ROGUE scenario files as benchmark tasks

set -e

# SECURITY: Do not hardcode API keys. Set via environment variable:
# export MISTRAL_API_KEY="your-key-here"
if [[ -z "${MISTRAL_API_KEY:-}" ]]; then
    echo "ERROR: MISTRAL_API_KEY environment variable not set"
    echo "Set it with: export MISTRAL_API_KEY='your-key-here'"
    exit 1
fi

AGENTS=("qa_agent" "content_agent" "legal_agent" "support_agent" "analyst_agent")

echo "🚀 Starting Genesis Agent Benchmarks"
echo "===================================="
echo ""

mkdir -p reports/benchmarks

for agent in "${AGENTS[@]}"; do
    echo "📊 Benchmarking: $agent"
    echo "-----------------------------------"
    
    # Check if model exists
    if [ ! -f "models/${agent}_mistral/model_id.txt" ]; then
        echo "⚠️  Model ID not found for $agent, skipping..."
        continue
    fi
    
    MODEL_ID=$(cat "models/${agent}_mistral/model_id.txt")
    echo "   Model: $MODEL_ID"
    
    # Run benchmark using genesis-custom
    python3 scripts/benchmark_finetuned.py \
        --model "models/${agent}_mistral" \
        --benchmark genesis-custom \
        --agent "$agent" \
        --output_dir "reports/benchmarks" \
        2>&1 | tee "reports/benchmarks/${agent}_benchmark.log"
    
    echo "✅ $agent complete"
    echo ""
done

echo "===================================="
echo "✅ All benchmarks complete!"
echo ""
echo "Results saved to: reports/benchmarks/"
ls -lh reports/benchmarks/*.json 2>/dev/null || echo "No JSON results yet"
