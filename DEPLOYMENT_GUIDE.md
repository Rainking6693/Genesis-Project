# Genesis A2A Service - Complete Deployment Guide

This guide covers deploying the Genesis A2A FastAPI service to production as a 24/7 web service (not localhost).

## Table of Contents
1. [Quick Start](#quick-start)
2. [Railway Deployment (Recommended)](#railway-deployment)
3. [Render Deployment (Free Tier)](#render-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Environment Variables](#environment-variables)
6. [Testing Deployment](#testing-deployment)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

**What you get:**
- 24/7 deployed A2A service (not localhost)
- HTTPS endpoint with automatic SSL
- 15 Genesis agents accessible via A2A protocol
- Auto-scaling and health monitoring
- Zero-downtime deployments

**Time to deploy:** 5-10 minutes

---

## Railway Deployment (Recommended)

Railway provides the easiest deployment with generous free tier and excellent developer experience.

### Prerequisites
- GitHub account
- Railway account (free tier: 500 hours/month)

### Step 1: Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify your email

### Step 2: Deploy from GitHub
```bash
# 1. Push code to GitHub
git add .
git commit -m "Add A2A service deployment config"
git push origin main

# 2. Go to Railway dashboard
# 3. Click "New Project"
# 4. Select "Deploy from GitHub repo"
# 5. Choose your Genesis repository
# 6. Railway will auto-detect railway.toml and deploy
```

### Step 3: Configure Environment Variables
In Railway dashboard:
1. Click on your service
2. Go to "Variables" tab
3. Add these variables:

```bash
GENESIS_ENV=production
A2A_API_KEY=<generate-secure-key>
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
GEMINI_API_KEY=<your-gemini-key>
LOG_LEVEL=INFO
```

**Generate secure API key:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

### Step 4: Get Your Deployment URL
Railway will provide a URL like:
```
https://genesis-a2a-service-production.up.railway.app
```

### Step 5: Test Deployment
```bash
# Health check
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "agents_available": 15,
  "uptime_seconds": 123.45,
  "feature_flags": {...}
}
```

### Railway Features
- ✅ Free tier: 500 hours/month (~$5/month after)
- ✅ Automatic HTTPS
- ✅ Custom domains supported
- ✅ Built-in metrics (CPU, memory, network)
- ✅ Logs with 7-day retention
- ✅ Auto-deploy on git push
- ✅ Zero-downtime deployments

---

## Render Deployment (Free Tier)

Render offers a generous free tier perfect for testing and low-traffic deployments.

### Prerequisites
- GitHub account
- Render account (free tier available)

### Step 1: Sign up for Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify your email

### Step 2: Deploy from GitHub
```bash
# 1. Push code to GitHub (if not already done)
git add .
git commit -m "Add A2A service deployment config"
git push origin main

# 2. Go to Render dashboard
# 3. Click "New +" → "Web Service"
# 4. Connect your GitHub repository
# 5. Render will auto-detect render.yaml and deploy
```

### Step 3: Configure Environment Variables
In Render dashboard:
1. Click on your service
2. Go to "Environment" tab
3. Add these variables:

```bash
GENESIS_ENV=production
A2A_API_KEY=<generate-secure-key>
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
GEMINI_API_KEY=<your-gemini-key>
LOG_LEVEL=INFO
```

### Step 4: Get Your Deployment URL
Render will provide a URL like:
```
https://genesis-a2a-service.onrender.com
```

### Render Features
- ✅ Free tier: 750 hours/month (spins down after 15 min inactivity)
- ✅ Automatic HTTPS
- ✅ Custom domains supported
- ✅ Built-in metrics
- ✅ Logs with 7-day retention
- ✅ Auto-deploy on git push
- ✅ DDoS protection

### Important: Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- Cold start takes ~30 seconds to wake up
- Upgrade to paid tier ($7/month) for always-on service

---

## Docker Deployment

For custom deployments (AWS, GCP, Azure, self-hosted).

### Step 1: Build Docker Image
```bash
# Build the image
docker build -t genesis-a2a-service .

# Test locally
docker run -p 8000:8000 \
  -e GENESIS_ENV=production \
  -e A2A_API_KEY=your-api-key \
  -e OPENAI_API_KEY=your-openai-key \
  -e ANTHROPIC_API_KEY=your-anthropic-key \
  -e GEMINI_API_KEY=your-gemini-key \
  genesis-a2a-service
```

### Step 2: Deploy to Cloud

#### Google Cloud Run
```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/genesis-a2a-service

# Deploy
gcloud run deploy genesis-a2a-service \
  --image gcr.io/YOUR_PROJECT_ID/genesis-a2a-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GENESIS_ENV=production,A2A_API_KEY=your-key
```

#### AWS ECS/Fargate
```bash
# Build and tag
docker build -t genesis-a2a-service .
docker tag genesis-a2a-service:latest YOUR_ECR_REPO/genesis-a2a-service:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REPO
docker push YOUR_ECR_REPO/genesis-a2a-service:latest

# Deploy via ECS console or Terraform
```

#### Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch

# Deploy
fly deploy

# Set secrets
fly secrets set A2A_API_KEY=your-key OPENAI_API_KEY=your-key
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GENESIS_ENV` | Environment mode | `production` |
| `A2A_API_KEY` | API key for authentication | `<secure-token>` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port (auto-set by Railway/Render) | `8000` |
| `A2A_HOST` | Server host | `0.0.0.0` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `A2A_SERVICE_URL` | Internal A2A service URL | `http://localhost:8001` |

### Security Best Practices
1. **Never commit API keys to git** - Use environment variables
2. **Rotate API keys regularly** - Every 90 days minimum
3. **Use different keys per environment** - dev/staging/prod
4. **Enable rate limiting** - In production
5. **Monitor API usage** - Set up cost alerts

---

## Testing Deployment

### 1. Health Check
```bash
curl https://your-deployment-url.com/health
```

Expected:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "agents_available": 15,
  "uptime_seconds": 123.45,
  "feature_flags": {
    "a2a_integration": true,
    "toon_encoding": true,
    "circuit_breaker": true,
    "intent_abstraction": true
  }
}
```

### 2. List Agents
```bash
curl -H "X-API-Key: your-api-key" \
  https://your-deployment-url.com/agents
```

Expected:
```json
{
  "agents": [
    "spec_agent", "architect_agent", "builder_agent",
    "frontend_agent", "backend_agent", "qa_agent",
    "security_agent", "deploy_agent", "monitoring_agent",
    "maintenance_agent", "marketing_agent", "sales_agent",
    "support_agent", "analytics_agent", "finance_agent"
  ],
  "count": 15,
  "endpoint_pattern": "/invoke/{agent}"
}
```

### 3. Test Agent Invocation
```bash
curl -X POST https://your-deployment-url.com/invoke \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "agent": "qa_agent",
    "task": "Echo test: Hello from deployed A2A service",
    "arguments": {},
    "context": {}
  }'
```

### 4. API Documentation
Visit your deployment URL + `/docs` for interactive API documentation:
```
https://your-deployment-url.com/docs
```

---

## Monitoring & Logs

### Railway Monitoring
1. Go to Railway dashboard
2. Click on your service
3. View metrics:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request rate
   - Response time
4. Access logs in "Deployments" tab

### Render Monitoring
1. Go to Render dashboard
2. Click on your service
3. View "Metrics" tab:
   - Request count
   - Response time
   - Memory usage
   - CPU usage
4. Access logs in "Logs" tab

### Custom Monitoring (OpenTelemetry)
The service exports OpenTelemetry metrics that can be sent to:
- Prometheus + Grafana
- DataDog
- New Relic
- Honeycomb

Configure via environment variables:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.com
OTEL_SERVICE_NAME=genesis-a2a-service
```

### Health Check Monitoring
Set up external monitoring with:
- UptimeRobot (free)
- Pingdom
- Better Uptime

Monitor endpoint:
```
https://your-deployment-url.com/health
```

---

## Troubleshooting

### Service Won't Start

**Problem:** Deployment fails during startup

**Solutions:**
1. Check environment variables are set correctly
2. Verify Python version (must be 3.12)
3. Check logs for missing dependencies
4. Ensure `requirements_production.txt` is valid

```bash
# Railway logs
railway logs

# Render logs
# View in dashboard → Logs tab

# Docker logs
docker logs <container-id>
```

### 500 Internal Server Error

**Problem:** API returns 500 errors

**Solutions:**
1. Check if infrastructure files exist:
   ```bash
   ls infrastructure/a2a_connector.py
   ls infrastructure/agent_auth_registry.py
   ls infrastructure/feature_flags.py
   ```
2. Verify LLM API keys are valid
3. Check logs for detailed error messages

### 401 Unauthorized

**Problem:** API returns 401 errors

**Solutions:**
1. Verify `X-API-Key` header is included
2. Check `A2A_API_KEY` environment variable matches
3. In development mode, API key is optional (warning logged)

### Slow Response Times

**Problem:** API responses take >5 seconds

**Solutions:**
1. Enable circuit breaker (already enabled)
2. Increase worker count in Procfile:
   ```
   web: uvicorn a2a_fastapi:app --workers 8
   ```
3. Check LLM API rate limits
4. Monitor memory usage (upgrade tier if needed)

### Service Keeps Crashing

**Problem:** Service restarts frequently

**Solutions:**
1. Check memory usage (upgrade tier if OOM)
2. Review error logs for exceptions
3. Verify all required environment variables are set
4. Check if dependencies are missing

### API Key Not Working

**Problem:** Valid API key rejected

**Solutions:**
1. Regenerate API key:
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```
2. Update `A2A_API_KEY` in deployment dashboard
3. Wait 30 seconds for change to propagate
4. Test with new key

---

## Cost Estimates

### Railway
- Free tier: 500 hours/month ($0)
- Paid tier: ~$5-10/month for basic usage
- Scales automatically based on usage

### Render
- Free tier: 750 hours/month ($0, with spin-down)
- Starter tier: $7/month (always-on)
- Standard tier: $25/month (auto-scaling)

### LLM API Costs
- GPT-4o: $3/1M tokens
- Claude Sonnet: $3/1M tokens
- Gemini Flash: $0.03/1M tokens (100x cheaper)

**Optimization:** Use DAAO intelligent routing (48% cost reduction)

### Total Monthly Cost (Estimated)
- Hosting: $0-10/month
- LLM APIs: $10-50/month (depends on usage)
- **Total: $10-60/month** for production deployment

---

## Next Steps

1. **Deploy to Railway or Render** (5 minutes)
2. **Test with curl commands** (2 minutes)
3. **Set up monitoring** (UptimeRobot, 5 minutes)
4. **Configure custom domain** (optional, 10 minutes)
5. **Enable auto-scaling** (if needed)
6. **Set up alerts** (cost alerts, uptime alerts)

## Support

- Railway docs: https://docs.railway.app
- Render docs: https://render.com/docs
- Genesis docs: See `PROJECT_STATUS.md`

---

**You're ready to deploy!** Choose Railway for best developer experience or Render for free tier.
