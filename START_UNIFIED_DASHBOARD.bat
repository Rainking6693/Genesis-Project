@echo off
echo.
echo ========================================
echo   Genesis Enhanced Unified Dashboard
echo ========================================
echo.
echo Starting single unified dashboard...
echo This replaces all 4 separate dashboards!
echo.
echo Dashboard will open at: http://localhost:8888
echo.
echo Features:
echo   - Plain English status banner
echo   - Real-time agent activity
echo   - All system metrics
echo   - Business generation tracking
echo.
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

cd /d "%~dp0"
python scripts\enhanced_unified_dashboard.py

pause

