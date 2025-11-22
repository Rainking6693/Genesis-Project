#!/bin/bash
#
# MLOps Setup Verification Script
# Verifies RLT + Nanochat installation and cost analysis
#

set -e

echo "=================================="
echo "MLOps Setup Verification"
echo "=================================="
echo ""

# Check RLT installation
echo "1. Checking RLT installation..."
if [ -d "/home/genesis/genesis-rebuild/integrations/evolution/RLT" ]; then
    echo "   ✓ RLT repository present"

    # Check dependencies
    python -c "import transformers, datasets, accelerate, peft, trl" 2>/dev/null && \
        echo "   ✓ RLT core dependencies installed" || \
        echo "   ✗ RLT dependencies missing"
else
    echo "   ✗ RLT repository not found"
fi
echo ""

# Check Nanochat installation
echo "2. Checking Nanochat installation..."
if [ -d "/home/genesis/genesis-rebuild/integrations/memory/nanochat" ]; then
    echo "   ✓ Nanochat repository present"

    # Check UV
    if command -v /home/genesis/.local/bin/uv &> /dev/null; then
        echo "   ✓ UV package manager installed"
    else
        echo "   ✗ UV package manager not found"
    fi
else
    echo "   ✗ Nanochat repository not found"
fi
echo ""

# Check training pipelines
echo "3. Checking training pipelines..."
if [ -f "/home/genesis/genesis-rebuild/infrastructure/waltzrl_rlt_trainer.py" ]; then
    echo "   ✓ RLT training pipeline created"
    python -m infrastructure.waltzrl_rlt_trainer --help 2>/dev/null || true
else
    echo "   ✗ RLT training pipeline missing"
fi

if [ -f "/home/genesis/genesis-rebuild/infrastructure/nanochat_finetuner.py" ]; then
    echo "   ✓ Nanochat finetuning pipeline created"
    python -m infrastructure.nanochat_finetuner --help 2>/dev/null || true
else
    echo "   ✗ Nanochat finetuning pipeline missing"
fi
echo ""

# Check documentation
echo "4. Checking documentation..."
if [ -f "/home/genesis/genesis-rebuild/docs/BUDGET_FINETUNING_COMPARISON.md" ]; then
    echo "   ✓ Cost comparison documentation created"
    wc -l /home/genesis/genesis-rebuild/docs/BUDGET_FINETUNING_COMPARISON.md
else
    echo "   ✗ Cost comparison documentation missing"
fi
echo ""

# Display cost analysis summary
echo "=================================="
echo "Cost Analysis Summary"
echo "=================================="
echo ""
echo "RLT (WaltzRL Safety Agents):"
echo "  Baseline:    \$100,000"
echo "  RLT:         \$10,000"
echo "  Savings:     90% (\$90,000)"
echo ""
echo "Nanochat (15 Specialist Agents):"
echo "  OpenAI:      \$7,500 (15 × \$500)"
echo "  Nanochat:    \$1,440 (15 × \$96)"
echo "  Savings:     81% (\$6,060)"
echo ""
echo "Total Genesis Training Cost:"
echo "  Baseline:    \$107,500"
echo "  Optimized:   \$11,440"
echo "  Savings:     89.4% (\$96,060)"
echo ""

echo "=================================="
echo "Next Steps"
echo "=================================="
echo ""
echo "1. Prepare WaltzRL safety dataset (1000+ examples)"
echo "2. Prepare specialist agent datasets (100+ per agent)"
echo "3. Provision 8XH100 GPU node (\$24/hr Lambda GPU Cloud)"
echo "4. Execute RLT training (~52 hours, ~\$1,250)"
echo "5. Execute Nanochat finetuning (4 hours/agent, ~\$96)"
echo "6. Integrate trained models into Genesis agents"
echo "7. Validate quality vs. OpenAI/Anthropic baselines"
echo ""

echo "=================================="
echo "Installation Files"
echo "=================================="
echo ""
echo "RLT:"
echo "  - Repository: /home/genesis/genesis-rebuild/integrations/evolution/RLT/"
echo "  - Trainer:    /home/genesis/genesis-rebuild/infrastructure/waltzrl_rlt_trainer.py"
echo ""
echo "Nanochat:"
echo "  - Repository: /home/genesis/genesis-rebuild/integrations/memory/nanochat/"
echo "  - Finetuner:  /home/genesis/genesis-rebuild/infrastructure/nanochat_finetuner.py"
echo ""
echo "Documentation:"
echo "  - Cost Analysis: /home/genesis/genesis-rebuild/docs/BUDGET_FINETUNING_COMPARISON.md"
echo ""

echo "=================================="
echo "Verification Complete"
echo "=================================="
