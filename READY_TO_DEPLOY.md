# 🚀 Ready to Deploy - Everything Configured!

Your MongoDB and Redis are set up and ready to go!

## ✅ What's Configured:

### MongoDB Atlas (Cloud)
```
mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/
```
- ✓ FREE tier (512 MB storage)
- ✓ Connection string saved
- ✓ Will be automatically configured on VPS

### Redis Cloud
```
redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
```
- ✓ FREE tier (30 MB storage)
- ✓ Connection string saved
- ✓ Will be automatically configured on VPS

---

## 🎯 3-Step Deployment (20 minutes)

### Step 1: Copy Files to VPS (5 minutes)

**On your local PC**, run in PowerShell as Administrator:

```powershell
cd C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis
.\SAFE_COPY_TO_VPS.ps1
```

**This script:**
- ✓ **COPIES** files to VPS (your local files stay intact!)
- ✓ Does NOT delete or move anything from your PC
- ✓ Uses robocopy for safe, resumable transfer
- ✓ Excludes large directories (node_modules, .git, etc.)
- ✓ Takes 5-10 minutes depending on internet speed

**If the script fails**, use Remote Desktop:
1. Open Remote Desktop: `mstsc.exe`
2. Connect to: `154.12.244.112`
3. Login: `Administrator` / `Chartres6693`
4. Manually copy folder from your PC to `C:\Genesis` on VPS

---

### Step 2: Setup VPS (10 minutes)

**On the VPS**, open PowerShell as Administrator and run:

```powershell
# Merge environment configuration (MongoDB + Redis + API keys)
cd C:\Genesis
.\MERGE_ENV_ON_VPS.ps1

# Install dependencies (Python packages, Node modules)
.\DEPLOY_VPS_SETUP.ps1
```

**What this does:**
- Merges `.env.local` (your API keys) with `.env.vps` (MongoDB/Redis)
- Installs Python 3.12 packages
- Installs Node.js packages for dashboard
- Configures Windows Firewall for ports 8000, 5001, 3000
- Creates required directories

---

### Step 3: Start Services (2 minutes)

**On the VPS**, open 3 separate PowerShell windows:

**Window 1: A2A Service (Port 8000)**
```powershell
cd C:\Genesis
.\START_A2A_SERVICE.bat
```

**Window 2: Dashboard API (Port 5001)**
```powershell
cd C:\Genesis
.\START_DASHBOARD_API.bat
```

**Window 3: Dashboard UI (Port 3000)**
```powershell
cd C:\Genesis
.\START_DASHBOARD_UI.bat
```

---

## ✅ Verify Deployment

**From your local PC browser**, test these URLs:

1. **A2A API Health**: http://154.12.244.112:8000/health
   - Expected: `{"status": "healthy"}`

2. **A2A API Docs**: http://154.12.244.112:8000/docs
   - Expected: Interactive API documentation

3. **List All Agents**: http://154.12.244.112:8000/agents
   - Expected: JSON list of 26 agents

4. **Dashboard API**: http://154.12.244.112:5001/health
   - Expected: `{"status": "ok"}`

5. **Dashboard UI**: http://154.12.244.112:3000
   - Expected: Genesis dashboard with metrics

---

## 🔍 Troubleshooting

### "Cannot connect to MongoDB"
```powershell
# Test on VPS:
python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').admin.command('ping'))"
```
Expected: `{'ok': 1.0}`

### "Cannot connect to Redis"
```powershell
# Test on VPS:
python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.ping())"
```
Expected: `True`

### "Port not accessible"
1. Check Windows Firewall on VPS:
   ```powershell
   Get-NetFirewallRule -DisplayName "Genesis*"
   ```
2. Check Contabo control panel firewall settings
3. Verify services are running (should see Python/Node processes)

### Services crash on startup
Check logs:
```powershell
Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50
```

---

## 🔒 Security Checklist

After deployment:
- [ ] Change VPS password from `Chartres6693` to something secure
- [ ] Enable Windows Updates on VPS
- [ ] Backup `.env` file (contains all API keys)
- [ ] Verify MongoDB Atlas IP whitelist includes VPS IP
- [ ] Test all 3 services are accessible

---

## 📊 What You'll See

### A2A Service (Port 8000)
- 26 Genesis agents available via REST API
- Agents: BuilderAgent, QAAgent, DeployAgent, SEOAgent, etc.
- Swagger docs at `/docs`

### Dashboard API (Port 5001)
- Real-time business generation metrics
- Agent activity tracking
- System health monitoring

### Dashboard UI (Port 3000)
- Executive dashboard
- 6 sections: Executive, Agents, Orchestration, Evolution, Safety, Cost
- Live metrics updating every 5 seconds

---

## 🚀 Next Steps

After verifying deployment:

### Test Business Generation
```powershell
cd C:\Genesis
python scripts\autonomous_fully_integrated.py --count 1
```

### Enable Continuous Operation (24/7)
```powershell
python scripts\autonomous_business_orchestrator.py --continuous
```

### Setup Auto-Start (Optional)
See: `DEPLOY_TO_CONTABO_VPS.md` Part 5 (NSSM Windows Service)

---

## 💡 Quick Commands

```powershell
# Check if services are running
Get-Process | Where-Object {$_.ProcessName -match "python|node"}

# View recent logs
Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50

# Restart a service
# Ctrl+C in the service window, then re-run the .bat file

# Test MongoDB connection
python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').list_database_names())"

# Test Redis connection
python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.info())"
```

---

## 📝 Important Notes

1. **Your local files are SAFE**: The copy script does NOT delete anything from your PC
2. **VPS files are separate**: Changes on VPS won't affect your local development
3. **Database is cloud-hosted**: MongoDB and Redis are on cloud (not local)
4. **Services must run continuously**: Keep PowerShell windows open or setup as Windows services

---

## ❓ Need Help?

**Common Issues:**
- Script fails → Use Remote Desktop manual copy method
- Port not accessible → Check Contabo firewall in control panel
- Service crashes → Check logs in `C:\Genesis\logs\`
- Database connection fails → Verify connection strings in `.env`

**Verification Steps:**
1. All 3 services running? ✓
2. Can access http://154.12.244.112:8000/health? ✓
3. Can access http://154.12.244.112:3000? ✓
4. MongoDB connection works? ✓
5. Redis connection works? ✓

---

**Estimated Total Time**: 20 minutes
**Difficulty**: Beginner-friendly (copy-paste commands)
**Your Local Files**: 100% safe (only copying, not moving)
