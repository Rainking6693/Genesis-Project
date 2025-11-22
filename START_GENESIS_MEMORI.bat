@echo off
REM ==========================================================================
REM Genesis Production Startup Script with Memori Backend
REM ==========================================================================
REM
REM This script starts Genesis with the VPS implementation:
REM - Memori SQL backend for trajectory storage and querying
REM - DreamGym synthetic experience generation
REM - Automatic TrajectoryPool mirroring to Memori
REM
REM Prerequisites:
REM   - Python 3.12.4+
REM   - pip install -r requirements.txt
REM
REM Environment Variables:
REM   GENESIS_ENV=production     (required)
REM   MEMORI_DB_PATH=            (optional, defaults to data/memori/genesis_memori.db)
REM   DREAMGYM_ENABLED=1         (optional, enables synthetic batch generation)
REM
REM Usage:
REM   START_GENESIS_MEMORI.bat [COMMAND]
REM
REM Commands:
REM   full-test    Run comprehensive 1-hour test with all agents
REM   es-training  Run Evolution Strategies training
REM   business     Generate single business
REM   monitor      Monitor Memori performance
REM   a2a-service  Start A2A FastAPI service
REM   dashboard    Start Genesis Dashboard
REM
REM ==========================================================================

setlocal enabledelayedexpansion

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR:~0,-1%"

REM Setup Python path
set PYTHONPATH=%CD%;%PYTHONPATH%

REM Default environment
if not defined GENESIS_ENV set GENESIS_ENV=production
if not defined MEMORI_DB_PATH set MEMORI_DB_PATH=data/memori/genesis_memori.db
if not defined DREAMGYM_ENABLED set DREAMGYM_ENABLED=1

echo.
echo ========================================================
echo Genesis Production Startup - Memori Backend
echo ========================================================
echo.
echo Environment:
echo   GENESIS_ENV:        %GENESIS_ENV%
echo   MEMORI_DB_PATH:     %MEMORI_DB_PATH%
echo   DREAMGYM_ENABLED:   %DREAMGYM_ENABLED%
echo   Python Version:
python --version
echo.

REM Create necessary directories
if not exist "data\memori" mkdir data\memori
if not exist "logs" mkdir logs
if not exist "metrics" mkdir metrics

REM Validate environment
echo Validating Genesis environment...
python -c "from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('✓ Environment loaded')" 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Failed to load Genesis environment
    echo Please ensure:
    echo   - All required API keys are set in .env
    echo   - requirements.txt dependencies are installed
    echo.
    pause
    exit /b 1
)

REM Parse command
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=full-test

echo.
echo Starting Genesis with command: %COMMAND%
echo ========================================================
echo.

if /i "%COMMAND%"=="full-test" (
    echo Running Full Agent Production Test (1 hour)...
    echo This will generate 100+ businesses with all agents.
    echo.
    python scripts\full_agent_production_test.py
    goto :end
)

if /i "%COMMAND%"=="es-training" (
    echo Running Evolution Strategies Training...
    echo.
    python scripts\nightly_es_training.py --iterations 3 --population 6
    goto :end
)

if /i "%COMMAND%"=="business" (
    echo Generating single business...
    echo.
    python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0
    goto :end
)

if /i "%COMMAND%"=="monitor" (
    echo Monitoring Memori Performance...
    echo.
    python "!SCRIPT_DIR!monitor_memori_performance.py" --duration 3600 --interval 5
    goto :end
)

if /i "%COMMAND%"=="a2a-service" (
    echo Starting A2A FastAPI Service...
    echo Service will run on http://localhost:8000
    echo API Docs: http://localhost:8000/docs
    echo Health: http://localhost:8000/health
    echo.
    python a2a_fastapi.py
    goto :end
)

if /i "%COMMAND%"=="dashboard" (
    echo Starting Genesis Dashboard...
    echo.
    echo Starting API server on port 5001...
    start "" python scripts\dashboard_api_server.py
    timeout /t 2 /nobreak
    echo.
    echo Starting Dashboard UI on port 3000...
    cd genesis-dashboard
    call npm run dev
    goto :end
)

if /i "%COMMAND%"=="help" (
    echo Available commands:
    echo   full-test    - Run comprehensive 1-hour test
    echo   es-training  - Run Evolution Strategies training
    echo   business     - Generate single business
    echo   monitor      - Monitor Memori performance
    echo   a2a-service  - Start A2A service
    echo   dashboard    - Start Genesis Dashboard
    echo.
    goto :end
)

echo Unknown command: %COMMAND%
echo Use: START_GENESIS_MEMORI.bat help
exit /b 1

:end
echo.
echo Genesis shutdown
echo ========================================================
endlocal
