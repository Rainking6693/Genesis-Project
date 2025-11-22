# Render.com Quick Start - Complete Setup

## 🚀 5-Minute Setup

### Step 1: Get Your Render API Key

1. Go to https://dashboard.render.com
2. Sign up/login with GitHub
3. Go to **Account Settings** → **API Keys**
4. Click **"New API Key"**
5. Copy the key

### Step 2: Run Setup Script

**PowerShell:**
```powershell
# Set your API key
$env:RENDER_API_KEY = "your-api-key-here"

# Run deployment
python scripts/deploy_render.py
```

**Or use the PowerShell script:**
```powershell
.\scripts\setup_render_complete.ps1 -RenderApiKey "your-api-key-here"
```

### Step 3: Add Environment Variables

After services are created, add secrets in Render dashboard:

**Backend (`genesis-backend`):**
- Go to: https://dashboard.render.com → `genesis-backend` → **Environment**
- Add all variables from your `.env` file (see `RENDER_COMPLETE_SETUP.md`)

**Frontend (`genesis-frontend`):**
- Go to: https://dashboard.render.com → `genesis-frontend` → **Environment**
- Add: `NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com`

### Step 4: Wait for Deployment

- First deployment: **5-10 minutes**
- Watch progress in Render dashboard → **Logs** tab

### Step 5: Access Your Apps

- **Backend API:** https://genesis-backend.onrender.com
- **Backend Health:** https://genesis-backend.onrender.com/health
- **Backend Docs:** https://genesis-backend.onrender.com/docs
- **Frontend Dashboard:** https://genesis-frontend.onrender.com

---

## 📊 Dashboard Features

The dashboard at `genesis-frontend.onrender.com` shows:

### Real-Time Monitoring
- ✅ **System Health** - Overall status
- ✅ **Agent Activity** - All 21 agents with metrics
- ✅ **API Metrics** - Request counts, response times
- ✅ **Error Tracking** - Failed requests, exceptions
- ✅ **Resource Usage** - CPU, memory, disk

### Metrics Sections
1. **Executive Overview** - Revenue, costs, profit, success rate
2. **Agent Performance** - Individual agent metrics
3. **Orchestration** - HTDAG, HALO, AOP, Circuit Breaker
4. **Evolution & Learning** - SE-Darwin, ATLAS, AgentGit
5. **Safety & Governance** - Policy violations, approvals
6. **Cost Optimization** - LLM usage, cost reduction

### Auto-Refresh
- Dashboard updates every **30 seconds** automatically
- No page reload needed

---

## 🔧 Manual Setup (Alternative)

If API deployment doesn't work:

### Backend
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repo
4. Settings:
   - **Name:** `genesis-backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip setuptools wheel && pip install -r requirements_production.txt`
   - **Start Command:** `python a2a_fastapi.py`
   - **Health Check Path:** `/health`
5. Add environment variables
6. Deploy

### Frontend
1. Click **"New +"** → **"Web Service"**
2. Connect same GitHub repo
3. Settings:
   - **Name:** `genesis-frontend`
   - **Environment:** `Python 3`
   - **Root Directory:** `dashboard`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - **Health Check Path:** `/`
4. Add environment variables
5. Deploy

---

## 📝 Environment Variables

### Backend Required Variables

```
GENESIS_ENV=production
A2A_HOST=0.0.0.0
PORT=8000
A2A_PORT=8000
PYTHONUNBUFFERED=1
REDIS_URL=redis://...
OPENROUTER_API_KEY=sk-or-v1-...
SERPER_API_KEY=...
JINA_API_KEY=...
GOOGLE_AI_STUDIO_KEY=...
GITHUB_TOKEN=...
A2A_API_KEY=...
```

### Frontend Required Variables

```
FLASK_ENV=production
FLASK_DEBUG=0
NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com
```

---

## 🐛 Troubleshooting

### Service Won't Start
- Check **Logs** tab in Render dashboard
- Common: Missing environment variables, import errors

### Build Fails
- Check **Events** tab → Latest build
- Common: Python version, requirements.txt issues

### Slow First Request
- Normal! Free tier services sleep after 15min
- First request wakes them (~30 seconds)

---

## 💰 Cost

**Free Tier:**
- ✅ 750 hours/month (enough for 2 services)
- ✅ 512MB RAM per service
- ✅ Free SSL
- ✅ Auto-deploy from GitHub

**If you exceed:**
- $7/month per service (Starter plan)

---

## 📚 Full Documentation

See `RENDER_COMPLETE_SETUP.md` for detailed instructions.

---

**That's it!** Your apps are now running on Render with a monitoring dashboard. 🎉

