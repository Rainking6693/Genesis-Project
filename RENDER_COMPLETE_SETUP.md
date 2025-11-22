# Render.com Complete Setup Guide

## 🚀 End-to-End Deployment: Backend + Frontend + Dashboard

This guide will get both apps running on Render with a monitoring dashboard.

---

## Step 1: Get Render API Key

1. Go to https://dashboard.render.com
2. Sign up/login with GitHub
3. Go to **Account Settings** → **API Keys**
4. Click **"New API Key"**
5. Copy the key

---

## Step 2: Set API Key (PowerShell)

```powershell
$env:RENDER_API_KEY = "your-api-key-here"
```

Or add to `.env`:
```
RENDER_API_KEY=your-api-key-here
```

---

## Step 3: Deploy via API (Automatic)

```powershell
# Make sure you're in the repo root
cd C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis

# Set API key
$env:RENDER_API_KEY = "your-api-key-here"

# Run deployment script
python scripts/deploy_render.py
```

This will:
- ✅ Create backend service (`genesis-backend`)
- ✅ Create frontend service (`genesis-frontend`)
- ✅ Configure both services
- ✅ Set up auto-deploy from GitHub

---

## Step 4: Add Environment Variables (Secrets)

After services are created, add secrets in Render dashboard:

### Backend Service (`genesis-backend`)

Go to: https://dashboard.render.com → Your service → **Environment**

Add these variables:

```
REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
OPENROUTER_API_KEY=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
SERPER_API_KEY=3861159e44657fc519dfa9a688866937135376c1
JINA_API_KEY=jina_2aa20c05fa84493c9524baa0bd85a8dfyzQ9oh8wiLkzxxvHidUJXg7qBMBp
GOOGLE_AI_STUDIO_KEY=AIzaSyAc5lGnaAGDLlYsG1EOfceobFVK9Ge_FeA
GITHUB_TOKEN=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
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
EVENT_BUS_TYPE=redis_stream
STORAGE_BACKEND=redis
OMNIDAEMON_API_ENABLED=true
MEMORI_DATABASE_URL=sqlite:///./data/genesis_memory.db
GENESIS_MEMORY_BACKEND=memori
```

### Frontend Service (`genesis-frontend`)

Add:

```
NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com
```

**Important:** Update this after backend deploys to get the actual URL.

---

## Step 5: Manual Setup (Alternative)

If API deployment doesn't work, use the web interface:

### Backend Setup

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Settings:
   - **Name:** `genesis-backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip setuptools wheel && pip install -r requirements_production.txt`
   - **Start Command:** `python a2a_fastapi.py`
   - **Health Check Path:** `/health`
5. Add environment variables (see Step 4)
6. Click **"Create Web Service"**

### Frontend Setup

1. Click **"New +"** → **"Web Service"**
2. Connect same GitHub repository
3. Settings:
   - **Name:** `genesis-frontend`
   - **Environment:** `Python 3`
   - **Root Directory:** `dashboard`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - **Health Check Path:** `/`
4. Add environment variables:
   - `FLASK_ENV=production`
   - `FLASK_DEBUG=0`
   - `NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com`
5. Click **"Create Web Service"**

---

## Step 6: Wait for Deployment

- First deployment: **5-10 minutes**
- Subsequent deployments: **2-3 minutes** (auto on git push)

You can watch progress in:
- Render dashboard → Your service → **Logs** tab
- Or: Render dashboard → Your service → **Events** tab

---

## Step 7: Access Your Apps

After deployment completes:

- **Backend API:** https://genesis-backend.onrender.com
- **Backend Health:** https://genesis-backend.onrender.com/health
- **Backend Docs:** https://genesis-backend.onrender.com/docs
- **Frontend Dashboard:** https://genesis-frontend.onrender.com

---

## Step 8: Dashboard Features

The dashboard at `genesis-frontend.onrender.com` shows:

### Main Dashboard
- **System Health:** Overall status
- **Agent Activity:** Real-time agent metrics
- **API Metrics:** Request counts, response times
- **Error Tracking:** Failed requests, exceptions
- **Resource Usage:** CPU, memory, disk

### API Endpoints (Backend)

- `/health` - Health check
- `/docs` - API documentation (Swagger UI)
- `/a2a/agents` - List all agents
- `/a2a/invoke` - Invoke agent tools
- `/metrics` - Prometheus metrics (if enabled)

---

## Monitoring & Logs

### View Logs

**Backend:**
- Render dashboard → `genesis-backend` → **Logs** tab
- Real-time streaming logs
- Filter by level (info, error, warning)

**Frontend:**
- Render dashboard → `genesis-frontend` → **Logs** tab

### Metrics

**Render Dashboard:**
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

**Custom Dashboard:**
- Visit `genesis-frontend.onrender.com`
- Real-time metrics from backend
- Agent activity tracking
- System health monitoring

---

## Auto-Deploy

Render automatically deploys on every `git push` to `main` branch.

To disable:
- Service → Settings → **Auto-Deploy** → Toggle off

To deploy manually:
- Service → **Manual Deploy** → Select branch → Deploy

---

## Troubleshooting

### Service Won't Start

1. **Check Logs:**
   - Render dashboard → Service → **Logs**
   - Look for error messages

2. **Common Issues:**
   - Missing environment variables
   - Import errors (check requirements.txt)
   - Port mismatch (should be 8000 for backend)
   - Python version (Render uses Python 3.10)

### Build Fails

1. **Check Build Logs:**
   - Service → **Events** → Click latest build

2. **Common Fixes:**
   - Update `requirements_production.txt`
   - Check Python version compatibility
   - Verify `render.yaml` syntax

### Slow First Request

- **Normal!** Free tier services "sleep" after 15min inactivity
- First request wakes them up (~30 seconds)
- Subsequent requests are fast

### Environment Variables Not Working

1. Check variable names (case-sensitive)
2. Verify values are set correctly
3. Restart service after adding variables
4. Check logs for variable-related errors

---

## Cost

**Free Tier Includes:**
- ✅ 750 hours/month (enough for 2 services)
- ✅ 512MB RAM per service
- ✅ Free SSL certificates
- ✅ Auto-deploy from GitHub
- ✅ Free PostgreSQL (90 days)

**If You Exceed:**
- $7/month per service (Starter plan)
- Still very affordable!

---

## Next Steps

1. ✅ Deploy both services
2. ✅ Add environment variables
3. ✅ Test backend: `curl https://genesis-backend.onrender.com/health`
4. ✅ Test frontend: Visit `https://genesis-frontend.onrender.com`
5. ✅ Monitor in dashboard
6. ✅ Set up alerts (optional)

---

## Quick Commands

### Check Service Status
```bash
# Via Render API
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services
```

### View Logs
- Use Render dashboard (easiest)
- Or: Render CLI (if installed)

### Restart Service
- Render dashboard → Service → **Manual Deploy** → Deploy

---

## Support

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Community:** https://community.render.com

---

**You're all set!** 🎉

Both apps are now running on Render with a monitoring dashboard.

