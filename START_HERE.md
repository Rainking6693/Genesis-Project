# 🚀 GENESIS LOCAL TESTING - START HERE

**Status:** READY TO RUN
**Setup Date:** November 8, 2025
**Testing Duration:** 24-48 hours (Tonight + Tomorrow)
**Purpose:** Validate all systems before PythonAnywhere deployment

---

## 🎯 ONE-CLICK START (Easiest)

### For Tonight (Night 1)
```
1. Double-click: QUICK_START_TESTING.bat
   → Opens monitoring dashboard in your browser

2. Double-click: RUN_NIGHT1_TESTS.bat
   → Runs all tests automatically (~15 minutes)
   → Creates logs and metrics
   → Shows progress in real-time

3. Check dashboard for results
   → Refreshes automatically every 30 seconds
```

### For Tomorrow (Night 2)
```
1. Double-click: RUN_NIGHT2_TESTS.bat
   → Runs production tests (~30-60 minutes)
   → Creates production models
   → Generates multiple businesses

2. Review results in morning
   → Check logs for overnight stability
```

---

## 📋 WHAT'S INCLUDED

### Files Created (All Ready to Use)
```
✅ LOCAL_TESTING_STATUS.md          # Detailed status tracking
✅ README_LOCAL_TESTING.md          # Complete setup guide
✅ local_monitor.html               # Browser monitoring dashboard
✅ QUICK_START_TESTING.bat          # One-click launcher
✅ RUN_NIGHT1_TESTS.bat            # Automated Night 1 tests
✅ RUN_NIGHT2_TESTS.bat            # Automated Night 2 tests
✅ START_HERE.md                   # This file
```

### Scripts to Test
```
✅ scripts/nightly_es_training.py         # ES training pipeline
✅ scripts/autonomous_fully_integrated.py # Business generation
✅ scripts/start_monitoring.py            # Streamlit dashboard
✅ setup_es_scheduler.ps1                # Task scheduler setup
```

---

## 🌙 TONIGHT'S PLAN (Night 1)

### Goal: Verify Everything Works
**Total Time:** ~15 minutes

1. **ES Training Test (1 minute)**
   - Tests: Evolution Strategies training pipeline
   - Mode: Dry-run (no model updates)
   - Result: Creates log file

2. **Business Generation Test (10 minutes)**
   - Tests: Full autonomous business creation
   - Creates: 1 complete business with ALL 53 systems
   - Result: Business in businesses/fully_integrated/

3. **Verification (5 minutes)**
   - Check: All logs created
   - Check: No errors or crashes
   - Check: Files in correct locations

### Success Indicators
- ✅ "TRAINING COMPLETE" in logs/nightly-es-training.log
- ✅ "Business #1 Complete" in logs/genesis_agent.log
- ✅ Business directory created with files
- ✅ No exceptions or error tracebacks

---

## 🌙 TOMORROW'S PLAN (Night 2)

### Goal: Production Workload Testing
**Total Time:** ~30-60 minutes + overnight monitoring

1. **Production ES Training (10 minutes)**
   - Tests: Real model updates
   - Creates: Production LoRA adapter
   - Result: models/lora_adapters/current/adapter.safetensors

2. **Multi-Business Generation (30 minutes)**
   - Tests: Multiple businesses + learning
   - Creates: 3 businesses
   - Result: TrajectoryPool accumulates knowledge

3. **Overnight Monitoring (12+ hours)**
   - Tests: System stability
   - Monitors: For crashes or errors
   - Result: Continuous operation validated

---

## 🖥️ MONITORING OPTIONS

### Option 1: HTML Dashboard (Simple)
```batch
# Open in browser
QUICK_START_TESTING.bat

# OR
start local_monitor.html
```
- Auto-refreshes every 30 seconds
- Shows system status
- No installation needed

### Option 2: Streamlit Dashboard (Advanced)
```bash
python scripts\start_monitoring.py
```
- Opens on http://localhost:8501
- Real-time metrics
- Interactive controls

### Option 3: Live Logs (Technical)
```powershell
# Watch ES training logs
Get-Content logs\nightly-es-training.log -Wait -Tail 20

# Watch business generation logs
Get-Content logs\genesis_agent.log -Wait -Tail 20
```

---

## ✅ QUICK CHECKLIST

### Before Starting
- [ ] Python 3.12.4 installed (`python --version`)
- [ ] In correct directory (CLAUDE CLEAN CODE folder)
- [ ] .env file exists with API keys
- [ ] Internet connection active (for Vertex AI)

### Night 1 Tests
- [ ] ES training completes without errors
- [ ] Single business generated successfully
- [ ] All log files created
- [ ] Dashboard shows green signals
- [ ] No crash errors

### Night 2 Tests
- [ ] Production adapter created
- [ ] 3+ businesses generated
- [ ] System runs 12+ hours without crashes
- [ ] Quality scores ≥70/100
- [ ] Ready for deployment

---

## 🚨 IF SOMETHING GOES WRONG

### Common Issues & Quick Fixes

**"ModuleNotFoundError"**
```bash
pip install -r requirements.txt
```

**"Permission denied"**
```bash
# Run as Administrator
# Or check file/folder permissions
```

**"API key error"**
```bash
# Verify .env file exists
dir .env

# Check it has required keys (don't print values)
type .env | findstr GOOGLE
```

**ES Training fails**
```bash
# Check Python version
python --version

# Create missing directories
mkdir logs metrics models\lora_adapters\current models\lora_adapters\archive fixtures
```

