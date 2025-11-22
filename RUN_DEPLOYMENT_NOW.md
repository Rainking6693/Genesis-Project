# Run VPS Deployment NOW - Step-by-Step

**Total Time**: 25-30 minutes
**Your Role**: Run commands and verify each step

---

## ⚡ AUTOMATED DEPLOYMENT (Recommended)

### Step 1: Run Automated Deployment Script (15 min)

**On your LOCAL PC**, open PowerShell as Administrator:

```powershell
cd C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis
.\DEPLOY_NOW_AUTOMATED.ps1
```

**What it does:**
1. ✓ Copies all files to VPS (your local files stay safe)
2. ✓ Creates `.env` with MongoDB and Redis configured
3. ✓ Merges your API keys
4. ✓ Configures Windows Firewall
5. ✓ Creates required directories

**Type "YES" when prompted to confirm deployment**

**Wait for**: "✓ DEPLOYMENT COMPLETE!" message

---

### Step 2: Connect to VPS (2 min)

Open **Remote Desktop Connection**:
1. Press `Windows + R`
2. Type: `mstsc.exe`
3. Computer: `154.12.244.112`
4. Username: `Administrator`
5. Password: `Chartres6693`
6. Click **Connect**

---

### Step 3: Install Python & Node.js on VPS (5 min)

**If not already installed**, on the VPS:

#### Install Python 3.12.4:
1. Download: https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe
2. Run installer
3. **CHECK** "Add Python to PATH"
4. Click "Install Now"
5. Verify: Open PowerShell, type `python --version`

#### Install Node.js 20.x:
1. Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
2. Run installer with default settings
3. Verify: `node --version` and `npm --version`

---

### Step 4: Run Setup Script on VPS (8 min)

**On the VPS**, PowerShell as Administrator:

```powershell
cd C:\Genesis
.\DEPLOY_VPS_SETUP.ps1
```

**What it does:**
- ✓ Installs Python packages (5-7 minutes)
- ✓ Installs Node modules for Dashboard (2-3 minutes)
- ✓ Builds Dashboard
- ✓ Verifies firewall configuration

**Wait for**: "✓ VPS Setup Complete" message

---

### Step 5: Start Services on VPS (2 min)

**On the VPS**, open **3 separate PowerShell windows**:

#### Window 1: A2A Service
```powershell
cd C:\Genesis
.\START_A2A_SERVICE.bat
```
**Wait for**: "Application startup complete"

#### Window 2: Dashboard API
```powershell
cd C:\Genesis
.\START_DASHBOARD_API.bat
```
**Wait for**: "Dashboard API running on port 5001"

#### Window 3: Dashboard UI
```powershell
cd C:\Genesis
.\START_DASHBOARD_UI.bat
```
**Wait for**: "Server running on http://localhost:3000"

---

### Step 6: Verify Deployment (2 min)

**From your LOCAL PC browser**, test these URLs:

1. **A2A API Health**: http://154.12.244.112:8000/health
   - ✓ Should show: `{"status":"healthy"}`

2. **A2A API Docs**: http://154.12.244.112:8000/docs
   - ✓ Should show: Interactive Swagger documentation

3. **List All Agents**: http://154.12.244.112:8000/agents
   - ✓ Should show: JSON list of 26 agents

4. **Dashboard API**: http://154.12.244.112:5001/health
   - ✓ Should show: `{"status":"ok"}`

5. **Dashboard UI**: http://154.12.244.112:3000
   - ✓ Should show: Genesis dashboard with metrics

---

## ✅ SUCCESS CHECKLIST

After deployment, verify:

- [ ] A2A Service running (port 8000)
- [ ] Dashboard API running (port 5001)
- [ ] Dashboard UI running (port 3000)
- [ ] Can access http://154.12.244.112:8000/health
- [ ] Can access http://154.12.244.112:3000
- [ ] MongoDB connection works
- [ ] Redis connection works

**Test MongoDB & Redis (on VPS)**:
```powershell
# Test MongoDB
python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').admin.command('ping'))"

# Test Redis
python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.ping())"
```

Both should return success (MongoDB: `{'ok': 1.0}`, Redis: `True`)

---

## 🎯 For Claude Code on VPS

**Point Claude Code to this document**: `C:\Genesis\CLAUDE_VPS.md`

This document contains:
- VPS-specific commands
- Database connection details
- Service management
- Troubleshooting guides
- Production safety notes

**How to use it:**
1. On the VPS, open Claude Code in PowerShell
2. Set working directory: `cd C:\Genesis`
3. Claude Code will automatically read `CLAUDE_VPS.md` (or point it manually)

---

## 🔧 Common Issues & Fixes

### Issue: Port Already in Use
```powershell
# Find what's using the port
Get-NetTCPConnection -LocalPort 8000

# Kill the process if needed
Stop-Process -Id <PID> -Force
```

### Issue: Module Not Found
```powershell
# Reinstall requirements
cd C:\Genesis
pip install -r requirements.txt --force-reinstall
```

### Issue: Service Crashes Immediately
```powershell
# Check logs
Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50

# Look for ERROR messages
Get-Content C:\Genesis\logs\genesis_agent.log | Select-String "ERROR"
```

### Issue: Dashboard Shows No Data
```powershell
# Verify events file exists
Test-Path C:\Genesis\logs\business_generation\events.jsonl

# If missing, create it
New-Item -ItemType File -Path C:\Genesis\logs\business_generation\events.jsonl -Force
```

---

## 📊 What You'll See

### A2A Service (Port 8000)
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Dashboard API (Port 5001)
```
INFO:     Started server process [23456]
INFO:     Waiting for application startup.
Dashboard API running on port 5001
INFO:     Application startup complete.
```

### Dashboard UI (Port 3000)
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🚀 Next Steps After Deployment

### Test Business Generation
```powershell
cd C:\Genesis
python scripts\autonomous_fully_integrated.py --count 1
```

### Enable 24/7 Autonomous Operation
```powershell
python scripts\autonomous_business_orchestrator.py --continuous
```

### Setup Auto-Start Services (Optional)
See: `C:\Genesis\DEPLOY_TO_CONTABO_VPS.md` Part 5

---

## 📝 Important Notes

1. **Keep PowerShell windows open** - closing them stops the services
2. **Local files are safe** - deployment only copies, doesn't move
3. **VPS is production** - full security and monitoring enabled
4. **Cloud databases** - MongoDB Atlas and Redis Cloud (no local DB needed)

---

## 🆘 Need Help?

**If automated deployment fails**, use manual method:
1. Follow: `VPS_QUICK_START.md`
2. Or see: `DEPLOY_TO_CONTABO_VPS.md` for full manual steps

**If services fail to start**:
1. Check logs: `C:\Genesis\logs\genesis_agent.log`
2. Verify Python/Node installed: `python --version`, `node --version`
3. Test database connections (commands above)
4. Check firewall: `Get-NetFirewallRule -DisplayName "Genesis*"`

**For Claude Code on VPS**:
- Working directory: `C:\Genesis`
- Documentation: `CLAUDE_VPS.md`
- All commands use `C:\Genesis` as base path

---

**Ready to deploy?** Run `.\DEPLOY_NOW_AUTOMATED.ps1` and follow the prompts!
