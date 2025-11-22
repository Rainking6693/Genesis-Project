# Genesis VPS Quick Start Guide

**VPS**: Contabo Windows Server (154.12.244.112)
**Services**: A2A API (8000), Dashboard API (5001), Dashboard UI (3000)

---

## 🚀 5-Step Deployment (45 minutes)

### Step 1: Setup Cloud Databases (15 min)

#### MongoDB Atlas (FREE)
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create account → Choose **M0 FREE** tier
3. Database Access → Add User:
   - Username: `genesis_admin`
   - Password: (auto-generate and save)
   - Role: **Atlas Admin**
4. Network Access → Add IP:
   - IP: `154.12.244.112` (your VPS)
   - Also add your local IP for testing
5. Database → Connect → Copy connection string:
   ```
   mongodb+srv://genesis_admin:<password>@cluster.xxxxx.mongodb.net/
   ```

#### Redis Cloud (FREE)
1. Go to: https://redis.com/try-free/
2. Create account → Choose **FREE** plan (30 MB)
3. New Database → Copy connection string:
   ```
   redis://default:<password>@redis-xxxxx.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
   ```

**Save both connection strings - you'll need them in Step 3**

---

### Step 2: Copy Files to VPS (10 min)

**Option A: Git Clone (Recommended)**
1. Connect to VPS via Remote Desktop:
   - IP: `154.12.244.112`
   - User: `Administrator`
   - Password: `Chartres6693`
2. Open PowerShell on VPS
3. Run:
   ```powershell
   cd C:\
   git clone https://github.com/Rainking6693/Claude-Clean-Code-Genesis.git Genesis
   ```

**Option B: Manual Copy**
1. On your local PC, run in PowerShell as Admin:
   ```powershell
   C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis\DEPLOY_VPS_COPY_FILES.ps1
   ```
2. If script fails, use Remote Desktop to manually copy folder to `C:\Genesis`

---

### Step 3: Install Dependencies (15 min)

**On VPS**, run in PowerShell as Administrator:

```powershell
# Install Python 3.12.4
# Download: https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe
# Check "Add to PATH" during installation

# Install Node.js 20.x
# Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi

# Run setup script
cd C:\Genesis
.\DEPLOY_VPS_SETUP.ps1
```

---

### Step 4: Configure Environment (3 min)

**Edit `.env` file** on VPS:

```powershell
notepad C:\Genesis\.env
```

**Update these lines:**
```env
# MongoDB Atlas (from Step 1)
MONGODB_URI=mongodb+srv://genesis_admin:YOUR_PASSWORD@cluster.xxxxx.mongodb.net/

# Redis Cloud (from Step 1)
REDIS_URI=redis://default:YOUR_PASSWORD@redis-xxxxx.c52.us-east-1-4.ec2.cloud.redislabs.com:13436

# Set to production
GENESIS_ENV=production
ENVIRONMENT=production

# Keep all existing API keys from your local .env
```

**Save and close**

---

### Step 5: Start Services (2 min)

**On VPS**, open 3 separate PowerShell windows:

**Window 1: A2A Service**
```powershell
C:\Genesis\START_A2A_SERVICE.bat
```

**Window 2: Dashboard API**
```powershell
C:\Genesis\START_DASHBOARD_API.bat
```

**Window 3: Dashboard UI**
```powershell
C:\Genesis\START_DASHBOARD_UI.bat
```

---

## ✅ Verify Deployment

**From your local PC browser:**

1. **A2A API Health**: http://154.12.244.112:8000/health
   - Should return: `{"status": "healthy"}`

2. **Dashboard API Health**: http://154.12.244.112:5001/health
   - Should return: `{"status": "ok"}`

3. **Dashboard UI**: http://154.12.244.112:3000
   - Should show Genesis dashboard with metrics

4. **A2A API Docs**: http://154.12.244.112:8000/docs
   - Interactive API documentation

5. **Test Agent List**: http://154.12.244.112:8000/agents
   - Should return JSON list of 26 agents

---

## 🔧 Troubleshooting

### "Cannot connect to MongoDB"
- Verify VPS IP `154.12.244.112` is whitelisted in MongoDB Atlas
- Test connection: `python -c "from pymongo import MongoClient; print(MongoClient('YOUR_URI').admin.command('ping'))"`

### "Cannot connect to Redis"
- Verify Redis Cloud endpoint and password
- Test connection: `python -c "import redis; r=redis.from_url('YOUR_URI'); print(r.ping())"`

### "Port not accessible"
- Check Windows Firewall on VPS (should be configured by setup script)
- Check Contabo control panel firewall rules

### Services crash on startup
- Check logs: `C:\Genesis\logs\`
- Verify all API keys in `.env` are valid
- Run services manually to see error messages

---

## 🔒 Security Checklist

- [ ] Changed VPS password from default `Chartres6693`
- [ ] Enabled Windows Updates on VPS
- [ ] Windows Firewall configured (done by setup script)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Redis Cloud password secured
- [ ] `.env` file backed up securely

---

## 📊 What's Running

### A2A Service (Port 8000)
- REST API for 26 Genesis agents
- Endpoints: `/agents`, `/invoke`, `/health`, `/docs`
- Handles: BuilderAgent, QAAgent, DeployAgent, SEOAgent, etc.

### Dashboard API (Port 5001)
- Backend for monitoring dashboard
- Reads logs from `C:\Genesis\logs\business_generation\events.jsonl`
- Endpoints: `/api/metrics`, `/api/agents/all`, `/api/events`

### Dashboard UI (Port 3000)
- Next.js frontend
- Real-time metrics updates (5s refresh)
- Shows: Business count, revenue, quality scores, agent activity

---

## 🚀 Next Steps

### Run Test Business Generation
```powershell
cd C:\Genesis
python scripts\autonomous_fully_integrated.py --count 1
```

### Enable Continuous Operation
```powershell
python scripts\autonomous_business_orchestrator.py --continuous
```

### Setup Auto-Start Services (Optional)
See: `C:\Genesis\DEPLOY_TO_CONTABO_VPS.md` → Part 5

---

## 📞 Need Help?

**Common Issues:**
- Port not accessible → Check Contabo firewall settings in control panel
- Service crashes → Check `C:\Genesis\logs\` for error details
- MongoDB connection fails → Verify IP whitelist and credentials
- Dashboard empty → Verify events file exists: `C:\Genesis\logs\business_generation\events.jsonl`

**Quick Commands:**
```powershell
# Check if services are running
Get-Process | Where-Object {$_.ProcessName -match "python|node"}

# View recent logs
Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50

# Restart firewall rules
Remove-NetFirewallRule -DisplayName "Genesis*"
.\DEPLOY_VPS_SETUP.ps1
```

---

**Estimated Total Time**: 45 minutes
**Difficulty**: Beginner-friendly (step-by-step instructions)
