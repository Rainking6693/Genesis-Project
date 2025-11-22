@echo off
REM Start Genesis Dashboard UI on Port 3000
REM Run this on the VPS to start the Dashboard frontend

title Genesis Dashboard UI (Port 3000)
cd /d C:\Genesis\genesis-dashboard

echo ========================================
echo Genesis Dashboard UI Starting...
echo ========================================
echo.
echo Dashboard will be available at:
echo http://154.12.244.112:3000
echo.
echo Make sure Dashboard API is running first!
echo (Run START_DASHBOARD_API.bat in another window)
echo.
echo ========================================
echo.

npm run start

pause
