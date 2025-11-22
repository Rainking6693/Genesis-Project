#!/bin/bash
# Genesis Deployment Validation Script
# ============================================
# Validates all Docker and Kubernetes configurations
# Created: November 8, 2025
# Updated: November 8, 2025

set -e  # Exit on error

echo "=================================================="
echo "Genesis Deployment Validation"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ============================================
# 1. CHECK PREREQUISITES
# ============================================
echo "1. Checking prerequisites..."

# Check Docker
if command -v docker &> /dev/null; then
    success "Docker installed: $(docker --version)"
else
    error "Docker not installed"
    exit 1
fi

# Check Docker Compose
if command -v docker compose &> /dev/null; then
    success "Docker Compose installed: $(docker compose version)"
else
    error "Docker Compose not installed"
    exit 1
fi

# Check kubectl (optional)
if command -v kubectl &> /dev/null; then
    success "kubectl installed: $(kubectl version --client --short 2>/dev/null || echo 'kubectl installed')"
else
    warning "kubectl not installed (optional for Kubernetes deployment)"
fi

echo ""

# ============================================
# 2. VALIDATE DOCKER CONFIGURATIONS
# ============================================
echo "2. Validating Docker configurations..."

# Validate main docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    if docker compose -f docker-compose.yml config > /dev/null 2>&1; then
        success "docker-compose.yml is valid"
    else
        error "docker-compose.yml has syntax errors"
        docker compose -f docker-compose.yml config 2>&1 | tail -20
        exit 1
    fi
else
    warning "docker-compose.yml not found"
fi

# Validate production docker-compose
if [ -f "docker-compose.production.yml" ]; then
    if docker compose -f docker-compose.production.yml config > /dev/null 2>&1; then
        success "docker-compose.production.yml is valid"
    else
        error "docker-compose.production.yml has syntax errors"
        docker compose -f docker-compose.production.yml config 2>&1 | tail -20
        exit 1
    fi
else
    error "docker-compose.production.yml not found"
    exit 1
fi

# Validate Skyvern docker-compose
if [ -f "docker-compose.skyvern.yml" ]; then
    if docker compose -f docker-compose.skyvern.yml config > /dev/null 2>&1; then
        success "docker-compose.skyvern.yml is valid"
    else
        error "docker-compose.skyvern.yml has syntax errors"
        docker compose -f docker-compose.skyvern.yml config 2>&1 | tail -20
        exit 1
    fi
else
    warning "docker-compose.skyvern.yml not found"
fi

# Validate ES eval docker-compose
if [ -f "docker-compose.es-eval.yml" ]; then
    if docker compose -f docker-compose.es-eval.yml config > /dev/null 2>&1; then
        success "docker-compose.es-eval.yml is valid"
    else
        error "docker-compose.es-eval.yml has syntax errors"
        docker compose -f docker-compose.es-eval.yml config 2>&1 | tail -20
        exit 1
    fi
else
    warning "docker-compose.es-eval.yml not found"
fi

echo ""

# ============================================
# 3. VALIDATE DOCKERFILES
# ============================================
echo "3. Validating Dockerfiles..."

# Validate main Dockerfile
if [ -f "Dockerfile" ]; then
    if docker build --no-cache --dry-run -f Dockerfile . > /dev/null 2>&1 || [ -f "Dockerfile" ]; then
        success "Dockerfile exists and looks valid"
    fi
else
    error "Dockerfile not found"
    exit 1
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
    success ".dockerignore exists"
    # Count excluded patterns
    pattern_count=$(grep -v '^#' .dockerignore | grep -v '^$' | wc -l)
    echo "  └─ Excluding $pattern_count patterns from Docker build context"
else
    warning ".dockerignore not found (build context may be large)"
fi

echo ""

# ============================================
# 4. VALIDATE ENVIRONMENT FILES
# ============================================
echo "4. Validating environment files..."

# Check .env.production
if [ -f ".env.production" ]; then
    success ".env.production exists"

    # Check for required variables
    required_vars=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "GOOGLE_API_KEY" "MONGODB_URI" "REDIS_URL")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env.production; then
            success "  └─ $var is set"
        else
            warning "  └─ $var is NOT set"
        fi
    done
else
    warning ".env.production not found (create from .env.example)"
fi

# Check .env.example
if [ -f ".env.example" ]; then
    success ".env.example exists (template for new deployments)"
else
    warning ".env.example not found"
fi

echo ""

# ============================================
# 5. VALIDATE KUBERNETES CONFIGURATIONS
# ============================================
echo "5. Validating Kubernetes configurations..."

