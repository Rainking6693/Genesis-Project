#!/bin/bash
# Start Genesis A2A Service
# Exposes 15 agents with 56 tools via A2A protocol

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Genesis A2A Service...${NC}"

# Change to project root
cd "$(dirname "$0")/.."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Warning: .env file not found. Creating from template...${NC}"
    cat > .env << EOF
# Genesis Environment Configuration
GENESIS_ENV=development

# A2A API Key (auto-generated if not set)
# A2A_API_KEY=your-api-key-here

# Azure Configuration (if needed)
# AZURE_OPENAI_ENDPOINT=your-endpoint
# AZURE_OPENAI_API_KEY=your-key
EOF
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}Error: Port 8000 is already in use${NC}"
    echo "Run: lsof -i :8000 to see what's using it"
    echo "Or: kill $(lsof -t -i:8000) to terminate it"
    exit 1
fi

# Start A2A service with uvicorn
echo -e "${GREEN}Starting A2A service on http://localhost:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo "Available endpoints:"
echo "  - http://localhost:8000/health (health check)"
echo "  - http://localhost:8000/a2a/card (agent metadata)"
echo "  - http://localhost:8000/a2a/agents (list all agents)"
echo "  - http://localhost:8000/a2a/invoke (invoke agent tools)"
echo "  - http://localhost:8000/docs (API documentation)"
echo ""

# Start uvicorn with hot reload for development
uvicorn a2a_service:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info

# Note: For production, use:
# uvicorn a2a_service:app --host 0.0.0.0 --port 8000 --workers 4
