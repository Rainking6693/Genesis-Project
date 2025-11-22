# Genesis Local Windows Testing - Setup Guide

**Date:** November 8, 2025
**Purpose:** 24-48 hour local validation before PythonAnywhere deployment
**Status:** READY TO START

---

## QUICK START (3 Simple Steps)

### Option 1: Fully Automated (Recommended)
```batch
1. Double-click: QUICK_START_TESTING.bat
   - Opens monitoring dashboard in browser
   - Shows all commands you need

2. Double-click: RUN_NIGHT1_TESTS.bat
   - Runs all Night 1 tests automatically
   - Takes ~10-15 minutes total
   - Shows progress in real-time

3. Review results in browser dashboard
   - Auto-refreshes every 30 seconds
   - Check logs for errors
```

### Option 2: Manual Step-by-Step
```bash
# Test 1: ES Training (dry-run)
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run

# Test 2: Business Generation
python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0

# Test 3: Monitoring Dashboard
python scripts\start_monitoring.py
```

---

## WHAT YOU GET

### Files Created
1. **LOCAL_TESTING_STATUS.md** - Complete status tracking document
2. **local_monitor.html** - Real-time monitoring dashboard (browser)
3. **QUICK_START_TESTING.bat** - One-click dashboard launcher
4. **RUN_NIGHT1_TESTS.bat** - Automated Night 1 test suite
5. **RUN_NIGHT2_TESTS.bat** - Automated Night 2 test suite (to be created)

### Systems Being Tested
- ✅ ES Training Pipeline (Evolution Strategies)
- ✅ Autonomous Business Generation (ALL 53 systems)
- ✅ Monitoring & Logging
- ✅ Directory Structure
- ✅ Error Handling

---

## DETAILED WORKFLOW

### Tonight (Night 1) - System Verification
**Goal:** Verify all individual components work

1. **ES Training Test (Dry-Run)**
   - Duration: ~60 seconds
   - Creates log but NO model updates
   - Validates: Training pipeline works

2. **Single Business Generation**
   - Duration: ~5-10 minutes
   - Creates one complete business
   - Validates: All 53 systems integrate properly

3. **Log Verification**
   - Check: logs/nightly-es-training.log
   - Check: logs/genesis_agent.log
   - Look for: "TRAINING COMPLETE", "Business #1 Complete"

### Tomorrow (Night 2) - Production Testing
**Goal:** Run production workloads overnight

1. **Production ES Training (NO dry-run)**
   - Duration: ~5-10 minutes
   - Creates production LoRA adapter
   - Updates: models/lora_adapters/current/adapter.safetensors

2. **Multi-Business Generation (3 businesses)**
   - Duration: ~15-30 minutes
   - Creates 3 complete businesses
   - Tests: TrajectoryPool learning

3. **Overnight Stability Test**
   - Leave running for 12+ hours
   - Monitor for crashes
   - Check logs in morning

---

## MONITORING

### Browser Dashboard
```bash
# Open monitoring dashboard
start local_monitor.html

# OR use quick start
QUICK_START_TESTING.bat
```

**Dashboard Features:**
- Auto-refreshes every 30 seconds
- Shows system status
- Lists running services
- Displays test progress
- Quick command reference
- Error detection guide

### Real-Time Log Viewing (PowerShell)
```powershell
# ES Training Log
Get-Content logs\nightly-es-training.log -Wait -Tail 20

# Genesis Agent Log
Get-Content logs\genesis_agent.log -Wait -Tail 20

# Infrastructure Log
Get-Content logs\infrastructure.log -Wait -Tail 20
```

### Check Running Processes
```batch
# Show Python processes
tasklist | findstr python

# Show with details (PowerShell)
Get-Process python | Select-Object Id, CPU, WorkingSet
```

---

## KEY FILES & LOCATIONS

### Logs
```
logs/
├── nightly-es-training.log     # ES training output
├── genesis_agent.log            # Autonomous loop
├── infrastructure.log           # Infrastructure components
├── agents.log                   # Agent interactions
└── a2a_service.log             # A2A communication
```

### Metrics
```
metrics/
└── es_training_metrics.json    # ES performance data
```

### Models
```
models/
└── lora_adapters/
    ├── current/
    │   └── adapter.safetensors  # Production adapter
    └── archive/
        └── adapter_iter_*.safetensors  # Archived versions
```

### Generated Businesses
```
businesses/
└── fully_integrated/
    └── [business_type]/
        └── [business_name]/
            ├── README.md
            ├── requirements.txt
            └── src/
```

---

## SUCCESS CRITERIA

### Night 1 (Tonight)
- [ ] ES training completes without errors
- [ ] Single business generated successfully
- [ ] All log files created and readable
- [ ] No crash errors or exceptions
- [ ] Monitoring dashboard loads

### Night 2 (Tomorrow)
- [ ] Production adapter created successfully
- [ ] 3+ businesses generated
- [ ] TrajectoryPool learning validated
- [ ] System runs stably for 12+ hours
- [ ] Quality scores meet threshold (70+)

### Overall
- [ ] All scripts tested individually
- [ ] Integration between systems verified
- [ ] Performance baselines established
- [ ] Ready for PythonAnywhere deployment
- [ ] Comprehensive error logs captured

---

## ERROR HANDLING

### Red Flags (STOP IMMEDIATELY)
- ❌ Python crashes or exceptions
- ❌ ModuleNotFoundError or ImportError
- ❌ File permission errors
- ❌ Database connection failures
- ❌ API key errors

**Action:** Stop testing, check logs, fix issue, restart

