# Railway Deployment Troubleshooting

## Current Issue: Build Connection Errors

The errors you're seeing (`EOF`, `connection refused`) are Railway infrastructure issues, not code problems. Here's how to fix:

## Quick Fixes

### Option 1: Retry Deployment (Most Common Fix)
1. Wait 5-10 minutes (Railway may be experiencing temporary issues)
2. Trigger a new deployment from Railway dashboard
3. Or push a new commit to trigger auto-deploy

### Option 2: Switch to Nixpacks Builder
The `railway.toml` has been updated to use Docker, but you can switch back to Nixpacks:

```toml
[services.build]
builder = "nixpacks"
buildCommand = "pip install -r requirements_production.txt"
```

Then remove or rename `Dockerfile` temporarily.

### Option 3: Use Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

## Common Railway Build Errors

### Error: "EOF" or "connection refused"
**Cause:** Railway buildkit infrastructure issue  
**Fix:** 
- Wait 5-10 minutes and retry
- Try deploying from different region (change in Railway settings)
- Use Railway CLI instead of web UI

### Error: "failed to solve"
**Cause:** Dockerfile syntax or missing files  
**Fix:**
- Verify `requirements_production.txt` exists
- Check Dockerfile syntax
- Ensure all COPY paths are correct

### Error: "dial unix /run/buildkit/buildkitd.sock"
**Cause:** Buildkit daemon not running  
**Fix:**
- This is Railway infrastructure - wait and retry
- Contact Railway support if persists > 1 hour

## Verification Checklist

Before deploying, verify:

- [ ] `Dockerfile` exists and is valid
- [ ] `requirements_production.txt` exists
- [ ] `.dockerignore` exists (reduces build context)
- [ ] All required environment variables set in Railway dashboard:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_API_KEY`
  - `A2A_API_KEY` or `GENESIS_API_KEY`
  - `MONGODB_URI` (if using MongoDB)
  - `REDIS_URL` (if using Redis)

## Railway-Specific Settings

### Environment Variables (Set in Railway Dashboard)
```
GENESIS_ENV=production
A2A_HOST=0.0.0.0
A2A_PORT=8000
PORT=8000
LOG_LEVEL=INFO
```

### Resource Allocation
- **Memory:** 4GB minimum (set in `railway.toml`)
- **CPU:** 2 cores minimum
- **Region:** us-west1 (or your preferred region)

## Alternative: Use Render.com

If Railway continues having issues, Render.com is a good alternative:

1. Connect GitHub repo
2. Select "Web Service"
3. Build command: `pip install -r requirements_production.txt`
4. Start command: `python a2a_fastapi.py`
5. Environment: `Python 3`

## Support

- **Railway Status:** https://status.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Docs:** https://docs.railway.app

## Next Steps

1. Wait 10 minutes and retry deployment
2. If still failing, try Railway CLI: `railway up`
3. If persists, switch to Nixpacks builder (update `railway.toml`)
4. As last resort, try Render.com or Fly.io

