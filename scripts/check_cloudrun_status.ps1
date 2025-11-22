# Quick status check for Genesis on Cloud Run
# Usage: .\scripts\check_cloudrun_status.ps1

$ServiceName = "genesis-a2a"
$Region = "us-central1"

Write-Host "🔍 Checking Genesis Cloud Run Status..." -ForegroundColor Green
Write-Host ""

# Check if service exists
$service = gcloud run services describe $ServiceName --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Service '$ServiceName' not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Deploy first with: .\deploy_cloudrun.ps1" -ForegroundColor Yellow
    exit 1
}

# Get service info
Write-Host "📊 Service Information:" -ForegroundColor Cyan
$url = gcloud run services describe $ServiceName --region $Region --format "value(status.url)"
$status = gcloud run services describe $ServiceName --region $Region --format "value(status.conditions[0].status)"
$ready = gcloud run services describe $ServiceName --region $Region --format "value(status.conditions[0].status)"

Write-Host "  Name: $ServiceName" -ForegroundColor White
Write-Host "  Region: $Region" -ForegroundColor White
Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "True") { "Green" } else { "Red" })
Write-Host "  URL: $url" -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
if ($url) {
    Write-Host "🏥 Health Check:" -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod -Uri "$url/health" -Method Get -TimeoutSec 5
        Write-Host "  ✅ Service is healthy!" -ForegroundColor Green
        Write-Host "  Version: $($health.version)" -ForegroundColor White
        Write-Host "  Agents: $($health.agents_available)" -ForegroundColor White
        Write-Host "  Uptime: $([math]::Round($health.uptime_seconds, 2))s" -ForegroundColor White
    } catch {
        Write-Host "  ❌ Health check failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Show recent logs
Write-Host "📋 Recent Logs (last 5 lines):" -ForegroundColor Cyan
gcloud run services logs read $ServiceName --region $Region --limit 5 2>&1 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 Commands:" -ForegroundColor Yellow
Write-Host "  View logs: gcloud run services logs tail $ServiceName --region $Region" -ForegroundColor Cyan
Write-Host "  Open console: https://console.cloud.google.com/run/detail/$Region/$ServiceName" -ForegroundColor Cyan

