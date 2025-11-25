@echo off
echo.
echo ========================================
echo   Creating Desktop Shortcut
echo ========================================
echo.

REM Get desktop path
for /f "tokens=*" %%a in ('powershell -Command "[Environment]::GetFolderPath('Desktop')"') do set DESKTOP=%%a

REM Copy the batch file to desktop
copy "START_UNIFIED_DASHBOARD.bat" "%DESKTOP%\Genesis_Dashboard.bat"

echo.
echo ✅ Created Genesis_Dashboard.bat on your desktop!
echo.
echo You can now double-click it from your desktop to start the dashboard.
echo.
echo Desktop location: %DESKTOP%
echo.
pause

