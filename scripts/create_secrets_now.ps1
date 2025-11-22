# Create Google Cloud Run secrets from your .env file
# Run this AFTER installing gcloud CLI and logging in

$ErrorActionPreference = "Stop"

Write-Host "🔐 Creating Google Cloud Run secrets from .env..." -ForegroundColor Green
Write-Host ""

# Check gcloud
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
    Write-Host "❌ gcloud CLI not found!" -ForegroundColor Red
    Write-Host "Install: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check login
$project = gcloud config get-value project 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in! Run: gcloud auth login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project: $project" -ForegroundColor Green
Write-Host ""

# Read .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

$envLines = Get-Content .env
$secrets = @{}

# Extract values
foreach ($line in $envLines) {
    $line = $line.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace '^["'']|["'']$', ''
        
        # Map keys
        switch ($key) {
            "OPENAI_API_KEY" { $secrets["OPENAI_API_KEY"] = $value }
            "ANTHROPIC_API_KEY" { $secrets["ANTHROPIC_API_KEY"] = $value }
            "GOOGLE_API_KEY" { $secrets["GOOGLE_API_KEY"] = $value }
            "GEMINI_API_KEY" { 
                if (-not $secrets.ContainsKey("GOOGLE_API_KEY")) {
                    $secrets["GOOGLE_API_KEY"] = $value 
                }
            }
            "A2A_API_KEY" { $secrets["A2A_API_KEY"] = $value }
            "GENESIS_API_KEY" { 
                if (-not $secrets.ContainsKey("A2A_API_KEY")) {
                    $secrets["A2A_API_KEY"] = $value 
                }
            }
            "MONGODB_URI" { $secrets["MONGODB_URI"] = $value }
            "REDIS_URL" { $secrets["REDIS_URL"] = $value }
        }
    }
}

# Create secrets
$created = 0
$projectNumber = gcloud projects describe $project --format="value(projectNumber)"
$serviceAccount = "${projectNumber}-compute@developer.gserviceaccount.com"

foreach ($secretName in @("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "A2A_API_KEY", "MONGODB_URI", "REDIS_URL")) {
    if (-not $secrets.ContainsKey($secretName) -or [string]::IsNullOrWhiteSpace($secrets[$secretName])) {
        Write-Host "⚠️  Skipping $secretName (not in .env)" -ForegroundColor Yellow
        continue
    }
    
    $value = $secrets[$secretName]
    Write-Host "Creating: $secretName" -ForegroundColor Yellow
    
    # Check if exists
    gcloud secrets describe $secretName 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Updating..." -ForegroundColor Cyan
        $value | gcloud secrets versions add $secretName --data-file=-
    } else {
        $value | gcloud secrets create $secretName --data-file=-
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Created/updated" -ForegroundColor Green
        
        # Grant access
        gcloud secrets add-iam-policy-binding $secretName `
            --member="serviceAccount:${serviceAccount}" `
            --role="roles/secretmanager.secretAccessor" `
            --quiet 2>&1 | Out-Null
        
        $created++
    } else {
        Write-Host "  ❌ Failed" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "✅ Done! Created/updated $created secrets" -ForegroundColor Green
Write-Host ""
Write-Host "Next: .\deploy_cloudrun.ps1" -ForegroundColor Cyan

