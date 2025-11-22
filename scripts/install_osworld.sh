#!/bin/bash
#
# OSWorld Installation Script
# Purpose: Install OSWorld GUI benchmark framework for Computer Use validation
# Requirements: Python 3.10+, Ubuntu 22.04+ (or compatible Linux)
# Author: Alex (E2E Testing Specialist)
# Date: October 27, 2025
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OSWorld Installation Script ===${NC}"
echo "This script will install OSWorld benchmark framework"
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
TEMP_DIR="/tmp/osworld_install_$$"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo ""
echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
sudo apt-get update -qq

# Install required system packages
PACKAGES=(
    "python3-pip"
    "python3-tk"
    "python3-dev"
    "git"
    "wget"
    "curl"
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

echo ""
echo -e "${YELLOW}Step 2: Cloning OSWorld repository...${NC}"
if [ -d "$HOME/OSWorld" ]; then
    echo -e "${YELLOW}OSWorld directory already exists. Pulling latest changes...${NC}"
    cd "$HOME/OSWorld"
    git pull origin main 2>&1 | grep -v "Already up to date" || echo -e "${GREEN}✓ Repository updated${NC}"
else
    echo "Cloning from GitHub..."
    git clone https://github.com/xlang-ai/OSWorld "$HOME/OSWorld"
    cd "$HOME/OSWorld"
    echo -e "${GREEN}✓ Repository cloned to $HOME/OSWorld${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt --quiet
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${RED}Warning: requirements.txt not found. Installing core dependencies...${NC}"
    pip3 install --quiet \
        numpy \
        gymnasium \
        Pillow \
        requests \
        pyautogui \
        opencv-python
    echo -e "${GREEN}✓ Core dependencies installed${NC}"
fi

# Install OSWorld package
echo "Installing OSWorld package..."
pip3 install -e . --quiet
echo -e "${GREEN}✓ OSWorld package installed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Verifying installation...${NC}"
if python3 -c "import desktop_env; print('OSWorld version:', desktop_env.__version__ if hasattr(desktop_env, '__version__') else 'unknown')" 2>/dev/null; then
    echo -e "${GREEN}✓ OSWorld import successful${NC}"
else
    echo -e "${RED}Warning: OSWorld import verification failed${NC}"
    echo "This may be normal if running headless. Will verify during tests."
fi

# Optional: Download sample tasks/benchmarks
echo ""
echo -e "${YELLOW}Step 5: Checking for benchmark tasks...${NC}"
if [ -d "$HOME/OSWorld/evaluation_examples" ]; then
    TASK_COUNT=$(find "$HOME/OSWorld/evaluation_examples" -name "*.json" | wc -l)
    echo -e "${GREEN}✓ Found $TASK_COUNT benchmark tasks${NC}"
else
    echo -e "${YELLOW}Note: Benchmark tasks directory not found. Will be created during tests.${NC}"
fi

# Create symlink for easy access
echo ""
echo -e "${YELLOW}Step 6: Creating symlinks...${NC}"
GENESIS_DIR="/home/genesis/genesis-rebuild"
if [ -d "$GENESIS_DIR" ]; then
    if [ ! -L "$GENESIS_DIR/OSWorld" ]; then
        ln -sf "$HOME/OSWorld" "$GENESIS_DIR/OSWorld"
        echo -e "${GREEN}✓ Symlink created: $GENESIS_DIR/OSWorld -> $HOME/OSWorld${NC}"
    else
        echo -e "${GREEN}✓ Symlink already exists${NC}"
    fi
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OSWorld Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installation Summary:"
echo "  - OSWorld Location: $HOME/OSWorld"
echo "  - Python Version: $PYTHON_VERSION"
echo "  - Benchmark Tasks: Available in evaluation_examples/"
echo ""
echo "Next Steps:"
echo "  1. Run tests: pytest tests/test_osworld_benchmark.py"
echo "  2. View docs: cat docs/GUI_BENCHMARK_INTEGRATION_COMPLETE.md"
echo "  3. Check status: python3 -c 'import desktop_env; print(desktop_env.__version__)'"
echo ""
echo -e "${GREEN}Ready for benchmark validation!${NC}"
