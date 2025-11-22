#!/bin/bash
# Overnight Business Generation Script (VPS-optimized)
# Run this to generate 3 businesses overnight

set -e

echo "════════════════════════════════════════════════════════════"
echo "  OVERNIGHT BUSINESS GENERATION"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Start Time: $(date)"
echo "Expected Completion: ~10-12 hours"
echo ""

# Configuration
OUTPUT_DIR="businesses/friday_demo"
LOG_DIR="logs/business_generation"
mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# Log file
LOG_FILE="$LOG_DIR/generation_$(date +%Y%m%d_%H%M%S).log"

# Start timestamp
START_TIME=$(date +%s)

# Generate all 3 businesses in parallel
echo "▶ Starting parallel business generation..."
echo "  - Business 1: TechGear Store (E-Commerce)"
echo "  - Business 2: DevInsights Blog (Content Platform)"
echo "  - Business 3: TaskFlow Pro (SaaS)"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo "Log file: $LOG_FILE"
echo ""

# Run generation
cd /home/genesis/genesis-rebuild

python3 scripts/generate_business.py \
    --all \
    --parallel \
    --output-dir "$OUTPUT_DIR" \
    2>&1 | tee "$LOG_FILE"

# End timestamp
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
HOURS=$((DURATION / 3600))
MINUTES=$(((DURATION % 3600) / 60))

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  GENERATION COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo "Completion Time: $(date)"
echo "Duration: ${HOURS}h ${MINUTES}m"
echo "Output: $OUTPUT_DIR/"
echo "Log: $LOG_FILE"
echo "Cost: \$0.00 (local LLM)"
echo ""
echo "Businesses generated:"
ls -la "$OUTPUT_DIR" 2>/dev/null || echo "  (Check output directory)"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps (Friday morning):"
echo "  1. Validate: cd $OUTPUT_DIR && ls -la"
echo "  2. Review logs: cat $LOG_FILE"
echo "  3. Test locally: cd $OUTPUT_DIR/ecommerce && npm install && npm run dev"
echo "  4. Deploy: vercel deploy"
echo ""
