@echo off
REM START_OLLAMA_OPTIMIZED.bat
REM Wrapper to run the PowerShell script with admin privileges

echo ========================================
echo  Genesis Ollama Optimized Launcher
echo ========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath 'powershell' -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0START_OLLAMA_OPTIMIZED.ps1\"' -Verb RunAs"
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0START_OLLAMA_OPTIMIZED.ps1"
)
