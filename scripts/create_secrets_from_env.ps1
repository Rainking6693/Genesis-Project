# Create Google Cloud Run secrets from .env file
# Usage: .\scripts\create_secrets_from_env.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔐 Creating Google Cloud Run secrets from .env file..." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

# Read .env file
$envContent = Get-Content .env

# Function to extract value from .env line
function Get-EnvValue {
    param([string]$Line)
    if ($Line -match '^[^=]+=(.+)$') {
        return $matches[1].Trim()
    }
    return $null
}

# Secrets to create
$Secrets = @{
    "OPENAI_API_KEY" = $null
    "ANTHROPIC_API_KEY" = $null
    "GOOGLE_API_KEY" = $null
    "A2A_API_KEY" = $null
    "MONGODB_URI" = $null
    "REDIS_URL" = $null
}

# Extract values from .env
foreach ($line in $envContent) {
    $line = $line.Trim()
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes if present
        $value = $value -replace '^["'']|["'']$', ''
        
        if ($Secrets.ContainsKey($key)) {
            $Secrets[$key] = $value
        }
        # Also check for GENESIS_API_KEY as fallback for A2A_API_KEY
        if ($key -eq "GENESIS_API_KEY" -and -not $Secrets["A2A_API_KEY"]) {
            $Secrets["A2A_API_KEY"] = $value
        }
    }
}

# Create secrets
$Created = 0
$Skipped = 0

foreach ($SecretName in $Secrets.Keys) {
    $Value = $Secrets[$SecretName]
    
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "⚠️  Skipping $SecretName (not found in .env)" -ForegroundColor Yellow
        $Skipped++
        continue
    }
    
    Write-Host "Creating secret: $SecretName" -ForegroundColor Yellow
    
    # Check if secret already exists
    $exists = gcloud secrets describe $SecretName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Cyan
        $Value | gcloud secrets versions add $SecretName --data-file=-
    } else {
        $Value | gcloud secrets create $SecretName --data-file=-
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Created/updated: $SecretName" -ForegroundColor Green
        $Created++
    } else {
        Write-Host "  ❌ Failed to create: $SecretName" -ForegroundColor Red
    }
    Write-Host ""
}

# Grant Cloud Run service account access
if ($Created -gt 0) {
    Write-Host "🔑 Granting Cloud Run access to secrets..." -ForegroundColor Green
    $ProjectId = gcloud config get-value project
    $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
    $ServiceAccount = "${ProjectNumber}-compute@developer.gserviceaccount.com"
    
    foreach ($SecretName in $Secrets.Keys) {
        if (-not [string]::IsNullOrWhiteSpace($Secrets[$SecretName])) {
            Write-Host "Granting access to $SecretName..." -ForegroundColor Yellow
            gcloud secrets add-iam-policy-binding $SecretName `
                --member="serviceAccount:${ServiceAccount}" `
                --role="roles/secretmanager.secretAccessor" `
                --quiet 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Access granted" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "✅ Done! Created: $Created, Skipped: $Skipped" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Deploy with .\deploy_cloudrun.ps1" -ForegroundColor Cyan

