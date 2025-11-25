# Genesis Dashboard Progress (Windows)

## What I did
- Read and followed `Genesis Dashboard - Windows.md` instructions applicable without elevation.
- Created required directories: `C:\Genesis\dashboard\static` and `C:\Genesis\infrastructure`.
- Added event emitter module: `C:\Genesis\infrastructure\event_emitter.py`.
- Added FastAPI backend: `C:\Genesis\dashboard\api.py`.
- Added frontend HTML: `C:\Genesis\dashboard\static\index.html`.
- Installed Python deps: `fastapi`, `uvicorn`, `requests` (user install; scripts in `C:\Users\Administrator\AppData\Roaming\Python\Python312\Scripts`).
- Smoke-tested API: `http://localhost:8001/health` returned `{"status":"healthy",...}` when running `python api.py`.
- Exercised event ingestion: started API, sent test events via emitter (using `sys.path.insert(0, 'C:\\Genesis\\infrastructure'); import event_emitter`); confirmed stored in `C:\Genesis\dashboard\genesis_events.db` via `/events/recent`.

## What’s left (needs elevated PowerShell / admin)
1) Install IIS + URL Rewrite + ARR:
```
New-Item -Path C:\Downloads -ItemType Directory -Force
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile "C:\Downloads\urlrewrite.msi"
Invoke-WebRequest -Uri "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi" -OutFile "C:\Downloads\arr.msi"
Start-Process msiexec.exe -ArgumentList '/i C:\Downloads\urlrewrite.msi /quiet' -Wait
Start-Process msiexec.exe -ArgumentList '/i C:\Downloads\arr.msi /quiet' -Wait
```

2) Enable ARR proxy and create IIS site/rewrite rule:
```
Import-Module WebAdministration
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
Remove-WebSite -Name "Default Web Site" -ErrorAction SilentlyContinue
New-WebSite -Name "GenesisDashboard" -Port 80 -PhysicalPath "C:\Genesis\dashboard\static" -ApplicationPool "DefaultAppPool"
$ruleName="ReverseProxyToAPI"; $siteName="GenesisDashboard"
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules" -Name "." -Value @{name=$ruleName;stopProcessing='True'}
Set-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules/rule[@name='$ruleName']/match" -Name "url" -Value "^api/(.*)"
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules/rule[@name='$ruleName']/action" -Name "." -Value @{type='Rewrite';url='http://localhost:8001/{R:1}'}
```

3) Firewall rules:
```
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "Dashboard API" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -RemoteAddress LocalSubnet
```

4) NSSM service for API (after copying nssm.exe to System32):
```
Copy-Item "C:\Downloads\nssm\nssm-2.24\win64\nssm.exe" -Destination "C:\Windows\System32\" -Force
nssm install GenesisDashboardAPI python "C:\Genesis\dashboard\api.py"
nssm set GenesisDashboardAPI AppDirectory "C:\Genesis\dashboard"
nssm set GenesisDashboardAPI DisplayName "Genesis Dashboard API"
nssm set GenesisDashboardAPI Description "Genesis Mission Control Dashboard API"
nssm set GenesisDashboardAPI Start SERVICE_AUTO_START
Start-Service GenesisDashboardAPI
```

5) DNS: set A records for `taxtok.org` and `www` to `135.181.100.213` at the registrar.

6) Post-setup validation:
- `Invoke-WebRequest http://localhost/api/health`
- `Invoke-WebRequest http://localhost/ | Select-Object StatusCode`
- Send a test event while service runs:
```
python -c "import sys; sys.path.insert(0,'C:\\\\Genesis\\\\infrastructure'); import event_emitter; event_emitter.GenesisEventEmitter('http://localhost:8001').emit('test_event', {'test':'data'}, message='Dashboard test successful')"
```
- Confirm events: `Invoke-WebRequest http://localhost:8001/events/recent?limit=5 | Select-Object -ExpandProperty Content`

## Notes
- IIS and NSSM steps failed earlier due to UAC/admin; rerun commands above in an elevated PowerShell.
- If `uvicorn.exe`/`fastapi.exe` not found in PATH, add `C:\Users\Administrator\AppData\Roaming\Python\Python312\Scripts` to PATH or call via `python -m uvicorn`.
