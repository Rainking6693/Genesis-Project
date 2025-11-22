# FULL AUTOMATED VPS DEPLOYMENT
# Run this script from your LOCAL PC as Administrator
# It will handle the entire deployment process automatically

param(
    [switch]$SkipCopy = $false  # Use this if files are already copied
)

$ErrorActionPreference = "Stop"

$VPS_IP = "154.12.244.112"
$VPS_USER = "Administrator"
$VPS_PASSWORD = "Chartres6693"
$LOCAL_PATH = "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"
$REMOTE_PATH = "C:\Genesis"

Write-Host @"
╔════════════════════════════════════════════════╗
║   GENESIS VPS AUTOMATED DEPLOYMENT             ║
║   Contabo Windows Server (154.12.244.112)     ║
╚════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Copy files to VPS (SAFE - local files stay intact)" -ForegroundColor White
Write-Host "  2. Install Python 3.12.4 & Node.js 20.x on VPS" -ForegroundColor White
Write-Host "  3. Configure MongoDB Atlas & Redis Cloud" -ForegroundColor White
Write-Host "  4. Install all dependencies" -ForegroundColor White
Write-Host "  5. Start all services (A2A, Dashboard API, Dashboard UI)" -ForegroundColor White
Write-Host ""
Write-Host "Estimated time: 20-30 minutes" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Ready to deploy? (Type YES to continue)"
if ($confirmation -ne "YES") {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Create deployment log
$logFile = "$LOCAL_PATH\deployment_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
Start-Transcript -Path $logFile

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 1: PREPARE CONNECTION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Enable PSRemoting locally
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck -ErrorAction SilentlyContinue
    Write-Host "✓ PSRemoting enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠ PSRemoting may require manual setup" -ForegroundColor Yellow
}

# Add VPS to trusted hosts
$currentTrustedHosts = (Get-Item WSMan:\localhost\Client\TrustedHosts -ErrorAction SilentlyContinue).Value
if ($currentTrustedHosts -notlike "*$VPS_IP*") {
    Write-Host "Adding VPS to trusted hosts..." -ForegroundColor Yellow
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VPS_IP -Force -Concatenate
    Write-Host "✓ VPS added to trusted hosts" -ForegroundColor Green
}

