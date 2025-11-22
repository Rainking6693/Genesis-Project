# Complete setup: Install gcloud CLI and create secrets from .env
# Usage: .\scripts\setup_gcloud_and_secrets.ps1

Write-Host "🚀 Google Cloud Run Setup" -ForegroundColor Green
Write-Host ""

# Check if gcloud is installed
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue

if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install gcloud CLI:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "  2. Run installer" -ForegroundColor Cyan
    Write-Host "  3. Restart PowerShell" -ForegroundColor Cyan
    Write-Host "  4. Run: gcloud init" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or install via PowerShell (Chocolatey):" -ForegroundColor Yellow
    Write-Host "  choco install gcloudsdk" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ gcloud CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
$project = gcloud config get-value project 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Google Cloud" -ForegroundColor Yellow
    Write-Host "Run: gcloud auth login" -ForegroundColor Cyan
    Write-Host "Then: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Google Cloud project: $project" -ForegroundColor Green
Write-Host ""

# Now create secrets
Write-Host "Creating secrets from .env file..." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Read .env and extract values
$envContent = Get-Content .env
$secrets = @{}

foreach ($line in $envContent) {
    $line = $line.Trim()
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace '^["'']|["'']$', ''
        
        if ($key -in @("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "A2A_API_KEY", "GENESIS_API_KEY", "MONGODB_URI", "REDIS_URL")) {
            if ($key -eq "GENESIS_API_KEY" -and -not $secrets.ContainsKey("A2A_API_KEY")) {
                $secrets["A2A_API_KEY"] = $value
            } elseif ($key -eq "GEMINI_API_KEY" -and -not $secrets.ContainsKey("GOOGLE_API_KEY")) {
                # Use GEMINI_API_KEY as GOOGLE_API_KEY if GOOGLE_API_KEY not found
                $secrets["GOOGLE_API_KEY"] = $value
            } elseif ($key -ne "GENESIS_API_KEY") {
                $secrets[$key] = $value
            }
        }
    }
}

# Create secrets
$created = 0
foreach ($secretName in $secrets.Keys) {
    $value = $secrets[$secretName]
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "⚠️  Skipping $secretName (empty)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Creating: $secretName" -ForegroundColor Yellow
    
    # Check if exists
    gcloud secrets describe $secretName 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Updating existing secret..." -ForegroundColor Cyan
        $value | gcloud secrets versions add $secretName --data-file=-
    } else {
        $value | gcloud secrets create $secretName --data-file=-
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Created/updated" -ForegroundColor Green
        $created++
    } else {
        Write-Host "  ❌ Failed" -ForegroundColor Red
    }
}

# Grant permissions
if ($created -gt 0) {
    Write-Host ""
    Write-Host "Granting Cloud Run access..." -ForegroundColor Green
    $projectNumber = gcloud projects describe $project --format="value(projectNumber)"
    $serviceAccount = "${projectNumber}-compute@developer.gserviceaccount.com"
    
    foreach ($secretName in $secrets.Keys) {
        if (-not [string]::IsNullOrWhiteSpace($secrets[$secretName])) {
            gcloud secrets add-iam-policy-binding $secretName `
                --member="serviceAccount:${serviceAccount}" `
                --role="roles/secretmanager.secretAccessor" `
                --quiet 2>&1 | Out-Null
        }
    }
    Write-Host "✅ Permissions granted" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup complete! Created $created secrets" -ForegroundColor Green
Write-Host ""
Write-Host "Next: .\deploy_cloudrun.ps1" -ForegroundColor Cyan

