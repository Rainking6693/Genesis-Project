# LOCAL WINDOWS TESTING STATUS
**Date:** November 8, 2025
**Purpose:** 24-48 hour local testing before PythonAnywhere deployment

---

## CURRENT STATUS

### Running Services
- **Python Version:** 3.12.4 ✅
- **Project Root:** `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE`
- **Environment:** `.env` file present ✅

### Active Scripts (To Verify)
1. **autonomous_fully_integrated.py** - Fully integrated autonomous business generation
2. **start_monitoring.py** - Genesis Dashboard (Streamlit on port 8501)
3. **nightly_es_training.py** - Evolution Strategies training (scheduled)

### Logs Directory
```
logs/
├── a2a_service.log
├── agents.log
├── genesis_agent.log
├── infrastructure.log
├── infrastructure_casebank.log
├── infrastructure_hybrid_rag_retriever.log
├── infrastructure_llm_judge_rl.log
├── infrastructure_visual_memory_compressor.log
└── policy_compliance/
```

---

## IMMEDIATE SETUP TASKS

### 1. ES Training Scheduler ⏳
**Status:** NOT YET RUN
**Script:** `setup_es_scheduler.ps1`
**Purpose:** Creates Windows Task Scheduler task for nightly ES training

**Command to run:**
```powershell
# Open PowerShell as Administrator
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
.\setup_es_scheduler.ps1
```

**Expected Outcome:**
- Task created in Windows Task Scheduler
- Task name: "Genesis ES Nightly Training"
- Schedule: Daily at 2:00 AM
- Runs: `python scripts\nightly_es_training.py --iterations 5 --population 8`

### 2. Manual ES Training Test ⏳
**Status:** PENDING
**Purpose:** Verify ES training works before automated scheduling

**Command to run:**
```bash
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
python scripts/nightly_es_training.py --iterations 1 --population 4 --dry-run
```

**Expected Outcome:**
- Completes without errors
- Creates log: `logs/nightly-es-training.log`
- NO adapter updates (dry-run mode)
- Duration: ~30-60 seconds

### 3. Directory Structure Verification ✅
**Status:** VERIFIED
Required directories exist:
- ✅ `logs/`
- ✅ `metrics/` (to be created)
- ✅ `models/lora_adapters/current/` (to be created)
- ✅ `models/lora_adapters/archive/` (to be created)
- ✅ `fixtures/` (to be created)

### 4. Autonomous Loop Status ⏳
**Status:** TO VERIFY
**Script:** `autonomous_fully_integrated.py`

**What it does:**
- Generates businesses autonomously using ALL 53 Genesis systems
- Integrates: HTDAG, HALO, AOP, DAAO (orchestration)
- Integrates: SE-Darwin, TrajectoryPool, SICA (evolution)
- Integrates: A2A, OpenEnv (communication)
- Integrates: Inclusive Fitness Swarm (team composition)
- Integrates: Memento, CaseBank, Memory×Router (memory)
- Integrates: WaltzRL, TRiSM (safety)

**Test command:**
```bash
python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0
```

**Expected Output:**
- Business idea generated (market analysis)
- Optimal team composed (swarm intelligence)
- Tasks decomposed (HTDAG)
- Plan validated (AOP)
- Business built with memory integration
- Quality assessment (HGM Judge)

### 5. Monitoring Dashboard ⏳
**Status:** TO START
**Script:** `start_monitoring.py`

**Command to run:**
```bash
python scripts/start_monitoring.py
```

**Expected Outcome:**
- Checks Prometheus (port 9090)
- Checks Business Monitor (port 8000)
- Starts Genesis Dashboard on http://localhost:8501
- Press Ctrl+C to stop

---

## NIGHTLY TESTING PLAN

### Night 1 (Tonight)
**Focus:** Verify all systems work independently

1. ✅ **Manual ES Training Test**
   ```bash
   python scripts/nightly_es_training.py --iterations 1 --population 4 --dry-run
   ```
   - Expected duration: ~60 seconds
   - Check: `logs/nightly-es-training.log` created
   - Look for: "TRAINING COMPLETE"

2. ✅ **Single Business Generation Test**
   ```bash
   python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0
   ```
   - Expected duration: ~5-10 minutes
   - Check: Business created in `businesses/fully_integrated/`
   - Look for: Quality score 70+/100

3. ✅ **Monitoring Dashboard Test**
   ```bash
   python scripts/start_monitoring.py
   ```
   - Visit: http://localhost:8501
   - Verify: Dashboard loads without errors
   - Check: Metrics displayed correctly

### Night 2 (Tomorrow)
**Focus:** Extended integration testing

1. ✅ **Production ES Training (NO dry-run)**
   ```bash
   python scripts/nightly_es_training.py --iterations 3 --population 6
   ```
   - Expected duration: ~5-10 minutes
   - Check: `models/lora_adapters/current/adapter.safetensors` created
   - Check: `metrics/es_training_metrics.json` updated

2. ✅ **Multi-Business Generation**
   ```bash
   python scripts/autonomous_fully_integrated.py --count 3 --min-score 75.0
   ```
   - Expected duration: ~15-30 minutes
   - Check: 3 businesses created
   - Check: TrajectoryPool size increases

