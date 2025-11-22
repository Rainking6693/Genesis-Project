# Deploy Genesis to Contabo Windows VPS

**VPS Details:**
- Provider: Contabo VPS 20 SSD
- OS: Windows Server
- IP: 154.12.244.112
- RAM: 12 GB
- CPU: 6 cores
- Storage: 200 GB SSD
- User: Administrator

---

## Part 1: Setup MongoDB Atlas (Cloud MongoDB)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email (rainking6693@gmail.com or preferred)
3. Choose **FREE tier** (M0 Sandbox - 512 MB storage)

### Step 2: Create Database Cluster
1. After signup, click **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. Cloud Provider: **AWS** (recommended)
4. Region: Choose closest to you (e.g., US East or Europe)
5. Cluster Name: `genesis-cluster`
6. Click **"Create Cluster"** (takes 1-3 minutes)

### Step 3: Create Database User
1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `genesis_admin`
5. Password: **Auto-generate** and copy it (or set your own)
6. Database User Privileges: **Atlas Admin**
7. Click **"Add User"**

### Step 4: Whitelist VPS IP
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Enter IP: `154.12.244.112` (your Contabo VPS)
4. Comment: `Contabo VPS`
5. Click **"Confirm"**

**ALSO ADD YOUR LOCAL IP** (for testing from your Windows PC):
6. Click **"Add IP Address"** again
7. Click **"Add Current IP Address"** button
8. Comment: `Local Development PC`
9. Click **"Confirm"**

### Step 5: Get Connection String
1. Click **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Python**, Version: **3.12 or later**
5. Copy the connection string (looks like):
   ```
   mongodb+srv://genesis_admin:<password>@genesis-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password from Step 3

**Save this connection string - you'll need it in .env file**

---

## Part 2: Setup Redis Cloud

### Step 1: Create Redis Cloud Account
1. Go to: https://redis.com/try-free/
2. Sign up with your email
3. Choose **FREE tier** (30 MB storage, 30 connections)

### Step 2: Create Database
1. After signup, click **"New Database"**
2. Choose **"FREE"** plan
3. Cloud Provider: **AWS** (recommended)
4. Region: Choose closest to you
5. Database Name: `genesis-cache`
6. Click **"Activate"**

### Step 3: Get Connection Details
1. Click on your database name
2. Copy the following:
   - **Endpoint**: `redis-xxxxx.c52.us-east-1-4.ec2.cloud.redislabs.com:13436`
   - **Password**: Click "eye" icon to reveal password
3. Connection string format:
   ```
   redis://default:<password>@redis-xxxxx.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
   ```

**Save this connection string - you'll need it in .env file**

---

## Part 3: Deploy to Contabo VPS

### Option A: Automated Deployment (Recommended)

1. **On your local PC**, open PowerShell as Administrator
2. **Copy files to VPS** using the provided script (see `DEPLOY_VPS_COPY_FILES.ps1`)
3. **SSH into VPS** using Remote Desktop or PowerShell
4. **Run setup script** (see `DEPLOY_VPS_SETUP.ps1`)

### Option B: Manual Deployment

#### Step 1: Connect to VPS via Remote Desktop
1. Open **Remote Desktop Connection** (mstsc.exe)
2. Computer: `154.12.244.112`
3. Username: `Administrator`
4. Password: `Chartres6693`
5. Click **"Connect"**

#### Step 2: Install Required Software on VPS
1. **Install Python 3.12.4**:
   - Download: https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe
   - Run installer, check **"Add to PATH"**
   - Verify: Open PowerShell, run `python --version`

2. **Install Git**:
   - Download: https://git-scm.com/download/win
   - Run installer with default settings
   - Verify: `git --version`

3. **Install Node.js 20.x**:
   - Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
   - Run installer with default settings
   - Verify: `node --version` and `npm --version`

#### Step 3: Copy Genesis Files to VPS

**Method 1: Using Git (Recommended)**
```powershell
# On VPS, open PowerShell
cd C:\
git clone https://github.com/Rainking6693/Claude-Clean-Code-Genesis.git
cd Claude-Clean-Code-Genesis
```

**Method 2: Manual Copy**
1. Compress your local `Claude-Clean-Code-Genesis` folder to ZIP
2. Copy ZIP to VPS via Remote Desktop (shared clipboard or drive mapping)
3. Extract on VPS to `C:\Genesis`

#### Step 4: Configure Environment Variables
1. Copy `.env.example` to `.env` (or copy your existing `.env`)
2. Update the following in `.env`:

```env
# MongoDB Atlas (from Part 1, Step 5)
MONGODB_URI=mongodb+srv://genesis_admin:<password>@genesis-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority

