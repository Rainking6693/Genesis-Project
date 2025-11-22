# Windows Task Scheduler - Quick Reference Card

## Critical Paths

```
Python:     C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe
Script:     C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py
Working:    C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE
Logs:       C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log
Models:     C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\
```

## Quick Setup

1. Open Task Scheduler: `taskschd.msc`
2. Create Task → "Genesis ES Nightly Training"
3. Triggers tab → New → Daily at 02:00:00
4. Actions tab → Start program:
   - Program: `C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe`
   - Arguments: `-u "...\scripts\nightly_es_training.py" --iterations 5 --population 8`
   - Start in: `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE`
5. General tab → Check "Run whether user is logged on or not" + "Run with highest privileges"
6. Settings tab → Stop after 1 hour
7. Conditions tab → Check "Wake computer to run task"
8. Create!

## Key Settings

| Item | Value |
|------|-------|
| Schedule | Daily at 2:00 AM |
| Recurrence | Every 1 day |
| Timeout | 1 hour (01:00:00) |
| Restart | 5 min intervals, max 3 times |
| Run if logged off | Yes |
| Wake computer | Yes |
| Highest privileges | Yes |

## Test Steps (Do This First!)

```powershell
# 1. Verify Python works
C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe --version

# 2. Navigate to project
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"

# 3. Run script manually (dry-run mode)
C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe -u scripts/nightly_es_training.py --iterations 1 --population 4 --dry-run

# 4. Check logs
Get-Content logs/nightly-es-training.log -Tail 20

# 5. Run task from Task Scheduler GUI (Right-click → Run)

# 6. Verify logs show success
Get-Content logs/nightly-es-training.log -Tail 5
```

## Arguments Reference

```
Default:        --iterations 5 --population 8
Fast:           --iterations 3 --population 4
Intensive:      --iterations 10 --population 16
Dry-run:        --iterations 1 --population 4 --dry-run
Custom sigma:   --iterations 5 --population 8 --sigma 0.02
Custom rate:    --iterations 5 --population 8 --learning-rate 0.0005
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Task won't start | Check Python path exists, verify trigger time, test manually with Right-click → Run |
| Task fails (Result: 1) | Check logs: `Get-Content logs/nightly-es-training.log -Tail 50` |
| Wrong Python path | Use `where python` to find correct path |
| Access denied | Check "Run with highest privileges" is enabled |
| Task timeout | Increase timeout in Settings tab or reduce --population size |
| Computer won't wake | Enable "Wake computer to run task" in Conditions tab |
| Missing adapter | Create baseline at `models/lora_adapters/current/adapter.safetensors` |

## View Logs

```powershell
# Last 20 lines
Get-Content "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log" -Tail 20

# Follow in real-time (like tail -f)
Get-Content "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log" -Tail 20 -Wait

# Search for errors
Select-String "FAILED|ERROR" "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log"
```

## Check Task Status

```powershell
# Get task details
Get-ScheduledTask -TaskName "Genesis ES Nightly Training" | Select-Object State, LastTaskResult

# View all runs
Get-ScheduledTaskInfo -TaskName "Genesis ES Nightly Training"

# Delete task (if needed)
Unregister-ScheduledTask -TaskName "Genesis ES Nightly Training" -Confirm:$false
```

## Success Indicators

- [ ] Task appears in Task Scheduler Library
- [ ] Manual run (Right-click → Run) succeeds
- [ ] Log file contains "TRAINING COMPLETE"
- [ ] Adapter updated in `models/lora_adapters/current/adapter.safetensors`
- [ ] Archive contains timestamped adapters
- [ ] Metrics file created: `metrics/es_training_metrics.json`

## Log Messages to Expect

```
STARTING EVOLUTION STRATEGIES OPTIMIZATION        ← Task started
Loaded base adapter: 1,024,000 parameters         ← Model loaded
ITERATION 1/5                                     ← Processing
Variant 1/8: fitness = 0.7234                     ← Evaluation done
New best fitness: 0.8456                          ← Improvement found
Best adapter saved to production                  ← Model updated
TRAINING COMPLETE                                 ← Success!
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Single iteration | < 10 minutes | With --population 8 |
| Full run (5 iterations) | < 60 minutes | Default settings |
| Task startup overhead | < 2 seconds | Python launch + import |
| Log file size | < 50 MB per month | Depends on verbosity |
| Adapter file size | 4-10 MB | Binary safetensors format |

## Emergency Commands

```powershell
# Kill stuck task
Stop-ScheduledTask -TaskName "Genesis ES Nightly Training"

# Re-enable after manual stop
Enable-ScheduledTask -TaskName "Genesis ES Nightly Training"

# Run immediately (bypass schedule)
Start-ScheduledTask -TaskName "Genesis ES Nightly Training"

# Clear old logs
Remove-Item "logs/nightly-es-training.log" -Force

# Reset to defaults
Unregister-ScheduledTask -TaskName "Genesis ES Nightly Training" -Confirm:$false
# Then recreate following setup steps
```

## Full Documentation

See: `WINDOWS_TASK_SCHEDULER_SETUP.md` for complete guide with:
- Step-by-step setup with screenshots
- Detailed testing procedures
- Advanced configuration options
- Comprehensive troubleshooting
- Integration with PythonAnywhere deployment

---

**Version:** 1.0
**Last Updated:** November 8, 2025
**Keep this handy for quick reference!**
