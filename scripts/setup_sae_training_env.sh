#!/bin/bash
set -e

###############################################################################
# SAE PII Training Environment Setup Script (Draft Stub)
# For Lambda Labs GPU Instances
#
# 🚧  STATUS: Concept only. Cluster provisioning, datasets, and model weights are
#      not yet available. Do not run this script expecting a working environment.
#      Keep it checked in purely as future documentation.
#
# Usage (once implementation lands): bash setup_sae_training_env.sh
###############################################################################

echo "=========================================="
echo "SAE PII Training Environment Setup (stub)"
echo "=========================================="
echo ""
echo "[stub] This environment setup has not been implemented yet." >&2
echo "[stub] Exiting to avoid partial or misleading provisioning." >&2
exit 1

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${YELLOW}Note: Running as root, some commands may differ${NC}"
fi

# ============================================================================
# Step 1: Update System
# ============================================================================

echo -e "${GREEN}[1/10]${NC} Updating system packages..."
sudo apt-get update -y > /dev/null 2>&1
sudo apt-get upgrade -y > /dev/null 2>&1
echo -e "${GREEN}✓${NC} System updated"

# ============================================================================
# Step 2: Install Build Tools
# ============================================================================

echo -e "${GREEN}[2/10]${NC} Installing build tools..."
sudo apt-get install -y \
    build-essential \
    git \
    wget \
    curl \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-pip \
    python3-venv \
    ca-certificates \
    > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Build tools installed"

# ============================================================================
# Step 3: Verify NVIDIA GPU and CUDA
# ============================================================================

echo -e "${GREEN}[3/10]${NC} Checking NVIDIA GPU and CUDA..."

if ! command -v nvidia-smi &> /dev/null; then
    echo -e "${RED}✗${NC} nvidia-smi not found. GPU drivers may not be installed."
    exit 1
fi

NVIDIA_DRIVER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -n1)
CUDA_VERSION=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}')
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n1)
GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n1)

echo -e "${GREEN}✓${NC} GPU detected"
echo "  GPU Name: $GPU_NAME"
echo "  GPU Memory: ${GPU_MEMORY} MB"
echo "  CUDA Version: $CUDA_VERSION"
echo "  Driver Version: $NVIDIA_DRIVER"

# ============================================================================
# Step 4: Create Python Virtual Environment
# ============================================================================

echo -e "${GREEN}[4/10]${NC} Creating Python virtual environment..."

VENV_PATH="/home/ubuntu/sae-training-venv"

if [ -d "$VENV_PATH" ]; then
    echo "  Virtual environment already exists at $VENV_PATH"
else
    python3 -m venv "$VENV_PATH"
    echo -e "${GREEN}✓${NC} Virtual environment created at $VENV_PATH"
fi

# Source the virtual environment
source "$VENV_PATH/bin/activate"
echo -e "${GREEN}✓${NC} Virtual environment activated"

# ============================================================================
# Step 5: Upgrade pip and setuptools
# ============================================================================

echo -e "${GREEN}[5/10]${NC} Upgrading pip and setuptools..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
echo -e "${GREEN}✓${NC} pip upgraded"

# ============================================================================
# Step 6: Install PyTorch with CUDA Support
# ============================================================================

echo -e "${GREEN}[6/10]${NC} Installing PyTorch with CUDA support..."
echo "  This may take 2-5 minutes..."

# Determine CUDA version for PyTorch
# CUDA 11.8 works with most NVIDIA drivers
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 \
    > /dev/null 2>&1

# Verify PyTorch installation
PYTORCH_VERSION=$(python3 -c "import torch; print(torch.__version__)" 2>/dev/null)
CUDA_AVAILABLE=$(python3 -c "import torch; print(torch.cuda.is_available())" 2>/dev/null)

echo -e "${GREEN}✓${NC} PyTorch installed"
echo "  Version: $PYTORCH_VERSION"
echo "  CUDA Available: $CUDA_AVAILABLE"

if [ "$CUDA_AVAILABLE" != "True" ]; then
    echo -e "${YELLOW}⚠${NC}  Warning: CUDA not detected in PyTorch. This may work anyway."
fi

# ============================================================================
# Step 7: Install Machine Learning Dependencies
# ============================================================================

echo -e "${GREEN}[7/10]${NC} Installing ML dependencies..."
echo "  This may take 3-5 minutes..."

pip install \
    transformers==4.45.2 \
    safetensors==0.4.3 \
    scikit-learn==1.5.2 \
    xgboost==2.1.3 \
    numpy==1.26.4 \
    pandas==2.2.3 \
    scipy==1.14.1 \
    tqdm==4.67.1 \
    requests==2.32.3 \
    langdetect==1.0.9 \
    > /dev/null 2>&1

