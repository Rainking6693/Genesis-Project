#!/bin/bash
# Genesis Skyvern Secrets Setup Script
# ============================================
# Securely creates secret files from .env
# Created: November 8, 2025
# Owner: Quinn (Security Specialist)

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/secrets"
ENV_FILE="$PROJECT_ROOT/.env"

echo "=========================================="
echo "Genesis Skyvern Secrets Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: .env file not found at: $ENV_FILE"
    echo ""
    echo "Please create .env from template:"
    echo "  cp .env.example .env"
    echo "  # Edit .env and fill in your API keys"
    exit 1
fi

# Create secrets directory if it doesn't exist
echo "Creating secrets directory..."
mkdir -p "$SECRETS_DIR"

# Function to extract env var and write to secret file
create_secret_file() {
    local env_var="$1"
    local secret_file="$2"

    echo "Processing $env_var..."

    # Extract value from .env
    local value=$(grep "^$env_var=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\n\r')

    if [ -z "$value" ]; then
        echo "⚠️  WARNING: $env_var not found in .env, creating empty file"
        echo "REPLACE_WITH_YOUR_KEY" > "$secret_file"
    else
        # Write to secret file (remove any trailing newlines)
        echo -n "$value" > "$secret_file"
        echo "✓ Created: $secret_file"
    fi
}

# Create secret files
echo ""
echo "Creating secret files..."
echo "----------------------------------------"

create_secret_file "OPENAI_API_KEY" "$SECRETS_DIR/openai_api_key.txt"
create_secret_file "ANTHROPIC_API_KEY" "$SECRETS_DIR/anthropic_api_key.txt"

# Skyvern API key (may not be in .env yet)
if grep -q "^SKYVERN_API_KEY=" "$ENV_FILE"; then
    create_secret_file "SKYVERN_API_KEY" "$SECRETS_DIR/skyvern_api_key.txt"
else
    echo "⚠️  WARNING: SKYVERN_API_KEY not found in .env"
    echo "Creating placeholder file..."
    echo "REPLACE_WITH_YOUR_SKYVERN_KEY" > "$SECRETS_DIR/skyvern_api_key.txt"
fi

# Generate database password if not exists
echo ""
echo "Generating database password..."
if [ ! -f "$SECRETS_DIR/skyvern_db_password.txt" ]; then
    # Generate secure random password (32 bytes base64)
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32 | tr -d '\n' > "$SECRETS_DIR/skyvern_db_password.txt"
        echo "✓ Generated secure DB password"
    else
        echo "⚠️  WARNING: openssl not found, using fallback password"
        echo "genesis_db_password_$(date +%s)" | tr -d '\n' > "$SECRETS_DIR/skyvern_db_password.txt"
    fi
else
    echo "✓ DB password already exists"
fi

echo ""
echo "=========================================="
echo "Secret files created in: $SECRETS_DIR"
echo "=========================================="
echo ""

# Set secure permissions (Linux/Mac only)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Setting secure file permissions (600)..."
    chmod 600 "$SECRETS_DIR"/*.txt
    echo "✓ Permissions set"
else
    echo "⚠️  Windows detected - skipping permission changes"
    echo "   (Windows file permissions managed via NTFS ACLs)"
fi

echo ""
echo "Verifying secret files..."
echo "----------------------------------------"

# List created files (hide contents!)
for file in "$SECRETS_DIR"/*.txt; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        filesize=$(wc -c < "$file")

        if [ "$filesize" -eq 0 ]; then
            echo "❌ $filename (EMPTY - needs value)"
        elif grep -q "REPLACE_WITH_YOUR" "$file"; then
            echo "⚠️  $filename (PLACEHOLDER - needs real key)"
        else
            echo "✓ $filename ($filesize bytes)"
        fi
    fi
done

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Verify secret files contain real API keys:"
echo "   cd $SECRETS_DIR"
echo "   cat skyvern_api_key.txt  # Should show your real key"
echo ""
echo "2. If any files have PLACEHOLDER values:"
echo "   echo \"your-real-key\" > secrets/skyvern_api_key.txt"
echo ""
echo "3. Start Skyvern services:"
echo "   docker-compose -f docker-compose.skyvern.yml up -d"
echo ""
echo "4. Verify health:"
echo "   docker-compose -f docker-compose.skyvern.yml ps"
echo "   docker logs genesis-skyvern"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "   - NEVER commit secret files to Git"
echo "   - Rotate keys every 90 days"
echo "   - Use different keys for dev/staging/prod"
echo ""
echo "See secrets/README.md for full documentation"
echo ""
