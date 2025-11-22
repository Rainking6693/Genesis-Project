# Genesis VPS Deployment - File Copy Script
# Copies Genesis codebase to Contabo Windows VPS
# Run this from your LOCAL PC in PowerShell as Administrator

$VPS_IP = "154.12.244.112"
$VPS_USER = "Administrator"
$VPS_PASSWORD = "Chartres6693"
$LOCAL_PATH = "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"
$REMOTE_PATH = "C:\Genesis"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Genesis VPS Deployment - File Copy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VPS: $VPS_IP" -ForegroundColor Yellow
Write-Host "Local Path: $LOCAL_PATH" -ForegroundColor Yellow
Write-Host "Remote Path: $REMOTE_PATH" -ForegroundColor Yellow
Write-Host ""

# Method 1: Using PowerShell Remoting (Recommended)
Write-Host "Setting up PowerShell remoting..." -ForegroundColor Green

# Enable PSRemoting on local machine (if not already enabled)
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck -ErrorAction SilentlyContinue
    Write-Host "✓ PSRemoting enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠ PSRemoting already enabled or requires manual setup" -ForegroundColor Yellow
}

# Add VPS to trusted hosts (required for non-domain machines)
$currentTrustedHosts = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
if ($currentTrustedHosts -notlike "*$VPS_IP*") {
    Write-Host "Adding VPS to trusted hosts..." -ForegroundColor Yellow
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VPS_IP -Force -Concatenate
    Write-Host "✓ VPS added to trusted hosts" -ForegroundColor Green
}

# Create credential object
$securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($VPS_USER, $securePassword)

Write-Host ""
Write-Host "Connecting to VPS..." -ForegroundColor Green

# Test connection
try {
    $session = New-PSSession -ComputerName $VPS_IP -Credential $credential -ErrorAction Stop
    Write-Host "✓ Connected to VPS successfully" -ForegroundColor Green

    # Create remote directory
    Write-Host ""
    Write-Host "Creating remote directory structure..." -ForegroundColor Green
    Invoke-Command -Session $session -ScriptBlock {
        param($remotePath)
        if (!(Test-Path $remotePath)) {
            New-Item -ItemType Directory -Path $remotePath -Force | Out-Null
            Write-Host "✓ Created $remotePath" -ForegroundColor Green
        } else {
            Write-Host "✓ Directory $remotePath already exists" -ForegroundColor Yellow
        }
    } -ArgumentList $REMOTE_PATH

    # Copy files (excluding large directories)
    Write-Host ""
    Write-Host "Copying files to VPS..." -ForegroundColor Green
    Write-Host "(This may take 5-10 minutes depending on connection speed)" -ForegroundColor Yellow
    Write-Host ""

    # Exclude patterns
    $excludeDirs = @(
        "node_modules",
        ".git",
        "__pycache__",
        "*.pyc",
        "businesses",
        "logs",
        "metrics",
        "data",
        ".venv",
        "venv"
    )

    # Copy using robocopy (faster and more reliable)
    Write-Host "Using robocopy for efficient transfer..." -ForegroundColor Cyan

    $robocopyArgs = @(
        $LOCAL_PATH,
        "\\$VPS_IP\C$\Genesis",
        "/E",          # Copy subdirectories including empty ones
        "/Z",          # Copy in restartable mode
        "/R:3",        # Retry 3 times on failure
        "/W:5",        # Wait 5 seconds between retries
        "/MT:8",       # Multi-threaded (8 threads)
        "/XD"          # Exclude directories
    ) + $excludeDirs

    # Map network drive temporarily for robocopy
    Write-Host "Mapping network drive..." -ForegroundColor Yellow
    $netPassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
    $netCred = New-Object System.Management.Automation.PSCredential ($VPS_USER, $netPassword)

    try {
        # Create mapped drive
        New-PSDrive -Name "V" -PSProvider FileSystem -Root "\\$VPS_IP\C$" -Credential $netCred -ErrorAction Stop | Out-Null
        Write-Host "✓ Network drive mapped" -ForegroundColor Green

        # Run robocopy
        Write-Host "Starting file transfer..." -ForegroundColor Cyan
        $robocopyResult = robocopy $LOCAL_PATH "V:\Genesis" /E /Z /R:3 /W:5 /MT:8 /XD $excludeDirs /NP /NFL /NDL

        Write-Host ""
        Write-Host "✓ Files copied successfully" -ForegroundColor Green

        # Remove mapped drive
        Remove-PSDrive -Name "V" -Force

    } catch {
        Write-Host "✗ Network drive mapping failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Use Remote Desktop to manually copy files" -ForegroundColor Yellow
        Write-Host "1. Open Remote Desktop (mstsc.exe)" -ForegroundColor Yellow
        Write-Host "2. Connect to: $VPS_IP" -ForegroundColor Yellow
        Write-Host "3. Copy folder from your PC to C:\Genesis on VPS" -ForegroundColor Yellow
    }

    # Close session
    Remove-PSSession -Session $session

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Deployment Files Copied Successfully" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Connect to VPS via Remote Desktop: $VPS_IP" -ForegroundColor White
    Write-Host "2. Run: C:\Genesis\DEPLOY_VPS_SETUP.ps1" -ForegroundColor White
    Write-Host "3. Configure MongoDB Atlas and Redis Cloud (see DEPLOY_TO_CONTABO_VPS.md)" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "✗ Connection failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Verify VPS IP: $VPS_IP" -ForegroundColor White
    Write-Host "2. Verify credentials: $VPS_USER / $VPS_PASSWORD" -ForegroundColor White
    Write-Host "3. Enable WinRM on VPS: Enable-PSRemoting -Force" -ForegroundColor White
    Write-Host "4. Check Windows Firewall allows WinRM (port 5985/5986)" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative Method:" -ForegroundColor Cyan
    Write-Host "Use Remote Desktop to manually copy files:" -ForegroundColor White
    Write-Host "  mstsc.exe -> Connect to $VPS_IP -> Copy $LOCAL_PATH to C:\Genesis" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
