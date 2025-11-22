@echo off
REM Start Genesis Dashboard API on Port 5001
REM Run this on the VPS to start the Dashboard backend

title Genesis Dashboard API (Port 5001)
cd /d C:\Genesis

echo ========================================
echo Genesis Dashboard API Starting...
echo ========================================
echo.
echo Service will be available at:
echo http://154.12.244.112:5001
echo.
echo Health Check:
echo http://154.12.244.112:5001/health
echo.
echo API Endpoints:
echo http://154.12.244.112:5001/api/metrics
echo http://154.12.244.112:5001/api/agents/all
echo.
echo API Documentation:
echo http://154.12.244.112:5001/docs
echo.
echo ========================================
echo.

python scripts\dashboard_api_server.py

pause
