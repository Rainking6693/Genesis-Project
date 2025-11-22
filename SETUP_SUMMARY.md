# Windows Task Scheduler Setup - Summary

**Created:** November 8, 2025
**Status:** Complete - Ready for Local Testing

---

## What Was Created

Three comprehensive guides and one automated setup script for running ES nightly training on Windows:

### 1. **WINDOWS_TASK_SCHEDULER_SETUP.md** (842 lines)
**Complete reference guide with full documentation**

Contains:
- Prerequisites checklist
- 8-step visual setup guide with screenshot descriptions
- Testing procedures (4 test methods)
- Scheduled task settings reference table
- Monitoring and logging section with log examples
- 10+ troubleshooting scenarios with solutions
- Advanced configuration options
- Uninstallation instructions
- Success checklist
- Diagnostic script (PowerShell)

**Use this:** For comprehensive understanding and detailed troubleshooting

---

### 2. **WINDOWS_TASK_SCHEDULER_QUICK_REFERENCE.md**
**One-page quick reference card**

Contains:
- All critical paths (Python, script, logs, models)
- Quick 4-step setup summary
- Key settings table
- Test steps (ready-to-copy PowerShell commands)
- Arguments reference for different use cases
- Troubleshooting quick matrix
- Log viewing commands
- Task status check commands
- Performance targets
- Emergency commands
- Links to full documentation

**Use this:** For quick lookup during setup or troubleshooting

---

### 3. **setup_es_scheduler.ps1**
**Automated setup script (administrator required)**

Features:
- Fully automated task creation
- Prerequisite validation
- Directory creation
- Clear color-coded output
- Parameter customization support
- Error handling
- Task verification
- Integrated diagnostics

**Usage:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\setup_es_scheduler.ps1

# With custom parameters
.\setup_es_scheduler.ps1 -Iterations 10 -Population 16 -Time "22:00:00"

# Force replacement of existing task
.\setup_es_scheduler.ps1 -Force
```

**Use this:** For quick automated setup (5 minutes vs 30 minutes manual)

---

## Quick Start (Choose Your Path)

### Path A: Automated Setup (Recommended)
```powershell
# 1. Open PowerShell as Administrator
# 2. Navigate to project directory:
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"

# 3. Run setup script:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\setup_es_scheduler.ps1

# 4. Wait for completion (5 minutes)
# 5. Test manually: Open Task Scheduler → Right-click task → Run
# 6. Monitor logs
```

### Path B: Manual Setup (Control)
1. Follow steps in WINDOWS_TASK_SCHEDULER_SETUP.md
2. Complete all 8 steps carefully
3. Verify each step using screenshots as reference
4. Test before relying on schedule
5. Monitor logs for 2-3 days

---

## Critical Information

### Python Path (Do NOT change!)
```
C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe
```

### Script Path (Do NOT change!)
```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py
```

### Working Directory (Do NOT change!)
```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE
```

### Logs Location
```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log
```

### Models Location
```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\
```

---

## Default Schedule

| Setting | Value |
|---------|-------|
| Time | 2:00 AM daily |
| Timeout | 1 hour |
| Iterations | 5 |
| Population | 8 |
| Restart | 5-minute intervals (max 3 times on failure) |

---

## Testing Checklist

Before considering setup complete, verify:

- [ ] Task appears in Task Scheduler Library
- [ ] Task properties show correct Python path
- [ ] Task properties show correct script path
- [ ] Working directory is correct
- [ ] Manual run (Right-click → Run) succeeds
- [ ] Logs file created with recent timestamp
- [ ] Log file contains "TRAINING COMPLETE" message
- [ ] Adapter file updated: `models/lora_adapters/current/adapter.safetensors`
- [ ] Archive contains timestamped adapter: `adapter_iter_0001_*.safetensors`
- [ ] Metrics file created: `metrics/es_training_metrics.json`
- [ ] No errors in log file

---

## Key Features Documented

### 1. Automation
- Daily schedule at 2:00 AM
- Automatic wake-on-timer
- Automatic restart on failure (3 attempts)
- No manual intervention required

### 2. Safety
- 1-hour timeout (prevents hanging)
- "Stop existing instance" prevents duplicates
- Highest privileges for file access
- Graceful error handling

### 3. Monitoring
- Real-time log file
- JSON metrics output
- Task history in Task Scheduler
- Event Viewer integration

### 4. Flexibility
- Adjustable iterations (3-20)
- Adjustable population (4-32)
- Custom sigma and learning rate
- Dry-run mode for testing
- Multiple scheduled runs possible

---

## File Locations Summary

```
WINDOWS_TASK_SCHEDULER_SETUP.md
├─ Main reference guide (842 lines)
├─ Use for: Complete understanding, detailed setup, troubleshooting
└─ Time to read: 20-30 minutes

