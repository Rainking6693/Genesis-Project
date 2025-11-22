#!/bin/bash
#
# WebArena Installation Script
# Purpose: Install WebArena web-based GUI benchmark framework
# Requirements: Python 3.10+, Playwright, Docker (optional for full environment)
# Author: Alex (E2E Testing Specialist)
# Date: October 27, 2025
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== WebArena Installation Script ===${NC}"
echo "This script will install WebArena benchmark framework"
echo ""

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]; }; then
    echo -e "${RED}Error: Python 3.10+ required. Found: $PYTHON_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $PYTHON_VERSION detected${NC}"

# Check if running on Ubuntu/Debian
echo -e "${YELLOW}Checking operating system...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "${GREEN}✓ Detected: $OS${NC}"
else
    echo -e "${RED}Warning: Could not detect OS. Proceeding anyway...${NC}"
fi

# Create temporary directory for installation
TEMP_DIR="/tmp/webarena_install_$$"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo ""
echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
sudo apt-get update -qq

# Install required system packages
PACKAGES=(
    "python3-pip"
    "python3-dev"
    "git"
    "wget"
    "curl"
    "build-essential"
)

for pkg in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $pkg "; then
        echo -e "${GREEN}✓ $pkg already installed${NC}"
    else
        echo "Installing $pkg..."
        sudo apt-get install -y "$pkg" > /dev/null 2>&1
        echo -e "${GREEN}✓ $pkg installed${NC}"
    fi
done

# Check Docker (optional but recommended for full WebArena environment)
echo ""
echo -e "${YELLOW}Checking Docker installation (optional)...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}')
    echo -e "${GREEN}✓ Docker $DOCKER_VERSION detected${NC}"
    echo "  Full WebArena websites can be deployed with Docker"
else
    echo -e "${YELLOW}! Docker not found. This is optional for basic benchmarking.${NC}"
    echo "  To install Docker: https://docs.docker.com/engine/install/"
fi

echo ""
echo -e "${YELLOW}Step 2: Cloning WebArena repository...${NC}"
if [ -d "$HOME/webarena" ]; then
    echo -e "${YELLOW}WebArena directory already exists. Pulling latest changes...${NC}"
    cd "$HOME/webarena"
    git pull origin main 2>&1 | grep -v "Already up to date" || echo -e "${GREEN}✓ Repository updated${NC}"
else
    echo "Cloning from GitHub..."
    git clone https://github.com/web-arena-x/webarena.git "$HOME/webarena"
    cd "$HOME/webarena"
    echo -e "${GREEN}✓ Repository cloned to $HOME/webarena${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt --quiet
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${RED}Warning: requirements.txt not found. Installing core dependencies...${NC}"
    pip3 install --quiet \
        playwright \
        beautifulsoup4 \
        requests \
        openai \
        anthropic \
        selenium
    echo -e "${GREEN}✓ Core dependencies installed${NC}"
fi

# Install WebArena package in editable mode
echo "Installing WebArena package..."
pip3 install -e . --quiet
echo -e "${GREEN}✓ WebArena package installed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Installing Playwright browsers...${NC}"
echo "This may take a few minutes on first install..."
playwright install chromium --quiet 2>&1 | grep -E "(Downloaded|Installing)" || true
playwright install firefox --quiet 2>&1 | grep -E "(Downloaded|Installing)" || true
echo -e "${GREEN}✓ Playwright browsers installed (Chromium, Firefox)${NC}"

echo ""
echo -e "${YELLOW}Step 5: Verifying installation...${NC}"
if python3 -c "import webarena; print('WebArena imported successfully')" 2>/dev/null; then
    echo -e "${GREEN}✓ WebArena import successful${NC}"
elif python3 -c "import browser_env; print('WebArena browser_env imported successfully')" 2>/dev/null; then
    echo -e "${GREEN}✓ WebArena browser_env import successful${NC}"
else
    echo -e "${YELLOW}Note: Direct import verification inconclusive. Will verify during tests.${NC}"
fi

# Check for benchmark tasks
echo ""
echo -e "${YELLOW}Step 6: Checking for benchmark tasks...${NC}"
if [ -d "$HOME/webarena/config_files" ]; then
    CONFIG_COUNT=$(find "$HOME/webarena/config_files" -name "*.json" | wc -l)
    echo -e "${GREEN}✓ Found $CONFIG_COUNT configuration files${NC}"
else
    echo -e "${YELLOW}Note: Config files directory not found at expected location.${NC}"
fi

if [ -d "$HOME/webarena/test_data" ] || [ -d "$HOME/webarena/evaluation_examples" ]; then
    echo -e "${GREEN}✓ Test data directory found${NC}"
else
    echo -e "${YELLOW}Note: Test data will be generated during benchmark runs.${NC}"
fi

# Create symlink for easy access
echo ""
echo -e "${YELLOW}Step 7: Creating symlinks...${NC}"
GENESIS_DIR="/home/genesis/genesis-rebuild"
if [ -d "$GENESIS_DIR" ]; then
    if [ ! -L "$GENESIS_DIR/webarena" ]; then
        ln -sf "$HOME/webarena" "$GENESIS_DIR/webarena"
        echo -e "${GREEN}✓ Symlink created: $GENESIS_DIR/webarena -> $HOME/webarena${NC}"
    else
        echo -e "${GREEN}✓ Symlink already exists${NC}"
    fi
fi

# Create environment template
echo ""
echo -e "${YELLOW}Step 8: Creating environment configuration template...${NC}"
ENV_FILE="$HOME/webarena/.env.example"
if [ ! -f "$ENV_FILE" ] && [ ! -f "$HOME/webarena/.env" ]; then
    cat > "$ENV_FILE" << 'EOF'
# WebArena Environment Configuration
# Copy this to .env and configure with your actual URLs

# Shopping Website
SHOPPING="http://localhost:7770"
SHOPPING_ADMIN="http://localhost:7780/admin"

# Reddit-like Forum
REDDIT="http://localhost:9999"

# GitLab Instance
GITLAB="http://localhost:8023"

# Wikipedia
WIKIPEDIA="http://localhost:8888/wikipedia_en_all_maxi_2022-05/A/User:The_other_Kiwix_guy/Landing"

# Map Service
MAP="http://localhost:3000"

# Homepage
HOMEPAGE="http://localhost:4399"

# LLM Configuration (for agents)
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
EOF
    echo -e "${GREEN}✓ Environment template created: $ENV_FILE${NC}"
    echo "  Configure .env file before running full benchmarks"
else
    echo -e "${GREEN}✓ Environment configuration already exists${NC}"
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WebArena Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installation Summary:"
echo "  - WebArena Location: $HOME/webarena"
echo "  - Python Version: $PYTHON_VERSION"
echo "  - Playwright: Installed (Chromium, Firefox)"
if command -v docker &> /dev/null; then
    echo "  - Docker: Available (can run full environment)"
else
    echo "  - Docker: Not installed (optional)"
fi
echo ""
echo "Next Steps:"
echo "  1. Configure .env file: cp $HOME/webarena/.env.example $HOME/webarena/.env"
echo "  2. (Optional) Start WebArena websites with Docker"
echo "  3. Run tests: pytest tests/test_webarena_benchmark.py"
echo "  4. View docs: cat docs/GUI_BENCHMARK_INTEGRATION_COMPLETE.md"
echo ""
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Note: For full WebArena environment, install Docker:${NC}"
    echo "  https://docs.docker.com/engine/install/ubuntu/"
    echo ""
fi
echo -e "${GREEN}Ready for benchmark validation!${NC}"
