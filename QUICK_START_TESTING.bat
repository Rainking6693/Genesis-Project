@echo off
REM Genesis Local Testing - Quick Start Script
REM Run this to open monitoring dashboard and prepare for testing

echo ========================================
echo Genesis Local Testing - Quick Start
echo ========================================
echo.

REM Open monitoring dashboard in browser
echo Opening local monitoring dashboard...
start "" "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\local_monitor.html"

echo.
echo ========================================
echo Dashboard opened in browser!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Review LOCAL_TESTING_STATUS.md for full details
echo.
echo 2. Run ES Training Test:
echo    python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run
echo.
echo 3. Run Business Generation Test:
echo    python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0
echo.
echo 4. Start Monitoring:
echo    python scripts\start_monitoring.py
echo.
echo ========================================
echo.
pause
