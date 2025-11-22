# Create all required secrets for Genesis in Google Cloud Secret Manager (PowerShell)
# Usage: .\scripts\create_cloudrun_secrets.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔐 Creating secrets for Genesis in Google Cloud Secret Manager..." -ForegroundColor Green
Write-Host ""

# Required secrets
$Secrets = @(
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "A2A_API_KEY",
    "MONGODB_URI",
    "REDIS_URL"
)

# Create secrets (will prompt for values)
foreach ($Secret in $Secrets) {
    Write-Host "Creating secret: $Secret" -ForegroundColor Yellow
    
    # Check if secret already exists
    $exists = gcloud secrets describe $Secret 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ⚠️  Secret $Secret already exists. Adding new version..." -ForegroundColor Yellow
        $value = Read-Host "Enter value for $Secret" -AsSecureString
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
        )
        $plainValue | gcloud secrets versions add $Secret --data-file=-
    } else {
        $value = Read-Host "Enter value for $Secret" -AsSecureString
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
        )
        $plainValue | gcloud secrets create $Secret --data-file=-
    }
    
    Write-Host "  ✅ Secret $Secret created/updated" -ForegroundColor Green
    Write-Host ""
}

# Grant Cloud Run service account access
Write-Host "🔑 Granting Cloud Run access to secrets..." -ForegroundColor Green
$ProjectId = gcloud config get-value project
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$ServiceAccount = "${ProjectNumber}-compute@developer.gserviceaccount.com"

foreach ($Secret in $Secrets) {
    Write-Host "Granting access to $Secret..." -ForegroundColor Yellow
    gcloud secrets add-iam-policy-binding $Secret `
        --member="serviceAccount:${ServiceAccount}" `
        --role="roles/secretmanager.secretAccessor" `
        --quiet
    Write-Host "  ✅ Access granted" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All secrets created and permissions set!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Deploy with:" -ForegroundColor Cyan
Write-Host "  .\deploy_cloudrun.ps1" -ForegroundColor Cyan