# Redis Cloud (from Part 2, Step 3)
REDIS_URI=redis://default:<password>@redis-xxxxx.c52.us-east-1-4.ec2.cloud.redislabs.com:13436

# Keep all your existing API keys (copy from local .env)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
# ... (all other keys from your local .env)

# Set to production mode
GENESIS_ENV=production
ENVIRONMENT=production

# Ensure agent auth is set
AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b
```

#### Step 5: Install Python Dependencies
```powershell
# On VPS PowerShell
cd C:\Genesis
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 6: Install Dashboard Dependencies
```powershell
cd C:\Genesis\genesis-dashboard
npm install
npm run build
```

#### Step 7: Configure Windows Firewall
```powershell
# Allow ports 8000, 5001, 3000
New-NetFirewallRule -DisplayName "Genesis A2A Service" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Genesis Dashboard API" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Genesis Dashboard UI" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## Part 4: Start Services

### Start A2A Service (Port 8000)
```powershell
# Terminal 1
cd C:\Genesis
python a2a_fastapi.py
```

### Start Dashboard API (Port 5001)
```powershell
# Terminal 2
cd C:\Genesis
python scripts\dashboard_api_server.py
```

### Start Dashboard UI (Port 3000)
```powershell
# Terminal 3
cd C:\Genesis\genesis-dashboard
npm run start
```

### Verify Services
1. **A2A Service**: http://154.12.244.112:8000/health
2. **Dashboard API**: http://154.12.244.112:5001/health
3. **Dashboard UI**: http://154.12.244.112:3000

---

## Part 5: Setup Services to Auto-Start (Optional)

Use **NSSM** (Non-Sucking Service Manager) to run as Windows services:

1. Download NSSM: https://nssm.cc/download
2. Extract to `C:\nssm`
3. Install services:

```powershell
# Install A2A Service
C:\nssm\nssm.exe install GenesisA2A "C:\Python312\python.exe" "C:\Genesis\a2a_fastapi.py"
C:\nssm\nssm.exe set GenesisA2A AppDirectory "C:\Genesis"
C:\nssm\nssm.exe start GenesisA2A

# Install Dashboard API
C:\nssm\nssm.exe install GenesisDashboardAPI "C:\Python312\python.exe" "C:\Genesis\scripts\dashboard_api_server.py"
C:\nssm\nssm.exe set GenesisDashboardAPI AppDirectory "C:\Genesis"
C:\nssm\nssm.exe start GenesisDashboardAPI

# Install Dashboard UI
C:\nssm\nssm.exe install GenesisDashboardUI "C:\Program Files\nodejs\npm.cmd" "run start"
C:\nssm\nssm.exe set GenesisDashboardUI AppDirectory "C:\Genesis\genesis-dashboard"
C:\nssm\nssm.exe start GenesisDashboardUI
```

---

## Troubleshooting

### MongoDB Connection Issues
- Verify VPS IP `154.12.244.112` is whitelisted in MongoDB Atlas
- Test connection: `python -c "from pymongo import MongoClient; print(MongoClient('YOUR_URI').admin.command('ping'))"`

### Redis Connection Issues
- Verify endpoint and password are correct
- Test connection: `python -c "import redis; r=redis.from_url('YOUR_URI'); print(r.ping())"`

### Port Access Issues
- Verify Windows Firewall rules are active: `Get-NetFirewallRule -DisplayName "Genesis*"`
- Verify Contabo firewall allows ports 8000, 5001, 3000 (check Contabo control panel)

### Service Crashes
- Check logs in `C:\Genesis\logs\`
- Restart services using NSSM: `nssm restart GenesisA2A`

---

## Security Recommendations

1. **Change default password** immediately after first login
2. **Enable Windows Updates** for security patches
3. **Setup Windows Firewall** to only allow necessary ports
4. **Use environment variables** for sensitive data (not hardcoded)
5. **Backup `.env` file** securely (contains all API keys)

---

## Next Steps

After deployment:
1. Verify all 3 services are running
2. Test A2A API: `curl http://154.12.244.112:8000/agents`
3. Open dashboard: http://154.12.244.112:3000
4. Monitor logs: `C:\Genesis\logs\`
5. Optional: Setup autonomous scheduler for continuous operation

**Estimated deployment time**: 30-45 minutes
