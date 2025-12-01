# Genesis 100-Test Suite - Log Locations

## Current Log Directory Structure

The Genesis 100-Test Suite creates and manages logs in the following locations:

### 📁 Primary Test Execution Logs

**Location:** `logs/genesis_100_tests/`
- `test_execution.log` - Main test execution log file (currently empty - needs proper file handling)

### 📊 Actual Test Results (JSON Data)

**Location:** `metrics/`
- `100_test_campaign.json` - Summary metrics and statistics
- `100_test_campaign_detailed_results.json` - Detailed test execution results

### 📝 Existing System Logs (During Test Execution)

**Location:** `logs/`
- `agents.log` - General agent activities (738KB)
- `infrastructure.log` - Infrastructure component logs (4.5MB)
- `se_darwin_agent.log` - SE-Darwin evolution agent logs (183KB)
- `infrastructure_oracle_hgm.log` - HGM Oracle scoring logs (63KB)

### 📂 Historical Business Generation Logs

**Location:** `logs/business_generation/`
- Contains 200+ individual test result files
- Various business generation test summaries
- Historical test data from previous executions

## Log Content Analysis

### Test Execution Logs Currently Capture:

1. **Console Output During Tests:**
   - Test start/finish notifications
   - Business idea generation details
   - Step-by-step workflow execution
   - Agent coordination messages
   - Error injection and recovery events
   - HGM Oracle scoring results

2. **Metrics Data:**
   - Test success/failure rates
   - HGM Oracle scores
   - Business creation statistics
   - Agent usage tracking
   - Integration coverage

### Example Log Content (from console during test execution):

```
INFO:GenesisTestForge:Starting Test 3: Auto Ai Tool Suite (core_11_agents)
INFO:GenesisTestForge:  📋 Step: Market analysis
INFO:GenesisTestForge:    📊 Market analysis complete for Enterprise
INFO:GenesisTestForge:  📋 Step: Build complete application
INFO:GenesisTestForge:    💻 Application built with features: Natural language processing, Custom models
INFO:GenesisTestForge:  📋 Step: Deploy to platform
INFO:GenesisTestForge:    🚀 Deployed to render: https://auto-ai-tool-suite.render.app
INFO:GenesisTestForge:  💥 Injected error: payment_gateway_failure
INFO:GenesisTestForge:  🔄 Error recovered: payment_gateway_failure
INFO:GenesisTestForge:PASS: Test 3 PASSED - HGM Score: 95.0
```

## Issue Identified: File Logging Not Working

The current implementation has an issue where:
- ✅ Console logging works perfectly (seen in terminal output)
- ❌ File logging to `test_execution.log` is not capturing the output
- ✅ Metrics and results are properly saved to JSON files

## Log File Locations Summary

| Log Type | Location | Status | Description |
|----------|----------|--------|-------------|
| Test Execution | `logs/genesis_100_tests/test_execution.log` | Empty (0 bytes) | Should contain full test execution logs |
| Test Metrics | `metrics/100_test_campaign.json` | ✅ Working | Summary statistics |
| Detailed Results | `metrics/100_test_campaign_detailed_results.json` | ✅ Working | Complete test data |
| Agent Logs | `logs/agents.log` | ✅ Working | General agent activities |
| Infrastructure Logs | `logs/infrastructure.log` | ✅ Working | System infrastructure |
| SE-Darwin Logs | `logs/se_darwin_agent.log` | ✅ Working | Evolution agent logs |
| HGM Oracle Logs | `logs/infrastructure_oracle_hgm.log` | ✅ Working | Scoring system logs |

## How to View Current Test Results

Since the file logging isn't working properly, you can view the test results in these ways:

### 1. Check Metrics Files (JSON)
```bash
type metrics\100_test_campaign.json
type metrics\100_test_campaign_detailed_results.json
```

### 2. View Recent Agent Activity
```bash
type logs\agents.log
type logs\infrastructure.log
```

### 3. Check HGM Oracle Scores
```bash
type logs\infrastructure_oracle_hgm.log
```

## Fix Required

To properly capture test execution logs to file, the following needs to be implemented:

1. **Fix File Handler Configuration:** Ensure the logging.FileHandler is properly configured
2. **Add Log Rotation:** Implement log rotation for large test runs
3. **Flush Logging:** Ensure logs are flushed to disk during execution
4. **Timestamp Formatting:** Add proper timestamps to log entries

## Alternative: Real-time Log Monitoring

Since file logging isn't working, you can monitor the console output in real-time:

```bash
# Run tests with continuous output monitoring
python genesis_100_test_suite.py --parallel 4

# Monitor existing agent logs
type logs\agents.log
type logs\infrastructure.log | findstr "GenesisTestForge"
```

## Recommended Log Viewing Commands

For Windows environment:
```cmd
REM View test metrics
type metrics\100_test_campaign.json

REM View detailed results  
type metrics\100_test_campaign_detailed_results.json

REM Monitor agent activity
type logs\agents.log

REM Check HGM Oracle scores
type logs\infrastructure_oracle_hgm.log

REM View SE-Darwin evolution logs
type logs\se_darwin_agent.log
```

## Summary

**Current Status:**
- ✅ Test execution works perfectly (100% success rate in sample tests)
- ✅ Metrics and results are properly saved
- ✅ Console logging captures all test details
- ❌ File logging to test_execution.log needs fixing
- ✅ Comprehensive test data is available in metrics files

**Where to Find Test Results:**
- Primary results: `metrics/` directory (JSON files)
- System logs: `logs/` directory (agent, infrastructure, HGM Oracle logs)
- Historical data: `logs/business_generation/` directory