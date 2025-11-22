# Merge Environment Files on VPS
# Run this ON THE VPS after copying files
# This merges your local API keys with VPS database config

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Genesis VPS - Merge Environment Config" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$GENESIS_PATH = "C:\Genesis"
Set-Location $GENESIS_PATH

# Check if files exist
$envLocal = "$GENESIS_PATH\.env.local"
$envVps = "$GENESIS_PATH\.env.vps"
$envFinal = "$GENESIS_PATH\.env"

if (!(Test-Path $envLocal)) {
    Write-Host "⚠ .env.local not found (contains your API keys)" -ForegroundColor Yellow
    Write-Host "Copying from .env if available..." -ForegroundColor Yellow
    if (Test-Path $envFinal) {
        Copy-Item $envFinal $envLocal -Force
        Write-Host "✓ Copied .env to .env.local" -ForegroundColor Green
    }
}

if (!(Test-Path $envVps)) {
    Write-Host "✗ .env.vps not found (should contain MongoDB/Redis config)" -ForegroundColor Red
    Write-Host "Creating .env.vps with database config..." -ForegroundColor Yellow

    $vpsEnvContent = @"
# Genesis VPS Environment Configuration

# ============================================
# VPS CLOUD DATABASES (CONFIGURED)
# ============================================

# MongoDB Atlas Connection (FREE tier - 512MB)
MONGODB_URI=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/?appName=GenesisVps

# Redis Cloud Connection (FREE tier - 30MB)
REDIS_URI=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436

# ============================================
# PRODUCTION ENVIRONMENT
# ============================================
GENESIS_ENV=production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Agent Authentication Master Secret
AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b

# ============================================
# MEMORI DATABASE (Use Cloud MongoDB)
# ============================================
GENESIS_MEMORY_BACKEND=memori
MEMORI_DATABASE_URL=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/genesis_memory?appName=GenesisVps

# ============================================
# DEPLOYMENT & FEATURES
# ============================================
DEFAULT_DEPLOY_PLATFORM=github-pages
DISABLE_VERCEL_DEPLOY=true
ORCHESTRATION_ENABLED=true
SECURITY_HARDENING_ENABLED=true
LLM_INTEGRATION_ENABLED=true
ERROR_HANDLING_ENABLED=true
FORCE_CLOUD_LLM=true
DAAO_ENABLED=true
DAAO_BUDGET_CONSCIOUS=true
PROMPT_SHIELD_ENABLED=true
AGENT_AUTH_ENABLED=true
TASK_COUNTER_ENABLED=true
SANDBOX_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_SEC=60
RETRY_MAX_ATTEMPTS=3
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=genesis-orchestrator-vps
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL_SEC=30
METRICS_ENABLED=true
METRICS_PORT=9090
ENABLE_ITERRESEARCH=true
ENABLE_DR_MAMR=true
ENABLE_AGILE_THINKER=true
ENABLE_WALTZRL=true
ENABLE_MULTI_AGENT_EVOLVE=true
EVALUATION_THRESHOLD=50.0
EVALUATION_PERIOD_DAYS=30
LARGE_BILL_THRESHOLD=50.0

# A2A Service Authentication
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8

# OmniDaemon
EVENT_BUS_TYPE=redis_stream
STORAGE_BACKEND=redis
OMNIDAEMON_API_ENABLED=true
"@

    Set-Content -Path $envVps -Value $vpsEnvContent
    Write-Host "✓ Created .env.vps with database config" -ForegroundColor Green
}

Write-Host ""
Write-Host "Merging environment files..." -ForegroundColor Yellow
Write-Host ""

# Read both files
$localContent = Get-Content $envLocal -Raw
$vpsContent = Get-Content $envVps -Raw

# Extract API keys from local .env
Write-Host "Extracting API keys from local .env..." -ForegroundColor Cyan

$apiKeys = @()
$apiKeyPatterns = @(
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "GEMINI_API_KEY2",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_R1_API_KEY",
    "MISTRAL_API_KEY",
    "Google_API_KEY",
    "OPENROUTER_API_KEY",
    "SERPER_API_KEY",
    "JINA_API_KEY",
    "DASHSCOPE_API_KEY",
    "HF_TOKEN",
    "GITHUB_TOKEN",
    "NAMECOM_API_USERNAME",
    "NAMECOM_API_TOKEN",
    "MIXPANEL_TOKEN",
    "SENTRY_DSN",
    "MAILGUN_API_KEY",
    "TWITTER_BEARER_TOKEN",
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "PIPELEX_INFERENCE_API_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_AI_STUDIO_KEY",
    "AZURE_AI_PROJECT_ENDPOINT",
    "AZURE_AI_PROJECT_PATH",
    "AZURE_AI_MODEL_DEPLOYMENT"
)

foreach ($pattern in $apiKeyPatterns) {
    if ($localContent -match "(?m)^$pattern=(.+)$") {
        $value = $matches[1].Trim()
        if ($value -ne "" -and $value -ne "your_key_here" -and $value -ne "<your_key>") {
            $apiKeys += "$pattern=$value"
            Write-Host "  ✓ Found $pattern" -ForegroundColor Green
        }
    }
}

# Create final .env content
$finalContent = $vpsContent + "`n`n"
$finalContent += "# ============================================`n"
$finalContent += "# API KEYS (from local .env)`n"
$finalContent += "# ============================================`n"
$finalContent += ($apiKeys -join "`n")

# Write final .env
Set-Content -Path $envFinal -Value $finalContent

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Environment Configuration Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration saved to: $envFinal" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - MongoDB: ✓ Configured" -ForegroundColor Green
Write-Host "  - Redis: ✓ Configured" -ForegroundColor Green
Write-Host "  - API Keys: ✓ $($apiKeys.Count) keys imported" -ForegroundColor Green
Write-Host "  - Environment: ✓ Production mode" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\DEPLOY_VPS_SETUP.ps1" -ForegroundColor White
Write-Host "2. Start services:" -ForegroundColor White
Write-Host "   - .\START_A2A_SERVICE.bat" -ForegroundColor Yellow
Write-Host "   - .\START_DASHBOARD_API.bat" -ForegroundColor Yellow
Write-Host "   - .\START_DASHBOARD_UI.bat" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
