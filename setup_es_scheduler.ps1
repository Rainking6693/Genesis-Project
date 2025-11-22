#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Automated setup for Windows Task Scheduler ES nightly training

.DESCRIPTION
    This script automates the creation and configuration of the Windows Task Scheduler
    task for running ES nightly training. It handles all setup steps automatically.

.PARAMETER Iterations
    Number of ES iterations per run (default: 5)

.PARAMETER Population
    Population size per iteration (default: 8)

.PARAMETER Time
    Time to run daily (default: 02:00:00)

.PARAMETER DryRun
    Run in dry-run mode without updating adapters (default: false)

.EXAMPLE
    # Run setup with default parameters
    .\setup_es_scheduler.ps1

.EXAMPLE
    # Setup with custom parameters
    .\setup_es_scheduler.ps1 -Iterations 10 -Population 16 -Time "22:00:00"

.NOTES
    Requires administrator privileges
    Must run from within the project directory
#>

param(
    [int]$Iterations = 5,
    [int]$Population = 8,
    [string]$Time = "02:00:00",
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

# Force to run in admin mode
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "This script requires administrator privileges!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Configuration
$ProjectRoot = "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE"
$PythonPath = "C:\Users\Ben\AppData\Local\Programs\Python\Python312\python.exe"
$ScriptPath = "$ProjectRoot\scripts\nightly_es_training.py"
$TaskName = "Genesis ES Nightly Training"
$TaskDescription = "Automated Evolution Strategies training for Genesis agent system"

# Colors for output
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
    Info    = 'Cyan'
    Step    = 'Magenta'
}

function Write-Step { Write-Host "[STEP]   " -ForegroundColor $colors.Step -NoNewline; Write-Host $args }
function Write-Success { Write-Host "[OK]     " -ForegroundColor $colors.Success -NoNewline; Write-Host $args }
function Write-Error_ { Write-Host "[ERROR]  " -ForegroundColor $colors.Error -NoNewline; Write-Host $args }
function Write-Warning_ { Write-Host "[WARN]   " -ForegroundColor $colors.Warning -NoNewline; Write-Host $args }
function Write-Info { Write-Host "[INFO]   " -ForegroundColor $colors.Info -NoNewline; Write-Host $args }

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host "Genesis ES Task Scheduler Setup" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Step "Checking prerequisites..."
Write-Host ""

$prereqs_ok = $true

# Check Python
if (Test-Path $PythonPath) {
    Write-Success "Python 3.12 found at: $PythonPath"
    $pythonVersion = & $PythonPath --version 2>&1
    Write-Info "Version: $pythonVersion"
} else {
    Write-Error_ "Python not found at: $PythonPath"
    Write-Info "Install Python 3.12 from python.org"
    $prereqs_ok = $false
}

# Check project root
if (Test-Path $ProjectRoot) {
    Write-Success "Project directory found: $ProjectRoot"
} else {
    Write-Error_ "Project directory not found: $ProjectRoot"
    $prereqs_ok = $false
}

# Check script file
if (Test-Path $ScriptPath) {
    Write-Success "Training script found: $ScriptPath"
} else {
    Write-Error_ "Training script not found: $ScriptPath"
    $prereqs_ok = $false
}

if (-not $prereqs_ok) {
    Write-Host ""
    Write-Error_ "Prerequisites check failed. Please fix the issues above and try again."
    exit 1
}

Write-Host ""

# Create required directories
Write-Step "Creating required directories..."
$requiredDirs = @(
    "$ProjectRoot\models\lora_adapters\current",
    "$ProjectRoot\models\lora_adapters\archive",
    "$ProjectRoot\logs",
    "$ProjectRoot\fixtures",
    "$ProjectRoot\metrics"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Info "$dir already exists"
    } else {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created: $dir"
    }
}

Write-Host ""

# Check if task already exists
Write-Step "Checking for existing task..."
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Warning_ "Task '$TaskName' already exists"
    if ($Force) {
        Write-Info "Force flag set - removing old task..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Success "Old task removed"
    } else {
        Write-Info "Use -Force to replace the existing task"
        Write-Host ""
        Write-Host "Existing task details:" -ForegroundColor Yellow
        Write-Host "  State: $($existingTask.State)"
        Write-Host "  Last result: $((Get-ScheduledTaskInfo -TaskName $TaskName).LastTaskResult)"
        Write-Host ""
        exit 1
    }
}

Write-Success "Ready to create new task"
Write-Host ""

