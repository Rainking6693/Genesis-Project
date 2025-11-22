# Genesis Autonomous Scheduler - Production Deployment Guide

## 🚀 Overview

The Genesis Autonomous Scheduler is a production-ready worker service that continuously generates businesses using the Genesis Meta-Agent. This guide covers deployment to Railway, Render, Fly.io, and other cloud platforms.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Railway](#railway-deployment)
  - [Render](#render-deployment)
  - [Fly.io](#flyio-deployment)
  - [Heroku](#heroku-deployment)
  - [Docker](#docker-deployment)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

### Components

1. **Autonomous Scheduler** (`scripts/autonomous_scheduler.py`)
   - Worker process that runs 24/7
   - Generates businesses every 5-10 minutes
   - Writes heartbeat file for health monitoring
   - Graceful shutdown on SIGTERM/SIGINT

2. **Health Check Server** (`scripts/health_check_server.py`) [OPTIONAL]
   - HTTP server for health monitoring
   - Endpoints: `/health`, `/heartbeat`, `/metrics`
   - Useful for platforms requiring HTTP health checks

### Process Flow

```
┌─────────────────────────────────────┐
│   Autonomous Scheduler (Worker)    │
│  - Generates business ideas         │
│  - Calls Genesis Meta-Agent         │
│  - Deploys to Vercel/GitHub         │
│  - Writes heartbeat file            │
└─────────────┬───────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  Heartbeat File     │
    │  /tmp/heartbeat.json│
    └─────────┬───────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Health Check Server (Optional)     │
│  - Reads heartbeat file             │
│  - Exposes HTTP endpoints           │
│  - Prometheus metrics               │
└─────────────────────────────────────┘
```

---

## ✅ Prerequisites

### Required

1. **Python 3.12+**
2. **Git repository** with Genesis codebase
3. **API Keys**:
   - OpenAI API key (for GPT-4o)
   - Anthropic API key (for Claude Sonnet)
   - Google API key (for Gemini)
4. **GitHub Token** (for auto-deployment)
5. **Vercel Token** (for auto-deployment)

### Optional

1. **MongoDB URI** (for persistent storage)
2. **Redis URL** (for caching)

---

## 🚀 Deployment Options

### Railway Deployment

**Best for**: Quick deployment with auto-scaling

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

#### Step 2: Initialize Project

```bash
cd genesis-clean-deploy-new
railway init
```

#### Step 3: Configure Environment Variables

```bash
railway variables set ENVIRONMENT=production
railway variables set OPENAI_API_KEY=sk-...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set GOOGLE_API_KEY=...
railway variables set GITHUB_TOKEN=ghp_...
railway variables set VERCEL_TOKEN=...
```

#### Step 4: Deploy

```bash
railway up
```

The `railway.toml` configuration will automatically:
- Install dependencies from `requirements.txt`
- Start the worker process
- Enable auto-restart on failure

#### Step 5: Monitor

```bash
# View logs
railway logs

# Check status
railway status
```

---

### Render Deployment

**Best for**: Free tier (750 hours/month)

#### Step 1: Connect Repository

1. Go to [render.com](https://render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select `render.yaml` configuration

#### Step 2: Configure Environment Variables

In the Render dashboard, add:
- `ENVIRONMENT=production`
- `OPENAI_API_KEY=sk-...`
- `ANTHROPIC_API_KEY=sk-ant-...`
- `GOOGLE_API_KEY=...`
- `GITHUB_TOKEN=ghp_...`
- `VERCEL_TOKEN=...`

#### Step 3: Deploy

Render will automatically:
- Read `render.yaml` configuration
- Create worker service
- Provision 10GB disk storage
- Enable auto-deploy on git push

#### Step 4: Monitor

View logs in Render dashboard:
- Navigate to service → Logs tab
- Check for "📊 SCHEDULER STATISTICS" messages every 5-10 minutes

---

### Fly.io Deployment

**Best for**: Global edge deployment

#### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

#### Step 2: Initialize App

```bash
cd genesis-clean-deploy-new
fly launch --config fly.toml --no-deploy
```

#### Step 3: Set Secrets

```bash
fly secrets set ENVIRONMENT=production
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set GOOGLE_API_KEY=...
fly secrets set GITHUB_TOKEN=ghp_...
fly secrets set VERCEL_TOKEN=...
```

#### Step 4: Deploy

```bash
fly deploy
```

#### Step 5: Monitor

```bash
# View logs
fly logs

# SSH into instance
fly ssh console
```

---

### Heroku Deployment

**Best for**: Established platform with add-ons

#### Step 1: Install Heroku CLI

```bash
curl https://cli-assets.heroku.com/install.sh | sh
heroku login
```

#### Step 2: Create App

```bash
cd genesis-clean-deploy-new
heroku create genesis-autonomous-scheduler
```

#### Step 3: Configure Environment Variables

```bash
heroku config:set ENVIRONMENT=production
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set GOOGLE_API_KEY=...
heroku config:set GITHUB_TOKEN=ghp_...
heroku config:set VERCEL_TOKEN=...
```

#### Step 4: Deploy

```bash
git push heroku main
```

#### Step 5: Scale Worker

```bash
# Start 1 worker dyno
heroku ps:scale worker=1

# Check status
heroku ps
```

#### Step 6: Monitor

```bash
# View logs
heroku logs --tail

# Check heartbeat
heroku run cat /tmp/genesis_scheduler_heartbeat.json
```

---

### Docker Deployment

**Best for**: Self-hosted or Kubernetes

#### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Environment
ENV ENVIRONMENT=production
ENV PYTHONUNBUFFERED=1

# Run scheduler
CMD ["python", "scripts/autonomous_scheduler.py", "--min-interval", "5", "--max-interval", "10"]
```

#### Step 2: Build Image

```bash
docker build -t genesis-autonomous-scheduler .
```

#### Step 3: Run Container

```bash
docker run -d \
  --name genesis-scheduler \
  --restart unless-stopped \
  -e ENVIRONMENT=production \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e GOOGLE_API_KEY=... \
  -e GITHUB_TOKEN=ghp_... \
  -e VERCEL_TOKEN=... \
  -v /var/genesis:/var/genesis \
  genesis-autonomous-scheduler
```

#### Step 4: Monitor

```bash
# View logs
docker logs -f genesis-scheduler

# Check heartbeat
docker exec genesis-scheduler cat /tmp/genesis_scheduler_heartbeat.json

# Restart
docker restart genesis-scheduler
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ENVIRONMENT` | Yes | Environment name | `development` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o | - |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude | - |
| `GOOGLE_API_KEY` | Yes | Google API key for Gemini | - |
| `GITHUB_TOKEN` | Optional | GitHub token for auto-deployment | - |
| `VERCEL_TOKEN` | Optional | Vercel token for auto-deployment | - |
| `MONGODB_URI` | Optional | MongoDB connection string | - |
| `REDIS_URL` | Optional | Redis connection string | - |

### Command-Line Arguments

```bash
python scripts/autonomous_scheduler.py \
  --min-interval 5 \    # Minimum minutes between cycles (default: 5)
  --max-interval 10 \   # Maximum minutes between cycles (default: 10)
  --max-cycles 100      # Maximum cycles to run (default: infinite)
```

### Heartbeat File

Location: `/tmp/genesis_scheduler_heartbeat.json`

Example:
```json
{
  "timestamp": "2025-11-08T12:34:56.789Z",
  "status": "running",
  "cycle_count": 42,
  "success_count": 38,
  "failure_count": 4,
  "success_rate": 0.905,
  "pid": 12345
}
```

---

## 📊 Monitoring

### Health Checks

#### Option 1: Heartbeat File (All Platforms)

```bash
# Check if file exists and is recent
test -f /tmp/genesis_scheduler_heartbeat.json && \
test $(date +%s) -lt $(date -d "$(jq -r .timestamp /tmp/genesis_scheduler_heartbeat.json) + 5 minutes" +%s)
```

#### Option 2: HTTP Health Check (Optional)

Deploy the health check server alongside the worker:

```bash
# Start health check server
python scripts/health_check_server.py

# Check health
curl http://localhost:8080/health

# Check heartbeat
curl http://localhost:8080/heartbeat

# Prometheus metrics
curl http://localhost:8080/metrics
```

### Log Monitoring

Look for these log patterns:

#### Success Pattern (every 5-10 minutes)
```
🌟 GENESIS AUTONOMOUS SCHEDULER STARTING
📋 Generated Business Idea:
✅ BUSINESS GENERATION SUCCESSFUL
📊 SCHEDULER STATISTICS:
   Total Cycles: 10
   Successful: 9 (90.0%)
   Failed: 1 (10.0%)
⏰ Next cycle in 7.3 minutes
```

#### Error Pattern
```
❌ BUSINESS GENERATION FAILED
❌ CYCLE FAILED WITH EXCEPTION
```

### Metrics

The optional health check server exposes Prometheus metrics:

```
genesis_scheduler_cycle_count 42
genesis_scheduler_success_count 38
genesis_scheduler_failure_count 4
genesis_scheduler_success_rate 0.905
genesis_scheduler_heartbeat_age_seconds 23.4
genesis_scheduler_up 1
```

---

## 🔧 Troubleshooting

### Scheduler Not Running

**Symptom**: No log activity, heartbeat file missing

**Solutions**:
1. Check process status: `ps aux | grep autonomous_scheduler`
2. Check logs for startup errors
3. Verify environment variables are set
4. Check API key validity

### High Failure Rate

**Symptom**: `failure_count` > 20% of `cycle_count`

**Solutions**:
1. Check LLM API quotas and rate limits
2. Review error logs for specific failures
3. Verify GitHub/Vercel tokens are valid
4. Check network connectivity

### Heartbeat File Stale

**Symptom**: Heartbeat timestamp > 15 minutes old

**Solutions**:
1. Check if scheduler process is stuck
2. Review logs for hangs or deadlocks
3. Restart the worker process
4. Check system resources (CPU, memory)

### Out of Memory

**Symptom**: Process crashes with OOM error

**Solutions**:
1. Increase memory allocation (Railway/Render/Fly.io)
2. Reduce `--max-parallel-tasks` in config
3. Enable swap space (if self-hosted)
4. Monitor memory usage with `psutil`

### API Rate Limits

**Symptom**: 429 errors in logs, high failure rate

**Solutions**:
1. Increase `--min-interval` to reduce request rate
2. Implement exponential backoff (already included)
3. Upgrade LLM API plan
4. Use cheaper models (Gemini Flash) for non-critical tasks

---

## 🔒 Security Best Practices

1. **Never commit API keys to git**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Rotate API keys regularly**
   - Set reminder for 30-day rotation
   - Update in deployment platform

3. **Use least-privilege GitHub token**
   - Only grant `repo` and `workflow` scopes
   - Create fine-grained personal access token

4. **Enable audit logging**
   - Monitor unusual business generation patterns
   - Track API usage and costs

5. **Set up alerts**
   - High failure rate (>20%)
   - Heartbeat stale (>15 minutes)
   - API quota exceeded

---

## 📈 Performance Tuning

### Interval Optimization

- **Fast mode**: `--min-interval 2 --max-interval 5` (high API cost)
- **Balanced mode**: `--min-interval 5 --max-interval 10` (default)
- **Slow mode**: `--min-interval 15 --max-interval 30` (low cost)

### Resource Limits

Set these in your deployment platform:

| Platform | CPU | Memory | Disk |
|----------|-----|--------|------|
| Railway | 2 vCPU | 4GB | 10GB |
| Render | 1 vCPU | 2GB | 10GB |
| Fly.io | 2 vCPU | 4GB | 10GB |
| Heroku | 1 dyno | 512MB | 0GB (ephemeral) |

### Cost Optimization

1. Use Gemini Flash for simple tasks ($0.03/1M tokens)
2. Cache LLM responses (Redis)
3. Batch business generation
4. Enable DAAO cost optimization (48% reduction)

---

## 🆘 Support

- **Documentation**: `docs/` directory
- **Issues**: GitHub Issues
- **Logs**: Platform-specific log viewer
- **Heartbeat**: `/tmp/genesis_scheduler_heartbeat.json`

---

## 📝 Changelog

### v1.0.0 (2025-11-08)

- ✅ Fixed `AttributeError` (line 97: `spec.industry` → `spec.business_type`)
- ✅ Converted to production-ready worker service
- ✅ Added graceful shutdown (SIGTERM/SIGINT)
- ✅ Added heartbeat monitoring
- ✅ Added structured JSON logging for production
- ✅ Created deployment configs (Railway, Render, Fly.io)
- ✅ Created optional health check HTTP server
- ✅ Updated Procfile with worker process
- ✅ Added comprehensive documentation

---

**🎉 Your Genesis Autonomous Scheduler is now production-ready!**
