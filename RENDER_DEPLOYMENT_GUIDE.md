# Render.com Deployment Guide - FREE TIER

## Why Render?

✅ **Best free PaaS for your needs:**
- **Free tier:** 750 hours/month (enough for 2 apps)
- **Supports both:** Python backend + Flask frontend
- **Auto-deploy:** From GitHub (just push)
- **Reliable:** No weird build errors like Railway/Fly.io
- **Simple:** Just connect GitHub repo
- **PostgreSQL/Redis:** Free managed databases available

## Quick Start (5 minutes)

### Step 1: Push to GitHub

```bash
# Make sure your code is on GitHub
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (free)
3. Connect your repository

### Step 3: Deploy Backend

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml`
4. Select **"genesis-backend"** service
5. Click **"Create Web Service"**
6. Set environment variables (see below)
7. Deploy!

### Step 4: Deploy Frontend

1. Click **"New +"** → **"Web Service"**
2. Connect same GitHub repo
3. Select **"genesis-frontend"** service
4. Click **"Create Web Service"**
5. Set environment variables
6. Deploy!

## Environment Variables

### Backend (`genesis-backend`)

In Render dashboard → Your service → Environment:

```
GENESIS_ENV=production
A2A_HOST=0.0.0.0
PORT=8000
A2A_PORT=8000
PYTHONUNBUFFERED=1
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
```

### Frontend (`genesis-frontend`)

```
FLASK_ENV=production
NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com
```

**Note:** Update `NEXT_PUBLIC_API_URL` after backend deploys to get the actual URL.

## URLs

After deployment:
- **Backend:** `https://genesis-backend.onrender.com`
- **Frontend:** `https://genesis-frontend.onrender.com`

## Free Tier Limits

- **750 hours/month** (enough for 2 services running 24/7)
- **512MB RAM** per service
- **Auto-sleep:** Services sleep after 15min inactivity (wake on request)
- **Free SSL:** Automatic HTTPS
- **Free PostgreSQL:** 90 days (then $7/month)

## Troubleshooting

### Service Won't Start

1. Check **Logs** tab in Render dashboard
2. Common issues:
   - Missing environment variables
   - Import errors (check requirements.txt)
   - Port mismatch (should be 8000)

### Slow First Request

- Normal! Free tier services "sleep" after 15min
- First request wakes them up (~30 seconds)
- Subsequent requests are fast

### Build Fails

1. Check build logs
2. Common fixes:
   - Update `requirements_production.txt`
   - Check Python version (Render uses 3.10 by default)
   - Verify `render.yaml` syntax

## Alternative: Manual Setup (No render.yaml)

If you prefer manual setup:

### Backend:
1. New Web Service
2. Connect GitHub repo
3. Settings:
   - **Name:** `genesis-backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements_production.txt`
   - **Start Command:** `python a2a_fastapi.py`
   - **Health Check Path:** `/health`
4. Add environment variables
5. Deploy

### Frontend:
1. New Web Service
2. Connect GitHub repo
3. Settings:
   - **Name:** `genesis-frontend`
   - **Environment:** `Python 3`
   - **Root Directory:** `dashboard`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
4. Add environment variables
5. Deploy

## Auto-Deploy

Render auto-deploys on every `git push` to `main` branch.

To disable:
- Settings → **Auto-Deploy** → Toggle off

## Monitoring

- **Logs:** Real-time in dashboard
- **Metrics:** CPU, Memory, Request count
- **Alerts:** Email on service down

## Cost

**Free tier covers:**
- 2 web services (backend + frontend)
- 750 hours/month total
- Free SSL
- Free PostgreSQL (90 days)

**If you exceed:**
- $7/month per service (Starter plan)
- Still very affordable!

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Create Render account
3. ✅ Deploy backend
4. ✅ Deploy frontend
5. ✅ Test both URLs
6. ✅ Set up auto-deploy

**That's it!** Render is the easiest free PaaS for your setup.