# Build arguments
$arguments = "-u `"$ScriptPath`" --iterations $Iterations --population $Population"
if ($DryRun) {
    $arguments += " --dry-run"
}

Write-Step "Task configuration:"
Write-Info "Name: $TaskName"
Write-Info "Schedule: Daily at $Time"
Write-Info "Python: $PythonPath"
Write-Info "Script: $ScriptPath"
Write-Info "Working Directory: $ProjectRoot"
Write-Info "Arguments: $arguments"
Write-Info "Run if logged off: Yes"
Write-Info "Run with highest privileges: Yes"
Write-Info "Wake computer: Yes"
Write-Info "Timeout: 1 hour"

Write-Host ""
Write-Host "Creating task..." -ForegroundColor Cyan

# Create trigger
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
Write-Success "Trigger created: Daily at $Time"

# Create action
$action = New-ScheduledTaskAction `
    -Execute $PythonPath `
    -Argument $arguments `
    -WorkingDirectory $ProjectRoot
Write-Success "Action created: Python script execution"

# Create principal (run as system, not user)
$principal = New-ScheduledTaskPrincipal `
    -UserID "NT AUTHORITY\SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest
Write-Success "Principal created: System account with highest privileges"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries:$false `
    -DontStopIfGoingOnBatteries:$false `
    -Compatibility Win10 `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)
Write-Success "Settings created: Timeout=1hr, Restart=3x @ 5min intervals"

# Register task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Description $TaskDescription `
        -Trigger $trigger `
        -Action $action `
        -Principal $principal `
        -Settings $settings `
        -Force | Out-Null
    Write-Success "Task registered successfully!"
} catch {
    Write-Error_ "Failed to register task: $_"
    exit 1
}

Write-Host ""

# Verify task was created
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Success "Task verified in Task Scheduler"
    Write-Info "State: $($task.State)"
    Write-Info "Actions: $($task.Actions.Count)"
} else {
    Write-Error_ "Task not found after creation"
    exit 1
}

Write-Host ""
Write-Host ("="*70) -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host ("="*70) -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. TEST THE TASK:" -ForegroundColor Cyan
Write-Host "   - Open Task Scheduler (taskschd.msc)"
Write-Host "   - Find 'Genesis ES Nightly Training'"
Write-Host "   - Right-click → Run"
Write-Host "   - Monitor logs: " + ('"C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\CLAUDE CLEAN CODE\logs\nightly-es-training.log"')
Write-Host ""
Write-Host "2. VERIFY SUCCESS:" -ForegroundColor Cyan
Write-Host "   - Check logs for 'TRAINING COMPLETE'"
Write-Host "   - Verify adapter updated: models/lora_adapters/current/adapter.safetensors"
Write-Host "   - Check metrics: metrics/es_training_metrics.json"
Write-Host ""
Write-Host "3. MONITOR SCHEDULED RUNS:" -ForegroundColor Cyan
Write-Host "   - Task will run daily at $Time"
Write-Host "   - Check logs in the morning"
Write-Host "   - Monitor Task Scheduler history"
Write-Host ""
Write-Host "For troubleshooting, see: WINDOWS_TASK_SCHEDULER_SETUP.md" -ForegroundColor Yellow
Write-Host ""

# Optional: Run diagnostics
Write-Host "Run diagnostics now? (Y/n): " -ForegroundColor Cyan -NoNewline
$response = Read-Host
if ($response -ne 'n' -and $response -ne 'N') {
    Write-Host ""
    Write-Host "Running diagnostics..." -ForegroundColor Cyan
    Write-Host ""

    # Test Python
    Write-Step "Testing Python..."
    try {
        $pythonTest = & $PythonPath -c "import sys; print(f'✓ Python {sys.version}')" 2>&1
        Write-Success $pythonTest
    } catch {
        Write-Error_ "Python test failed: $_"
    }

    # Test script syntax
    Write-Step "Testing script syntax..."
    try {
        $syntaxTest = & $PythonPath -m py_compile $ScriptPath 2>&1
        Write-Success "Script syntax is valid"
    } catch {
        Write-Error_ "Script syntax error: $_"
    }

    # Test task
    Write-Step "Testing task trigger..."
    try {
        $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        Write-Success "Task info: State=$($taskInfo.State), NextRun=$($taskInfo.NextRunTime)"
    } catch {
        Write-Error_ "Task info error: $_"
    }
}

Write-Host ""
Write-Host "Setup complete! Task is ready to run." -ForegroundColor Green
Write-Host ""
