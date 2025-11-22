#!/bin/bash
# Genesis Rebuild - Environment Setup Script
# Automatically configures .env file with all required API keys

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

echo "===================================================="
echo "Genesis Rebuild - Environment Setup"
echo "===================================================="
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists at: $ENV_FILE"
    echo ""
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Existing .env file preserved."
        exit 0
    fi

    # Backup existing .env
    BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo "✅ Backed up existing .env to: $BACKUP_FILE"
    echo ""
fi

# Copy .env.example to .env
cp "$ENV_EXAMPLE" "$ENV_FILE"
echo "✅ Created .env from .env.example"
echo ""

# Function to prompt for API key and update .env
update_env_key() {
    local KEY_NAME=$1
    local DESCRIPTION=$2
    local URL=$3
    local REQUIRED=$4
    local DEFAULT_VALUE=$5

    echo "──────────────────────────────────────────────────"
    echo "Setting: $KEY_NAME"
    echo "Purpose: $DESCRIPTION"
    if [ ! -z "$URL" ]; then
        echo "Get key: $URL"
    fi
    echo ""

    # Check if already set in environment
    if [ ! -z "${!KEY_NAME}" ]; then
        echo "✅ Already set in environment: ${KEY_NAME:0:20}..."
        read -p "Use existing value? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sed -i "s|^$KEY_NAME=.*|$KEY_NAME=${!KEY_NAME}|" "$ENV_FILE"
            echo "✅ Used environment variable"
            echo ""
            return
        fi
    fi

    # Prompt for new value
    if [ "$REQUIRED" = "true" ]; then
        while true; do
            read -p "Enter $KEY_NAME (required): " VALUE
            if [ ! -z "$VALUE" ]; then
                sed -i "s|^$KEY_NAME=.*|$KEY_NAME=$VALUE|" "$ENV_FILE"
                echo "✅ Set $KEY_NAME"
                echo ""
                break
            else
                echo "❌ This key is required. Please enter a value."
            fi
        done
    else
        read -p "Enter $KEY_NAME (optional, press Enter to skip): " VALUE
        if [ ! -z "$VALUE" ]; then
            # Uncomment and set value
            sed -i "s|^# $KEY_NAME=.*|$KEY_NAME=$VALUE|" "$ENV_FILE"
            sed -i "s|^$KEY_NAME=.*|$KEY_NAME=$VALUE|" "$ENV_FILE"
            echo "✅ Set $KEY_NAME"
        else
            echo "⏭️  Skipped $KEY_NAME (can set later)"
        fi
        echo ""
    fi
}

echo "===================================================="
echo "REQUIRED API KEYS"
echo "===================================================="
echo ""

# Required API keys
update_env_key "ANTHROPIC_API_KEY" \
    "Code generation, safety evaluation (Claude Sonnet 4.5)" \
    "https://console.anthropic.com/settings/keys" \
    "true"

update_env_key "OPENAI_API_KEY" \
    "Orchestration, strategic decisions (GPT-4o)" \
    "https://platform.openai.com/api-keys" \
    "true"

echo "===================================================="
echo "OPTIONAL API KEYS (Recommended)"
echo "===================================================="
echo ""

update_env_key "GEMINI_API_KEY" \
    "High-throughput tasks, OCR vision model (Gemini 2.0 Flash)" \
    "https://aistudio.google.com/apikey" \
    "false"

echo "===================================================="
echo "OPTIONAL API KEYS (Advanced Features)"
echo "===================================================="
echo ""

update_env_key "GOOGLE_CLOUD_PROJECT_ID" \
    "VideoGen backend (VISTA multimodal)" \
    "https://console.cloud.google.com/" \
    "false"

update_env_key "DEEPSEEK_API_KEY" \
    "Open-source LLM fallback (DeepSeek R1)" \
    "https://platform.deepseek.com/api_keys" \
    "false"

update_env_key "AZURE_OPENAI_ENDPOINT" \
    "Azure OpenAI Service (if using Azure instead of OpenAI)" \
    "https://portal.azure.com/" \
    "false"

update_env_key "AZURE_OPENAI_API_KEY" \
    "Azure OpenAI API key" \
    "https://portal.azure.com/" \
    "false"

echo "===================================================="
echo "DATABASE CONFIGURATION"
echo "===================================================="
echo ""
echo "MongoDB and Redis are required for Layer 6 (Memory Systems)."
echo "If running locally, default values are usually correct."
echo ""

read -p "Configure database URLs? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    update_env_key "MONGODB_URI" \
        "MongoDB for graph database, trajectories, benchmarks" \
        "" \
        "false"

    update_env_key "REDIS_URL" \
        "Redis for caching, embeddings, attention scores" \
        "" \
        "false"
fi

echo "===================================================="
echo "✅ SETUP COMPLETE"
echo "===================================================="
echo ""
echo "Your .env file has been created at: $ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Verify your API keys are correct"
echo "2. Start MongoDB and Redis (if using Layer 6 features):"
echo "   docker-compose up -d mongodb redis"
echo "3. Run tests to verify configuration:"
echo "   pytest tests/"
echo ""
echo "To add more keys later, edit .env directly or re-run this script."
echo ""
echo "Security reminders:"
echo "✓ .env is in .gitignore (won't be committed)"
echo "✓ Never share your .env file"
echo "✓ Rotate API keys regularly"
echo "✓ Use different keys for dev/staging/prod"
echo ""

# Add to .bashrc for persistence (optional)
read -p "Add ANTHROPIC_API_KEY to ~/.bashrc for persistence? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Extract ANTHROPIC_API_KEY from .env
    ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)

    if [ ! -z "$ANTHROPIC_KEY" ] && [ "$ANTHROPIC_KEY" != "your_anthropic_api_key_here" ]; then
        # Check if already in .bashrc
        if grep -q "export ANTHROPIC_API_KEY=" ~/.bashrc; then
            echo "⚠️  ANTHROPIC_API_KEY already in ~/.bashrc, updating..."
            sed -i "/export ANTHROPIC_API_KEY=/c\export ANTHROPIC_API_KEY=\"$ANTHROPIC_KEY\"" ~/.bashrc
        else
            echo "" >> ~/.bashrc
            echo "# Genesis Rebuild - Anthropic API Key" >> ~/.bashrc
            echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_KEY\"" >> ~/.bashrc
        fi
        echo "✅ Added ANTHROPIC_API_KEY to ~/.bashrc"
        echo "   Run: source ~/.bashrc"
    else
        echo "❌ ANTHROPIC_API_KEY not set, skipping .bashrc update"
    fi
fi

echo ""
echo "Setup complete! 🚀"
