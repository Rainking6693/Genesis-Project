@echo off
REM Start OmniDaemon - Continuous Background Orchestration Service
REM
REM Integrates:
REM - IterResearch Workspace Manager (#69)
REM - Dr. MAMR Attribution Layer (#70)
REM - ES Training Scheduler (#68)

echo ============================================================
echo Starting OmniDaemon - Genesis Continuous Orchestration
echo ============================================================
echo.

REM Set PYTHONPATH
set PYTHONPATH=%CD%;%PYTHONPATH%

REM Create required directories
if not exist "logs" mkdir logs
if not exist "data\omnidaemon" mkdir data\omnidaemon
if not exist "data\workspaces" mkdir data\workspaces
if not exist "data\attribution" mkdir data\attribution
if not exist "data\es_training" mkdir data\es_training

echo [1/3] Directories created
echo [2/3] Starting OmniDaemon...
echo.

REM Start daemon
python infrastructure\omnidaemon\daemon_core.py

echo.
echo [3/3] OmniDaemon stopped
echo ============================================================
pause
