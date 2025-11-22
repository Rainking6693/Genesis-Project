# Render.com Complete Setup Script
# Sets up backend, frontend, and dashboard on Render

param(
    [Parameter(Mandatory=$true)]
    [string]$RenderApiKey
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Render.com Complete Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set API key
$env:RENDER_API_KEY = $RenderApiKey
Write-Host "✅ API key set" -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check if requests library is installed
try {
    python -c "import requests" 2>$null
    Write-Host "✅ requests library found" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Installing requests library..." -ForegroundColor Yellow
    pip install requests
}

# Run deployment script
Write-Host ""
Write-Host "Deploying to Render..." -ForegroundColor Cyan
python scripts/deploy_render.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Deployment Initiated!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Add environment variables to both services" -ForegroundColor White
    Write-Host "3. Services will auto-deploy from GitHub" -ForegroundColor White
    Write-Host ""
    Write-Host "Backend: https://genesis-backend.onrender.com" -ForegroundColor Cyan
    Write-Host "Frontend: https://genesis-frontend.onrender.com" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}

