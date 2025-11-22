# Deploy to Render NOW - Step by Step

## You have the API key - Let's deploy!

### Option 1: Automatic (Recommended)

```powershell
# 1. Set your Render API key
$env:RENDER_API_KEY = "your-api-key-here"

# 2. Run deployment script
python scripts/deploy_render.py
```

### Option 2: Manual (Web Interface)

1. **Go to:** https://dashboard.render.com
2. **Sign in** with GitHub
3. **Click:** "New +" → "Blueprint"
4. **Connect** your GitHub repository
5. **Render will auto-detect** `render.yaml` and create both services
6. **Add environment variables** (see below)
7. **Deploy!**

---

## Environment Variables to Add

### Backend Service (`genesis-backend`)

In Render dashboard → Your service → **Environment** tab:

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

```
NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com
```

**Note:** Update this after backend deploys to get the actual URL.

---

## What Happens Next

1. **Services created** (2-3 minutes)
2. **Code deployed** from GitHub (5-10 minutes)
3. **Services running** at:
   - Backend: `https://genesis-backend.onrender.com`
   - Frontend: `https://genesis-frontend.onrender.com`

---

## Test Your Deployment

```powershell
# Test backend
curl https://genesis-backend.onrender.com/health

# Test frontend
curl https://genesis-frontend.onrender.com/api/health
```

---

## View Dashboard

Open in browser:
**https://genesis-frontend.onrender.com**

You'll see:
- ✅ System health
- ✅ Agent metrics
- ✅ API statistics
- ✅ Cost tracking
- ✅ Real-time updates (every 30 seconds)

---

## Need Help?

- **Logs:** Render dashboard → Service → **Logs** tab
- **Status:** Render dashboard → Service → **Events** tab
- **Docs:** See `RENDER_COMPLETE_SETUP.md`

---

**Ready? Run the deployment script now!** 🚀

