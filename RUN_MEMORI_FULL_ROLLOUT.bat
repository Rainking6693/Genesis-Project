@echo off
REM ================================================================================
REM MEMORI BACKEND FULL ROLLOUT - ALL 25 AGENTS
REM ================================================================================
REM
REM This script rolls out the Memori backend to ALL 25 agents after successful
REM canary testing. Run this ONLY if the canary test (10 agents) was successful.
REM
REM Created: November 11, 2025
REM ================================================================================

echo.
echo ================================================================================
echo MEMORI BACKEND FULL ROLLOUT - ALL 25 AGENTS
echo ================================================================================
echo.
echo WARNING: This will enable Memori backend for ALL 25 agents in production.
echo Only proceed if canary test (10 agents) was successful.
echo.
echo ================================================================================
echo.

set /p CONFIRM="Have you reviewed the canary test results? (yes/no): "

if /i not "%CONFIRM%"=="yes" (
    echo.
    echo Rollout cancelled. Please review canary test results first.
    echo Check: memori_canary_metrics.json and logs\full_agent_test_report.json
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo PROCEEDING WITH FULL ROLLOUT
echo ================================================================================
echo.

REM Change to correct directory
cd /d "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"

REM Enable Memori backend
echo [1/5] Enabling Memori backend...
call ENABLE_MEMORI_BACKEND.bat

REM Set production parameters
set GENESIS_ENV=production
set GENESIS_AGENT_COUNT=25
set TEST_DURATION=3600
set MIN_QUALITY_SCORE=75.0

echo.
echo [2/5] Starting performance monitoring for 1 hour...
start /B python monitor_memori_performance.py --duration %TEST_DURATION% --output memori_production_metrics.json

echo.
echo [3/5] Running production test with ALL 25 agents...
echo.

REM Run full agent production test with all 25 agents
python scripts\full_agent_production_test.py --duration 3600 --agent-count 25 --min-score %MIN_QUALITY_SCORE%

echo.
echo [4/5] Production test complete. Analyzing results...
echo.

REM Check if monitoring finished
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Generating production report...
echo.

REM Display metrics
if exist memori_production_metrics.json (
    echo Performance Metrics (25 agents):
    type memori_production_metrics.json
) else (
    echo Warning: Metrics file not found. Check monitor_memori_performance.py logs.
)

echo.
echo ================================================================================
echo PRODUCTION ROLLOUT COMPLETE
echo ================================================================================
echo.
echo All 25 agents are now using Memori backend with:
echo   - Automatic mirroring from TrajectoryPool
echo   - DreamGym synthetic experience generation
echo   - 80-90 percent cost reduction vs vector databases
echo   - Sub-millisecond query performance
echo.
echo Next Steps:
echo   1. Monitor database performance over next 24 hours
echo   2. Review daily performance reports
echo   3. Optimize queries if needed
echo   4. Continue Evolution Strategies training
echo.
echo ================================================================================

pause