WINDOWS_TASK_SCHEDULER_QUICK_REFERENCE.md
├─ Quick reference card
├─ Use for: Quick lookup, command reference
└─ Time to read: 2-3 minutes

setup_es_scheduler.ps1
├─ Automated setup script
├─ Use for: Quick setup (5 minutes vs 30 minutes)
└─ Requires: Administrator privileges

SETUP_SUMMARY.md (this file)
├─ Overview and quick start
├─ Use for: Navigation and path reference
└─ Time to read: 5 minutes
```

All files located in:
```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\
```

---

## Next Steps After Setup

### Week 1: Local Testing
1. Run task manually each day (Right-click → Run)
2. Monitor logs for any issues
3. Verify adapters updating in `models/lora_adapters/current/`
4. Check metrics file for training progress
5. Document any issues

### Week 2: Automated Runs
1. Allow task to run on schedule (2:00 AM)
2. Check logs each morning
3. Monitor for 7 days
4. Adjust parameters if needed:
   - Increase iterations if quality not improving
   - Decrease population if timeout occurring
   - Adjust sigma for convergence speed

### Week 3: Deploy to PythonAnywhere
1. Review deployment guide (linked in main README)
2. Transfer script to PythonAnywhere
3. Configure cron instead of Task Scheduler
4. Monitor production runs

---

## Troubleshooting Overview

Most common issues and solutions:

| Issue | Quick Fix |
|-------|-----------|
| Task won't start | Check Python path, verify trigger time, test with Right-click → Run |
| Task fails (Result: 1) | Check logs: `Get-Content logs/nightly-es-training.log -Tail 50` |
| Task timeouts | Reduce --population size in task arguments |
| Computer won't wake | Enable "Wake computer to run task" in task Conditions |
| Permission denied | Check "Run with highest privileges" is enabled |
| Adapter not updating | Verify `models/lora_adapters/current/` exists and is writable |

For detailed troubleshooting, see WINDOWS_TASK_SCHEDULER_SETUP.md → Troubleshooting section

---

## Support Resources

### Documentation Hierarchy

1. **SETUP_SUMMARY.md** (this file) - Overview and quick start
2. **setup_es_scheduler.ps1** - Automated setup (recommended)
3. **WINDOWS_TASK_SCHEDULER_QUICK_REFERENCE.md** - Quick lookup
4. **WINDOWS_TASK_SCHEDULER_SETUP.md** - Complete reference

### When to Use Each

- **Just want to set it up?** → Use `setup_es_scheduler.ps1`
- **Need quick command reference?** → Use Quick Reference
- **Troubleshooting a problem?** → Use Setup Guide
- **Checking paths and settings?** → Use Quick Reference or this summary

---

## Success Indicators

You'll know the setup is working when:

1. **Morning after first night (2 AM):**
   - Check `logs/nightly-es-training.log`
   - Look for "TRAINING COMPLETE" message
   - Verify file has recent timestamp (2:XX AM)

2. **Models directory:**
   - `models/lora_adapters/current/adapter.safetensors` has recent modification time
   - `models/lora_adapters/archive/` contains dated files

3. **Metrics:**
   - `metrics/es_training_metrics.json` exists with recent timestamp
   - Contains valid JSON with fitness scores

4. **Task Scheduler:**
   - Task history shows successful runs
   - Result code is 0 (success)
   - Last run time matches 2:00 AM

---

## Version Information

| Component | Version | Status |
|-----------|---------|--------|
| Setup Guide | 1.0 | Complete |
| Quick Reference | 1.0 | Complete |
| Setup Script | 1.0 | Complete |
| Python | 3.12 | Required |
| Windows | 10/11 | Required |

---

## Contact & Support

For issues not covered in documentation:

1. Check logs for error messages
2. Run diagnostics script (in Setup Guide)
3. Review troubleshooting section
4. Check Task Scheduler event history
5. Consult PowerShell command reference in Quick Guide

---

**Last Updated:** November 8, 2025
**Status:** Complete and Ready for Use
**Estimated Setup Time:** 5-30 minutes (depending on method)
**Expected Runtime:** < 1 hour per day