### Yellow Flags (NOTE BUT CONTINUE)
- ⚠️ Slower than expected performance
- ⚠️ Lower quality scores than expected
- ⚠️ Missing optional features (A2A, Memento)
- ⚠️ Warning messages in logs

**Action:** Document in logs, continue testing, investigate later

### Green Signals (ALL GOOD)
- ✅ "TRAINING COMPLETE" in ES logs
- ✅ "Business #N Complete" in autonomous logs
- ✅ Files created in expected locations
- ✅ Metrics updated correctly
- ✅ No exceptions or tracebacks

**Action:** Continue testing, everything is working

---

## TROUBLESHOOTING

### ES Training Fails
```bash
# Check Python version
python --version  # Should be 3.12.4

# Reinstall dependencies
pip install -r requirements.txt

# Check fixtures exist
dir fixtures

# Verify write permissions
# Try creating a test file in models/
echo test > models\test.txt
```

### Business Generation Fails
```bash
# Check .env file exists
dir .env

# Verify API keys in .env
# (Don't print them, just verify they exist)

# Check logs for specific errors
type logs\genesis_agent.log | findstr ERROR

# Test infrastructure components
python -c "from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('OK')"
```

### Monitoring Dashboard Fails
```bash
# Install Streamlit
pip install streamlit

# Check port availability
netstat -ano | findstr 8501

# Install dashboard requirements
pip install -r dashboard\requirements.txt

# Test simple Python server
python -m http.server 8000
# Then visit: http://localhost:8000/local_monitor.html
```

---

## AFTER TESTING

### If All Tests Pass ✅

1. **Enable Task Scheduler (Administrator)**
   ```powershell
   # Run PowerShell as Administrator
   cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
   .\setup_es_scheduler.ps1
   ```

2. **Document Findings**
   - Update LOCAL_TESTING_STATUS.md with results
   - Note performance baselines
   - Record any Windows-specific issues

3. **Prepare PythonAnywhere Migration**
   - Review logs for platform-specific code
   - Document working configuration
   - Save baseline metrics

### If Tests Fail ❌

1. **Capture Full Error Context**
   - Copy complete error messages
   - Save relevant log excerpts
   - Note which step failed

2. **Debug Systematically**
   - Fix one issue at a time
   - Re-test after each fix
   - Document solutions

3. **Get Help**
   - Provide full error logs
   - Describe reproduction steps
   - Share environment details

---

## COMMANDS REFERENCE

### ES Training
```bash
# Dry-run (no adapter updates)
python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run

# Production run
python scripts\nightly_es_training.py --iterations 3 --population 6

# Custom parameters
python scripts\nightly_es_training.py --iterations 5 --population 8 --sigma 0.02 --learning-rate 0.002
```

### Business Generation
```bash
# Single business
python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0

# Multiple businesses
python scripts\autonomous_fully_integrated.py --count 3 --min-score 75.0

# High quality threshold
python scripts\autonomous_fully_integrated.py --count 5 --min-score 80.0
```

### Monitoring
```bash
# Start Streamlit dashboard
python scripts\start_monitoring.py

# Open HTML dashboard
start local_monitor.html

# View logs
type logs\nightly-es-training.log
type logs\genesis_agent.log

# Real-time log monitoring
Get-Content logs\nightly-es-training.log -Wait -Tail 20
```

---

## TECHNICAL DETAILS

### System Architecture
```
Layer 1 (Orchestration): HTDAG, HALO, AOP, DAAO
Layer 2 (Evolution): SE-Darwin, TrajectoryPool, SICA, SPICE
Layer 3 (Communication): A2A, OpenEnv
Layer 5 (Swarm): Inclusive Fitness
Layer 6 (Memory): Memento, CaseBank, TEI, Memory×Router
Advanced: WaltzRL, SGLang, vLLM, Computer Use, HGM
```

### Performance Targets
```
ES Training (1 iteration): < 60 seconds
Business Generation: 5-10 minutes
Quality Score: ≥ 70/100
Success Rate: ≥ 80%
```

### Resource Usage
```
Python 3.12.4
Memory: ~2-4 GB during generation
Disk: ~100 MB per business
Network: API calls to Vertex AI
```

---

## FAQ

**Q: How long should Night 1 testing take?**
A: ~15-20 minutes total. ES training (~1 min) + Business generation (~10 min) + verification (~5 min).

**Q: What if I get "ModuleNotFoundError"?**
A: Run `pip install -r requirements.txt` to install all dependencies.

**Q: Can I run multiple tests in parallel?**
A: No, run tests sequentially to avoid resource conflicts.

**Q: What if the dashboard doesn't update?**
A: Refresh the browser. Dashboard auto-refreshes every 30 seconds.

**Q: How do I know if it's working?**
A: Check logs for "TRAINING COMPLETE" and "Business #N Complete" messages. No exceptions or tracebacks.

**Q: What happens if my computer sleeps?**
A: Tests will pause. Best to disable sleep mode during testing.

**Q: Can I stop and restart tests?**
A: Yes, but start from the beginning of the test sequence.

---

## CONTACT & SUPPORT

**Documentation:**
- LOCAL_TESTING_STATUS.md - Detailed status tracking
- local_monitor.html - Real-time dashboard
- logs/ directory - All execution logs

**For Issues:**
1. Check logs first (errors usually explain the issue)
2. Review troubleshooting section above
3. Document complete error context
4. Update LOCAL_TESTING_STATUS.md with findings

---

**Last Updated:** November 8, 2025
**Next Update:** After Night 1 completion
**Version:** 1.0 - Initial Setup
