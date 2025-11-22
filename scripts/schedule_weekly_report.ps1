# Schedules the Genesis weekly Discord KPI report for 9:00 AM every Monday.
# Usage:
#   pwsh -File scripts/schedule_weekly_report.ps1 `
#       -PythonPath "C:\Path\to\python.exe" `
#       -ProjectRoot "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis"
param(
    [string]$PythonPath = "",
    [string]$ProjectRoot = "",
    [string]$TaskName = "GenesisWeeklyDiscordReport"
)

if (-not $PythonPath) {
    $PythonPath = if ($env:PYTHON) { $env:PYTHON } else { "python" }
}
if (-not $ProjectRoot) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

$scriptPath = Join-Path $ProjectRoot "scripts\daily_discord_report.py"
if (-not (Test-Path $scriptPath)) {
    throw "Cannot find daily_discord_report.py at $scriptPath"
}

$arguments = "`"$scriptPath`" --weekly"
$action = New-ScheduledTaskAction -Execute $PythonPath -Argument $arguments -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable

Write-Host "Registering scheduled task '$TaskName' to run $scriptPath every Monday at 9:00 AM..."
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Sends Genesis weekly Discord KPI report"
Write-Host "✅ Scheduled task registered. Use 'Unregister-ScheduledTask -TaskName $TaskName' to remove."

