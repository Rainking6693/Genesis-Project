#!/bin/bash
# Run Rogue automated tests against Genesis A2A service

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Genesis Rogue Testing Framework${NC}"
echo "================================"
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if A2A service is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}Error: A2A service is not running on port 8000${NC}"
    echo ""
    echo "Start the service first with:"
    echo "  ./scripts/start_a2a_service.sh"
    echo ""
    echo "Or in the background:"
    echo "  uvicorn a2a_service:app --host 0.0.0.0 --port 8000 &"
    exit 1
fi

echo -e "${GREEN}A2A service is running${NC}"
echo ""

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}Warning: OPENAI_API_KEY not set${NC}"
    echo "LLM judge will not be available. Set with:"
    echo "  export OPENAI_API_KEY='sk-...'"
    echo ""
    read -p "Continue without LLM judge? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load A2A API key from .env if exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep A2A_API_KEY | xargs)
fi

# Run Rogue in CLI mode
echo -e "${GREEN}Starting Rogue test execution...${NC}"
echo ""

WORKDIR="/home/genesis/genesis-rebuild/rogue_config"
CONFIG_FILE="/home/genesis/genesis-rebuild/rogue_config/rogue_config.yaml"

# Run Rogue tests
uvx rogue-ai cli \
    --workdir "$WORKDIR" \
    --config-file "$CONFIG_FILE" \
    --protocol a2a \
    --transport http \
    --evaluated-agent-url "http://localhost:8000/a2a" \
    --evaluated-agent-auth-type api_key \
    --input-scenarios-file "$WORKDIR/scenarios.json" \
    --output-report-file "$WORKDIR/rogue_report.json" \
    --judge-llm "gpt-4" \
    --debug

# Check if report was generated
if [ -f "$WORKDIR/rogue_report.json" ]; then
    echo ""
    echo -e "${GREEN}Test execution complete!${NC}"
    echo ""
    echo "Report generated at: $WORKDIR/rogue_report.json"
    echo ""

    # Pretty-print summary if jq is available
    if command -v jq &> /dev/null; then
        echo "Test Summary:"
        jq '.summary // .results | length' "$WORKDIR/rogue_report.json" 2>/dev/null || echo "Report format may vary"
    fi
else
    echo -e "${RED}Warning: Report file not generated${NC}"
fi

echo ""
echo "View full report:"
echo "  cat $WORKDIR/rogue_report.json | jq ."
