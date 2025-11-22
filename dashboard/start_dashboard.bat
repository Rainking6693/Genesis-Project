@echo off
REM Genesis Dashboard Launcher for Windows

echo ========================================
echo Genesis Monitoring Dashboard
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
pip show Flask >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Flask...
    pip install -r requirements.txt
) else (
    echo Dependencies OK
)

echo.
echo [2/4] Creating sample data...
python test_dashboard.py

echo.
echo [3/4] Starting dashboard server...
echo.
echo ========================================
echo Dashboard will be available at:
echo http://localhost:5000
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Flask app
python app.py

pause
