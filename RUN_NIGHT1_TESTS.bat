@echo off
REM Genesis Night 1 Testing Script
REM Runs all Night 1 validation tests automatically

cd /d "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"

echo ========================================
echo GENESIS NIGHT 1 TESTING
echo ========================================
echo.
echo Start Time: %date% %time%
echo.

REM Create required directories
echo [1/4] Creating required directories...
if not exist "logs" mkdir logs
if not exist "metrics" mkdir metrics
if not exist "models\lora_adapters\current" mkdir models\lora_adapters\current
if not exist "models\lora_adapters\archive" mkdir models\lora_adapters\archive
if not exist "fixtures" mkdir fixtures
echo     Directories created!
echo.

REM Test 1: ES Training (dry-run)
echo [2/4] Running ES Training Test (dry-run)...
echo     Expected duration: ~60 seconds
echo     Command: python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run
echo.
python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run
if %errorlevel% neq 0 (
    echo     ERROR: ES Training test failed!
    echo     Check logs\nightly-es-training.log for details
    goto :error
)
echo     ES Training test PASSED!
echo.

REM Test 2: Single Business Generation
echo [3/4] Running Business Generation Test...
echo     Expected duration: ~5-10 minutes
echo     Command: python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0
echo.
python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0
if %errorlevel% neq 0 (
    echo     WARNING: Business generation test failed
    echo     Check logs\genesis_agent.log for details
    echo     Continuing with remaining tests...
)
echo     Business generation test completed!
echo.

REM Test 3: Verify logs created
echo [4/4] Verifying log files...
if exist "logs\nightly-es-training.log" (
    echo     ES training log: FOUND
) else (
    echo     ES training log: MISSING
)

if exist "logs\genesis_agent.log" (
    echo     Genesis agent log: FOUND
) else (
    echo     Genesis agent log: MISSING (may not have been created yet)
)
echo.

echo ========================================
echo NIGHT 1 TESTING COMPLETE!
echo ========================================
echo.
echo End Time: %date% %time%
echo.
echo Results Summary:
echo   - ES Training: Check logs\nightly-es-training.log
echo   - Business Gen: Check logs\genesis_agent.log
echo   - Metrics: Check metrics\es_training_metrics.json
echo.
echo Next Steps:
echo   1. Review logs for errors
echo   2. Check generated files
echo   3. Run Night 2 tests tomorrow
echo.
goto :end

:error
echo.
echo ========================================
echo TESTING FAILED
echo ========================================
echo.
echo Please check the error messages above and:
echo   1. Review relevant log files in logs\ directory
echo   2. Verify Python version: python --version
echo   3. Check dependencies: pip install -r requirements.txt
echo   4. Verify .env file exists and has required keys
echo.

:end
pause
