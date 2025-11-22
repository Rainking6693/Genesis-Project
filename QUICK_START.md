# Genesis A2A Service - 5-Minute Quick Start

Deploy your A2A service in 5 minutes. Choose your preferred platform:

## Option 1: Railway (Recommended)

**Time:** 5 minutes | **Cost:** Free tier (500 hrs/month)

### Steps

1. **Sign up:** [railway.app](https://railway.app) (use GitHub)

2. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Add A2A deployment"
   git push origin main
   ```

3. **Deploy:**
   - Click "New Project" in Railway
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-deploys using `railway.toml`

4. **Set secrets** (in Railway dashboard → Variables):
   ```bash
   GENESIS_ENV=production
   A2A_API_KEY=<generate-with-python-secrets>
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GEMINI_API_KEY=AIza...
   ```

5. **Get URL:** Railway provides `https://your-app.up.railway.app`

6. **Test:**
   ```bash
   curl https://your-app.up.railway.app/health
   ```

**Done!** 🎉

---

## Option 2: Render (Free Tier)

**Time:** 5 minutes | **Cost:** Free (spins down after 15 min inactivity)

### Steps

1. **Sign up:** [render.com](https://render.com) (use GitHub)

2. **Push code to GitHub** (if not done)

3. **Deploy:**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Render auto-deploys using `render.yaml`

4. **Set secrets** (in Render dashboard → Environment):
   ```bash
   GENESIS_ENV=production
   A2A_API_KEY=<generate-with-python-secrets>
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GEMINI_API_KEY=AIza...
   ```

5. **Get URL:** Render provides `https://your-app.onrender.com`

6. **Test:**
   ```bash
   curl https://your-app.onrender.com/health
   ```

**Done!** 🎉

---

## Generate Secure API Key

```python
import secrets
print(secrets.token_urlsafe(32))
```

Copy output and use as `A2A_API_KEY`

---

## Test Your Deployment

### 1. Health Check
```bash
curl https://your-deployment-url.com/health
```

Expected: `{"status": "healthy", ...}`

### 2. List Agents
```bash
curl -H "X-API-Key: your-api-key" \
  https://your-deployment-url.com/agents
```

Expected: 15 agents listed

### 3. Invoke Agent
```bash
curl -X POST https://your-deployment-url.com/invoke \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "agent": "qa_agent",
    "task": "Echo: Hello from deployed service",
    "arguments": {}
  }'
```

### 4. API Docs
Visit: `https://your-deployment-url.com/docs`

---

## What You Get

✅ 24/7 deployed service (not localhost)
✅ HTTPS with automatic SSL
✅ 15 Genesis agents accessible via A2A
✅ Auto-scaling and health monitoring
✅ Zero-downtime deployments
✅ Built-in metrics and logs

---

## Cost Estimate

- **Railway:** $0-5/month (free tier: 500 hrs/month)
- **Render:** $0-7/month (free tier with spin-down, $7 always-on)
- **LLM APIs:** $10-50/month (depends on usage)

**Total:** $10-60/month for production deployment

---

## Troubleshooting

**Service won't start?**
- Check environment variables are set
- View logs in dashboard
- Verify Python version is 3.12

**401 errors?**
- Verify `X-API-Key` header
- Check `A2A_API_KEY` matches

**500 errors?**
- Check logs for detailed error
- Verify LLM API keys are valid
- Ensure infrastructure files exist

---

## Next Steps

1. ✅ Deploy (5 minutes)
2. ✅ Test with curl (2 minutes)
3. Set up monitoring (UptimeRobot, 5 minutes)
4. Configure custom domain (optional, 10 minutes)
5. Enable alerts (cost, uptime)

---

## Full Documentation

See `DEPLOYMENT_GUIDE.md` for comprehensive deployment guide including:
- Docker deployment
- Cloud providers (AWS, GCP, Azure)
- Monitoring setup
- Troubleshooting
- Security best practices

---

**Ready? Pick Railway or Render and deploy now!** 🚀
