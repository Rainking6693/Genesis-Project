# Deploy to Render NOW - Web Interface (Easiest)

## ✅ Your render.yaml is ready! Just 3 steps:

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Sign in with GitHub (if not already)

### Step 2: Create Blueprint
1. Click **"New +"** button (top right)
2. Select **"Blueprint"**
3. Connect your GitHub repository:
   - Repository: `Rainking6693/Claude-Clean-Code-Genesis`
   - Branch: `main`
4. Click **"Apply"**

### Step 3: Render Auto-Detects render.yaml
- Render will automatically detect your `render.yaml`
- It will create **2 services**:
  - `genesis-backend` (A2A FastAPI)
  - `genesis-frontend` (Dashboard)

### Step 4: Add Environment Variables

After services are created, add secrets:

**Backend (`genesis-backend`):**
- Go to service → **Environment** tab
- Add these variables:

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

**Frontend (`genesis-frontend`):**
- Go to service → **Environment** tab
- Add:

```
NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com
```

### Step 5: Wait for Deployment

- First deployment: **5-10 minutes**
- Watch progress in **Logs** tab
- Services will auto-deploy from GitHub

### Step 6: Access Your Apps

After deployment:
- **Backend:** https://genesis-backend.onrender.com
- **Backend Health:** https://genesis-backend.onrender.com/health
- **Backend Docs:** https://genesis-backend.onrender.com/docs
- **Frontend Dashboard:** https://genesis-frontend.onrender.com

---

## 📊 Dashboard Features

Visit `https://genesis-frontend.onrender.com` to see:
- ✅ System health and status
- ✅ All 21 agents with real-time metrics
- ✅ API request/response statistics
- ✅ Cost tracking and optimization
- ✅ Error tracking
- ✅ Auto-refresh every 30 seconds

---

## 🎯 That's It!

Your apps are now running on Render with full monitoring dashboard!

**Need help?** Check `RENDER_COMPLETE_SETUP.md` for detailed troubleshooting.

