@echo off
REM AG-UI Dashboard Launcher for Genesis Pipeline
REM
REM This starts the AG-UI Dojo for real-time pipeline visualization.
REM Run this BEFORE starting the pipeline to see real-time events.

echo.
echo ============================================================
echo               AG-UI DASHBOARD LAUNCHER
echo ============================================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if pnpm is available
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm...
    npm install -g pnpm
)

REM Navigate to AG-UI directory
cd /d "%~dp0tools\ag-ui"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
)

echo.
echo Starting AG-UI Dashboard...
echo.
echo Dashboard will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the dashboard.
echo.

REM Start the development server
pnpm dev

pause
