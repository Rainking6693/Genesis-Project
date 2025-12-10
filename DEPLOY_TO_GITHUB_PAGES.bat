@echo off
echo ============================================
echo  Genesis GitHub Pages Batch Deployer
echo ============================================
echo.
echo This will deploy all generated businesses to GitHub Pages
echo Target: https://github.com/bullrushinvestments
echo.
echo Options:
echo   1. Deploy all businesses (with QA testing)
echo   2. Deploy all businesses (skip QA testing)
echo   3. Deploy first 10 (test run with QA)
echo   4. Dry run (no actual deployment)
echo   5. Exit
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Starting full deployment with QA testing...
    python scripts\deploy_to_github_pages.py
)
if "%choice%"=="2" (
    echo.
    echo Starting full deployment without QA...
    python scripts\deploy_to_github_pages.py --skip-qa
)
if "%choice%"=="3" (
    echo.
    echo Starting test deployment (10 businesses)...
    python scripts\deploy_to_github_pages.py --limit 10
)
if "%choice%"=="4" (
    echo.
    echo Starting dry run...
    python scripts\deploy_to_github_pages.py --dry-run
)
if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
)

echo.
echo ============================================
echo  Deployment Complete
echo ============================================
echo Check logs\deployment_results_*.json for details
pause
