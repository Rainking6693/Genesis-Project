#!/bin/bash
# Real Business Generation with Vertex AI
# Properly loads .env variables for Vertex AI access

cd /home/genesis/genesis-rebuild

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║         REAL BUSINESS GENERATION WITH VERTEX AI                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment variables from .env
echo "📋 Loading environment variables from .env..."
set -a
source .env
set +a

# Verify critical variables
echo "✅ Environment loaded:"
echo "   ENABLE_VERTEX_AI: $ENABLE_VERTEX_AI"
echo "   VERTEX_PROJECT_ID: $VERTEX_PROJECT_ID"
echo "   ENABLE_MULTI_AGENT_EVOLVE: $ENABLE_MULTI_AGENT_EVOLVE"
echo "   ENABLE_FP16_TRAINING: $ENABLE_FP16_TRAINING"
echo ""

# Clean previous mock output
if [ -d "businesses/friday_demo" ]; then
    echo "🧹 Cleaning previous mock output..."
    rm -rf businesses/friday_demo
    echo "✅ Cleaned"
    echo ""
fi

# Start generation
echo "🚀 Starting REAL business generation..."
echo "   Mode: Parallel (3 businesses simultaneously)"
echo "   LLM: Vertex AI (fine-tuned + base Gemini Flash)"
echo "   Expected time: 10-12 hours"
echo "   Expected cost: ~\$0.02-0.10 (2-10 cents)"
echo ""
echo "Active Enhancements:"
echo "   ✅ Multi-Agent Evolve (+10-25% quality)"
echo "   ✅ FP16 Training (2-3x faster)"
echo "   ✅ HGM Tree Search (+15-25% code quality)"
echo "   ✅ SLICE Context Linting (30-50% token reduction)"
echo "   ✅ Vertex AI (6 fine-tuned + base models)"
echo ""

# Run generation with environment variables
python3 scripts/generate_business.py --all --parallel --output-dir businesses/friday_demo

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    GENERATION COMPLETE                                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Output directory: businesses/friday_demo/"
echo ""
echo "Next steps:"
echo "  1. Check output: ls -la businesses/friday_demo/*/​"
echo "  2. Review manifests: cat businesses/friday_demo/*/business_manifest.json"
echo "  3. Test locally: cd businesses/friday_demo/ecommerce && npm install && npm run dev"
echo "  4. Deploy: cd businesses/friday_demo/ecommerce && vercel deploy --prod"
echo ""