3. ✅ **Overnight Monitoring**
   - Leave monitoring dashboard running
   - Check logs in the morning
   - Verify: No crash errors
   - Verify: All businesses completed

---

## KEY FILES TO MONITOR

### During Testing
1. **ES Training Log**
   - Path: `logs/nightly-es-training.log`
   - Look for: "TRAINING COMPLETE", "Best fitness", iteration stats

2. **Autonomous Loop Logs**
   - Path: `logs/genesis_agent.log`
   - Look for: Business generation progress, errors

3. **Infrastructure Logs**
   - Path: `logs/infrastructure.log`
   - Look for: System component errors

4. **Metrics**
   - Path: `metrics/es_training_metrics.json`
   - Contains: Best fitness, iterations, timing

5. **Generated Businesses**
   - Path: `businesses/fully_integrated/[business_type]/[name]/`
   - Check: Files created, quality

---

## ERROR DETECTION CHECKLIST

### Red Flags (Stop immediately)
- ❌ Python crashes or exceptions
- ❌ "ModuleNotFoundError" or "ImportError"
- ❌ File permission errors
- ❌ Database connection failures
- ❌ API key errors

### Yellow Flags (Note but continue)
- ⚠️ Slower than expected performance
- ⚠️ Lower quality scores than expected
- ⚠️ Missing optional features (A2A, Memento)
- ⚠️ Warning messages in logs

### Green Signals (All good)
- ✅ "TRAINING COMPLETE" in ES logs
- ✅ "Business #N Complete" in autonomous logs
- ✅ Files created in expected locations
- ✅ Metrics updated correctly
- ✅ No exceptions or tracebacks

---

## TROUBLESHOOTING GUIDE

### If ES Training Fails
1. Check Python version: `python --version` (should be 3.12.4)
2. Check dependencies: `pip install -r requirements.txt`
3. Check fixtures directory: Should have benchmark scenarios
4. Check write permissions on `models/` directory

### If Autonomous Loop Fails
1. Check `.env` file exists and has required API keys
2. Check logs for specific error messages
3. Verify all infrastructure components initialized
4. Check network connectivity (for A2A)

### If Monitoring Dashboard Fails
1. Check Streamlit installed: `pip install streamlit`
2. Check port 8501 not in use: `netstat -ano | findstr 8501`
3. Check dashboard requirements: `pip install -r dashboard/requirements.txt`

---

## NEXT STEPS AFTER TESTING

### If All Tests Pass ✅
1. **Enable Windows Task Scheduler**
   - Run `setup_es_scheduler.ps1` as Administrator
   - Verify task created in Task Scheduler
   - Test run from Task Scheduler GUI

2. **Prepare PythonAnywhere Migration**
   - Document any Windows-specific issues
   - Note performance baselines
   - Save working configuration

3. **Document Findings**
   - Update this file with results
   - Note any optimizations discovered
   - Record typical runtime durations

### If Tests Fail ❌
1. **Document Errors**
   - Copy full error messages
   - Save relevant log excerpts
   - Note which step failed

2. **Debug Systematically**
   - Start with simplest test (ES dry-run)
   - Fix issues one at a time
   - Re-test after each fix

3. **Contact for Help**
   - Provide full error logs
   - Describe steps to reproduce
   - Share environment details

---

## MONITORING COMMANDS

### Check Running Processes
```bash
# Windows
tasklist | findstr python

# Show with details
powershell -Command "Get-Process python | Select-Object Id, CPU, WorkingSet"
```

### View Real-Time Logs
```bash
# ES Training Log
Get-Content "logs/nightly-es-training.log" -Wait -Tail 20

# Genesis Agent Log
Get-Content "logs/genesis_agent.log" -Wait -Tail 20

# Infrastructure Log
Get-Content "logs/infrastructure.log" -Wait -Tail 20
```

### Check Disk Space
```bash
# Check C: drive space
powershell -Command "Get-PSDrive C | Select-Object Used, Free"
```

### Check Network Connectivity
```bash
# Test Google connectivity (for Vertex AI)
ping -n 4 google.com

# Test port connectivity
Test-NetConnection localhost -Port 8501
```

---

## SUCCESS CRITERIA

### Night 1 Goals
- [ ] ES Training completes without errors (dry-run)
- [ ] Single business generated successfully
- [ ] Monitoring dashboard loads and displays data
- [ ] All logs created and readable
- [ ] No crash errors overnight

### Night 2 Goals
- [ ] ES Training creates production adapter
- [ ] Multiple businesses generated (3+)
- [ ] TrajectoryPool learning validated
- [ ] Quality scores meet minimum threshold (70+)
- [ ] System runs stably for 12+ hours

### Overall Success
- [ ] All scripts tested individually
- [ ] Integration between systems verified
- [ ] Performance baselines established
- [ ] Ready for PythonAnywhere deployment
- [ ] Comprehensive error logs captured

---

## NOTES & OBSERVATIONS

### Night 1 Results
*(To be filled in after tonight's run)*

### Night 2 Results
*(To be filled in after tomorrow's run)*

### Issues Encountered
*(Document any problems here)*

### Performance Metrics
*(Record baseline performance here)*

---

**Last Updated:** November 8, 2025
**Next Update:** After Night 1 testing
**Contact:** Document issues in this file
