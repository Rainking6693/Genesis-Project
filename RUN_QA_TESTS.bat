@echo off
echo ============================================
echo  Genesis QA Testing and Remediation
echo ============================================
echo.
echo This runs QA tests on all deployed sites with automatic remediation.
echo GitHub Pages typically takes 1-5 minutes to propagate.
echo.
echo Options:
echo   1. Quick QA (3 min wait, auto-fix, re-test)
echo   2. Thorough QA (5 min wait, auto-fix, re-test)
echo   3. Test only (no fixes, 1 min wait)
echo   4. Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Starting Quick QA (3 minute propagation wait)...
    python scripts\qa_deployed_sites.py --wait-minutes 3 --fix-issues --retest-failed
)
if "%choice%"=="2" (
    echo.
    echo Starting Thorough QA (5 minute propagation wait)...
    python scripts\qa_deployed_sites.py --wait-minutes 5 --fix-issues --retest-failed
)
if "%choice%"=="3" (
    echo.
    echo Starting Test-only mode (no fixes)...
    python scripts\qa_deployed_sites.py --wait-minutes 1 --no-fix
)
if "%choice%"=="4" (
    echo Exiting...
    exit /b 0
)

echo.
echo ============================================
echo  QA Testing Complete
echo ============================================
echo Check logs\qa_results_*.json for details
pause
