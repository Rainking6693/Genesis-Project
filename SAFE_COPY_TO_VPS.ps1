# SAFE COPY TO VPS - Your Local Files Stay Untouched!
# This script COPIES files to VPS without deleting anything locally
# Run this from your LOCAL PC in PowerShell as Administrator

$VPS_IP = "154.12.244.112"
$VPS_USER = "Administrator"
$VPS_PASSWORD = "Chartres6693"
$LOCAL_PATH = "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"
$REMOTE_PATH = "C:\Genesis"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SAFE COPY TO VPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: This script COPIES files only!" -ForegroundColor Yellow
Write-Host "Your local files will remain 100% untouched." -ForegroundColor Green
Write-Host ""
Write-Host "Local Source: $LOCAL_PATH" -ForegroundColor White
Write-Host "VPS Destination: $REMOTE_PATH" -ForegroundColor White
Write-Host "VPS IP: $VPS_IP" -ForegroundColor White
Write-Host ""

# Confirmation prompt
$confirmation = Read-Host "Ready to COPY files to VPS? (Type YES to continue)"
if ($confirmation -ne "YES") {
    Write-Host "❌ Cancelled by user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting safe copy process..." -ForegroundColor Green
Write-Host ""

# Verify local files exist
if (!(Test-Path $LOCAL_PATH)) {
    Write-Host "❌ Local path not found: $LOCAL_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Local files verified at: $LOCAL_PATH" -ForegroundColor Green
$localFileCount = (Get-ChildItem -Path $LOCAL_PATH -Recurse -File | Measure-Object).Count
Write-Host "  Total files to copy: $localFileCount" -ForegroundColor Cyan
Write-Host ""

# Method: Using Remote Desktop shared drive mapping
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copy Method: Network Drive Mapping" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Add VPS to trusted hosts
$currentTrustedHosts = (Get-Item WSMan:\localhost\Client\TrustedHosts -ErrorAction SilentlyContinue).Value
if ($currentTrustedHosts -notlike "*$VPS_IP*") {
    Write-Host "Adding VPS to trusted hosts..." -ForegroundColor Yellow
    try {
        Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VPS_IP -Force -Concatenate -ErrorAction Stop
        Write-Host "✓ VPS added to trusted hosts" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not add to trusted hosts (may require admin)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Connecting to VPS..." -ForegroundColor Yellow

# Create credential
$securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("$VPS_IP\$VPS_USER", $securePassword)

# Test if admin share is available
try {
    Write-Host "Testing VPS connection..." -ForegroundColor Yellow
    $testPath = "\\$VPS_IP\C$"

    # Try to access the share
    $null = New-PSDrive -Name "GenesisVPSTest" -PSProvider FileSystem -Root $testPath -Credential $credential -ErrorAction Stop
    Remove-PSDrive -Name "GenesisVPSTest" -Force

    Write-Host "✓ VPS connection successful" -ForegroundColor Green
    Write-Host ""

    # Map drive for copying
    Write-Host "Mapping network drive to VPS..." -ForegroundColor Yellow
    $driveLetter = "V"

    # Remove drive if already exists
    if (Test-Path "${driveLetter}:") {
        Remove-PSDrive -Name $driveLetter -Force -ErrorAction SilentlyContinue
    }

    # Map new drive
    New-PSDrive -Name $driveLetter -PSProvider FileSystem -Root "\\$VPS_IP\C$" -Credential $credential -Persist | Out-Null
    Write-Host "✓ Network drive mapped to ${driveLetter}:\" -ForegroundColor Green
    Write-Host ""

    # Create destination directory
    $vpsPath = "${driveLetter}:\Genesis"
    if (!(Test-Path $vpsPath)) {
        Write-Host "Creating destination directory on VPS..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $vpsPath -Force | Out-Null
        Write-Host "✓ Created $vpsPath" -ForegroundColor Green
    } else {
        Write-Host "⚠ Directory $vpsPath already exists" -ForegroundColor Yellow
        $overwrite = Read-Host "Overwrite existing files? (Type YES to continue)"
        if ($overwrite -ne "YES") {
            Write-Host "❌ Cancelled by user" -ForegroundColor Red
            Remove-PSDrive -Name $driveLetter -Force
            exit 0
        }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Copying Files to VPS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This may take 5-15 minutes depending on:" -ForegroundColor Yellow
    Write-Host "  - Internet connection speed" -ForegroundColor White
    Write-Host "  - VPS network speed" -ForegroundColor White
    Write-Host "  - Number of files to copy" -ForegroundColor White
    Write-Host ""
    Write-Host "Progress will be shown below..." -ForegroundColor Cyan
    Write-Host ""

    # Exclude patterns (don't copy these large directories)
    $excludeDirs = @(
        "node_modules",
        ".git",
        "__pycache__",
        "businesses",
        "logs",
        "metrics",
        "data",
        ".venv",
        "venv",
        ".next"
    )

    # Build robocopy exclude list
    $excludeArgs = $excludeDirs | ForEach-Object { "/XD", (Join-Path $LOCAL_PATH $_) }

    # Use robocopy for efficient copying
    $robocopyArgs = @(
        $LOCAL_PATH,
        $vpsPath,
        "/E",          # Copy subdirectories including empty
        "/R:3",        # Retry 3 times
        "/W:5",        # Wait 5 seconds between retries
        "/MT:8",       # Multi-threaded (8 threads)
        "/V",          # Verbose output
        "/ETA"         # Show estimated time
    ) + $excludeArgs

    # Start copy
    $startTime = Get-Date
    & robocopy @robocopyArgs
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Copy Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Time taken: $([math]::Round($duration, 1)) seconds" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Local files: PRESERVED (nothing deleted)" -ForegroundColor Green
    Write-Host "VPS files: COPIED to ${driveLetter}:\Genesis" -ForegroundColor Green
    Write-Host ""

    # Copy VPS-specific .env file
    Write-Host "Copying VPS configuration..." -ForegroundColor Yellow
    if (Test-Path "$LOCAL_PATH\.env.vps") {
        Copy-Item "$LOCAL_PATH\.env.vps" "$vpsPath\.env.vps" -Force
        Write-Host "✓ Copied .env.vps (VPS environment config)" -ForegroundColor Green
    }

    # Copy local .env as template
    if (Test-Path "$LOCAL_PATH\.env") {
        Copy-Item "$LOCAL_PATH\.env" "$vpsPath\.env.local" -Force
        Write-Host "✓ Copied .env.local (local API keys)" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Next Steps" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Connect to VPS via Remote Desktop:" -ForegroundColor White
    Write-Host "   mstsc.exe -> IP: $VPS_IP" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. On VPS, merge environment files:" -ForegroundColor White
    Write-Host "   a. Open: C:\Genesis\.env.local (has your API keys)" -ForegroundColor Yellow
    Write-Host "   b. Open: C:\Genesis\.env.vps (has MongoDB/Redis)" -ForegroundColor Yellow
    Write-Host "   c. Copy API keys from .env.local to .env.vps" -ForegroundColor Yellow
    Write-Host "   d. Rename .env.vps to .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Run setup script on VPS:" -ForegroundColor White
    Write-Host "   C:\Genesis\DEPLOY_VPS_SETUP.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Start services (3 separate PowerShell windows):" -ForegroundColor White
    Write-Host "   C:\Genesis\START_A2A_SERVICE.bat" -ForegroundColor Yellow
    Write-Host "   C:\Genesis\START_DASHBOARD_API.bat" -ForegroundColor Yellow
    Write-Host "   C:\Genesis\START_DASHBOARD_UI.bat" -ForegroundColor Yellow
    Write-Host ""

    # Cleanup
    Write-Host "Cleaning up network drive..." -ForegroundColor Yellow
    Remove-PSDrive -Name $driveLetter -Force
    Write-Host "✓ Network drive removed" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Connection Failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Alternative Method: Manual Copy" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Open Remote Desktop Connection (mstsc.exe)" -ForegroundColor White
    Write-Host "2. Before connecting, click 'Show Options'" -ForegroundColor White
    Write-Host "3. Go to 'Local Resources' tab" -ForegroundColor White
    Write-Host "4. Click 'More...' under 'Local devices and resources'" -ForegroundColor White
    Write-Host "5. Check 'Drives' to share your local drives" -ForegroundColor White
    Write-Host "6. Connect to: $VPS_IP" -ForegroundColor Yellow
    Write-Host "7. User: $VPS_USER" -ForegroundColor Yellow
    Write-Host "8. On VPS, copy from your shared drive to C:\Genesis" -ForegroundColor White
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "- Verify VPS IP: $VPS_IP" -ForegroundColor White
    Write-Host "- Verify credentials work in Remote Desktop" -ForegroundColor White
    Write-Host "- Check VPS firewall allows file sharing (SMB port 445)" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