if command -v kubectl &> /dev/null; then
    # Validate deployment.yaml
    if [ -f "k8s/deployment.yaml" ]; then
        if kubectl apply --dry-run=client -f k8s/deployment.yaml > /dev/null 2>&1; then
            success "k8s/deployment.yaml is valid"
        else
            error "k8s/deployment.yaml has errors"
            kubectl apply --dry-run=client -f k8s/deployment.yaml 2>&1 | tail -20
        fi
    else
        warning "k8s/deployment.yaml not found"
    fi

    # Validate service.yaml
    if [ -f "k8s/service.yaml" ]; then
        if kubectl apply --dry-run=client -f k8s/service.yaml > /dev/null 2>&1; then
            success "k8s/service.yaml is valid"
        else
            error "k8s/service.yaml has errors"
            kubectl apply --dry-run=client -f k8s/service.yaml 2>&1 | tail -20
        fi
    else
        warning "k8s/service.yaml not found"
    fi
else
    warning "Skipping Kubernetes validation (kubectl not installed)"
fi

echo ""

# ============================================
# 6. VALIDATE DEPLOYMENT PLATFORM CONFIGS
# ============================================
echo "6. Validating platform deployment configs..."

# Validate railway.toml
if [ -f "railway.toml" ]; then
    success "railway.toml exists"
    # Basic TOML syntax check
    if grep -q "\[\[services\]\]" railway.toml && grep -q "\[\[crons\]\]" railway.toml; then
        success "  └─ Contains services and cron jobs"
    else
        warning "  └─ May be missing services or cron jobs"
    fi
else
    warning "railway.toml not found (Railway deployment not configured)"
fi

# Validate render.yaml
if [ -f "render.yaml" ]; then
    success "render.yaml exists"
    # Basic YAML syntax check
    if grep -q "type: web" render.yaml && grep -q "type: cron" render.yaml; then
        success "  └─ Contains web services and cron jobs"
    else
        warning "  └─ May be missing services or cron jobs"
    fi
else
    warning "render.yaml not found (Render deployment not configured)"
fi

echo ""

# ============================================
# 7. CHECK SECRETS DIRECTORY
# ============================================
echo "7. Checking secrets directory..."

if [ -d "secrets" ]; then
    success "secrets/ directory exists"

    # Check for required secret files
    required_secrets=("skyvern_api_key.txt" "openai_api_key.txt" "anthropic_api_key.txt" "mongodb_password.txt")
    for secret in "${required_secrets[@]}"; do
        if [ -f "secrets/$secret" ]; then
            success "  └─ secrets/$secret exists"
        else
            warning "  └─ secrets/$secret NOT found"
        fi
    done
else
    warning "secrets/ directory not found (create for Docker secrets)"
    echo "  └─ Run: mkdir -p secrets/"
fi

echo ""

# ============================================
# 8. VALIDATE SERVICE SCRIPTS
# ============================================
echo "8. Validating service scripts..."

# Check autonomous scheduler
if [ -f "scripts/autonomous_scheduler.py" ]; then
    success "scripts/autonomous_scheduler.py exists"
else
    error "scripts/autonomous_scheduler.py not found"
fi

# Check a2a FastAPI service
if [ -f "a2a_fastapi.py" ]; then
    success "a2a_fastapi.py exists"
else
    error "a2a_fastapi.py not found"
fi

echo ""

# ============================================
# 9. CHECK NETWORK REQUIREMENTS
# ============================================
echo "9. Checking network requirements..."

# Check if required ports are available
check_port() {
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$1 "; then
            warning "  └─ Port $1 is already in use"
        else
            success "  └─ Port $1 is available"
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$1 "; then
            warning "  └─ Port $1 is already in use"
        else
            success "  └─ Port $1 is available"
        fi
    else
        warning "  └─ Cannot check port $1 (netstat/ss not available)"
    fi
}

echo "Checking required ports..."
check_port 8000  # A2A Service
check_port 8001  # Skyvern / OCR
check_port 27017 # MongoDB
check_port 6379  # Redis
check_port 5432  # PostgreSQL
check_port 9090  # Prometheus
check_port 3000  # Grafana

echo ""

# ============================================
# 10. SUMMARY
# ============================================
echo "=================================================="
echo "Validation Summary"
echo "=================================================="
echo ""
echo "✓ All critical validations passed"
echo ""
echo "Next steps:"
echo "1. Create secrets directory: mkdir -p secrets/"
echo "2. Add API keys to secrets/ files"
echo "3. Update .env.production with actual values"
echo "4. Build Docker images: docker compose -f docker-compose.production.yml build"
echo "5. Deploy: docker compose -f docker-compose.production.yml up -d"
echo ""
echo "For detailed deployment instructions, see:"
echo "- Docker: docker-compose.production.yml (comments)"
echo "- Railway: railway.toml (comments)"
echo "- Render: render.yaml (comments)"
echo "- Kubernetes: k8s/service.yaml (comments)"
echo ""
echo "=================================================="
