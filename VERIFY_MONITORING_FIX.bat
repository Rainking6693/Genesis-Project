@echo off
REM Verify Monitoring Agent Auto-Start Fix
REM Author: Claude Code
REM Date: November 22, 2025

echo ================================================================================
echo VERIFY MONITORING AGENT AUTO-START FIX
echo ================================================================================
echo.

REM Run verification script
python scripts\verify_monitoring_fix.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================================
    echo SUCCESS: Monitoring agent fix verified!
    echo ================================================================================
    echo.
    echo Next steps:
    echo 1. Run a business generation test to see monitoring in action
    echo 2. Check logs for "Monitoring loop started in background"
    echo 3. Verify health checks run every 5 minutes
    echo.
    pause
) else (
    echo.
    echo ================================================================================
    echo FAILED: Verification failed - check logs above
    echo ================================================================================
    echo.
    pause
    exit /b 1
)
