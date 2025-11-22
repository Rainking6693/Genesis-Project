@echo off
REM Autonomous Business Orchestrator - Launch Script
REM
REM This script runs the complete autonomous business operation:
REM 1. Genesis generates business ideas
REM 2. Agents build the businesses
REM 3. Businesses deployed automatically
REM 4. Revenue tracked
REM 5. Performance evaluated
REM 6. Underperforming businesses shutdown
REM
REM NO HUMAN INTERACTION except large bill approvals ($100+)

echo ========================================
echo GENESIS AUTONOMOUS BUSINESS ORCHESTRATOR
echo ========================================
echo.
echo This will run end-to-end autonomous business operation:
echo   1. Generate business ideas
echo   2. Build with specialized agents
echo   3. Deploy autonomously (Railway)
echo   4. Track revenue and metrics
echo   5. Evaluate performance
echo   6. Shutdown if below threshold
echo.
echo Press Ctrl+C to cancel, or
pause

REM Set PYTHONPATH
set PYTHONPATH=%CD%;%PYTHONPATH%

REM Run orchestrator
python scripts\autonomous_business_orchestrator.py --count 3

echo.
echo ========================================
echo Run complete!
echo.
echo To run continuous mode (creates 1 business per day, evaluates all):
echo   python scripts\autonomous_business_orchestrator.py --continuous
echo.
echo To evaluate existing businesses only:
echo   python scripts\autonomous_business_orchestrator.py --evaluate-only
echo ========================================
pause
