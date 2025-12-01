@echo off
REM Genesis 100-Test Suite Execution Script
REM Executes 100 autonomous business creation tests

echo ===============================================
echo GENESIS TESTFORGE ALPHA - 100 TESTS
echo ===============================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check for API keys
if defined OPENAI_API_KEY (
    echo OpenAI API Key: CONFIGURED
) else (
    echo OpenAI API Key: NOT FOUND
)

if defined GEMINI_API_KEY (
    echo Gemini API Key: CONFIGURED
) else (
    echo Gemini API Key: NOT FOUND
)

echo.
echo Starting Genesis 100-Test Suite...
echo This will execute 100 comprehensive business creation tests
echo Phase 1: Tests 1-50 (Core 11 Agents)
echo Phase 2: Tests 51-100 (Full 26-Agent Swarm)
echo.

REM Run the test suite
python genesis_100_test_suite.py --parallel 8 --min-score 80.0

echo.
echo Test execution completed!
echo Check the following files for results:
echo - metrics/100_test_campaign.json
echo - GENESIS_100_TEST_CAMPAIGN_FINAL_REPORT.md
echo - logs/genesis_100_tests/test_execution.log
echo.

pause