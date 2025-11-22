@echo off
REM ================================================================================
REM MEMORI BACKEND CANARY TEST - 10 AGENTS (1 HOUR)
REM ================================================================================
REM
REM This script runs a 1-hour production test with 10 agents using the Memori
REM backend to validate performance, stability, and automatic mirroring before
REM rolling out to all 25 agents.
REM
REM Created: November 11, 2025
REM ================================================================================

echo.
echo ================================================================================
echo MEMORI BACKEND CANARY TEST - 10 AGENTS
echo ================================================================================
echo.
echo Test Duration: 1 hour
echo Agent Count: 10 agents (canary deployment)
echo Backend: Memori SQL with automatic mirroring
echo DreamGym: Enabled with synthetic experience generation
echo.
echo Test will generate 50-100+ businesses and monitor:
echo   - Query latency (target: sub-100ms)
echo   - Mirroring latency (target: sub-10ms)
echo   - Database size and growth
echo   - Agent coordination with Memori
echo   - Synthetic experience generation
echo.
echo ================================================================================
echo.

REM Change to correct directory
cd /d "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"

REM Enable Memori backend
echo [1/4] Enabling Memori backend...
call ENABLE_MEMORI_BACKEND.bat

REM Set canary test parameters
set GENESIS_ENV=production
set GENESIS_AGENT_COUNT=10
set TEST_DURATION=3600
set MIN_QUALITY_SCORE=75.0

echo.
echo [2/4] Starting performance monitoring in background...
start /B python monitor_memori_performance.py --duration %TEST_DURATION% --output memori_canary_metrics.json

echo.
echo [3/4] Running 1-hour canary test with 10 agents...
echo.

REM Run full agent production test for 1 hour
python scripts\full_agent_production_test.py --duration 3600 --agent-count 10 --min-score %MIN_QUALITY_SCORE%

echo.
echo [4/4] Canary test complete. Analyzing results...
echo.

REM Check if monitoring finished
timeout /t 5 /nobreak >nul

echo ================================================================================
echo CANARY TEST RESULTS
echo ================================================================================
echo.

REM Display metrics if available
if exist memori_canary_metrics.json (
    echo Performance Metrics:
    type memori_canary_metrics.json
) else (
    echo Warning: Metrics file not found. Check monitor_memori_performance.py logs.
)

echo.
echo ================================================================================
echo NEXT STEPS
echo ================================================================================
echo.
echo 1. Review metrics in memori_canary_metrics.json
echo 2. Check logs\full_agent_test_report.json for business generation stats
echo 3. Verify all 10 agents worked correctly with Memori backend
echo 4. If successful, proceed with full rollout to 25 agents
echo.
echo To roll out to all 25 agents:
echo   RUN_MEMORI_FULL_ROLLOUT.bat
echo.
echo ================================================================================

pause
