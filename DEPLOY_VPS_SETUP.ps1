# Genesis VPS Setup Script
# Run this ON THE VPS after copying files
# Run in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Genesis VPS Setup - Contabo Windows Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set working directory
$GENESIS_PATH = "C:\Genesis"
if (!(Test-Path $GENESIS_PATH)) {
    Write-Host "✗ Genesis directory not found at $GENESIS_PATH" -ForegroundColor Red
    Write-Host "Please copy files first using DEPLOY_VPS_COPY_FILES.ps1" -ForegroundColor Yellow
    exit 1
}

Set-Location $GENESIS_PATH
Write-Host "✓ Working directory: $GENESIS_PATH" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Python not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.12.4:" -ForegroundColor Yellow
    Write-Host "1. Download: https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe" -ForegroundColor White
    Write-Host "2. Run installer, check 'Add to PATH'" -ForegroundColor White
    Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "✓ Python installed: $pythonVersion" -ForegroundColor Green

# Check if Git is installed
Write-Host "Checking Git installation..." -ForegroundColor Yellow
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Git not found (optional but recommended)" -ForegroundColor Yellow
    Write-Host "Download: https://git-scm.com/download/win" -ForegroundColor White
} else {
    Write-Host "✓ Git installed: $gitVersion" -ForegroundColor Green
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js 20.x:" -ForegroundColor Yellow
    Write-Host "1. Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -ForegroundColor White
    Write-Host "2. Run installer with default settings" -ForegroundColor White
    Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "✓ pip upgraded" -ForegroundColor Green

# Install Python dependencies
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Write-Host "(This may take 5-10 minutes)" -ForegroundColor Cyan
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install Python dependencies" -ForegroundColor Red
    Write-Host "Check requirements.txt and try again" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Python dependencies installed" -ForegroundColor Green

# Install Dashboard dependencies
Write-Host ""
Write-Host "Installing Dashboard dependencies..." -ForegroundColor Yellow
Write-Host "(This may take 3-5 minutes)" -ForegroundColor Cyan
Set-Location "$GENESIS_PATH\genesis-dashboard"
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install Dashboard dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dashboard dependencies installed" -ForegroundColor Green

# Build Dashboard
Write-Host ""
Write-Host "Building Dashboard..." -ForegroundColor Yellow
npm run build --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build Dashboard" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dashboard built successfully" -ForegroundColor Green

Set-Location $GENESIS_PATH

# Create required directories
Write-Host ""
Write-Host "Creating required directories..." -ForegroundColor Yellow
$directories = @(
    "logs",
    "logs\business_generation",
    "metrics",
    "data",
    "data\contexts",
    "data\memori",
    "data\sessions",
    "data\x402"
)
foreach ($dir in $directories) {
    $fullPath = Join-Path $GENESIS_PATH $dir
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Green
    }
}
Write-Host "✓ All directories created" -ForegroundColor Green

# Configure Windows Firewall
Write-Host ""
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
try {
    # Remove existing rules (if any)
    Remove-NetFirewallRule -DisplayName "Genesis A2A Service" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "Genesis Dashboard API" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "Genesis Dashboard UI" -ErrorAction SilentlyContinue

    # Add new rules
    New-NetFirewallRule -DisplayName "Genesis A2A Service" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow | Out-Null
    New-NetFirewallRule -DisplayName "Genesis Dashboard API" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow | Out-Null
    New-NetFirewallRule -DisplayName "Genesis Dashboard UI" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow | Out-Null
    Write-Host "✓ Firewall rules configured" -ForegroundColor Green
} catch {
    Write-Host "⚠ Failed to configure firewall: $_" -ForegroundColor Yellow
    Write-Host "You may need to configure manually" -ForegroundColor Yellow
}

# Check .env file
Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path "$GENESIS_PATH\.env")) {
    Write-Host "⚠ .env file not found" -ForegroundColor Yellow
    Write-Host "Please create .env file with your API keys and database URLs" -ForegroundColor White
    Write-Host "See DEPLOY_TO_CONTABO_VPS.md for details" -ForegroundColor White
} else {
    Write-Host "✓ .env file found" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Verify these settings in .env:" -ForegroundColor Yellow
    Write-Host "  1. MONGODB_URI - MongoDB Atlas connection string" -ForegroundColor White
    Write-Host "  2. REDIS_URI - Redis Cloud connection string" -ForegroundColor White
    Write-Host "  3. All API keys (ANTHROPIC, OPENAI, GEMINI, etc.)" -ForegroundColor White
    Write-Host "  4. ENVIRONMENT=production" -ForegroundColor White
    Write-Host "  5. AGENT_AUTH_MASTER_SECRET" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ VPS Setup Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure MongoDB Atlas and Redis Cloud:" -ForegroundColor White
Write-Host "   See: $GENESIS_PATH\DEPLOY_TO_CONTABO_VPS.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Update .env file with database URLs:" -ForegroundColor White
Write-Host "   notepad $GENESIS_PATH\.env" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Start services using provided batch files:" -ForegroundColor White
Write-Host "   - START_A2A_SERVICE.bat" -ForegroundColor Yellow
Write-Host "   - START_DASHBOARD_API.bat" -ForegroundColor Yellow
Write-Host "   - START_DASHBOARD_UI.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Verify services are running:" -ForegroundColor White
Write-Host "   - A2A API: http://154.12.244.112:8000/health" -ForegroundColor Yellow
Write-Host "   - Dashboard API: http://154.12.244.112:5001/health" -ForegroundColor Yellow
Write-Host "   - Dashboard UI: http://154.12.244.112:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
