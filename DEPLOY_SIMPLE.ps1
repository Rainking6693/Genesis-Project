# Simple VPS Deployment Script
# Run from local PC as Administrator

$VPS_IP = "154.12.244.112"
$VPS_USER = "Administrator"
$VPS_PASSWORD = "Chartres6693"
$LOCAL_PATH = "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Genesis VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VPS: $VPS_IP" -ForegroundColor Yellow
Write-Host "This will COPY files (local files stay safe)" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
    Write-Host "Cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Step 1: Adding VPS to trusted hosts..." -ForegroundColor Cyan

try {
    $current = (Get-Item WSMan:\localhost\Client\TrustedHosts -ErrorAction SilentlyContinue).Value
    if ($current -notlike "*$VPS_IP*") {
        Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VPS_IP -Force -Concatenate
        Write-Host "OK - VPS trusted" -ForegroundColor Green
    } else {
        Write-Host "OK - Already trusted" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Could not add to trusted hosts" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Connecting to VPS..." -ForegroundColor Cyan

$secPass = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($VPS_USER, $secPass)

try {
    Write-Host "Mapping network drive..." -ForegroundColor Yellow

    if (Test-Path "V:") {
        Remove-PSDrive -Name "V" -Force -ErrorAction SilentlyContinue
    }

    New-PSDrive -Name "V" -PSProvider FileSystem -Root "\\$VPS_IP\C$" -Credential $cred -Persist | Out-Null
    Write-Host "OK - Connected" -ForegroundColor Green

    Write-Host ""
    Write-Host "Step 3: Creating Genesis directory..." -ForegroundColor Cyan

    if (!(Test-Path "V:\Genesis")) {
        New-Item -ItemType Directory -Path "V:\Genesis" -Force | Out-Null
    }
    Write-Host "OK - Directory ready" -ForegroundColor Green

    Write-Host ""
    Write-Host "Step 4: Copying files (5-10 minutes)..." -ForegroundColor Cyan
    Write-Host "Progress will be shown below..." -ForegroundColor Yellow
    Write-Host ""

    $exclude = @("node_modules", ".git", "__pycache__", "businesses", "logs", "data", ".venv", "venv", ".next")

    robocopy $LOCAL_PATH "V:\Genesis" /E /Z /R:3 /W:5 /MT:8 /XD $exclude /NP

    Write-Host ""
    Write-Host "OK - Files copied" -ForegroundColor Green

    Write-Host ""
    Write-Host "Step 5: Creating VPS environment file..." -ForegroundColor Cyan

    $envContent = @"
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
PROMPT_SHIELD_ENABLED=true
AGENT_AUTH_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
EVENT_BUS_TYPE=redis_stream
STORAGE_BACKEND=redis
"@

    Set-Content -Path "V:\Genesis\.env.vps" -Value $envContent
    Write-Host "OK - VPS env created" -ForegroundColor Green

    if (Test-Path "$LOCAL_PATH\.env") {
        Copy-Item "$LOCAL_PATH\.env" "V:\Genesis\.env.local" -Force
        Write-Host "OK - Local env copied" -ForegroundColor Green
    }

    Remove-PSDrive -Name "V" -Force

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Connect via Remote Desktop to: $VPS_IP" -ForegroundColor White
    Write-Host "2. Run: cd C:\Genesis" -ForegroundColor White
    Write-Host "3. Run: .\MERGE_ENV_ON_VPS.ps1" -ForegroundColor White
    Write-Host "4. Run: .\DEPLOY_VPS_SETUP.ps1" -ForegroundColor White
    Write-Host "5. Start services with the 3 .bat files" -ForegroundColor White
    Write-Host ""
    Write-Host "See: RUN_DEPLOYMENT_NOW.md for detailed steps" -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual copy instead:" -ForegroundColor Yellow
    Write-Host "1. Open Remote Desktop: mstsc.exe" -ForegroundColor White
    Write-Host "2. Connect to: $VPS_IP" -ForegroundColor White
    Write-Host "3. Copy $LOCAL_PATH to C:\Genesis on VPS" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