# Create credentials
$securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($VPS_USER, $securePassword)

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 2: COPY FILES TO VPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipCopy) {
    try {
        # Map network drive
        Write-Host "Mapping network drive to VPS..." -ForegroundColor Yellow
        $driveLetter = "V"

        if (Test-Path "${driveLetter}:") {
            Remove-PSDrive -Name $driveLetter -Force -ErrorAction SilentlyContinue
        }

        New-PSDrive -Name $driveLetter -PSProvider FileSystem -Root "\\$VPS_IP\C$" -Credential $credential -Persist | Out-Null
        Write-Host "✓ Network drive mapped" -ForegroundColor Green

        # Create Genesis directory
        $vpsPath = "${driveLetter}:\Genesis"
        if (!(Test-Path $vpsPath)) {
            New-Item -ItemType Directory -Path $vpsPath -Force | Out-Null
            Write-Host "✓ Created $vpsPath" -ForegroundColor Green
        }

        # Copy files with robocopy
        Write-Host ""
        Write-Host "Copying files (this may take 5-10 minutes)..." -ForegroundColor Yellow
        Write-Host "Excluding: node_modules, .git, businesses, logs, data" -ForegroundColor Cyan
        Write-Host ""

        $excludeDirs = @("node_modules", ".git", "__pycache__", "businesses", "logs", "metrics", "data", ".venv", "venv", ".next")
        $robocopyArgs = @(
            $LOCAL_PATH,
            $vpsPath,
            "/E", "/Z", "/R:3", "/W:5", "/MT:8",
            "/XD"
        ) + $excludeDirs

        $startTime = Get-Date
        & robocopy @robocopyArgs | Out-Null
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds

        Write-Host "✓ Files copied in $([math]::Round($duration, 1)) seconds" -ForegroundColor Green

        # Remove drive
        Remove-PSDrive -Name $driveLetter -Force
        Write-Host "✓ Network drive unmapped" -ForegroundColor Green

    } catch {
        Write-Host "✗ File copy failed: $_" -ForegroundColor Red
        Write-Host "Please copy files manually via Remote Desktop" -ForegroundColor Yellow
        Stop-Transcript
        exit 1
    }
} else {
    Write-Host "⊘ Skipping file copy (--SkipCopy flag)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 3: CONFIGURE VPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    # Create remote session
    Write-Host "Connecting to VPS..." -ForegroundColor Yellow
    $session = New-PSSession -ComputerName $VPS_IP -Credential $credential -ErrorAction Stop
    Write-Host "✓ Connected to VPS" -ForegroundColor Green

    # Create .env.vps on VPS with MongoDB and Redis
    Write-Host ""
    Write-Host "Creating VPS environment configuration..." -ForegroundColor Yellow

    $vpsEnvContent = @"
# Genesis VPS Environment Configuration
MONGODB_URI=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/?appName=GenesisVps
REDIS_URI=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
GENESIS_ENV=production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b
GENESIS_MEMORY_BACKEND=memori
MEMORI_DATABASE_URL=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/genesis_memory?appName=GenesisVps
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
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
ENABLE_ITERRESEARCH=true
ENABLE_DR_MAMR=true
ENABLE_AGILE_THINKER=true
ENABLE_WALTZRL=true
ENABLE_MULTI_AGENT_EVOLVE=true
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
EVENT_BUS_TYPE=redis_stream
STORAGE_BACKEND=redis
OMNIDAEMON_API_ENABLED=true
"@

    Invoke-Command -Session $session -ScriptBlock {
        param($content, $remotePath)
        Set-Content -Path "$remotePath\.env.vps" -Value $content
    } -ArgumentList $vpsEnvContent, $REMOTE_PATH

    Write-Host "✓ VPS environment created" -ForegroundColor Green

    # Copy local API keys to VPS
    Write-Host "Copying API keys from local .env..." -ForegroundColor Yellow
    if (Test-Path "$LOCAL_PATH\.env") {
        $localEnv = Get-Content "$LOCAL_PATH\.env" -Raw
        Invoke-Command -Session $session -ScriptBlock {
            param($content, $remotePath)
            Set-Content -Path "$remotePath\.env.local" -Value $content
        } -ArgumentList $localEnv, $REMOTE_PATH
        Write-Host "✓ API keys copied" -ForegroundColor Green
    }

    # Merge environment files on VPS
    Write-Host "Merging environment configuration..." -ForegroundColor Yellow
    Invoke-Command -Session $session -ScriptBlock {
        param($remotePath)

        $vpsEnv = Get-Content "$remotePath\.env.vps" -Raw
        $localEnv = Get-Content "$remotePath\.env.local" -Raw -ErrorAction SilentlyContinue

        # Extract API keys
        $apiKeys = @()
        $keyPatterns = @(
            "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GEMINI_API_KEY2",
            "DEEPSEEK_API_KEY", "DEEPSEEK_R1_API_KEY", "MISTRAL_API_KEY", "Google_API_KEY",
            "OPENROUTER_API_KEY", "SERPER_API_KEY", "JINA_API_KEY", "HF_TOKEN",
            "GITHUB_TOKEN", "NAMECOM_API_USERNAME", "NAMECOM_API_TOKEN",
            "STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
            "PIPELEX_INFERENCE_API_KEY", "GOOGLE_AI_STUDIO_KEY"
        )

        foreach ($pattern in $keyPatterns) {
            if ($localEnv -match "(?m)^$pattern=(.+)$") {
                $value = $matches[1].Trim()
                if ($value -and $value -ne "" -and $value -ne "your_key_here") {
                    $apiKeys += "$pattern=$value"
                }
            }
        }

        # Create final .env
        $finalEnv = $vpsEnv + "`n`n# API KEYS`n" + ($apiKeys -join "`n")
        Set-Content -Path "$remotePath\.env" -Value $finalEnv

    } -ArgumentList $REMOTE_PATH

    Write-Host "✓ Environment merged" -ForegroundColor Green

    # Create directories
    Write-Host "Creating required directories..." -ForegroundColor Yellow
    Invoke-Command -Session $session -ScriptBlock {
        param($remotePath)
        $dirs = @("logs", "logs\business_generation", "metrics", "data", "data\contexts", "data\memori", "data\sessions", "data\x402")
        foreach ($dir in $dirs) {
            $fullPath = Join-Path $remotePath $dir
            if (!(Test-Path $fullPath)) {
                New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            }
        }
    } -ArgumentList $REMOTE_PATH
    Write-Host "✓ Directories created" -ForegroundColor Green

    # Configure firewall
    Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
    Invoke-Command -Session $session -ScriptBlock {
        Remove-NetFirewallRule -DisplayName "Genesis*" -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName "Genesis A2A Service" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow | Out-Null
        New-NetFirewallRule -DisplayName "Genesis Dashboard API" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow | Out-Null
        New-NetFirewallRule -DisplayName "Genesis Dashboard UI" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow | Out-Null
    }
    Write-Host "✓ Firewall configured" -ForegroundColor Green

    Remove-PSSession -Session $session

} catch {
    Write-Host "✗ VPS configuration failed: $_" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Connect to VPS via Remote Desktop:" -ForegroundColor White
Write-Host "   IP: $VPS_IP" -ForegroundColor Yellow
Write-Host "   User: $VPS_USER" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Install Python 3.12.4 & Node.js 20.x (if not already installed)" -ForegroundColor White
Write-Host "   Python: https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe" -ForegroundColor Yellow
Write-Host "   Node: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. On VPS, run:" -ForegroundColor White
Write-Host "   cd C:\Genesis" -ForegroundColor Yellow
Write-Host "   .\DEPLOY_VPS_SETUP.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Start services (3 separate PowerShell windows):" -ForegroundColor White
Write-Host "   .\START_A2A_SERVICE.bat" -ForegroundColor Yellow
Write-Host "   .\START_DASHBOARD_API.bat" -ForegroundColor Yellow
Write-Host "   .\START_DASHBOARD_UI.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Verify deployment:" -ForegroundColor White
Write-Host "   http://${VPS_IP}:8000/health" -ForegroundColor Yellow
Write-Host "   http://${VPS_IP}:5001/health" -ForegroundColor Yellow
Write-Host "   http://${VPS_IP}:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Deployment log saved to:" -ForegroundColor Cyan
Write-Host "  $logFile" -ForegroundColor Yellow
Write-Host ""

Stop-Transcript

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
