#!/bin/bash
# Genesis Skyvern Security Validation Script
# ============================================
# Validates that security best practices are followed
# Created: November 8, 2025
# Owner: Quinn (Security Specialist)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/secrets"
DOCKER_COMPOSE="$PROJECT_ROOT/docker-compose.skyvern.yml"

PASS=0
FAIL=0
WARN=0

echo "=========================================="
echo "Genesis Skyvern Security Validation"
echo "=========================================="
echo ""

# Function to print test results
pass() {
    echo "✓ PASS: $1"
    ((PASS++))
}

fail() {
    echo "✗ FAIL: $1"
    ((FAIL++))
}

warn() {
    echo "⚠  WARN: $1"
    ((WARN++))
}

# Test 1: Check if docker-compose.skyvern.yml exists
echo "[1/15] Checking Docker Compose file..."
if [ -f "$DOCKER_COMPOSE" ]; then
    pass "docker-compose.skyvern.yml exists"
else
    fail "docker-compose.skyvern.yml not found"
fi

# Test 2: Check if secrets are NOT in environment
echo "[2/15] Checking for API keys in environment..."
if grep -q "SKYVERN_API_KEY=\${SKYVERN_API_KEY}" "$DOCKER_COMPOSE" 2>/dev/null; then
    fail "INSECURE: API keys found in environment variables"
else
    pass "No API keys in environment variables"
fi

# Test 3: Check if Docker secrets are configured
echo "[3/15] Checking Docker secrets configuration..."
if grep -q "secrets:" "$DOCKER_COMPOSE"; then
    if grep -q "file: ./secrets/" "$DOCKER_COMPOSE"; then
        pass "Docker secrets properly configured"
    else
        fail "Docker secrets defined but file paths incorrect"
    fi
else
    fail "No Docker secrets configuration found"
fi

# Test 4: Check if secrets directory exists
echo "[4/15] Checking secrets directory..."
if [ -d "$SECRETS_DIR" ]; then
    pass "secrets/ directory exists"
else
    fail "secrets/ directory not found"
fi

# Test 5: Check if secret files exist
echo "[5/15] Checking secret files..."
REQUIRED_SECRETS=("skyvern_api_key.txt" "openai_api_key.txt" "anthropic_api_key.txt" "skyvern_db_password.txt")
MISSING_SECRETS=0

for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ ! -f "$SECRETS_DIR/$secret" ]; then
        warn "Secret file missing: $secret"
        ((MISSING_SECRETS++))
    fi
done

if [ $MISSING_SECRETS -eq 0 ]; then
    pass "All required secret files exist"
elif [ $MISSING_SECRETS -lt ${#REQUIRED_SECRETS[@]} ]; then
    warn "Some secret files missing (run setup_skyvern_secrets.sh)"
else
    fail "No secret files found (run setup_skyvern_secrets.sh)"
fi

# Test 6: Check if secrets are in .gitignore
echo "[6/15] Checking .gitignore for secrets..."
if [ -f "$SECRETS_DIR/.gitignore" ]; then
    if grep -q "*.txt" "$SECRETS_DIR/.gitignore"; then
        pass "secrets/.gitignore blocks .txt files"
    else
        fail "secrets/.gitignore doesn't block .txt files"
    fi
else
    warn "secrets/.gitignore not found"
fi

# Test 7: Check if secret files are tracked by Git
echo "[7/15] Checking if secret files are in Git..."
cd "$PROJECT_ROOT"
if git ls-files | grep -q "secrets/.*\.txt" 2>/dev/null; then
    fail "CRITICAL: Secret .txt files are tracked by Git!"
else
    pass "No secret files tracked by Git"
fi

# Test 8: Check for placeholder values in secret files
echo "[8/15] Checking for placeholder values..."
PLACEHOLDERS=0
for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ -f "$SECRETS_DIR/$secret" ]; then
        if grep -q "REPLACE_WITH_YOUR" "$SECRETS_DIR/$secret" 2>/dev/null; then
            warn "$secret contains placeholder value"
            ((PLACEHOLDERS++))
        fi
    fi
done

if [ $PLACEHOLDERS -eq 0 ]; then
    pass "No placeholder values in secret files"
else
    warn "$PLACEHOLDERS secret file(s) have placeholder values"
fi

# Test 9: Check for security hardening flags
echo "[9/15] Checking security hardening..."
if grep -q "no-new-privileges:true" "$DOCKER_COMPOSE"; then
    pass "no-new-privileges enabled"
else
    warn "no-new-privileges not enabled (container can escalate privileges)"
fi

# Test 10: Check for resource limits
echo "[10/15] Checking resource limits..."
if grep -q "resources:" "$DOCKER_COMPOSE" && grep -q "limits:" "$DOCKER_COMPOSE"; then
    pass "Resource limits configured (DoS protection)"
else
    warn "No resource limits (vulnerable to DoS attacks)"
fi

# Test 11: Check for health checks
echo "[11/15] Checking health checks..."
if grep -q "healthcheck:" "$DOCKER_COMPOSE"; then
    pass "Health checks configured"
else
    warn "No health checks (won't auto-restart on failure)"
fi

# Test 12: Check for read-only volumes
echo "[12/15] Checking read-only volumes..."
if grep -q ":ro" "$DOCKER_COMPOSE"; then
    pass "Read-only volumes configured"
else
    warn "No read-only volumes (unnecessary write access)"
fi

# Test 13: Check PostgreSQL security
echo "[13/15] Checking PostgreSQL security..."
if grep -q "POSTGRES_HOST_AUTH_METHOD=scram-sha-256" "$DOCKER_COMPOSE" 2>/dev/null; then
    pass "PostgreSQL uses SCRAM-SHA-256 encryption"
else
    warn "PostgreSQL may use weak authentication"
fi

# Test 14: Check if database is exposed to host
echo "[14/15] Checking database exposure..."
if grep -A 20 "skyvern-postgres:" "$DOCKER_COMPOSE" | grep -q "ports:" 2>/dev/null; then
    warn "PostgreSQL exposed to host (security risk)"
else
    pass "PostgreSQL not exposed to host (internal only)"
fi

# Test 15: Check if .env.example exists (template)
echo "[15/15] Checking .env.example template..."
if [ -f "$PROJECT_ROOT/.env.example" ]; then
    if grep -q "REPLACE_WITH_YOUR" "$PROJECT_ROOT/.env.example" || \
       grep -q "XXXXXXXX" "$PROJECT_ROOT/.env.example"; then
        pass ".env.example template exists (no real keys)"
    else
        warn ".env.example may contain real API keys"
    fi
else
    warn ".env.example not found (no template for users)"
fi

echo ""
echo "=========================================="
echo "Security Validation Results"
echo "=========================================="
echo "✓ PASS: $PASS"
echo "⚠  WARN: $WARN"
echo "✗ FAIL: $FAIL"
echo ""

# Overall assessment
TOTAL=$((PASS + WARN + FAIL))
SCORE=$((PASS * 100 / TOTAL))

echo "Security Score: $SCORE% ($PASS/$TOTAL tests passed)"
echo ""

if [ $FAIL -gt 0 ]; then
    echo "❌ SECURITY AUDIT FAILED"
    echo "Fix critical issues before deploying to production"
    exit 1
elif [ $WARN -gt 5 ]; then
    echo "⚠️  SECURITY AUDIT: WARNINGS DETECTED"
    echo "Review warnings before deploying to production"
    exit 0
else
    echo "✅ SECURITY AUDIT PASSED"
    echo "System meets security standards"
    exit 0
fi