**Business generation fails**
```bash
# Check logs for specific error
type logs\genesis_agent.log | findstr ERROR

# Verify infrastructure loads
python -c "from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('OK')"
```

### Get Detailed Help
```
1. Check logs/ directory for error messages
2. Review README_LOCAL_TESTING.md troubleshooting section
3. Update LOCAL_TESTING_STATUS.md with findings
```

---

## 📁 WHERE TO FIND RESULTS

### Logs (Real-time Status)
```
logs/
├── nightly-es-training.log    # ES training output
├── genesis_agent.log          # Business generation
└── infrastructure.log         # Component status
```

### Metrics (Performance Data)
```
metrics/
└── es_training_metrics.json  # Training statistics
```

### Generated Files
```
models/lora_adapters/current/adapter.safetensors  # Production model

businesses/fully_integrated/
└── [business_type]/[name]/   # Generated businesses
    ├── README.md
    ├── requirements.txt
    └── src/
```

---

## 🎓 WHAT GETS TESTED

### All 53 Genesis Systems
```
Layer 1 (Orchestration):
  ✓ HTDAG - Task decomposition
  ✓ HALO - Agent routing
  ✓ AOP - Plan validation
  ✓ DAAO - Cost optimization

Layer 2 (Evolution):
  ✓ SE-Darwin - Self-improvement
  ✓ TrajectoryPool - Learning memory
  ✓ SICA - Complexity detection

Layer 3 (Communication):
  ✓ A2A - Agent-to-agent protocol
  ✓ OpenEnv - External tools

Layer 5 (Swarm):
  ✓ Inclusive Fitness - Team optimization

Layer 6 (Memory):
  ✓ Memento - Long-term memory
  ✓ CaseBank - Case-based reasoning
  ✓ TEI - Embeddings
  ✓ Memory×Router - Hybrid retrieval

Advanced Features:
  ✓ WaltzRL - Safety alignment
  ✓ SGLang - Model routing
  ✓ vLLM - Token caching
  ✓ HGM - Quality judging
```

---

## 📊 EXPECTED PERFORMANCE

### ES Training (Night 1)
```
Duration:     ~60 seconds
Iterations:   1
Population:   4
Mode:         Dry-run
Output:       Log file only
```

### Business Generation (Night 1)
```
Duration:     ~5-10 minutes
Count:        1 business
Quality:      ≥70/100
Components:   5-10 files
Systems:      All 53 active
```

### Production Training (Night 2)
```
Duration:     ~5-10 minutes
Iterations:   3
Population:   6
Mode:         Production
Output:       Production adapter + metrics
```

### Multi-Business (Night 2)
```
Duration:     ~15-30 minutes
Count:        3 businesses
Quality:      ≥75/100
Learning:     TrajectoryPool grows
```

---

## 🎯 SUCCESS METRICS

### Technical Success
- [ ] All tests pass without errors
- [ ] Logs show expected completion messages
- [ ] Files created in correct locations
- [ ] No exceptions or crashes
- [ ] System runs stably overnight

### Quality Success
- [ ] Business quality scores ≥70/100
- [ ] Generated code is valid Python
- [ ] README files are complete
- [ ] Metrics show improvement over time

### Deployment Ready
- [ ] All systems integrate correctly
- [ ] Performance baselines established
- [ ] Windows-specific issues documented
- [ ] Ready for PythonAnywhere migration

---

## 🚀 NEXT STEPS AFTER TESTING

### If All Tests Pass ✅

1. **Enable Task Scheduler**
   ```powershell
   # Run PowerShell as Administrator
   .\setup_es_scheduler.ps1
   ```

2. **Document Results**
   - Update LOCAL_TESTING_STATUS.md
   - Record performance baselines
   - Note any issues encountered

3. **Prepare for Deployment**
   - Review PythonAnywhere requirements
   - Plan migration timeline
   - Update deployment documentation

### If Tests Fail ❌

1. **Capture Context**
   - Full error messages
   - Complete log files
   - System configuration

2. **Debug & Fix**
   - One issue at a time
   - Test after each fix
   - Document solutions

3. **Re-test**
   - Start from beginning
   - Verify fix worked
   - Continue testing

---

## 📞 NEED HELP?

### Documentation
```
README_LOCAL_TESTING.md      # Comprehensive guide
LOCAL_TESTING_STATUS.md      # Detailed status tracking
logs/                        # All execution logs
```

### Quick Reference
```
QUICK_START_TESTING.bat     # Open dashboard
RUN_NIGHT1_TESTS.bat       # Run all Night 1 tests
RUN_NIGHT2_TESTS.bat       # Run all Night 2 tests
local_monitor.html         # Browser monitoring
```

---

## ⏰ TIME ESTIMATE

```
Setup & Review:           5 minutes
Night 1 Testing:         15 minutes
Night 1 Verification:    10 minutes
------------------------------------
Night 1 Total:           30 minutes

Night 2 Testing:         60 minutes
Overnight Monitoring:    12 hours
Morning Verification:    15 minutes
Documentation:           15 minutes
------------------------------------
Night 2 Total:           ~14 hours

Total Testing Time:      ~14.5 hours
(Most is automated overnight)
```

---

## ✨ YOU'RE READY!

Everything is set up and ready to go. Just follow the "ONE-CLICK START" instructions at the top.

**Good luck with testing!** 🚀

---

**Last Updated:** November 8, 2025
**Version:** 1.0 - Initial Setup
**Status:** READY TO START
