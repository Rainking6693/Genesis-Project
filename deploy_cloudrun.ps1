# Deploy Genesis A2A Service to Google Cloud Run (PowerShell)
# Usage: .\deploy_cloudrun.ps1 [service-name] [region]

param(
    [string]$ServiceName = "genesis-a2a",
    [string]$Region = "us-central1"
)

Write-Host "🚀 Deploying Genesis A2A Service to Google Cloud Run..." -ForegroundColor Green
Write-Host "   Service: $ServiceName" -ForegroundColor Yellow
Write-Host "   Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Deploy with secrets (if they exist)
$Secrets = @(
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY", 
    "GOOGLE_API_KEY",
    "A2A_API_KEY",
    "MONGODB_URI",
    "REDIS_URL"
)

$SecretArgs = @()
foreach ($Secret in $Secrets) {
    # Check if secret exists
    $exists = gcloud secrets describe $Secret 2>&1
    if ($LASTEXITCODE -eq 0) {
        $SecretArgs += "--update-secrets"
        $SecretArgs += "${Secret}=${Secret}:latest"
    }
}

gcloud run deploy $ServiceName `
  --source . `
  --region $Region `
  --allow-unauthenticated `
  --port 8000 `
  --memory 2Gi `
  --cpu 2 `
  --timeout 300 `
  --max-instances 10 `
  --min-instances 0 `
  --set-env-vars GENESIS_ENV=production,LOG_LEVEL=INFO `
  $SecretArgs

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "   Get URL: gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'" -ForegroundColor Cyan

