#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Registers a Windows Scheduled Task to run the HopX watchdog script.

.DESCRIPTION
    Creates (or replaces) the task named "Genesis HopX Watchdog" that invokes
    `python scripts/hopx_watchdog.py --max-age 3600` every five minutes.  Run with
    administrative rights if you need to schedule for another user or SYSTEM.
#>

Set-StrictMode -Version Latest

$taskName = "Genesis HopX Watchdog"
$scriptPath = Join-Path $PSScriptRoot "hopx_watchdog.py"
if (-not (Test-Path $scriptPath)) {
    throw "Unable to locate hopx_watchdog.py in $PSScriptRoot"
}

$python = (Get-Command python -ErrorAction SilentlyContinue)?.Source
if (-not $python) {
    $python = "python"
}

$arguments = "`"$scriptPath`" --max-age 3600"
$action = "`"$python`" $arguments"

Write-Host "Registering scheduled task '$taskName' -> $action"
schtasks /Delete /TN $taskName /F | Out-Null
schtasks /Create /SC MINUTE /MO 5 /TN $taskName /TR $action /F | Out-Null
Write-Host "Task registered (runs every 5 minutes)."
