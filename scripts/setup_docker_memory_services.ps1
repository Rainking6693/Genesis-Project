# Genesis Memory Services Setup Script
# Sets up MongoDB, Redis, and Acontext via Docker
# Run as Administrator

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Genesis Memory Services Docker Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Docker Desktop is installed
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerPath)) {
    Write-Host ""
    Write-Host "[DOCKER NOT INSTALLED]" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop for Windows:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    Write-Host "  2. Run the installer as Administrator"
    Write-Host "  3. Restart your computer after installation"
    Write-Host "  4. Start Docker Desktop"
    Write-Host "  5. Re-run this script"
    Write-Host ""
    Write-Host "Alternative: Direct download link opening in browser..." -ForegroundColor Yellow
    Start-Process "https://www.docker.com/products/docker-desktop/"
    exit 1
}

# Check if Docker is running
$dockerRunning = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerRunning) {
    Write-Host "[Starting Docker Desktop...]" -ForegroundColor Yellow
    Start-Process $dockerPath
    Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# Change to Genesis project directory
Set-Location "C:\Users\Administrator\Desktop\Genesis-Project"

Write-Host ""
Write-Host "[Starting Memory Services...]" -ForegroundColor Green

# Start MongoDB and Redis with database profile
docker-compose --profile database --profile cache up -d

Write-Host ""
Write-Host "[Service Status]" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Memory Services Started Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services available at:" -ForegroundColor Yellow
Write-Host "  MongoDB:  localhost:27017 (user: genesis, pass: genesis_password)"
Write-Host "  Redis:    localhost:6379"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: python scripts/reset_marketing_budget.py"
Write-Host "  2. Re-run tests: python run_genesis_100_real_tests.py"
Write-Host ""
