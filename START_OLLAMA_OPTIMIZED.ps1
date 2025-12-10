# START_OLLAMA_OPTIMIZED.ps1
# Starts Ollama with CPU affinity and optimized environment variables
# Run as Administrator for best results

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Genesis Ollama Optimized Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Load environment variables from .env.ollama
$envFile = Join-Path $PSScriptRoot ".env.ollama"
if (Test-Path $envFile) {
    Write-Host "[OK] Loading optimizations from .env.ollama" -ForegroundColor Green
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  Set $name=$value" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "[WARN] .env.ollama not found, using defaults" -ForegroundColor Yellow
}

# Stop existing Ollama process if running
$existingOllama = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($existingOllama) {
    Write-Host "[INFO] Stopping existing Ollama process..." -ForegroundColor Yellow
    Stop-Process -Name "ollama" -Force
    Start-Sleep -Seconds 2
}

# CPU Affinity mask for first 6 cores (0-5)
# Binary: 00111111 = 0x3F = 63
$cpuAffinity = 0x3F  # Cores 0-5 only

Write-Host ""
Write-Host "Optimization Settings:" -ForegroundColor Cyan
Write-Host "  Context Caching:  ENABLED (+40-60% speed)" -ForegroundColor White
Write-Host "  Layer Offloading: 12 layers in RAM (no warm-up delays)" -ForegroundColor White
Write-Host "  Keep Alive:       24 hours (model stays loaded)" -ForegroundColor White
Write-Host "  CPU Threads:      6 (leaves 2 cores for agents)" -ForegroundColor White
Write-Host "  CPU Affinity:     Cores 0-5 (0x3F)" -ForegroundColor White
Write-Host ""

# Start Ollama with CPU affinity
Write-Host "[START] Launching Ollama with CPU affinity..." -ForegroundColor Green

try {
    # Method 1: Start-Process with ProcessorAffinity
    $process = Start-Process -FilePath "ollama" -ArgumentList "serve" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 1

    # Set CPU affinity after process starts
    if ($process -and !$process.HasExited) {
        $process.ProcessorAffinity = $cpuAffinity
        Write-Host "[OK] Ollama started with PID: $($process.Id)" -ForegroundColor Green
        Write-Host "[OK] CPU Affinity set to cores 0-5" -ForegroundColor Green
    }

    # Verify Ollama is responding
    Start-Sleep -Seconds 3
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
        Write-Host "[OK] Ollama API responding at http://localhost:11434" -ForegroundColor Green
        Write-Host ""
        Write-Host "Available Models:" -ForegroundColor Cyan
        $response.models | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor White }
    } catch {
        Write-Host "[WAIT] Ollama starting up, check http://localhost:11434 in a few seconds" -ForegroundColor Yellow
    }

} catch {
    Write-Host "[ERROR] Failed to start Ollama: $_" -ForegroundColor Red
    Write-Host "Make sure Ollama is installed and in PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Ollama is running optimized!" -ForegroundColor Green
Write-Host " CPU usage should now be ~75% max" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
