@echo off
REM Start Genesis A2A Service on Port 8000
REM Run this on the VPS to start the REST API

title Genesis A2A Service (Port 8000)
cd /d C:\Genesis

echo ========================================
echo Genesis A2A Service Starting...
echo ========================================
echo.
echo Service will be available at:
echo http://154.12.244.112:8000
echo.
echo Health Check:
echo http://154.12.244.112:8000/health
echo.
echo API Documentation:
echo http://154.12.244.112:8000/docs
echo.
echo ========================================
echo.

python a2a_fastapi.py

pause
