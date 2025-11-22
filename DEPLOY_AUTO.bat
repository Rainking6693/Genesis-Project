@echo off
REM Automatic VPS Deployment (No Prompts)
REM Run as Administrator

title Genesis VPS Deployment

echo ========================================
echo Genesis VPS Automatic Deployment
echo ========================================
echo.
echo Target VPS: 154.12.244.112
echo Local files will be COPIED (stay safe)
echo.
echo Starting deployment in 3 seconds...
timeout /t 3 /nobreak >nul

powershell.exe -ExecutionPolicy Bypass -Command ^
"$VPS_IP = '154.12.244.112'; ^
$VPS_USER = 'Administrator'; ^
$VPS_PASSWORD = 'Chartres6693'; ^
$LOCAL_PATH = 'C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis'; ^
Write-Host 'Step 1: Adding VPS to trusted hosts...' -ForegroundColor Cyan; ^
try { ^
    $current = (Get-Item WSMan:\localhost\Client\TrustedHosts -ErrorAction SilentlyContinue).Value; ^
    if ($current -notlike '*$VPS_IP*') { ^
        Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VPS_IP -Force -Concatenate; ^
    }; ^
    Write-Host 'OK - VPS trusted' -ForegroundColor Green; ^
} catch { ^
    Write-Host 'WARNING: Trust hosts failed' -ForegroundColor Yellow; ^
}; ^
Write-Host ''; ^
Write-Host 'Step 2: Connecting to VPS...' -ForegroundColor Cyan; ^
$secPass = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force; ^
$cred = New-Object System.Management.Automation.PSCredential ($VPS_USER, $secPass); ^
try { ^
    if (Test-Path 'V:') { Remove-PSDrive -Name 'V' -Force -ErrorAction SilentlyContinue }; ^
    New-PSDrive -Name 'V' -PSProvider FileSystem -Root '\\$VPS_IP\C$' -Credential $cred -Persist | Out-Null; ^
    Write-Host 'OK - Connected' -ForegroundColor Green; ^
    Write-Host ''; ^
    Write-Host 'Step 3: Creating directory...' -ForegroundColor Cyan; ^
    if (!(Test-Path 'V:\Genesis')) { New-Item -ItemType Directory -Path 'V:\Genesis' -Force | Out-Null }; ^
    Write-Host 'OK - Directory ready' -ForegroundColor Green; ^
    Write-Host ''; ^
    Write-Host 'Step 4: Copying files (5-10 minutes)...' -ForegroundColor Cyan; ^
    $exclude = @('node_modules', '.git', '__pycache__', 'businesses', 'logs', 'data', '.venv', 'venv', '.next'); ^
    robocopy $LOCAL_PATH 'V:\Genesis' /E /Z /R:3 /W:5 /MT:8 /XD $exclude /NP | Out-Null; ^
    Write-Host 'OK - Files copied' -ForegroundColor Green; ^
    Write-Host ''; ^
    Write-Host 'Step 5: Creating environment...' -ForegroundColor Cyan; ^
    $envContent = 'MONGODB_URI=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/?appName=GenesisVps' + [Environment]::NewLine + 'REDIS_URI=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436' + [Environment]::NewLine + 'REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436' + [Environment]::NewLine + 'GENESIS_ENV=production' + [Environment]::NewLine + 'ENVIRONMENT=production' + [Environment]::NewLine + 'AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b' + [Environment]::NewLine + 'A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8'; ^
    Set-Content -Path 'V:\Genesis\.env.vps' -Value $envContent; ^
    if (Test-Path '$LOCAL_PATH\.env') { Copy-Item '$LOCAL_PATH\.env' 'V:\Genesis\.env.local' -Force }; ^
    Write-Host 'OK - Environment created' -ForegroundColor Green; ^
    Remove-PSDrive -Name 'V' -Force; ^
    Write-Host ''; ^
    Write-Host '========================================' -ForegroundColor Green; ^
    Write-Host 'DEPLOYMENT COMPLETE!' -ForegroundColor Green; ^
    Write-Host '========================================' -ForegroundColor Green; ^
    Write-Host ''; ^
    Write-Host 'Next: Connect to VPS via Remote Desktop' -ForegroundColor Yellow; ^
    Write-Host 'IP: 154.12.244.112' -ForegroundColor White; ^
    Write-Host 'Then run: C:\Genesis\DEPLOY_VPS_SETUP.ps1' -ForegroundColor White; ^
} catch { ^
    Write-Host 'ERROR: ' + $_.Exception.Message -ForegroundColor Red; ^
}"

echo.
pause
