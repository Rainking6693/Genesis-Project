# Windows Task Scheduler Setup Guide for ES Nightly Training

**Version:** 1.0
**Last Updated:** November 8, 2025
**Purpose:** Run the Evolution Strategies nightly training pipeline locally on Windows using Task Scheduler

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Testing the Configuration](#testing-the-configuration)
4. [Scheduled Task Settings](#scheduled-task-settings)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)
8. [Uninstalling the Task](#uninstalling-the-task)

---

## Prerequisites

Before setting up the Windows Task Scheduler, ensure you have:

- **Windows 10/11** with Task Scheduler access
- **Python 3.12** installed on your system
- **Script Location:** `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py`
- **Python Executable Path:** `C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe`
- **Project Root Directory:** `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\`
- **Required Directories Created:**
  - `models/lora_adapters/current/` (contains current adapter)
  - `models/lora_adapters/archive/` (stores historical adapters)
  - `logs/` (for training logs)
  - `fixtures/` (for evaluation fixtures)

### Verify Python Installation

Open PowerShell and run:

```powershell
C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe --version
```

**Expected Output:** `Python 3.12.x`

If this fails, reinstall Python from python.org and ensure it's in your PATH.

---

## Step-by-Step Setup

### Step 1: Open Task Scheduler

**Method A - Using GUI:**
1. Press `Windows Key + R` to open the Run dialog
2. Type `taskschd.msc` and press Enter
3. The Task Scheduler window will open

**Method B - Using PowerShell (Admin):**
```powershell
taskschd.msc
```

### Step 2: Create New Task

In the Task Scheduler window:

1. Click on **"Task Scheduler Library"** in the left panel
2. Click **"Create Task..."** in the right panel (under "Actions")
3. A "Create Task" dialog will open

### Step 3: General Settings

In the **"General"** tab:

1. **Name:** Enter `Genesis ES Nightly Training`
2. **Description:** Enter `Automated Evolution Strategies training for Genesis agent system - Runs daily at 2:00 AM`
3. **Security Options:**
   - Check ✓ **"Run whether user is logged on or not"**
   - Check ✓ **"Run with highest privileges"**
   - **Configure for:** Select `Windows 10` (or your OS version)

**Screenshot Description:**
```
┌─ Create Task ─────────────────────────────────────────┐
│ General | Triggers | Actions | Conditions | Settings   │
├───────────────────────────────────────────────────────┤
│ Name: [Genesis ES Nightly Training________]            │
│ Description: [Automated Evolution Strategies train...]  │
│ Security Options:                                      │
│ ☑ Run whether user is logged on or not               │
│ ☑ Run with highest privileges                        │
│ Configure for: [Windows 10 ▼]                        │
└───────────────────────────────────────────────────────┘
```

### Step 4: Set Triggers (Schedule)

Click the **"Triggers"** tab:

1. Click **"New..."** button
2. A "New Trigger" dialog appears
3. **Trigger Settings:**
   - **Begin the task:** Select `On a schedule`
   - **Settings:**
     - **Daily** (radio button selected)
     - **Start:** Select today's date
     - **Recur every:** `1 day`
     - **Time:** Set to `02:00:00` (2:00 AM)

4. **Advanced Settings:**
   - Check ✓ **"Enabled"**

5. Click **"OK"** to save the trigger

**Screenshot Description:**
```
┌─ New Trigger ─────────────────────────────────────────┐
│ Begin the task: ○ On a schedule                       │
│ Settings: ○ One time ○ Daily ● ○ Weekly ○ Monthly   │
│ Daily:                                                │
│ Start: [November 8, 2025 ▼]                          │
│ Recur every: [1 ▼] day(s)                            │
│ Time: [02:00:00 ▼]                                   │
├─────────────────────────────────────────────────────┤
│ Advanced Settings:                                   │
│ ☑ Enabled                                           │
│ ☐ Repeat task every: __ minutes for a duration of __ │
│ ☐ Expire: [Never ▼]                                 │
│ ☐ Delay task for: 0 minutes                         │
│ [OK] [Cancel]                                        │
└───────────────────────────────────────────────────────┘
```

### Step 5: Configure Actions

Click the **"Actions"** tab:

1. Click **"New..."** button
2. A "New Action" dialog appears
3. **Action Settings:**
   - **Action:** Select `Start a program`
   - **Program/script:** `C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe`
   - **Add arguments:** `-u "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py" --iterations 5 --population 8`
   - **Start in:** `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE`

4. Click **"OK"** to save the action

**Screenshot Description:**
```
┌─ New Action ───────────────────────────────────────────┐
│ Action: [Start a program ▼]                            │
├────────────────────────────────────────────────────────┤
│ Program/script:                                        │
│ [C:\Users\Ben\AppData\Local\Programs\Python\...]       │
│ Add arguments (optional):                              │
│ [-u "C:\Users\Ben\OneDrive\Desktop\Ben Projects\...]   │
│ Start in (optional):                                   │
│ [C:\Users\Ben\OneDrive\Desktop\Ben Projects\...]       │
│                                                        │
│ [OK] [Cancel]                                          │
└────────────────────────────────────────────────────────┘
```

### Step 6: Configure Conditions

Click the **"Conditions"** tab:

1. **Power:**
   - Check ✓ **"Wake the computer to run this task"**
   - Uncheck ✗ **"Start the task only if the computer is on AC power"** (optional, based on your preference)

2. **Network:**
   - Uncheck ✗ **"Start only if the following network connection is available"** (if applicable)

**Screenshot Description:**
```
┌─ Conditions ──────────────────────────────────────────┐
│ Power:                                                │
│ ☑ Wake the computer to run this task                │
│ ☐ Start the task only if the computer is on AC power│
│ Network:                                              │
│ ☐ Start only if the following network connection is: │
│   [Any connection ▼]                                 │
│ Idle:                                                │
│ ☐ Start the task only if the computer has been idle│
└───────────────────────────────────────────────────────┘
```

### Step 7: Configure Settings

Click the **"Settings"** tab:

1. **If the task is already running, then the following rule applies:**
   - Select `Stop the existing instance` (prevents multiple runs)

2. **If the task does not end when requested, force it to close:**
   - Check ✓ **enabled**
   - Set timeout to `01:00:00` (1 hour - gives training time to complete)

3. **Other Settings:**
   - Check ✓ **"Allow task to be run on demand"**
   - Check ✓ **"If the task fails, restart every:"** and set to `5 minutes` (up to 3 times)
   - Check ✓ **"Stop the task if it runs longer than:"** and set to `01:00:00`

**Screenshot Description:**
```
┌─ Settings ───────────────────────────────────────────┐
│ If the task is already running:                      │
│ ○ Do not start a new instance                       │
│ ○ Run a new instance in parallel                    │
│ ● Stop the existing instance                        │
│ If the task does not end when requested:            │
│ ☑ Force it to close                                 │
│ Timeout for running tasks: [01:00:00 ▼]           │
│ [✓] Allow task to be run on demand                  │
│ [✓] If the task fails, restart every:              │
│     [5 ▼] minutes for a maximum of [3 ▼] times    │
│ [✓] Stop the task if it runs longer than:          │
│     [01:00:00 ▼]                                   │
│ [✓] If the running task does not end, do not:      │
│     [Create another instance ▼]                    │
└───────────────────────────────────────────────────────┘
```

### Step 8: Review and Create

1. Review all settings one final time
2. Click **"OK"** button to create the task
3. You may be prompted for your Windows password - enter it if requested
4. The task will be created and appear in the Task Scheduler Library

---

## Testing the Configuration

Before relying on the automated schedule, test the task manually to ensure everything works.

### Test 1: Manual Trigger from GUI

1. In Task Scheduler, find your task **"Genesis ES Nightly Training"** in the library
2. Right-click on it and select **"Run"**
3. The task should start immediately
4. Check the logs folder to verify it's running

### Test 2: Monitor the Run

1. Open the logs directory:
   ```
   C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\
   ```

2. Open `nightly-es-training.log` with a text editor (Notepad++ preferred)

3. Look for:
   ```
   STARTING EVOLUTION STRATEGIES OPTIMIZATION
   Loaded base adapter: X parameters
   Iteration 1/5
   ```

### Test 3: Check Run History

In Task Scheduler:

1. Right-click your task **"Genesis ES Nightly Training"**
2. Select **"Properties"** (or double-click)
3. Click the **"History"** tab
4. You should see the manual run with:
   - **Start Time:** Recent timestamp
   - **Status:** ✓ Task completed
   - **Result:** 0 (success) or error code if failed

**Screenshot Description:**
```
┌─ Task History ────────────────────────────────────────┐
│ Date & Time         | Task Category  | Result | Details │
├──────────────────────────────────────────────────────┤
│ 2025-11-08 15:30:42 | Genesis ES     | 0      | Task   │
│                     | Nightly Train  |        | Compl. │
│ 2025-11-07 22:15:10 | Genesis ES     | 1       | Failed │
│                     | Nightly Train  |        |        │
└──────────────────────────────────────────────────────┘
```

### Test 4: Verify Adapter Output

If the training completed successfully:

1. Navigate to:
   ```
   C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\current\
   ```

2. Look for `adapter.safetensors` with a recent modification time

3. Check the archive folder:
   ```
   C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\archive\
   ```

   Should contain files like:
   - `adapter_iter_0001_20251108_150330.safetensors`
   - `history_20251108_150330.json`

---

## Scheduled Task Settings Summary

### Task Details

| Setting | Value |
|---------|-------|
| **Name** | Genesis ES Nightly Training |
| **Description** | Automated Evolution Strategies training for Genesis agent system |
| **Schedule** | Daily at 2:00 AM |
| **Recurrence** | Every 1 day |
| **User** | Current Windows user (run whether logged in or not) |
| **Privileges** | Highest |

### Execution Parameters

| Parameter | Value |
|-----------|-------|
| **Python Executable** | `C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe` |
| **Script Path** | `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py` |
| **Working Directory** | `C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE` |
| **Arguments** | `-u "...\nightly_es_training.py" --iterations 5 --population 8` |

### Safety Settings

| Setting | Value |
|---------|-------|
| **Run even if logged off** | Yes |
| **Wake computer to run** | Yes |
| **Stop if running longer than** | 1 hour |
| **Restart on failure** | Yes (5 min interval, max 3 times) |
| **Force close if not ending** | Yes |

---

## Monitoring and Logging

### Log File Location

All training logs are written to:

```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log
```

### Log Format

Each log entry follows this format:

```
2025-11-08 02:00:15 - [NIGHTLY-ES] - INFO - STARTING EVOLUTION STRATEGIES OPTIMIZATION
2025-11-08 02:00:16 - [NIGHTLY-ES] - INFO - Loading base adapter: models/lora_adapters/current/adapter.safetensors
2025-11-08 02:00:18 - [NIGHTLY-ES] - INFO - Loaded base adapter: 1,024,000 parameters (4.1 MB)
```

### Key Log Messages to Monitor

| Message | Meaning |
|---------|---------|
| `STARTING EVOLUTION STRATEGIES OPTIMIZATION` | Training started successfully |
| `Loaded base adapter: X parameters` | Base model loaded (normal) |
| `ITERATION 1/5` | Processing iteration (normal) |
| `Variant 1/8: fitness = 0.7234` | Individual model evaluated |
| `New best fitness: 0.8456` | Found improvement |
| `Converged at iteration 3` | Training completed early (good) |
| `Best adapter saved to production` | Training succeeded |
| `TRAINING COMPLETE` | Success - task finished normally |
| `TRAINING FAILED:` | Error occurred - check error details |

### Viewing Logs in Real-Time

**Using PowerShell:**

```powershell
# Follow log file (like tail -f)
Get-Content "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log" -Tail 20 -Wait
```

**Using Notepad++:**

1. Open Notepad++
2. Click **File → Open**
3. Navigate to the logs folder
4. Open `nightly-es-training.log`
5. Enable **View → Follow Document at End** (auto-scroll as new logs appear)

### Metrics File

Training metrics are saved to:

```
C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\metrics\es_training_metrics.json
```

**Content Example:**

```json
{
  "timestamp": "2025-11-08T02:15:42.123456",
  "best_fitness": 0.8567,
  "iterations": 5,
  "total_time_seconds": 945.23,
  "population_size": 8,
  "config": {
    "population_size": 8,
    "sigma": 0.01,
    "learning_rate": 0.001,
    "top_k": 4,
    "max_iterations": 5
  },
  "adapter_path": "models/lora_adapters/current/adapter.safetensors"
}
```

---

## Troubleshooting

### Issue 1: Task Won't Start (Status: "Task has not yet run")

**Causes:**
- Scheduled time hasn't arrived yet
- Task disabled or permissions issue
- Python path incorrect

**Solutions:**

1. **Verify Task Status:**
   ```powershell
   # In PowerShell (Admin)
   Get-ScheduledTask -TaskName "Genesis ES Nightly Training" | Select-Object State
   # Should output: Running or Ready
   ```

2. **Enable the Task:**
   - Right-click the task → **Enable** (if disabled)

3. **Test Manually:**
   - Right-click the task → **Run**
   - Check logs immediately after

4. **Verify Python Path:**
   ```powershell
   Test-Path "C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe"
   # Should output: True
   ```

### Issue 2: Task Starts but Fails (Result: 1)

**Causes:**
- Python script error
- Missing dependencies
- Invalid paths
- LoRA adapter file missing

**Solutions:**

1. **Check Log File for Details:**
   ```powershell
   Get-Content "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log" -Tail 50
   ```

2. **Run Script Manually (Debug):**
   ```powershell
   cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
   C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe -u scripts/nightly_es_training.py --iterations 5 --population 8
   ```

3. **Check Dependencies:**
   ```powershell
   C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe -c "import numpy; print('numpy OK')"
   ```

4. **Verify Required Directories:**
   ```powershell
   Test-Path "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\current\adapter.safetensors"
   # Should output: True
   ```

### Issue 3: Script Runs but Training Fails

**Causes:**
- Corrupted LoRA adapter file
- Missing evaluation fixtures
- Insufficient memory
- Task timeout (>1 hour)

**Solutions:**

1. **Restore Backup Adapter:**
   ```powershell
   # Copy from archive if current is corrupted
   Copy-Item "archive/adapter_iter_0000_*.safetensors" -Destination "current/adapter.safetensors"
   ```

2. **Check Evaluation Fixtures:**
   ```powershell
   Test-Path "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\fixtures\*"
   # Should contain benchmark scenario files
   ```

3. **Increase Task Timeout:**
   - Open task in Task Scheduler
   - Click **Settings** tab
   - Increase **"Stop the task if it runs longer than:"** to 2 hours

4. **Reduce Population Size:**
   - Edit task's **Actions** tab
   - Change `--population 8` to `--population 4` (reduces evaluation time)

### Issue 4: Task Runs at Wrong Time

**Causes:**
- Trigger time not configured correctly
- System clock issue
- Daylight Saving Time conflict

**Solutions:**

1. **Check Trigger Time:**
   - Right-click task → **Properties**
   - Click **Triggers** tab
   - Verify time is set to `02:00:00`

2. **Verify System Time:**
   ```powershell
   Get-Date
   # Should match your actual time
   ```

3. **Resync Windows Clock:**
   - Right-click system clock → **Adjust date/time**
   - Click **Sync now**

### Issue 5: "Access Denied" Error

**Causes:**
- Script running without elevated privileges
- File permissions issue on log/model directories
- OneDrive sync conflict

**Solutions:**

1. **Run Task with Elevated Privileges:**
   - Open task in Task Scheduler
   - Click **General** tab
   - Check ✓ **"Run with highest privileges"**

2. **Check Directory Permissions:**
   ```powershell
   # Get current user
   whoami
   # Should show: DESKTOP-NAME\YourUsername
   ```

3. **Fix OneDrive Sync Issues:**
   - Ensure OneDrive is running
   - Check for sync conflicts in OneDrive status
   - Temporarily move project to `C:\projects` if persistent issues

### Issue 6: Computer Won't Wake from Sleep

**Causes:**
- Wake-on-LAN disabled
- Power settings blocking task wake
- USB power management interfering

**Solutions:**

1. **Enable Wake on Timer:**
   - Click **Settings** tab on task
   - Check ✓ **"Wake the computer to run this task"**

2. **Disable USB Selective Suspend:**
   ```powershell
   # In Device Manager:
   # 1. Device Manager → Universal Serial Bus controllers
   # 2. Right-click USB hub → Properties
   # 3. Power Management → Uncheck "Allow computer to turn off this device"
   ```

3. **Check Power Plan:**
   - **Settings → Power & sleep → Additional power settings**
   - Ensure **"Allow wake timers"** is enabled

---

## Advanced Configuration

### Adjusting Training Parameters

To change training settings, edit the task's action arguments:

1. Open Task Scheduler
2. Right-click **"Genesis ES Nightly Training"** → **Properties**
3. Click **Actions** tab
4. Click **"Start a program"** entry → **Edit**
5. Modify the arguments:

```powershell
# Current (default)
-u "...\nightly_es_training.py" --iterations 5 --population 8

# More intensive (longer runtime, better results)
-u "...\nightly_es_training.py" --iterations 10 --population 16

# Faster (less intensive)
-u "...\nightly_es_training.py" --iterations 3 --population 4

# Custom sigma (perturbation size)
-u "...\nightly_es_training.py" --iterations 5 --population 8 --sigma 0.02

# Custom learning rate
-u "...\nightly_es_training.py" --iterations 5 --population 8 --learning-rate 0.0005
```

### Parameter Reference

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `--iterations` | 5 | 1-20 | Number of ES iterations (higher = better quality, longer runtime) |
| `--population` | 8 | 4-32 | Variants evaluated per iteration (higher = better diversity, longer runtime) |
| `--sigma` | 0.01 | 0.001-0.1 | Perturbation magnitude (higher = more exploration, less fine-tuning) |
| `--learning-rate` | 0.001 | 0.0001-0.01 | Update step size (higher = faster convergence, more unstable) |

### Scheduling Multiple Training Runs

To run training at different times of day:

1. Create new task **"Genesis ES Evening Training"**
2. Set trigger to `22:00:00` (10 PM)
3. Use different parameters:
   ```
   -u "...\nightly_es_training.py" --iterations 3 --population 4
   ```

### Dry-Run Mode (No Updates)

To test without updating the production adapter:

1. Edit task's action arguments
2. Add `--dry-run` flag:
   ```
   -u "...\nightly_es_training.py" --iterations 5 --population 8 --dry-run
   ```

### Custom Fixtures Directory

If you have fixtures in a different location:

1. Edit task's action arguments
2. Add `--fixtures-dir` parameter:
   ```
   -u "...\nightly_es_training.py" --iterations 5 --fixtures-dir "D:\fixtures"
   ```

---

## Uninstalling the Task

To remove the scheduled task:

### Method 1: Using GUI

1. Open Task Scheduler
2. Right-click **"Genesis ES Nightly Training"** in the library
3. Click **"Delete"**
4. Click **"Yes"** to confirm

### Method 2: Using PowerShell (Admin)

```powershell
Unregister-ScheduledTask -TaskName "Genesis ES Nightly Training" -Confirm:$false
```

### Method 3: Using Command Prompt (Admin)

```cmd
schtasks /delete /tn "Genesis ES Nightly Training" /f
```

---

## Success Checklist

Before considering the setup complete:

- [ ] Task created in Task Scheduler
- [ ] Task runs manually without errors (test with **Run**)
- [ ] Log file created with successful entries
- [ ] Adapter updated in `models/lora_adapters/current/`
- [ ] Archive contains timestamped adapters
- [ ] Metrics file created in `metrics/` folder
- [ ] Task scheduled to run at 2:00 AM daily
- [ ] Wake-on-timer enabled in task settings
- [ ] Timeout set to 1 hour
- [ ] Restart-on-failure configured (5 min, 3 times)

---

## Next Steps

### Phase 2: Deploy to PythonAnywhere

Once local testing is confirmed successful:

1. Review `DEEP_RESEARCH_ANALYSIS.md` for PythonAnywhere setup
2. Transfer script to PythonAnywhere server
3. Configure cron job instead of Task Scheduler
4. Monitor production runs for 7 days
5. Adjust parameters based on production performance

### Phase 3: Integration with Deployment Pipeline

1. Integrate ES training metrics into monitoring dashboard
2. Add alerts for training failures
3. Create rollback procedure if fitness degrades
4. Document production runbook

---

## Support & Debugging

### Quick Diagnostics Script

Save this as `diagnose_task.ps1` and run it:

```powershell
Write-Host "Genesis ES Task Scheduler Diagnostics`n" -ForegroundColor Green

# Check Python
Write-Host "1. Python Installation:" -ForegroundColor Cyan
if (Test-Path "C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe") {
    Write-Host "   ✓ Python found" -ForegroundColor Green
    & "C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe" --version
} else {
    Write-Host "   ✗ Python not found" -ForegroundColor Red
}

# Check Script
Write-Host "`n2. Training Script:" -ForegroundColor Cyan
$scriptPath = "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\scripts\nightly_es_training.py"
if (Test-Path $scriptPath) {
    Write-Host "   ✓ Script found" -ForegroundColor Green
} else {
    Write-Host "   ✗ Script not found" -ForegroundColor Red
}

# Check Directories
Write-Host "`n3. Required Directories:" -ForegroundColor Cyan
$dirs = @(
    "models/lora_adapters/current",
    "models/lora_adapters/archive",
    "logs",
    "fixtures"
)
foreach ($dir in $dirs) {
    $fullPath = "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\$dir"
    if (Test-Path $fullPath) {
        Write-Host "   ✓ $dir exists" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $dir missing - creating..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "   ✓ Created" -ForegroundColor Green
    }
}

# Check Adapter File
Write-Host "`n4. Adapter File:" -ForegroundColor Cyan
$adapterPath = "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\models\lora_adapters\current\adapter.safetensors"
if (Test-Path $adapterPath) {
    $size = (Get-Item $adapterPath).Length / 1MB
    Write-Host "   ✓ Found ($($size)MB)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Adapter file not found - you'll need to create a baseline" -ForegroundColor Yellow
}

# Check Task Scheduler
Write-Host "`n5. Task Scheduler:" -ForegroundColor Cyan
try {
    $task = Get-ScheduledTask -TaskName "Genesis ES Nightly Training" -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "   ✓ Task found (State: $($task.State))" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Task not found - run setup steps" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Error checking task: $_" -ForegroundColor Red
}

# Check Recent Logs
Write-Host "`n6. Recent Logs:" -ForegroundColor Cyan
$logPath = "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log"
if (Test-Path $logPath) {
    Write-Host "   ✓ Log file exists" -ForegroundColor Green
    Write-Host "   Last 5 lines:" -ForegroundColor Cyan
    Get-Content $logPath -Tail 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "   ℹ No logs yet (task hasn't run)" -ForegroundColor Yellow
}

Write-Host "`n✓ Diagnostics complete" -ForegroundColor Green
```

### Getting Help

If issues persist:

1. **Check Windows Event Viewer:**
   - **Event Viewer → Windows Logs → System**
   - Look for entries from **TaskScheduler**

2. **Run Script with Verbose Output:**
   ```powershell
   cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
   C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe -u scripts/nightly_es_training.py --iterations 1 --population 4 -vv
   ```

3. **Check Task History in Detail:**
   - Right-click task → **View History**
   - Double-click the failed entry for detailed error message

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 8, 2025 | Initial comprehensive guide with full setup, testing, monitoring, and troubleshooting |

---

**Last Updated:** November 8, 2025
**Maintained By:** Claude Code
**Status:** Production-Ready
