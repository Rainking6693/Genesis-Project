@echo off
REM Genesis Autonomous Business Pipeline Launcher
REM
REM This script runs the complete Genesis Pipeline:
REM - Claude (Opus 4.5) as Primary LLM orchestrator
REM - 16 SuperClaude agents for specialized tasks
REM - Codex as Lead Developer (via Roundtable)
REM - Gemini as Lead QA (via Roundtable)
REM - Genesis Meta Agent + SE-Darwin for evolution
REM - AG-UI for real-time visualization
REM - n8n for post-deployment automation

echo.
echo ============================================================
echo           GENESIS AUTONOMOUS BUSINESS PIPELINE
echo ============================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH
    exit /b 1
)

REM Set PYTHONPATH
set PYTHONPATH=%~dp0;%PYTHONPATH%

REM Default values
set BUSINESS_TYPE=saas
set TARGET_MARKET=developers

REM Parse arguments
if not "%1"=="" set BUSINESS_TYPE=%1
if not "%2"=="" set TARGET_MARKET=%2

echo Running pipeline for:
echo   Business Type: %BUSINESS_TYPE%
echo   Target Market: %TARGET_MARKET%
echo.

REM Run the pipeline
python scripts\run_pipeline.py --business-type %BUSINESS_TYPE% --target-market "%TARGET_MARKET%" %3 %4 %5 %6 %7 %8 %9

if errorlevel 1 (
    echo.
    echo Pipeline failed with error code %errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo Pipeline completed successfully!
pause
