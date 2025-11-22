# Manual VPS Deployment - Simple Steps

I've prepared everything, but the automated script needs interactive input. Here's the simplest manual process:

---

## ✅ Option 1: Git Clone (Fastest - 5 minutes)

### On VPS via Remote Desktop:

1. **Connect to VPS:**
   - IP: `154.12.244.112`
   - User: `Administrator`
   - Password: `Chartres6693`

2. **Open PowerShell** on VPS

3. **Clone Repository:**
   ```powershell
   cd C:\
   git clone https://github.com/Rainking6693/Claude-Clean-Code-Genesis.git Genesis
   ```

4. **Configure Environment:**
   ```powershell
   cd C:\Genesis
   .\MERGE_ENV_ON_VPS.ps1
   ```

5. **Install Dependencies:**
   ```powershell
   .\DEPLOY_VPS_SETUP.ps1
   ```

6. **Start Services** (3 separate PowerShell windows):
   ```powershell
   .\START_A2A_SERVICE.bat
   .\START_DASHBOARD_API.bat
   .\START_DASHBOARD_UI.bat
   ```

**Done! Total time: ~20 minutes**

---

## ✅ Option 2: Remote Desktop Copy (if Git not available)

### On Your Local PC:

1. **Open Remote Desktop:**
   - Press `Windows + R`
   - Type: `mstsc.exe`
   - Enter IP: `154.12.244.112`

2. **Before connecting, click "Show Options"**

3. **Go to "Local Resources" tab**

4. **Click "More..." under devices**

5. **Check "Drives"** to share your C: drive

6. **Connect** with credentials:
   - User: `Administrator`
   - Password: `Chartres6693`

### On VPS (in Remote Desktop):

7. **Open File Explorer** on VPS

8. **You'll see your local drives** (e.g., `C on YOURPC`)

9. **Navigate to:**
   ```
   C on YOURPC\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis
   ```

10. **Copy entire folder to:**
    ```
    C:\Genesis
    ```
    (This will take 5-10 minutes)

11. **Follow steps 4-6 from Option 1 above**

**Done! Total time: ~25 minutes**

---

## ✅ Option 3: PowerShell Remoting (Advanced)

### On Your Local PC as Administrator:

1. **Open PowerShell as Administrator**

2. **Run:**
   ```powershell
   cd C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis
   .\SAFE_COPY_TO_VPS.ps1
   ```

3. **Type "YES" when prompted**

4. **Wait for "DEPLOYMENT COMPLETE"** (10-15 minutes)

5. **Connect to VPS and run steps 4-6 from Option 1**

---

## 📋 After Deployment Checklist:

### Verify Services (from your browser):

- [ ] http://154.12.244.112:8000/health (A2A API)
- [ ] http://154.12.244.112:5001/health (Dashboard API)
- [ ] http://154.12.244.112:3000 (Dashboard UI)

### Test Databases (on VPS PowerShell):

```powershell
# MongoDB
python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').admin.command('ping'))"

# Redis
python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.ping())"
```

Both should succeed!

---

## 🤖 For Claude Code on VPS:

**Point to:** `C:\Genesis\CLAUDE_VPS.md`

This file contains everything Claude needs to know about the VPS environment.

---

## ⚡ My Recommendation:

**Use Option 1 (Git Clone)** - it's the fastest and most reliable:

1. RDP to `154.12.244.112`
2. Run: `git clone https://github.com/Rainking6693/Claude-Clean-Code-Genesis.git C:\Genesis`
3. Run: `C:\Genesis\MERGE_ENV_ON_VPS.ps1`
4. Run: `C:\Genesis\DEPLOY_VPS_SETUP.ps1`
5. Start 3 services with .bat files

**Total: 20 minutes**

---

## 🔧 If Something Fails:

1. **Check Python/Node installed:**
   ```powershell
   python --version  # Should be 3.12.4
   node --version    # Should be 20.x
   ```

2. **Check logs:**
   ```powershell
   Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50
   ```

3. **Verify .env file exists:**
   ```powershell
   Test-Path C:\Genesis\.env
   ```

4. **Test firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "Genesis*"
   ```

---

**All deployment files are ready in your local folder!**

**MongoDB**: mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/
**Redis**: redis://default:HUnU...@redis-13436...
**VPS**: 154.12.244.112
**Credentials**: Administrator / Chartres6693

Ready when you are! 🚀
