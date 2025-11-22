@echo off
REM Genesis Night 2 Testing Script
REM Runs production workloads and extended integration tests

cd /d "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"

echo ========================================
echo GENESIS NIGHT 2 TESTING
echo ========================================
echo.
echo WARNING: This runs PRODUCTION tests
echo          Models WILL be updated
echo          This will take 30-60 minutes
echo.
echo Start Time: %date% %time%
echo.
pause

REM Test 1: Production ES Training
echo [1/3] Running Production ES Training...
echo     NO dry-run - models will be updated
echo     Expected duration: ~5-10 minutes
echo     Command: python scripts\nightly_es_training.py --iterations 3 --population 6
echo.
python scripts\nightly_es_training.py --iterations 3 --population 6
if %errorlevel% neq 0 (
    echo     ERROR: ES Training failed!
    echo     Check logs\nightly-es-training.log for details
    goto :error
)
echo     ES Training PASSED!
echo.

REM Verify adapter was created
if exist "models\lora_adapters\current\adapter.safetensors" (
    echo     Production adapter created: models\lora_adapters\current\adapter.safetensors
) else (
    echo     WARNING: Production adapter not found!
)
echo.

REM Test 2: Multi-Business Generation
echo [2/3] Running Multi-Business Generation...
echo     Generating 3 businesses
echo     Expected duration: ~15-30 minutes
echo     Command: python scripts\autonomous_fully_integrated.py --count 3 --min-score 75.0
echo.
python scripts\autonomous_fully_integrated.py --count 3 --min-score 75.0
if %errorlevel% neq 0 (
    echo     WARNING: Business generation had errors
    echo     Check logs\genesis_agent.log for details
    echo     Continuing...
)
echo     Multi-business generation completed!
echo.

REM Test 3: Metrics Verification
echo [3/3] Verifying Metrics...
if exist "metrics\es_training_metrics.json" (
    echo     ES metrics: FOUND
    type "metrics\es_training_metrics.json"
) else (
    echo     ES metrics: MISSING
)
echo.

REM Count generated businesses
echo Checking generated businesses...
if exist "businesses\fully_integrated" (
    dir /s /b "businesses\fully_integrated\*README.md" | find /c /v ""
    echo businesses found
) else (
    echo No businesses directory found
)
echo.

echo ========================================
echo NIGHT 2 TESTING COMPLETE!
echo ========================================
echo.
echo End Time: %date% %time%
echo.
echo Results Summary:
echo   - Production adapter: Check models\lora_adapters\current\
echo   - Generated businesses: Check businesses\fully_integrated\
echo   - Training metrics: Check metrics\es_training_metrics.json
echo   - ES logs: Check logs\nightly-es-training.log
echo   - Business logs: Check logs\genesis_agent.log
echo.
echo Next Steps:
echo   1. Review all generated businesses for quality
echo   2. Verify TrajectoryPool learning (check logs)
echo   3. Document performance baselines
echo   4. Prepare for PythonAnywhere deployment
echo.
goto :end

:error
echo.
echo ========================================
echo TESTING FAILED
echo ========================================
echo.
echo Production testing encountered errors.
echo.
echo Troubleshooting:
echo   1. Check error messages above
echo   2. Review logs in logs\ directory
echo   3. Verify dependencies: pip install -r requirements.txt
echo   4. Check disk space and write permissions
echo   5. Ensure .env file has all required API keys
echo.

:end
echo.
echo For detailed status and next steps, see:
echo   - LOCAL_TESTING_STATUS.md
echo   - README_LOCAL_TESTING.md
echo.
pause