echo -e "${GREEN}✓${NC} ML dependencies installed"

# ============================================================================
# Step 8: Install Anthropic SDK (for potential LLM-assisted labeling)
# ============================================================================

echo -e "${GREEN}[8/10]${NC} Installing Anthropic SDK..."

pip install anthropic==0.39.0 > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Anthropic SDK installed"

# ============================================================================
# Step 9: Verify Installations
# ============================================================================

echo -e "${GREEN}[9/10]${NC} Verifying installations..."

echo ""
echo "Python Packages:"
python3 << 'PYEOF'
import sys
packages = {
    'torch': 'PyTorch',
    'transformers': 'Transformers',
    'safetensors': 'SafeTensors',
    'sklearn': 'Scikit-Learn',
    'xgboost': 'XGBoost',
    'numpy': 'NumPy',
    'pandas': 'Pandas',
    'anthropic': 'Anthropic SDK'
}

for pkg_name, display_name in packages.items():
    try:
        mod = __import__(pkg_name)
        version = getattr(mod, '__version__', 'installed')
        print(f"  {display_name:20s}: {version}")
    except ImportError:
        print(f"  {display_name:20s}: NOT FOUND")
        sys.exit(1)

# Check CUDA
import torch
print(f"  {'CUDA Available':20s}: {torch.cuda.is_available()}")
print(f"  {'GPU Count':20s}: {torch.cuda.device_count()}")
if torch.cuda.is_available():
    print(f"  {'Current GPU':20s}: {torch.cuda.get_device_name(0)}")
PYEOF

echo -e "${GREEN}✓${NC} All packages verified"

# ============================================================================
# Step 10: Create Helper Scripts
# ============================================================================

echo -e "${GREEN}[10/10]${NC} Creating helper scripts..."

# Create activation script
cat > /home/ubuntu/activate_sae_env.sh << 'ACTIVATE'
#!/bin/bash
source /home/ubuntu/sae-training-venv/bin/activate
echo "SAE training environment activated!"
echo "Python: $(python3 --version)"
echo "CUDA available: $(python3 -c 'import torch; print(torch.cuda.is_available())')"
ACTIVATE

chmod +x /home/ubuntu/activate_sae_env.sh

# Create GPU monitor script
cat > /home/ubuntu/monitor_gpu.sh << 'MONITOR'
#!/bin/bash
watch -n 1 nvidia-smi
MONITOR

chmod +x /home/ubuntu/monitor_gpu.sh

# Create training data download script
mkdir -p /home/ubuntu/training-data
cat > /home/ubuntu/download_models.sh << 'DOWNLOAD'
#!/bin/bash
set -e

echo "Downloading required models..."
source /home/ubuntu/sae-training-venv/bin/activate

# Download Llama 3.2 8B
echo "Downloading Llama 3.2 8B..."
python3 << 'PYEOF'
from transformers import AutoTokenizer, AutoModel

# This will download to ~/.cache/huggingface/
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-8B")
model = AutoModel.from_pretrained("meta-llama/Llama-3.2-8B", load_in_8bit=False)
print("Llama 3.2 8B downloaded successfully!")
PYEOF

echo "Models downloaded!"
DOWNLOAD

chmod +x /home/ubuntu/download_models.sh

echo -e "${GREEN}✓${NC} Helper scripts created"
echo "  - /home/ubuntu/activate_sae_env.sh"
echo "  - /home/ubuntu/monitor_gpu.sh"
echo "  - /home/ubuntu/download_models.sh"

# ============================================================================
# Setup Complete
# ============================================================================

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "To activate the environment in future sessions:"
echo "  source /home/ubuntu/sae-training-venv/bin/activate"
echo ""
echo "Or use the helper script:"
echo "  bash /home/ubuntu/activate_sae_env.sh"
echo ""
echo "GPU Information:"
nvidia-smi --query-gpu=index,name,memory.total,driver_version --format=csv,noheader
echo ""
echo "Next steps:"
echo "  1. Upload Genesis training code:"
echo "     scp -i ~/.ssh/lambda_key -r /path/to/genesis-rebuild ubuntu@<instance-ip>:/home/ubuntu/"
echo ""
echo "  2. Run training script:"
echo "     python3 /home/ubuntu/genesis-rebuild/scripts/train_sae_pii.py"
echo ""
echo "  3. Monitor GPU:"
echo "     bash /home/ubuntu/monitor_gpu.sh"
echo ""
